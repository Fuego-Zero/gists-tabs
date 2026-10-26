import type { GistsTabs } from '@/types';

/** 冲突判定只比相等/不等，不做大小比较 */
export interface SyncMeta {
  deviceId: string;
  revision: string;
  updateAt: number;
}

export type SyncStatus = 'auth_failed' | 'conflict' | 'failed' | 'pending' | 'rate_limited' | 'synced' | 'syncing';

export interface SyncConflictPayload {
  cloud: GistsTabs;
  cloudEtag: null | string;
  local: GistsTabs;
}

export interface SyncState {
  backoffUntil?: number;
  conflict?: SyncConflictPayload;
  /** 连续自动重试失败的次数。成功、关闭同步或鉴权失败后清零。 */
  failureCount?: number;
  lastError?: string;
  lastPullAt?: number;
  lastPushAt?: number;
  status: SyncStatus;
}

export interface SyncSnapshot {
  at: number;
  data: GistsTabs;
  id: string;
  reason: string;
}

export const PULL_THROTTLE_MS = 5 * 60 * 1000;
export const PUSH_DEBOUNCE_MS = 3000;
export const SNAPSHOT_RING_SIZE = 5;
export const BACKOFF_CAP_MS = 10 * 60 * 1000;
export const BACKOFF_BASE_MS = 5000;
