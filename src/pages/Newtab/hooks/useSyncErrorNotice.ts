import { useEffect, useRef } from 'react';

import { syncStateItem } from '@/storage/items';
import type { SyncState } from '@/types/sync';
import { SYNC_NOTICE_KEY, syncErrorContent, syncErrorSignature, type SyncNoticeApi } from '@/utils/syncNotice';

type NoticeApi = Pick<SyncNoticeApi, 'error'>;

/**
 * 自动同步出错时提醒一次。打开页面时已经存在的错误不弹；
 * 同一个错误重复出现不弹；恢复为已同步之后再出错会重新提醒。
 */
export function useSyncErrorNotice(message: NoticeApi) {
  const messageRef = useRef(message);
  messageRef.current = message;

  useEffect(() => {
    let disposed = false;
    let baselineReady = false;
    let noticed: null | string = null;
    let queued: SyncState | null | undefined;

    const consider = (state: SyncState | null) => {
      if (state?.status === 'synced') {
        noticed = null;
        return;
      }

      const signature = syncErrorSignature(state);
      if (!signature || signature === noticed || !state) {return;}

      noticed = signature;
      const content = syncErrorContent(state);
      if (!content) {return;}

      messageRef.current.error({ content, key: SYNC_NOTICE_KEY });
    };

    const stop = syncStateItem.watch((value) => {
      if (!baselineReady) {
        queued = value;
        return;
      }

      consider(value);
    });

    void syncStateItem.getValue().then((value) => {
      if (disposed) {return;}

      baselineReady = true;
      noticed = syncErrorSignature(value);
      if (queued !== undefined && syncErrorSignature(queued) !== noticed) {
        consider(queued);
      }
    });

    return () => {
      disposed = true;
      stop();
    };
  }, []);
}
