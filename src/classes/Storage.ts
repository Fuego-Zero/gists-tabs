import { GISTS_FILE_DESCRIPTION } from '@/config';
import { formatLastError, RATE_LIMIT_ERROR_PREFIX, t } from '@/i18n/translate';
import { sendMessage, type SyncCommandResult } from '@/messaging';
import { isInitialCanvas } from '@/storage/initialCanvas';
import { storageItems } from '@/storage/items';
import { nextRetryDelayMs } from '@/storage/retryDelay';
import { canvasHash, canvasKey, decidePull, decidePush, decideVerify, type PushDecision } from '@/storage/syncRules';
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
import { upgradeGistsTabsToV1 } from '@/utils/data/upgrade';
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
  lastSyncedHash = 'lastSyncedHash',
  lastSyncedRevision = 'lastSyncedRevision',
  legacyOverwriteConfirmed = 'legacyOverwriteConfirmed',
  syncSnapshots = 'syncSnapshots',
  syncState = 'syncState',
}

const PUSH_ALARM = 'yunjian-push';
const BACKOFF_ALARM = 'yunjian-backoff';
const CANVAS_VERSION = 1;

interface CloudRead {
  data: GistsTabs;
  etag: null | string;
  gistId: string;
}

/** 云端有用户内容：不是空画布，也不是自动生成的空首页。 */
function hasUserContent(data: GistsTabs): boolean {
  return data.pages.length > 0 && !isInitialCanvas(data);
}

function sameCanvas(a: GistsTabs | undefined, b: GistsTabs | undefined): boolean {
  if (!a || !b) {return a === b;}

  return canvasKey(a) === canvasKey(b);
}

function conflictMessage(reason: Extract<PushDecision, { kind: 'conflict' }>['reason']): string {
  if (reason === 'legacy') {return t('errLegacy');}

  if (reason === 'no-anchor') {return t('errNoAnchor');}

  return t('errRevision');
}

class Storage {
  private autoSyncQueued: Promise<void> | null = null;
  private engineActive = false;
  /** 后台所有同步操作排在这一条链上，同一时间只跑一个。 */
  private queue: Promise<unknown> = Promise.resolve();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** 只由 Background 调用。页面导入本模块不会冷启动。 */
  startEngine() {
    if (this.engineActive) {return;}

    this.engineActive = true;
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name !== PUSH_ALARM && alarm.name !== BACKOFF_ALARM) {return;}

