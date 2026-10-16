import { useStorageItem } from '@/hooks/useStorageItem';
import { syncStateItem } from '@/storage/items';
import type { SyncState } from '@/types/sync';

const DEFAULT_STATE: SyncState = { status: 'synced' };

export default function useSyncState(): SyncState {
  return useStorageItem(syncStateItem, DEFAULT_STATE) ?? DEFAULT_STATE;
}
