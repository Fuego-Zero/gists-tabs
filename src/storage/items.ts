import { storage } from 'wxt/utils/storage';

import type { GistsTabs } from '@/types';
import type { SyncSnapshot, SyncState } from '@/types/sync';

/** `local:` 只选择存储区，Chrome 里的键名仍是冒号后面的部分。不传 migrations，避免改写已有值。 */
export const activePageIdItem = storage.defineItem<string>('local:activePageId');
export const autoSyncItem = storage.defineItem<boolean>('local:autoSync');
export const autoSyncIntervalItem = storage.defineItem<number>('local:autoSyncInterval');
export const cloudSyncItem = storage.defineItem<boolean>('local:cloudSync');
export const deviceIdItem = storage.defineItem<string>('local:deviceId');
export const syncDirtyItem = storage.defineItem<boolean>('local:syncDirty');
export const gistIdItem = storage.defineItem<string>('local:gistId');
export const gistsTabsItem = storage.defineItem<GistsTabs>('local:gistsTabs');
export const gistsTokenItem = storage.defineItem<string>('local:gistsToken');
export const lastEtagItem = storage.defineItem<string>('local:lastEtag');
export const lastSyncedHashItem = storage.defineItem<string>('local:lastSyncedHash');
export const lastSyncedRevisionItem = storage.defineItem<string>('local:lastSyncedRevision');
export const legacyOverwriteConfirmedItem = storage.defineItem<boolean>('local:legacyOverwriteConfirmed');
export const syncSnapshotsItem = storage.defineItem<SyncSnapshot[]>('local:syncSnapshots');
export const syncStateItem = storage.defineItem<SyncState>('local:syncState');
export const themeItem = storage.defineItem<'dark' | 'light'>('local:theme', { fallback: 'light' });
export const localeItem = storage.defineItem<'en' | 'zh_CN'>('local:locale', { fallback: 'zh_CN' });

export const storageItems = {
  activePageId: activePageIdItem,
  autoSync: autoSyncItem,
  autoSyncInterval: autoSyncIntervalItem,
  cloudSync: cloudSyncItem,
  deviceId: deviceIdItem,
  syncDirty: syncDirtyItem,
  gistId: gistIdItem,
  gistsTabs: gistsTabsItem,
  gistsToken: gistsTokenItem,
  lastEtag: lastEtagItem,
  lastSyncedHash: lastSyncedHashItem,
  lastSyncedRevision: lastSyncedRevisionItem,
  legacyOverwriteConfirmed: legacyOverwriteConfirmedItem,
  syncSnapshots: syncSnapshotsItem,
  syncState: syncStateItem,
} as const;

export type StorageItemKey = keyof typeof storageItems;
