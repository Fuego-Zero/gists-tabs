import { useEffect, useState } from 'react';

import Storage from '@/classes/Storage';

import type { SyncState } from '@/types/sync';

const DEFAULT_STATE: SyncState = { status: 'synced' };

export default function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>(DEFAULT_STATE);

  useEffect(() => {
    Storage.getSyncState().then(setState);

    const onChanged: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== 'local') return;
      if (!changes.syncState) return;
      setState((changes.syncState.newValue as SyncState) || DEFAULT_STATE);
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  return state;
}
