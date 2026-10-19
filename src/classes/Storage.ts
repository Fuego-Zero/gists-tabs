import { GISTS_FILE_DESCRIPTION } from '@/config';
import { RATE_LIMIT_ERROR_PREFIX, t } from '@/i18n/translate';
import { isInitialCanvas } from '@/storage/initialCanvas';
import { nextRetryDelayMs } from '@/storage/retryDelay';
import { sendMessage, type SyncCommandResult } from '@/messaging';
import { storageItems } from '@/storage/items';
import type { GistsTabs } from '@/types';
import {
  PULL_THROTTLE_MS,
  PUSH_DEBOUNCE_MS,
  SNAPSHOT_RING_SIZE,
  type SyncSnapshot,
  type SyncState,
  type SyncStatus,
} from '@/types/sync';
import { clone, uuid } from '@/utils';
import {
  githubCreateGist,
  githubGetGist,
  githubListGists,
  githubPatchGist,
  type GitHubResult,
} from '@/utils/http/github';

enum storageKeys {
  activePageId = 'activePageId',
  autoSync = 'autoSync',
  autoSyncInterval = 'autoSyncInterval',
  cloudSync = 'cloudSync',
  deviceId = 'deviceId',
  dirty = 'syncDirty',
  gistId = 'gistId',
  gistsTabs = 'gistsTabs',
  gistsToken = 'gistsToken',
  lastEtag = 'lastEtag',
  lastSyncedRevision = 'lastSyncedRevision',
  legacyOverwriteConfirmed = 'legacyOverwriteConfirmed',
  syncSnapshots = 'syncSnapshots',
  syncState = 'syncState',
}

const PUSH_ALARM = 'yunjian-push';
const BACKOFF_ALARM = 'yunjian-backoff';

class Storage {
  private backoffTimer: ReturnType<typeof setTimeout> | null = null;
  private dirtyDuringFlight = false;
  private engineActive = false;
  private initialized = false;
  private pushInFlight = false;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;

  /** 只由 Background 调用。页面导入本模块不会冷启动。 */
  startEngine() {
    if (this.engineActive) {return;}

    this.engineActive = true;
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name !== PUSH_ALARM && alarm.name !== BACKOFF_ALARM) {return;}

