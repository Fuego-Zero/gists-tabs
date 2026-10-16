import { useCallback, useSyncExternalStore } from 'react';
import type { StorageItemKey } from 'wxt/utils/storage';

import { commitSnapshot } from '@/storage/snapshotCache';

interface WatchedItem<T> {
  fallback: T;
  getValue: () => Promise<T | null>;
  key: StorageItemKey | string;
  watch: (cb: (value: T | null) => void) => () => void;
}

const snapshots = new Map<string, unknown>();

/**
 * 多个组件共用同一份同步缓存。getValue 是异步的，getSnapshot 只能返回缓存或 fallback。
 * fallback 必须是稳定引用，否则 useSyncExternalStore 会反复渲染。
 */
export function useStorageItem<T>(item: WatchedItem<T>, fallback: T): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let superseded = false;
      void item.getValue().then((value) => {
        const next = value ?? fallback;
        if (commitSnapshot(snapshots, item.key, next, superseded)) {onStoreChange();}
      });
      return item.watch((value) => {
        superseded = true;
        snapshots.set(item.key, value ?? fallback);
        onStoreChange();
      });
    },
    [fallback, item],
  );

  const getSnapshot = useCallback(() => {
    if (snapshots.has(item.key)) {return snapshots.get(item.key) as T;}

    return fallback;
  }, [fallback, item.key]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
