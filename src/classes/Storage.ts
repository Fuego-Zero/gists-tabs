import { GISTS_FILE_DESCRIPTION } from '@/config';
import {
  BACKOFF_BASE_MS,
  BACKOFF_CAP_MS,
  PULL_THROTTLE_MS,
  PUSH_DEBOUNCE_MS,
  SNAPSHOT_RING_SIZE,
  type SyncSnapshot,
  type SyncState,
  type SyncStatus,
} from '@/types/sync';
import { clone, uuid } from '@/utils';
import {
  type GitHubResult,
  githubCreateGist,
  githubGetGist,
  githubListGists,
  githubPatchGist,
} from '@/utils/http/github';

import type { GistsTabs } from '@/types';

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

class Storage {
  private backoffTimer: ReturnType<typeof setTimeout> | null = null;
  private dirtyDuringFlight = false;
  private initialized = false;
  private pushInFlight = false;
  private syncGistsTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.bootstrap();
  }

  private async applyCloudData(cloud: GistsTabs, etag: null | string, reason: string) {
    const local = await this.getGistsTabs();
    await this.pushSnapshot(local, reason);
    await this.set(storageKeys.gistsTabs, cloud);
    await this.setLastSyncedRevision(cloud.syncMeta?.revision ?? null);
    if (etag) await this.setLastEtag(etag);
    await this.setDirty(false);
    await this.setSyncStatus('synced', { conflict: undefined, lastError: undefined, lastPullAt: Date.now() });
  }

  private async bootstrap() {
    try {
      await this.coldStartPull();
    } finally {
      this.initialized = true;
      const dirty = await this.getDirty();
      if (dirty && (await this.getCloudSync())) {
        this.debouncePush(0);
      }
    }
  }

  private async coldStartPull() {
    const open = await this.getCloudSync();
    if (!open) return;
    const token = await this.ensureToken();
    if (!token) return;

    const dirty = await this.getDirty();
    // dirty：留给 push（推前必 GET）。不脏：遵守 5min 节流，勿 force 绕过
    if (dirty) return;
    await this.pullFromCloud({ force: false, applyIfClean: true });
  }

  private computeBackoffMs(attemptHint = 0): number {
    const exp = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** Math.min(attemptHint, 6));
    const jitter = Math.floor(Math.random() * 1000);
    return Math.min(BACKOFF_CAP_MS, exp + jitter);
  }

  private debouncePush(delay = PUSH_DEBOUNCE_MS) {
    if (this.syncGistsTimer) clearTimeout(this.syncGistsTimer);
    this.syncGistsTimer = setTimeout(() => {
      this.syncGistsTimer = null;
      this.pushToCloud();
    }, delay);
  }

  private async ensureGistId(token: string): Promise<null | string> {
    const id = await this.getGistId();
    if (id) return id;

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
    if (created.etag) await this.setLastEtag(created.etag);
    // 新建路径写入 revision 并锚定，避免随后 GET 无 revision 误进冲突
    await this.set(storageKeys.gistsTabs, payload);
    await this.setLastSyncedRevision(newRevision);
    await this.setLegacyOverwriteConfirmed(false);
    await this.setDirty(false);
    await this.setSyncStatus('synced', { conflict: undefined, lastError: undefined, lastPushAt: Date.now() });
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
      lastError: reason || '检测到云端与本机 revision 不一致',
    });
  }

  private get(keys: string | string[]) {
    return chrome.storage.local.get(keys);
  }

  private async getDirty(): Promise<boolean> {
    const res = await this.get(storageKeys.dirty);
    return Boolean(res[storageKeys.dirty]);
  }

  private async getGistId(): Promise<string> {
    const res = await this.get(storageKeys.gistId);
    return (res[storageKeys.gistId] as string) || '';
  }

  private async getLastEtag(): Promise<null | string> {
    const res = await this.get(storageKeys.lastEtag);
    return (res[storageKeys.lastEtag] as string) || null;
  }

  private async getLastSyncedRevision(): Promise<null | string> {
    const res = await this.get(storageKeys.lastSyncedRevision);
    return (res[storageKeys.lastSyncedRevision] as string) || null;
  }

  private async getLegacyOverwriteConfirmed(): Promise<boolean> {
    const res = await this.get(storageKeys.legacyOverwriteConfirmed);
    return Boolean(res[storageKeys.legacyOverwriteConfirmed]);
  }

  private async getOrCreateDeviceId(): Promise<string> {
    const res = await this.get(storageKeys.deviceId);
    let id = res[storageKeys.deviceId] as string | undefined;
    if (!id) {
      id = uuid();
      await this.set(storageKeys.deviceId, id);
    }
    return id;
  }

  private async handleAuthFailure(message?: string) {
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }
    await this.setDirty(true);
    await this.setSyncStatus('auth_failed', {
      backoffUntil: undefined,
      lastError: message || 'Token 无效或已过期，请到 Options 重配 Token',
    });
  }

  private async handleRateLimit(result: GitHubResult<unknown>) {
    const fromHeader = result.rate.retryAfter || (result.rate.reset ? result.rate.reset - Date.now() : 0);
    const delay = Math.min(BACKOFF_CAP_MS, Math.max(fromHeader, this.computeBackoffMs()));
    const backoffUntil = Date.now() + delay;
    await this.setDirty(true);
    await this.setSyncStatus('rate_limited', {
      backoffUntil,
      lastError: result.message || `限流 HTTP ${result.status}`,
    });
    this.scheduleBackoffResume(delay);
  }

  private async handleTransientFailure(message?: string, attemptHint = 0) {
    const delay = this.computeBackoffMs(attemptHint);
    const backoffUntil = Date.now() + delay;
    await this.setDirty(true);
    await this.setSyncStatus('failed', {
      backoffUntil,
      lastError: message || '同步失败',
    });
    this.scheduleBackoffResume(delay);
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
    if (!data) return;
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
    if (!this.initialized && this.pushInFlight) return;

    const open = await this.getCloudSync();
    if (!open) return;

    const state = await this.getSyncState();
    if (this.isAutoPushPaused(state)) return;

    if (state.backoffUntil && Date.now() < state.backoffUntil && state.status === 'rate_limited') {
      this.scheduleBackoffResume(state.backoffUntil - Date.now());
      return;
    }

    if (this.pushInFlight) {
      this.dirtyDuringFlight = true;
      return;
    }

    const dirty = await this.getDirty();
    if (!dirty) {
      await this.setSyncStatus('synced');
      return;
    }

    const token = await this.ensureToken();
    if (!token) {
      await this.setSyncStatus('failed', { lastError: '未配置 Token' });
      return;
    }

    this.pushInFlight = true;
    this.dirtyDuringFlight = false;
    await this.setSyncStatus('syncing');

    try {
      const gistId = await this.ensureGistId(token);
      if (!gistId) return;

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

      if (got.etag) await this.setLastEtag(got.etag);

      const local = await this.getGistsTabs();
      if (!local) {
        await this.setDirty(false);
        await this.setSyncStatus('synced');
        return;
      }

      const lastSynced = await this.getLastSyncedRevision();
      const cloudRev = got.data.syncMeta?.revision;
      const legacyConfirmed = await this.getLegacyOverwriteConfirmed();

      // dirty+无云 revision → legacy 冲突（或已确认一次覆盖）；dirty+有云 revision 且无锚点/不等 → 冲突
      if (!cloudRev) {
        if (!legacyConfirmed) {
          await this.enterConflict(local, got.data, got.etag, '云端为旧格式（无 revision），覆盖前需确认');
          return;
        }
      } else if (this.revisionsConflict(cloudRev, lastSynced)) {
        await this.enterConflict(
          local,
          got.data,
          got.etag,
          lastSynced ? '检测到云端与本机 revision 不一致' : '本机无同步锚点且云端已有 revision，覆盖前需确认',
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

      const ifMatch = got.etag;
      const patched = await githubPatchGist(token, gistId, payload, { ifMatch });

      if (patched.errorKind === 'auth') {
        await this.handleAuthFailure(patched.message);
        return;
      }
      if (patched.errorKind === 'rate_limit') {
        await this.handleRateLimit(patched);
        return;
      }
      if (patched.errorKind === 'precondition') {
        const latest = await githubGetGist(token, gistId);
        await this.enterConflict(local, latest.data || got.data, latest.etag || got.etag);
        return;
      }
      if (patched.errorKind !== 'ok') {
        await this.handleTransientFailure(patched.message || `PATCH HTTP ${patched.status}`);
        return;
      }

      // 无 ETag 回退：PATCH 后立刻 GET 校验 revision
      if (!ifMatch) {
        const verify = await githubGetGist(token, gistId);
        if (verify.errorKind === 'ok' && verify.data && verify.data.syncMeta?.revision !== newRevision) {
          await this.enterConflict(local, verify.data, verify.etag);
          return;
        }
        if (verify.etag) await this.setLastEtag(verify.etag);
      } else if (patched.etag) {
        await this.setLastEtag(patched.etag);
      }

      await this.set(storageKeys.gistsTabs, payload);
      await this.setLastSyncedRevision(newRevision);
      await this.setLegacyOverwriteConfirmed(false);
      await this.setDirty(false);
      await this.setSyncStatus('synced', {
        conflict: undefined,
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
        this.debouncePush(0);
      }
    }
  }

  private revisionsConflict(cloudRevision: string | undefined, lastSynced: null | string): boolean {
    // 无云 revision：由 legacy 路径单独处理
    if (!cloudRevision) return false;
    // 云有 revision、本机无锚点：禁止静默覆盖（与设计①同精神）
    if (!lastSynced) return true;
    return cloudRevision !== lastSynced;
  }

  private scheduleBackoffResume(delayMs: number) {
    if (this.backoffTimer) clearTimeout(this.backoffTimer);
    this.backoffTimer = setTimeout(
      () => {
        this.backoffTimer = null;
        this.pushToCloud();
      },
      Math.max(0, delayMs),
    );
  }

  private set(key: string, value: unknown): Promise<void> {
    return chrome.storage.local.set({ [key]: value });
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
    return res[storageKeys.activePageId];
  }

  /** @deprecated 强云同步下不再对用户暴露；保留读取以免旧数据报错 */
  async getAutoSync(): Promise<boolean> {
    const res = await this.get(storageKeys.autoSync);
    return res[storageKeys.autoSync];
  }

  /** @deprecated */
  async getAutoSyncInterval(): Promise<number> {
    const res = await this.get(storageKeys.autoSyncInterval);
    return res[storageKeys.autoSyncInterval];
  }

  // —— public API ——

  async getCloudSync(): Promise<boolean> {
    const res = await this.get(storageKeys.cloudSync);
    return Boolean(res[storageKeys.cloudSync]);
  }

  async getGistsTabs(): Promise<GistsTabs> {
    const res = await this.get(storageKeys.gistsTabs);
    return res[storageKeys.gistsTabs];
  }

  async getGistsToken(): Promise<string> {
    const res = await this.get(storageKeys.gistsToken);
    return res[storageKeys.gistsToken];
  }

  async getSnapshots(): Promise<SyncSnapshot[]> {
    const res = await this.get(storageKeys.syncSnapshots);
    return (res[storageKeys.syncSnapshots] as SyncSnapshot[]) || [];
  }

  async getSyncState(): Promise<SyncState> {
    const res = await this.get(storageKeys.syncState);
    const state = res[storageKeys.syncState] as SyncState | undefined;
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
    if (!open) return { ok: false, reason: 'cloudSync off' };

    const token = await this.ensureToken();
    if (!token) return { ok: false, reason: 'no token' };

    const dirty = await this.getDirty();
    if (options?.skipIfDirty && dirty) return { ok: false, reason: 'dirty' };

    const state = await this.getSyncState();
    if (!options?.force && !dirty && state.lastPullAt && Date.now() - state.lastPullAt < PULL_THROTTLE_MS) {
      return { ok: true, reason: 'throttled' };
    }

    const gistId = await this.ensureGistId(token);
    if (!gistId) return { ok: false, reason: 'no gistId' };

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

    if (result.etag) await this.setLastEtag(result.etag);
    await this.patchSyncState({ lastPullAt: Date.now() });

    const cloud = result.data;
    const lastSynced = await this.getLastSyncedRevision();
    const cloudRev = cloud.syncMeta?.revision;

    if (dirty && !cloudRev) {
      const local = await this.getGistsTabs();
      await this.enterConflict(local, cloud, result.etag, '云端为旧格式（无 revision），覆盖前需确认');
      return { ok: false, reason: 'conflict' };
    }

    if (dirty && this.revisionsConflict(cloudRev, lastSynced)) {
      const local = await this.getGistsTabs();
      await this.enterConflict(
        local,
        cloud,
        result.etag,
        lastSynced ? '检测到云端与本机 revision 不一致' : '本机无同步锚点且云端已有 revision，覆盖前需确认',
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

    await this.setSyncStatus(dirty ? 'pending' : 'synced');
    return { ok: true, reason: 'checked' };
  }

  /** 用户确认后从云端拉取覆盖本机 */
  async pullFromCloudConfirmed() {
    const open = await this.getCloudSync();
    if (!open) return { ok: false, reason: 'cloudSync off' };
    const token = await this.ensureToken();
    if (!token) return { ok: false, reason: 'no token' };

    const gistId = await this.ensureGistId(token);
    if (!gistId) return { ok: false, reason: 'no gistId' };

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
    return { ok: true };
  }

  async resolveConflictKeepLocal() {
    const state = await this.getSyncState();
    if (!state.conflict) return;
    // 用户明确覆盖云端：用冲突时的 cloudEtag 作 If-Match；清冲突后强制推
    await this.set(storageKeys.gistsTabs, state.conflict.local);
    if (state.conflict.cloudEtag) await this.setLastEtag(state.conflict.cloudEtag);
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
    const state = await this.getSyncState();
    if (!state.conflict) return;
    await this.setLegacyOverwriteConfirmed(false);
    await this.applyCloudData(state.conflict.cloud, state.conflict.cloudEtag, 'conflict-use-cloud');
  }

  async retrySync() {
    const state = await this.getSyncState();
    if (state.status === 'auth_failed') return;
    if (state.status === 'conflict') return;
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
    if (open) {
      await this.coldStartPull();
      const dirty = await this.getDirty();
      if (dirty) this.debouncePush(0);
    } else {
      if (this.syncGistsTimer) clearTimeout(this.syncGistsTimer);
      if (this.backoffTimer) clearTimeout(this.backoffTimer);
      await this.setSyncStatus('synced', { lastError: undefined, conflict: undefined, backoffUntil: undefined });
    }
  }

  async setGistsTabs(data: GistsTabs) {
    await this.set(storageKeys.gistsTabs, data);
    await this.setDirty(true);
    const open = await this.getCloudSync();
    if (!open) {
      await this.setSyncStatus('synced');
      return;
    }
    const state = await this.getSyncState();
    if (state.status === 'conflict' || state.status === 'auth_failed') {
      await this.setSyncStatus(state.status, { lastError: state.lastError, conflict: state.conflict });
      return;
    }
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

  /** 立即同步（手动）：走完整冲突检查的 push */
  async syncGists() {
    const open = await this.getCloudSync();
    if (!open) return;

    await this.setDirty(true);
    const state = await this.getSyncState();
    if (state.status === 'auth_failed') {
      // 手动仍提示鉴权，不假装可推
      return;
    }
    if (state.status === 'conflict') {
      return;
    }
    await this.setSyncStatus('pending', { backoffUntil: undefined });
    await this.pushToCloud();
  }
}

export default new Storage();