      this.clearTimer(alarm.name);
      void this.requestAutoSync();
    });
    void this.exclusive(() => this.coldStart());
  }

  /** 页面编辑后调用。状态在队列里改，避免覆盖正在进行的同步写下的冲突等状态。 */
  schedulePushFromEngine(delay = PUSH_DEBOUNCE_MS) {
    this.scheduleDelayed(PUSH_ALARM, delay);
    void this.exclusive(() => this.markPending());
  }

  coldStartFromEngine() {
    return this.exclusive(() => this.coldStart());
  }

  stopSyncFromEngine() {
    return this.exclusive(async () => {
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
    });
  }

  tokenChangedFromEngine() {
    return this.exclusive(async () => {
      const state = await this.getSyncState();
      if (state.status !== 'auth_failed') {return;}

      await this.setSyncStatus('pending', { lastError: undefined });
      await this.autoSync();
    });
  }

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.catch((error: unknown) => {
      console.error('sync task error:', error);
    });
    return run;
  }

  /** 定时器、闹钟和退避都走这里；已排队还没开始的自动同步只保留一个。 */
  private requestAutoSync(): Promise<void> {
    if (!this.autoSyncQueued) {
      this.autoSyncQueued = this.exclusive(async () => {
        this.autoSyncQueued = null;
        await this.autoSync();
      });
    }

    return this.autoSyncQueued;
  }

  /**
   * 后台还在时用定时器按原延迟触发；同时预约闹钟，进程被回收后由闹钟唤醒。
   * 两路都到点时由 requestAutoSync 合并，后到的一路只会看到已同步的本机。
   */
  private scheduleDelayed(name: string, delayMs: number) {
    const delay = Math.max(0, delayMs);
    this.clearTimer(name);
    void chrome.alarms.create(name, { when: Date.now() + delay });
    this.timers.set(name, setTimeout(() => {
      this.timers.delete(name);
      void chrome.alarms.clear(name).then(() => this.requestAutoSync());
    }, delay));
  }

  private clearTimer(name: string) {
    const timer = this.timers.get(name);
    if (timer) {clearTimeout(timer);}

    this.timers.delete(name);
  }

  private scheduleBackoffResume(delayMs: number) {
    if (!this.engineActive) {return;}

    this.scheduleDelayed(BACKOFF_ALARM, delayMs);
  }

  private async markPending() {
    if (!(await this.getCloudSync())) {return;}

    const state = await this.getSyncState();
    if (this.isAutoSyncPaused(state) || this.inAutomaticBackoff(state) || state.status === 'pending') {return;}

    await this.setSyncStatus('pending');
  }

  private async coldStart() {
    await this.migrate();
    await this.autoSync();
  }

  /**
   * 一次性迁移，启动时执行，可重复执行。
   * - 停在内容相同的冲突上（同一份数据被推了两次）：认领云端 revision 并解除冲突。
   * - 有锚点、没有基线哈希、本机不脏：用当前画布补上基线哈希。
   */
  private async migrate() {
    const state = await this.getSyncState();
    const { conflict } = state;
    if (state.status === 'conflict' && conflict && sameCanvas(conflict.local, conflict.cloud)) {
      await this.setBase(conflict.cloud.syncMeta?.revision ?? null, await canvasHash(conflict.cloud));
      await this.settle();
      return;
    }

    if (await this.getLastSyncedHash()) {return;}

    const anchor = await this.getLastSyncedRevision();
    const local = await this.getGistsTabs();
    if (!anchor || !local || (await this.getDirty())) {return;}

    await this.setBase(anchor, await canvasHash(local));
  }

  private async autoSync() {
    if (!(await this.getCloudSync())) {return;}

    const state = await this.getSyncState();
    if (this.isAutoSyncPaused(state)) {return;}

    if (this.inAutomaticBackoff(state)) {
      this.scheduleBackoffResume((state.backoffUntil ?? Date.now()) - Date.now());
      return;
    }

    await this.syncOnce(false);
  }

  /** 本机有未同步的修改就推，否则拉。force 时拉取不受节流与 ETag 限制。 */
  private async syncOnce(force: boolean) {
    const local = await this.getGistsTabs();
    const changed = local ? await this.hasLocalChanges(local) : false;
    const token = await this.ensureToken();
    if (!token) {
      if (changed) {await this.setSyncStatus('failed', { lastError: t('errNoToken') });}

      return;
    }

    if (changed) {await this.push(token);}
    else {await this.pull(token, force);}
  }

  /** 有基线哈希时以内容为准，脏标记只在没有基线时作参考。 */
  private async hasLocalChanges(local: GistsTabs): Promise<boolean> {
    const baseHash = await this.getLastSyncedHash();
    if (!baseHash) {return this.getDirty();}

    return (await canvasHash(local)) !== baseHash;
  }

  private async push(token: string) {
    await this.setSyncStatus('syncing');
    // 推前必须拿到最新正文，不用 ETag 的 304 短路。
    const remote = await this.fetchCloud(token);
    if (!remote || remote === 'not_modified') {return;}

    const local = await this.getGistsTabs();
    if (!local) {
      await this.settle();
      return;
    }

    const cloud = remote.data;
    const cloudRevision = cloud.syncMeta?.revision ?? null;
    const [localHash, cloudHash] = await Promise.all([canvasHash(local), canvasHash(cloud)]);
    const anchor = await this.getLastSyncedRevision();
    if (cloudRevision && cloudRevision === anchor) {await this.setBase(anchor, cloudHash);}

    const decision = decidePush({
      anchor,
      baseHash: await this.getLastSyncedHash(),
      cloudHash,
      cloudHasContent: hasUserContent(cloud),
      cloudRevision,
      legacyConfirmed: await this.getLegacyOverwriteConfirmed(),
      localHash,
      localIsInitial: isInitialCanvas(local),
    });

    if (decision.kind === 'use-cloud') {
      await this.applyCloud(cloud, cloudHash, local, 'pull-init');
      return;
    }

    if (decision.kind === 'adopt') {
      await this.setBase(cloudRevision, cloudHash);
      await this.settle();
      return;
    }

    if (decision.kind === 'conflict') {
      await this.enterConflict(local, cloud, remote.etag, conflictMessage(decision.reason));
      return;
    }

    await this.pushSnapshot(local, 'pre-push');
    const revision = uuid();
    const payload: GistsTabs = {
      ...local,
      syncMeta: { deviceId: await this.getOrCreateDeviceId(), revision, updateAt: local.updateAt },
    };
    const patched = await githubPatchGist(token, remote.gistId, payload);
    if (patched.errorKind !== 'ok') {
      await this.handleRequestFailure(patched, 'PATCH');
      return;
    }

    let anchorRevision = revision;
    let etag = patched.etag;
    const verify = await githubGetGist(token, remote.gistId);
    if (verify.errorKind === 'ok' && verify.data) {
      const verifyRevision = verify.data.syncMeta?.revision ?? null;
      const verifyHash = await canvasHash(verify.data);
      const result = decideVerify({
        cloudHash: verifyHash,
        cloudRevision: verifyRevision,
        previousRevision: cloudRevision,
        pushedHash: localHash,
        pushedRevision: revision,
      });
      if (result === 'conflict') {
        await this.setBase(revision, localHash);
        await this.enterConflict(local, verify.data, verify.etag, t('errRevision'));
        return;
      }

      if (result === 'adopt' && verifyRevision) {anchorRevision = verifyRevision;}

      if (verifyRevision === anchorRevision) {etag = verify.etag ?? etag;}
    }

    // 只更新锚点与基线，不回写本机画布：推送期间的新编辑由 settle 发现并再推一次。
    await this.setBase(anchorRevision, localHash);
    await this.setLastEtag(etag);
    await this.settle({ lastPushAt: Date.now() });
  }

  private async pull(token: string, force: boolean) {
    const state = await this.getSyncState();
    if (!force && state.lastPullAt && Date.now() - state.lastPullAt < PULL_THROTTLE_MS) {
      await this.settle();
      return;
    }

    // 自动拉取随每次打开新标签页发生，不切到「同步中」，避免状态提示反复弹出。
    if (force) {await this.setSyncStatus('syncing');}

    const local = await this.getGistsTabs();
    const remote = await this.fetchCloud(token, force ? null : await this.getLastEtag());
    if (!remote) {return;}

    if (remote === 'not_modified') {
      await this.settle({ lastPullAt: Date.now() });
      return;
    }

    const cloud = remote.data;
    const cloudRevision = cloud.syncMeta?.revision ?? null;
    const cloudHash = await canvasHash(cloud);
    const anchor = await this.getLastSyncedRevision();
    if (cloudRevision && cloudRevision === anchor) {await this.setBase(anchor, cloudHash);}

    const decision = decidePull({
      anchor,
      cloudHash,
      cloudHasContent: hasUserContent(cloud),
      cloudRevision,
      localHash: local ? await canvasHash(local) : '',
    });
    if (decision === 'apply') {
      await this.applyCloud(cloud, cloudHash, local, 'pull');
      return;
    }

    if (decision === 'adopt') {await this.setBase(cloudRevision, cloudHash);}

    await this.settle({ lastPullAt: Date.now() });
  }

  /**
   * 用云端覆盖本机。expected 是做决定时读到的本机；写入前本机已经变了就放弃，
   * 交给下一次推送按三方比较处理。
   */
  private async applyCloud(cloud: GistsTabs, cloudHash: string, expected: GistsTabs | undefined, reason: string) {
    const current = await this.getGistsTabs();
    if (!sameCanvas(current, expected)) {
      await this.setSyncStatus('pending');
      this.scheduleDelayed(PUSH_ALARM, PUSH_DEBOUNCE_MS);
      return false;
    }

    await this.pushSnapshot(current, reason);
    const upgraded = cloud.version === CANVAS_VERSION ? cloud : upgradeGistsTabsToV1(cloud);
    // 本机画布不存 syncMeta，同步位置只看锚点与基线。
    await this.set(storageKeys.gistsTabs, {
      pages: upgraded.pages,
      updateAt: upgraded.updateAt,
      version: upgraded.version,
    } satisfies GistsTabs);
    await this.setBase(cloud.syncMeta?.revision ?? null, cloudHash);
    await this.settle({ lastPullAt: Date.now() });
    return true;
  }

  /**
   * 锚点确定后收尾。本机仍等于基线就清脏、标记已同步；
   * 期间又改过就保持脏并再推一次。
   */
  private async settle(extra: Partial<SyncState> = {}) {
    const local = await this.getGistsTabs();
    const changed = local ? await this.hasLocalChanges(local) : false;
    const cleared: Partial<SyncState> = {
      backoffUntil: undefined,
      conflict: undefined,
      failureCount: 0,
      lastError: undefined,
      ...extra,
    };
    if (!changed) {
      await this.setDirty(false);
      await this.setLegacyOverwriteConfirmed(false);
      await this.setSyncStatus('synced', cleared);
      return;
    }

    await this.setDirty(true);
    await this.setSyncStatus('pending', cleared);
    this.scheduleDelayed(PUSH_ALARM, PUSH_DEBOUNCE_MS);
  }

  /** 读取云端。Gist 404（换账号或被删）时清掉记录重新查找一次。失败时已写好状态并返回 null。 */
  private async fetchCloud(token: string, etag: null | string = null): Promise<CloudRead | 'not_modified' | null> {
    let ifNoneMatch = etag;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const gistId = await this.ensureGistId(token);
      if (!gistId) {return null;}

      const got = await githubGetGist(token, gistId, { etag: ifNoneMatch });
      if (got.errorKind === 'not_found' && attempt === 0) {
        await this.setGistId(null);
        await this.setLastEtag(null);
        ifNoneMatch = null;
        continue;
      }

      if (got.errorKind === 'not_modified') {return 'not_modified';}

      if (got.errorKind === 'ok' && got.data) {
        if (got.etag) {await this.setLastEtag(got.etag);}

        return { data: got.data, etag: got.etag, gistId };
      }

      await this.handleRequestFailure(got, 'GET');
      return null;
    }

    return null;
  }

  private async ensureGistId(token: string): Promise<null | string> {
    const id = await this.getGistId();
    if (id) {return id;}

    const listed = await githubListGists(token);
    if (listed.errorKind !== 'ok' || !listed.data) {
      await this.handleRequestFailure(listed, 'list gists');
      return null;
    }

    const found = listed.data.find((item) => item.description === GISTS_FILE_DESCRIPTION);
    if (found) {
      await this.setGistId(found.id);
      return found.id;
    }

    const local = (await this.getGistsTabs()) ?? { pages: [], updateAt: Date.now(), version: CANVAS_VERSION };
    const revision = uuid();
    const payload: GistsTabs = {
      ...local,
      syncMeta: { deviceId: await this.getOrCreateDeviceId(), revision, updateAt: local.updateAt },
    };
    const created = await githubCreateGist(token, payload);
    if (created.errorKind !== 'ok' || !created.data) {
      await this.handleRequestFailure(created, 'create gist');
      return null;
    }

    await this.setGistId(created.data.id);
    if (created.etag) {await this.setLastEtag(created.etag);}

    // 新建的 Gist 就是本机内容；调用方随后 GET 时按「内容相同」认领并收尾。
    await this.setBase(revision, await canvasHash(local));
    return created.data.id;
  }

  private async ensureToken(): Promise<null | string> {
    const token = await this.getGistsToken();
    return token || null;
  }

  private async enterConflict(local: GistsTabs, cloud: GistsTabs, cloudEtag: null | string, reason: string) {
    await this.pushSnapshot(local, 'conflict-local');
    await this.pushSnapshot(cloud, 'conflict-cloud');
    const anchor = await this.getLastSyncedRevision();
    // 本机画布不存 syncMeta；弹窗与导出里的本机 revision 显示本机所基于的云端版本。
    const localView: GistsTabs = {
      ...local,
      syncMeta: anchor ? { deviceId: await this.getOrCreateDeviceId(), revision: anchor, updateAt: local.updateAt } : undefined,
    };
    await this.setDirty(true);
    await this.setSyncStatus('conflict', {
      conflict: { cloud: clone(cloud), cloudEtag, local: clone(localView) },
      lastError: reason,
    });
  }

  private async keepLocal(): Promise<SyncCommandResult> {
    const state = await this.getSyncState();
    const { conflict } = state;
    if (state.status !== 'conflict' || !conflict) {return this.commandResult();}

    // 以冲突时的云端为基线推当前本机（含冲突期间的编辑）；云端此后又变会再次冲突。
    const cloudRevision = conflict.cloud.syncMeta?.revision ?? null;
    await this.setBase(cloudRevision, await canvasHash(conflict.cloud));
    if (!cloudRevision) {await this.setLegacyOverwriteConfirmed(true);}

    await this.setDirty(true);
    await this.setSyncStatus('pending', {
      backoffUntil: undefined,
      conflict: undefined,
      failureCount: 0,
      lastError: undefined,
    });
    await this.syncOnce(true);
    return this.commandResult();
  }

  /** 用户确认后用最新云端覆盖本机。 */
  private async pullConfirmed(reason: string): Promise<SyncCommandResult> {
    if (!(await this.getCloudSync())) {return { ok: false, reason: 'cloudSync off' };}

    const token = await this.ensureToken();
    if (!token) {return { ok: false, reason: t('errNoToken') };}

    await this.setSyncStatus('syncing');
    const local = await this.getGistsTabs();
    const remote = await this.fetchCloud(token);
    if (!remote || remote === 'not_modified') {return this.commandResult();}

    const applied = await this.applyCloud(remote.data, await canvasHash(remote.data), local, reason);
    if (!applied) {return { ok: false, reason: t('errLocalChanged') };}

    return this.commandResult();
  }

  private async commandResult(): Promise<SyncCommandResult> {
    const state = await this.getSyncState();
    // pending 表示同步期间本机又改过，已经排好下一次推送。
    if (state.status === 'synced' || state.status === 'pending') {return { ok: true };}

    return { ok: false, reason: formatLastError(state.lastError) || state.status };
  }

  private async handleRequestFailure(result: GitHubResult<unknown>, label: string) {
    if (result.errorKind === 'auth') {
      await this.handleAuthFailure(result.message);
      return;
    }

    if (result.errorKind === 'rate_limit') {
      await this.handleRateLimit(result);
      return;
    }

    if (result.errorKind === 'invalid') {
      await this.handleTransientFailure(result.message === 'truncated' ? t('errCloudTooLarge') : t('errCloudInvalid'));
      return;
    }

    await this.handleTransientFailure(result.message || `${label} HTTP ${result.status}`);
  }

  private async handleAuthFailure(message?: string) {
    this.clearTimer(BACKOFF_ALARM);
    await chrome.alarms.clear(BACKOFF_ALARM);
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
    await this.setSyncStatus('failed', {
      backoffUntil: Date.now() + delay,
      failureCount: failureCount + 1,
      lastError: message || t('errSync'),
    });
    this.scheduleBackoffResume(delay);
  }

  /** 自动同步在失败或限流窗口内必须停住。手动同步会先清掉这个窗口。 */
  private inAutomaticBackoff(state: SyncState): boolean {
    return (state.status === 'failed' || state.status === 'rate_limited')
      && Boolean(state.backoffUntil && Date.now() < state.backoffUntil);
  }

  private isAutoSyncPaused(state: SyncState): boolean {
    return state.status === 'conflict' || state.status === 'auth_failed';
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
    return res[storageKeys.gistId] || '';
  }

  private async getLastEtag(): Promise<null | string> {
    const res = await this.get(storageKeys.lastEtag);
    return res[storageKeys.lastEtag] || null;
  }

  private async getLastSyncedHash(): Promise<null | string> {
    const res = await this.get(storageKeys.lastSyncedHash);
    return res[storageKeys.lastSyncedHash] || null;
  }

  private async getLastSyncedRevision(): Promise<null | string> {
    const res = await this.get(storageKeys.lastSyncedRevision);
    return res[storageKeys.lastSyncedRevision] || null;
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

  private async set(key: storageKeys, value: unknown): Promise<void> {
    const item = storageItems[key];
    if (value == null) {
      await item.removeValue();
      return;
    }

    await item.setValue(value as never);
  }

  /** 锚点是本机所基于的云端 revision，基线哈希是那一版画布的内容。两者总是一起改。 */
  private async setBase(revision: null | string, hash: string) {
    await this.set(storageKeys.lastSyncedRevision, revision);
    await this.set(storageKeys.lastSyncedHash, hash);
  }

  private async setDirty(dirty: boolean) {
    return this.set(storageKeys.dirty, dirty);
  }

  private async setGistId(id: null | string) {
    return this.set(storageKeys.gistId, id);
  }

  private async setLastEtag(etag: null | string) {
    return this.set(storageKeys.lastEtag, etag);
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
    return res[storageKeys.syncSnapshots] || [];
  }

  async getSyncState(): Promise<SyncState> {
    const res = await this.get(storageKeys.syncState);
    const state = res[storageKeys.syncState];
    return state ?? { status: 'synced' };
  }

  /** 用户确认后从云端拉取覆盖本机 */
  async pullFromCloudConfirmed(): Promise<SyncCommandResult> {
    if (!this.engineActive) {return sendMessage('pullFromCloud');}

    return this.exclusive(() => this.pullConfirmed('manual-pull'));
  }

  async resolveConflictKeepLocal(): Promise<SyncCommandResult> {
    if (!this.engineActive) {return sendMessage('resolveConflict', 'keepLocal');}

    return this.exclusive(() => this.keepLocal());
  }

  async resolveConflictUseCloud(): Promise<SyncCommandResult> {
    if (!this.engineActive) {return sendMessage('resolveConflict', 'useCloud');}

    return this.exclusive(() => this.pullConfirmed('conflict-use-cloud'));
  }

  async retrySync(): Promise<SyncCommandResult> {
    if (!this.engineActive) {return sendMessage('retrySync');}

    return this.exclusive(async () => {
      if (!(await this.getCloudSync())) {return { ok: false, reason: 'cloudSync off' };}

      const state = await this.getSyncState();
      if (this.isAutoSyncPaused(state)) {return this.commandResult();}

      await this.patchSyncState({ backoffUntil: undefined, lastError: undefined });
      await this.syncOnce(true);
      return this.commandResult();
    });
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
   * 页面的编辑写入：只写画布和脏标记，然后等后台收到推送通知。
   * 同步状态、锚点与基线只由后台写。
   */
  async setGistsTabs(data: GistsTabs) {
    await this.set(storageKeys.gistsTabs, data);
    await this.setDirty(true);
    if (this.engineActive) {
      this.schedulePushFromEngine();
      return;
    }

    try {
      await sendMessage('schedulePush', PUSH_DEBOUNCE_MS);
    } catch (error) {
      // 画布已经写入；后台下次启动会按基线哈希发现这次修改并推送。
      console.error('schedulePush 通知发送失败', error);
    }
  }

  async setGistsToken(token: string) {
    await this.set(storageKeys.gistsToken, token);
    if (this.engineActive) {
      await this.tokenChangedFromEngine();
      return;
    }

    await sendMessage('tokenChanged');
  }

  /**
   * 立即同步（手动）：本机有修改就推，没有就拉最新云端，不受节流限制。
   * 旧格式云端视为用户已确认覆盖一次。
   */
  async syncGists(): Promise<SyncCommandResult> {
    if (!this.engineActive) {return sendMessage('syncNow');}

    return this.exclusive(async () => {
      if (!(await this.getCloudSync())) {return { ok: false, reason: 'cloudSync off' };}

      const state = await this.getSyncState();
      if (state.status === 'auth_failed') {return this.commandResult();}

      if (state.status === 'conflict') {
        if (state.conflict && !state.conflict.cloud.syncMeta?.revision) {return this.keepLocal();}

        return this.commandResult();
      }

      // 手动同步是唯一可以提前结束退避的入口。
      await this.patchSyncState({ backoffUntil: undefined, failureCount: 0, lastError: undefined });
      await this.setLegacyOverwriteConfirmed(true);
      await this.syncOnce(true);
      return this.commandResult();
    });
  }
}

export default new Storage();