      this.clearTimer(alarm.name);
      void this.pushToCloud();
    });
    void this.bootstrap();
  }

  schedulePushFromEngine(delay = PUSH_DEBOUNCE_MS) {
    this.scheduleDelayed(PUSH_ALARM, delay);
  }

  coldStartFromEngine() {
    return this.coldStartPull().then(async () => {
      if ((await this.getDirty()) && (await this.getCloudSync())) {this.scheduleDelayed(PUSH_ALARM, 0);}
    });
  }

  async stopSyncFromEngine() {
    this.clearTimer(PUSH_ALARM);
    this.clearTimer(BACKOFF_ALARM);
    await chrome.alarms.clear(PUSH_ALARM);
    await chrome.alarms.clear(BACKOFF_ALARM);
    await this.setSyncStatus('synced', {
      backoffUntil: undefined,
      conflict: undefined,
      failureCount: 0,
      lastError: undefined,
    });
  }

  private async applyCloudData(cloud: GistsTabs, etag: null | string, reason: string): Promise<boolean> {
    const anchored = await this.anchorLegacyCloud(cloud, etag);
    if (!cloud.syncMeta?.revision && !anchored.data.syncMeta?.revision) {return false;}

    const local = await this.getGistsTabs();
    await this.pushSnapshot(local, reason);
    await this.set(storageKeys.gistsTabs, anchored.data);
    await this.setLastSyncedRevision(anchored.data.syncMeta?.revision ?? null);
    if (anchored.etag) {await this.setLastEtag(anchored.etag);}

    await this.setDirty(false);
    await this.setLegacyOverwriteConfirmed(false);
    await this.setSyncStatus('synced', {
      backoffUntil: undefined,
      conflict: undefined,
      failureCount: 0,
      lastError: undefined,
      lastPullAt: Date.now(),
    });
    return true;
  }

  /**
   * 旧 Gist 没有 revision。采纳这份云端数据时补写一次锚点，否则下一次推送会再次进入冲突。
   */
  private async anchorLegacyCloud(data: GistsTabs, etag: null | string): Promise<{ data: GistsTabs; etag: null | string }> {
    if (data.syncMeta?.revision) {return { data, etag };}

    const token = await this.ensureToken();
    const gistId = await this.getGistId();
    if (!token || !gistId) {return { data, etag };}

    const deviceId = await this.getOrCreateDeviceId();
    const revision = uuid();
    const payload: GistsTabs = {
      ...data,
      syncMeta: {
        deviceId,
        revision,
        updateAt: data.updateAt ?? Date.now(),
      },
    };
    const patched = await githubPatchGist(token, gistId, payload);

    if (patched.errorKind === 'rate_limit') {
      await this.handleRateLimit(patched);
      return { data, etag };
    }

    if (patched.errorKind !== 'ok') {
      await this.handleTransientFailure(patched.message || `legacy anchor HTTP ${patched.status}`);
      return { data, etag };
    }

    return { data: payload, etag: patched.etag || etag };
  }

  private async bootstrap() {
    try {
      await this.coldStartPull();
    } finally {
      this.initialized = true;
      const dirty = await this.getDirty();
      if (dirty && (await this.getCloudSync())) {
        const state = await this.getSyncState();
        if (this.inAutomaticBackoff(state)) {
          this.scheduleBackoffResume((state.backoffUntil ?? Date.now()) - Date.now());
        } else {
          this.debouncePush(0);
        }
      }
    }
  }

  private async coldStartPull() {
    const open = await this.getCloudSync();
    if (!open) {return;}

    const token = await this.ensureToken();
    if (!token) {return;}

    const dirty = await this.getDirty();
    // dirty：留给 push（推前必 GET）。不脏：遵守 5min 节流，勿 force 绕过
    if (dirty) {return;}

    await this.pullFromCloud({ force: false, applyIfClean: true });
  }

  private debouncePush(delay = PUSH_DEBOUNCE_MS) {
    if (this.engineActive) {
      this.scheduleDelayed(PUSH_ALARM, delay);
      return;
    }

    void sendMessage('schedulePush', delay);
  }

  /**
   * 后台还在时用定时器按原延迟触发。同时预约 alarm：进程被回收后定时器消失，
   * alarm 仍会唤醒后台。定时器先到时清掉 alarm，避免约 30 秒后再推一次。
   */
  private scheduleDelayed(name: string, delayMs: number) {
    const delay = Math.max(0, delayMs);
    this.clearTimer(name);
    void chrome.alarms.create(name, { when: Date.now() + delay });
    const timer = setTimeout(() => {
      this.clearTimer(name);
      void chrome.alarms.clear(name);
      void this.pushToCloud();
    }, delay);
    if (name === PUSH_ALARM) {this.pushTimer = timer;}
    else {this.backoffTimer = timer;}
  }

  private clearTimer(name: string) {
    const timer = name === PUSH_ALARM ? this.pushTimer : this.backoffTimer;
    if (timer) {clearTimeout(timer);}

    if (name === PUSH_ALARM) {this.pushTimer = null;}
    else {this.backoffTimer = null;}
  }

  private async ensureGistId(token: string): Promise<null | string> {
    const id = await this.getGistId();
    if (id) {return id;}

    const listed = await githubListGists(token);
    if (listed.errorKind === 'auth') {
      await this.handleAuthFailure(listed.message);
      return null;
    }

    if (listed.errorKind === 'rate_limit') {
      await this.handleRateLimit(listed);
      return null;
    }

    if (listed.errorKind !== 'ok' || !listed.data) {
      await this.setSyncStatus('failed', { lastError: listed.message || `list gists HTTP ${listed.status}` });
      return null;
    }

    const found = listed.data.find((item) => item.description === GISTS_FILE_DESCRIPTION);
    if (found) {
      await this.setGistId(found.id);
      return found.id;
    }

    const local = (await this.getGistsTabs()) || { pages: [], updateAt: Date.now(), version: 1 };
    const deviceId = await this.getOrCreateDeviceId();
    const newRevision = uuid();
    const payload: GistsTabs = {
      ...local,
      syncMeta: {
        deviceId,
        revision: newRevision,
        updateAt: local.updateAt ?? Date.now(),
      },
    };
    const created = await githubCreateGist(token, payload);
    if (created.errorKind === 'auth') {
      await this.handleAuthFailure(created.message);
      return null;
    }

    if (created.errorKind === 'rate_limit') {
      await this.handleRateLimit(created);
      return null;
    }

    if (created.errorKind !== 'ok' || !created.data) {
      await this.setSyncStatus('failed', { lastError: created.message || `create gist HTTP ${created.status}` });
      return null;
    }

    await this.setGistId(created.data.id);
    if (created.etag) {await this.setLastEtag(created.etag);}

    // 新建路径写入 revision 并锚定，避免随后 GET 无 revision 误进冲突
    await this.set(storageKeys.gistsTabs, payload);
    await this.setLastSyncedRevision(newRevision);
    await this.setLegacyOverwriteConfirmed(false);
    await this.setDirty(false);
    await this.setSyncStatus('synced', {
      backoffUntil: undefined,
      conflict: undefined,
      failureCount: 0,
      lastError: undefined,
      lastPushAt: Date.now(),
    });
    return created.data.id;
  }

  private async ensureToken(): Promise<null | string> {
    const token = await this.getGistsToken();
    return token || null;
  }

  private async enterConflict(local: GistsTabs, cloud: GistsTabs, cloudEtag: null | string, reason?: string) {
    await this.pushSnapshot(local, 'conflict-local');
    await this.pushSnapshot(cloud, 'conflict-cloud');
    await this.setDirty(true);
    await this.setSyncStatus('conflict', {
      conflict: { cloud: clone(cloud), cloudEtag, local: clone(local) },
      lastError: reason || t('errRevision'),
    });
  }

  private async get<K extends storageKeys>(key: K) {
    const value = await storageItems[key].getValue();
    return {
      [key]: value ?? undefined,
    } as {
      [P in K]: NonNullable<Awaited<ReturnType<(typeof storageItems)[P]['getValue']>>> | undefined;
    };
  }

  private async getDirty(): Promise<boolean> {
    const res = await this.get(storageKeys.dirty);
    return Boolean(res[storageKeys.dirty]);
  }

  private async getGistId(): Promise<string> {
    const res = await this.get(storageKeys.gistId);
    return (res[storageKeys.gistId]!) || '';
  }

  private async getLastEtag(): Promise<null | string> {
    const res = await this.get(storageKeys.lastEtag);
    return (res[storageKeys.lastEtag]!) || null;
  }

  private async getLastSyncedRevision(): Promise<null | string> {
    const res = await this.get(storageKeys.lastSyncedRevision);
    return (res[storageKeys.lastSyncedRevision]!) || null;
  }

  private async getLegacyOverwriteConfirmed(): Promise<boolean> {
    const res = await this.get(storageKeys.legacyOverwriteConfirmed);
    return Boolean(res[storageKeys.legacyOverwriteConfirmed]);
  }

  private async getOrCreateDeviceId(): Promise<string> {
    const res = await this.get(storageKeys.deviceId);
    let id = res[storageKeys.deviceId];
    if (!id) {
      id = uuid();
      await this.set(storageKeys.deviceId, id);
    }

    return id;
  }

  private async handleAuthFailure(message?: string) {
    this.clearTimer(BACKOFF_ALARM);
    await chrome.alarms.clear(BACKOFF_ALARM);
    await this.setDirty(true);
    await this.setSyncStatus('auth_failed', {
      backoffUntil: undefined,
      failureCount: 0,
      lastError: message || t('errToken'),
    });
  }

  private async handleRateLimit(result: GitHubResult<unknown>) {
    const failureCount = (await this.getSyncState()).failureCount ?? 0;
    const delay = nextRetryDelayMs({
      failureCount,
      kind: 'rate_limit',
      resetAtMs: result.rate.reset,
      retryAfterMs: result.rate.retryAfter,
    });
    await this.setDirty(true);
    await this.setSyncStatus('rate_limited', {
      backoffUntil: Date.now() + delay,
      failureCount: failureCount + 1,
      lastError: result.message || `${RATE_LIMIT_ERROR_PREFIX}${result.status}`,
    });
    this.scheduleBackoffResume(delay);
  }

  private async handleTransientFailure(message?: string) {
    const failureCount = (await this.getSyncState()).failureCount ?? 0;
    const delay = nextRetryDelayMs({ failureCount, kind: 'transient' });
    await this.setDirty(true);
    await this.setSyncStatus('failed', {
      backoffUntil: Date.now() + delay,
      failureCount: failureCount + 1,
      lastError: message || t('errSync'),
    });
    this.scheduleBackoffResume(delay);
  }

  /** 自动推送在失败或限流窗口内必须停住。手动同步会先清掉这个窗口。 */
  private inAutomaticBackoff(state: SyncState): boolean {
    return (state.status === 'failed' || state.status === 'rate_limited')
      && Boolean(state.backoffUntil && Date.now() < state.backoffUntil);
  }

  private isAutoPushPaused(state: SyncState): boolean {
    return state.status === 'conflict' || state.status === 'auth_failed';
  }

  private async patchSyncState(patch: Partial<SyncState>) {
    const current = await this.getSyncState();
    const next: SyncState = { ...current, ...patch };
    await this.set(storageKeys.syncState, next);
    return next;
  }

  private async pushSnapshot(data: GistsTabs | undefined, reason: string) {
    if (!data) {return;}

    const list = await this.getSnapshots();
    const snap: SyncSnapshot = {
      at: Date.now(),
      data: clone(data),
      id: uuid(),
      reason,
    };
    const next = [snap, ...list].slice(0, SNAPSHOT_RING_SIZE);
    await this.set(storageKeys.syncSnapshots, next);
  }

  private async pushToCloud() {
    if (!this.initialized && this.pushInFlight) {return;}

    const open = await this.getCloudSync();
    if (!open) {return;}

    const state = await this.getSyncState();
    if (this.isAutoPushPaused(state)) {return;}

    if (this.inAutomaticBackoff(state)) {
      this.scheduleBackoffResume((state.backoffUntil ?? Date.now()) - Date.now());
      return;
    }

    if (this.pushInFlight) {
      this.dirtyDuringFlight = true;
      return;
    }

    const dirty = await this.getDirty();
    if (!dirty) {
      await this.setSyncStatus('synced', { backoffUntil: undefined, failureCount: 0, lastError: undefined });
      return;
    }

    const token = await this.ensureToken();
    if (!token) {
      await this.setSyncStatus('failed', { lastError: t('errNoToken') });
      return;
    }

    this.pushInFlight = true;
    this.dirtyDuringFlight = false;
    await this.setSyncStatus('syncing');

    try {
      const gistId = await this.ensureGistId(token);
      if (!gistId) {return;}

      // v1.1 B：凡 dirty 推云前必条件 GET，不受 5min 节流
      const got = await githubGetGist(token, gistId, { etag: null }); // 推前必须拿到正文与 ETag，不用 304 短路

      if (got.errorKind === 'auth') {
        await this.handleAuthFailure(got.message);
        return;
      }

      if (got.errorKind === 'rate_limit') {
        await this.handleRateLimit(got);
        return;
      }

      if (got.errorKind !== 'ok' || !got.data) {
        await this.handleTransientFailure(got.message || `pre-push GET HTTP ${got.status}`);
        return;
      }

      if (got.etag) {await this.setLastEtag(got.etag);}

      const local = await this.getGistsTabs();
      if (!local) {
        await this.setDirty(false);
        await this.setSyncStatus('synced', { backoffUntil: undefined, failureCount: 0, lastError: undefined });
        return;
      }

      // 本机仍是自动创建的空首页时采用云端，避免用空画布覆盖已有 Gist。不比较「首页」字符串。
      if (isInitialCanvas(local) && got.data.pages?.length && !isInitialCanvas(got.data)) {
        await this.applyCloudData(got.data, got.etag, 'pull-init');
        return;
      }

      const lastSynced = await this.getLastSyncedRevision();
      const cloudRev = got.data.syncMeta?.revision;
      const legacyConfirmed = await this.getLegacyOverwriteConfirmed();

      // dirty+无云 revision → legacy 冲突（或已确认一次覆盖）；dirty+有云 revision 且无锚点/不等 → 冲突
      if (!cloudRev) {
        if (!legacyConfirmed) {
          await this.enterConflict(local, got.data, got.etag, t('errLegacy'));
          return;
        }
      } else if (this.revisionsConflict(cloudRev, lastSynced)) {
        await this.enterConflict(
          local,
          got.data,
          got.etag,
          lastSynced ? t('errRevision') : t('errNoAnchor'),
        );
        return;
      }

      await this.pushSnapshot(local, 'pre-push');

      const deviceId = await this.getOrCreateDeviceId();
      const newRevision = uuid();
      const payload: GistsTabs = {
        ...local,
        syncMeta: {
          deviceId,
          revision: newRevision,
          updateAt: local.updateAt,
        },
      };

      // Gist 的 PATCH 不接受 If-Match，带上会直接 400。推送后用 GET 核对 revision。
      const patched = await githubPatchGist(token, gistId, payload);

      if (patched.errorKind === 'auth') {
        await this.handleAuthFailure(patched.message);
        return;
      }

      if (patched.errorKind === 'rate_limit') {
        await this.handleRateLimit(patched);
        return;
      }

      if (patched.errorKind !== 'ok') {
        await this.handleTransientFailure(patched.message || `PATCH HTTP ${patched.status}`);
        return;
      }

      const verify = await githubGetGist(token, gistId);
      if (verify.errorKind === 'ok' && verify.data && verify.data.syncMeta?.revision !== newRevision) {
        await this.enterConflict(local, verify.data, verify.etag);
        return;
      }

      if (verify.etag) {await this.setLastEtag(verify.etag);}
      else if (patched.etag) {await this.setLastEtag(patched.etag);}

      await this.set(storageKeys.gistsTabs, payload);
      await this.setLastSyncedRevision(newRevision);
      await this.setLegacyOverwriteConfirmed(false);
      await this.setDirty(false);
      await this.setSyncStatus('synced', {
        backoffUntil: undefined,
        conflict: undefined,
        failureCount: 0,
        lastError: undefined,
        lastPushAt: Date.now(),
      });
    } catch (error) {
      console.error('pushToCloud error:', error);
      await this.handleTransientFailure(error instanceof Error ? error.message : String(error));
    } finally {
      this.pushInFlight = false;
      if (this.dirtyDuringFlight) {
        this.dirtyDuringFlight = false;
        const state = await this.getSyncState();
        // 失败时退避闹钟已经排好，不能再用编辑防抖立刻再推。
        if (!this.inAutomaticBackoff(state)) {this.debouncePush();}
      }
    }
  }

  private revisionsConflict(cloudRevision: string | undefined, lastSynced: null | string): boolean {
    // 无云 revision：由 legacy 路径单独处理
    if (!cloudRevision) {return false;}

    // 云有 revision、本机无锚点：禁止静默覆盖（与设计①同精神）
    if (!lastSynced) {return true;}

    return cloudRevision !== lastSynced;
  }

  private scheduleBackoffResume(delayMs: number) {
    if (!this.engineActive) {return;}

    this.scheduleDelayed(BACKOFF_ALARM, delayMs);
  }

  private async set(key: storageKeys, value: unknown): Promise<void> {
    const item = storageItems[key];
    if (value == null) {
      await item.removeValue();
      return;
    }

    await item.setValue(value as never);
  }

  private async setDirty(dirty: boolean) {
    return this.set(storageKeys.dirty, dirty);
  }

  private async setGistId(id: string) {
    return this.set(storageKeys.gistId, id);
  }

  private async setLastEtag(etag: null | string) {
    return this.set(storageKeys.lastEtag, etag);
  }

  private async setLastSyncedRevision(revision: null | string) {
    return this.set(storageKeys.lastSyncedRevision, revision);
  }

  private async setLegacyOverwriteConfirmed(confirmed: boolean) {
    return this.set(storageKeys.legacyOverwriteConfirmed, confirmed);
  }

  private async setSyncStatus(status: SyncStatus, extra?: Partial<SyncState>) {
    return this.patchSyncState({ status, ...extra });
  }

  async getActivePageId(): Promise<string> {
    const res = await this.get(storageKeys.activePageId);
    return res[storageKeys.activePageId] || '';
  }

  /** @deprecated 强云同步下不再对用户暴露；保留读取以免旧数据报错 */
  async getAutoSync(): Promise<boolean> {
    const res = await this.get(storageKeys.autoSync);
    return Boolean(res[storageKeys.autoSync]);
  }

  /** @deprecated */
  async getAutoSyncInterval(): Promise<number> {
    const res = await this.get(storageKeys.autoSyncInterval);
    return res[storageKeys.autoSyncInterval] || 0;
  }

  // —— public API ——

  async getCloudSync(): Promise<boolean> {
    const res = await this.get(storageKeys.cloudSync);
    return Boolean(res[storageKeys.cloudSync]);
  }

  async getGistsTabs(): Promise<GistsTabs | undefined> {
    const res = await this.get(storageKeys.gistsTabs);
    return res[storageKeys.gistsTabs];
  }

  async getGistsToken(): Promise<string> {
    const res = await this.get(storageKeys.gistsToken);
    return res[storageKeys.gistsToken] || '';
  }

  async getSnapshots(): Promise<SyncSnapshot[]> {
    const res = await this.get(storageKeys.syncSnapshots);
    return (res[storageKeys.syncSnapshots]!) || [];
  }

  async getSyncState(): Promise<SyncState> {
    const res = await this.get(storageKeys.syncState);
    const state = res[storageKeys.syncState];
    return state ?? { status: 'synced' };
  }

  /**
   * 纯拉取。节流只作用于不脏的纯拉取；force 时跳过节流。
   * dirty 推送路径不走这里的节流。
   */
  async pullFromCloud(options?: {
    applyIfClean?: boolean;
    force?: boolean;
    skipIfDirty?: boolean;
  }): Promise<{ ok: boolean; reason?: string }> {
    const open = await this.getCloudSync();
    if (!open) {return { ok: false, reason: 'cloudSync off' };}

    const token = await this.ensureToken();
    if (!token) {return { ok: false, reason: 'no token' };}

    const dirty = await this.getDirty();
    if (options?.skipIfDirty && dirty) {return { ok: false, reason: 'dirty' };}

    const state = await this.getSyncState();
    if (!options?.force && !dirty && state.lastPullAt && Date.now() - state.lastPullAt < PULL_THROTTLE_MS) {
      return { ok: true, reason: 'throttled' };
    }

    const gistId = await this.ensureGistId(token);
    if (!gistId) {return { ok: false, reason: 'no gistId' };}

    await this.setSyncStatus('syncing');
    const etag = await this.getLastEtag();
    const result = await githubGetGist(token, gistId, { etag: options?.force ? null : etag });

    if (result.errorKind === 'auth') {
      await this.handleAuthFailure(result.message);
      return { ok: false, reason: 'auth' };
    }

    if (result.errorKind === 'rate_limit') {
      await this.handleRateLimit(result);
      return { ok: false, reason: 'rate_limit' };
    }

    if (result.errorKind === 'not_modified') {
      await this.patchSyncState({ lastPullAt: Date.now(), status: dirty ? 'pending' : 'synced' });
      return { ok: true, reason: 'not_modified' };
    }

    if (result.errorKind !== 'ok' || !result.data) {
      await this.handleTransientFailure(result.message || `GET HTTP ${result.status}`);
      return { ok: false, reason: 'http' };
    }

    if (result.etag) {await this.setLastEtag(result.etag);}

    await this.patchSyncState({ lastPullAt: Date.now() });

    const cloud = result.data;
    const local = await this.getGistsTabs();
    if (isInitialCanvas(local) && cloud.pages?.length && !isInitialCanvas(cloud)) {
      await this.applyCloudData(cloud, result.etag, 'pull-init');
      return { ok: true, reason: 'applied-init' };
    }

    const lastSynced = await this.getLastSyncedRevision();
    const cloudRev = cloud.syncMeta?.revision;

    if (dirty && !cloudRev) {
      const local = await this.getGistsTabs();
      if (local) {await this.enterConflict(local, cloud, result.etag, t('errLegacy'));}

      return { ok: false, reason: 'conflict' };
    }

    if (dirty && this.revisionsConflict(cloudRev, lastSynced)) {
      const local = await this.getGistsTabs();
      if (!local) {return { ok: false, reason: 'conflict' };}

      await this.enterConflict(
        local,
        cloud,
        result.etag,
        lastSynced ? t('errRevision') : t('errNoAnchor'),
      );
      return { ok: false, reason: 'conflict' };
    }

    const shouldApply = options?.applyIfClean !== false && !dirty;
    if (shouldApply && cloudRev && lastSynced && cloudRev !== lastSynced) {
      await this.applyCloudData(cloud, result.etag, 'pull');
      return { ok: true, reason: 'applied' };
    }

    if (shouldApply && !lastSynced && cloud.pages?.length) {
      // 本机尚无同步锚点、云端已有数据：采用云端
      await this.applyCloudData(cloud, result.etag, 'pull-init');
      return { ok: true, reason: 'applied-init' };
    }

    await this.setSyncStatus(dirty ? 'pending' : 'synced', dirty ? undefined : {
      backoffUntil: undefined,
      failureCount: 0,
      lastError: undefined,
    });
    return { ok: true, reason: 'checked' };
  }

  /** 用户确认后从云端拉取覆盖本机 */
  async pullFromCloudConfirmed() {
    if (!this.engineActive) {return sendMessage('pullFromCloud');}

    const open = await this.getCloudSync();
    if (!open) {return { ok: false, reason: 'cloudSync off' };}

    const token = await this.ensureToken();
    if (!token) {return { ok: false, reason: 'no token' };}

    const gistId = await this.ensureGistId(token);
    if (!gistId) {return { ok: false, reason: 'no gistId' };}

    await this.setSyncStatus('syncing');
    const got = await githubGetGist(token, gistId);
    if (got.errorKind === 'auth') {
      await this.handleAuthFailure(got.message);
      return { ok: false, reason: 'auth' };
    }

    if (got.errorKind === 'rate_limit') {
      await this.handleRateLimit(got);
      return { ok: false, reason: 'rate_limit' };
    }

    if (got.errorKind !== 'ok' || !got.data) {
      await this.handleTransientFailure(got.message || `GET HTTP ${got.status}`);
      return { ok: false, reason: 'http' };
    }

    await this.applyCloudData(got.data, got.etag, 'manual-pull');
    const after = await this.getSyncState();
    if (after.status !== 'synced') {return { ok: false, reason: after.lastError || after.status };}

    return { ok: true };
  }

  async resolveConflictKeepLocal() {
    if (!this.engineActive) {
      await sendMessage('resolveConflict', 'keepLocal');
      return;
    }

    const state = await this.getSyncState();
    if (!state.conflict) {return;}

    // 用户明确覆盖云端：用冲突时的 cloudEtag 作 If-Match；清冲突后强制推
    await this.set(storageKeys.gistsTabs, state.conflict.local);
    if (state.conflict.cloudEtag) {await this.setLastEtag(state.conflict.cloudEtag);}

    const cloudRev = state.conflict.cloud.syncMeta?.revision ?? null;
    await this.setLastSyncedRevision(cloudRev);
    // 旧格式云端无 revision：一次已确认的 legacy 覆盖，避免再次无限进冲突
    if (!cloudRev) {
      await this.setLegacyOverwriteConfirmed(true);
    }

    await this.setDirty(true);
    await this.setSyncStatus('pending', { conflict: undefined, lastError: undefined });
    await this.pushToCloud();
  }

  async resolveConflictUseCloud() {
    if (!this.engineActive) {
      await sendMessage('resolveConflict', 'useCloud');
      return;
    }

    const state = await this.getSyncState();
    if (!state.conflict) {return;}

    await this.setLegacyOverwriteConfirmed(false);
    await this.applyCloudData(state.conflict.cloud, state.conflict.cloudEtag, 'conflict-use-cloud');
  }

  async retrySync() {
    if (!this.engineActive) {
      await sendMessage('retrySync');
      return;
    }

    const state = await this.getSyncState();
    if (state.status === 'auth_failed') {return;}

    if (state.status === 'conflict') {return;}

    await this.patchSyncState({ backoffUntil: undefined, lastError: undefined });
    await this.setDirty(true);
    await this.setSyncStatus('pending');
    await this.pushToCloud();
  }

  async setActivePageId(pageId: string) {
    return this.set(storageKeys.activePageId, pageId);
  }

  /** @deprecated */
  async setAutoSync(open: boolean) {
    return this.set(storageKeys.autoSync, open);
  }

  /** @deprecated */
  async setAutoSyncInterval(interval: number) {
    return this.set(storageKeys.autoSyncInterval, interval);
  }

  async setCloudSync(open: boolean) {
    await this.set(storageKeys.cloudSync, open);
    if (this.engineActive) {
      if (open) {await this.coldStartFromEngine();}
      else {await this.stopSyncFromEngine();}

      return;
    }

    await sendMessage(open ? 'coldStart' : 'stopSync');
  }

  /**
   * User-edit write path. Engine writebacks (push / applyCloudData / use-cloud)
   * must use this.set + setDirty(false), not this method. If a sync write must
   * go through here, pass { fromSync: true } or { skipDirty: true }.
   */
  async setGistsTabs(data: GistsTabs, options?: { fromSync?: boolean; skipDirty?: boolean }) {
    const skipDirty = Boolean(options?.skipDirty || options?.fromSync);

    if (skipDirty) {
      await this.set(storageKeys.gistsTabs, data);
      await this.setDirty(false);
      return;
    }

    // Guard: synced data echoed back via user handler must not re-dirty.
    // Same anchored revision + unchanged pages => echo (updateAt bump only).
    const prev = await this.getGistsTabs();
    const lastSynced = await this.getLastSyncedRevision();
    const sameRevision = Boolean(data.syncMeta?.revision && lastSynced && data.syncMeta.revision === lastSynced);
    const samePages =
      prev != null && JSON.stringify(prev.pages) === JSON.stringify(data.pages) && prev.version === data.version;
    if (sameRevision && samePages) {
      await this.set(storageKeys.gistsTabs, data);
      return;
    }

    await this.set(storageKeys.gistsTabs, data);
    await this.setDirty(true);
    const open = await this.getCloudSync();
    if (!open) {
      await this.setSyncStatus('synced', { backoffUntil: undefined, failureCount: 0, lastError: undefined });
      return;
    }

    const state = await this.getSyncState();
    if (state.status === 'conflict' || state.status === 'auth_failed') {
      await this.setSyncStatus(state.status, { lastError: state.lastError, conflict: state.conflict });
      return;
    }

    // 退避窗口内只保留脏标记，不把自动重试提前到 3 秒防抖。
    if (this.inAutomaticBackoff(state)) {return;}

    await this.setSyncStatus('pending');
    this.debouncePush();
  }

  async setGistsToken(token: string) {
    await this.set(storageKeys.gistsToken, token);
    const state = await this.getSyncState();
    if (state.status === 'auth_failed') {
      await this.setSyncStatus('pending', { lastError: undefined });
      this.debouncePush(0);
    }
  }

  /** 立即同步（手动）：走完整冲突检查的 push。旧格式云端视为用户已确认覆盖。 */
  async syncGists(): Promise<SyncCommandResult> {
    if (!this.engineActive) {return sendMessage('syncNow');}

    const open = await this.getCloudSync();
    if (!open) {return { ok: false, reason: 'cloudSync off' };}

    const state = await this.getSyncState();
    if (state.status === 'auth_failed') {return { ok: false, reason: state.lastError || 'auth' };}

    // 手动同步是唯一可以提前结束退避的入口。
    await this.patchSyncState({ backoffUntil: undefined, failureCount: 0 });

    if (state.status === 'conflict' && state.conflict?.cloud.syncMeta?.revision) {
      return { ok: false, reason: state.lastError || t('errRevision') };
    }

    if (state.status === 'conflict') {
      await this.resolveConflictKeepLocal();
    } else {
      await this.setLegacyOverwriteConfirmed(true);
      await this.setDirty(true);
      await this.setSyncStatus('pending', { backoffUntil: undefined, lastError: undefined });
      await this.pushToCloud();
    }

    const after = await this.getSyncState();
    if (after.status === 'synced') {return { ok: true };}

    return { ok: false, reason: after.lastError || after.status };
  }
}

export default new Storage();
