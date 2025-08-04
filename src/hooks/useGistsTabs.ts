import { useCallback, useEffect, useState } from 'react';

import Storage from '@/classes/Storage';
import { clone } from '@/utils';
import { createPage } from '@/utils/data/factory';
import { upgradeGistsTabsToV1 } from '@/utils/data/upgrade';

import type { GistsTabs } from '@/types';

const VERSION = 1;

export default function useGistsTabs(): [gistsTabs: GistsTabs, setGistsTabs: (data: GistsTabs) => void] {
  const [gistsTabs, setGistsTabs] = useState<GistsTabs>({
    pages: [],
    updateAt: -1,
    version: VERSION,
  });

  const setGistsTabsHandler = useCallback((data: GistsTabs) => {
    data.updateAt = Date.now();
    setGistsTabs(clone(data));
    Storage.setGistsTabs(data);
  }, []);

  useEffect(() => {
    (async () => {
      let data = await Storage.getGistsTabs();

      //* 如果没有数据，就需要走初始化数据流程
      if (!data) {
        console.log('初始化数据流程');

        data = {
          pages: [createPage('首页')],
          updateAt: Date.now(),
          version: VERSION,
        };

        await Storage.setGistsTabs(data);
      }

      if (data.version === VERSION) return setGistsTabs(data);

      data = upgradeGistsTabsToV1(data);
      setGistsTabsHandler(data);
    })();
  }, [setGistsTabsHandler]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    (async function sync() {
      const autoSync = await Storage.getAutoSync();
      if (autoSync) await Storage.syncGists();

      const syncInterval = await Storage.getAutoSyncInterval();
      timer = setTimeout(sync, syncInterval * 1000);
    })();

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let lastData: GistsTabs | undefined;

    (async function sync() {
      const data = await Storage.getGistsTabs();

      if (data && data.updateAt !== lastData?.updateAt) {
        lastData = data;
        setGistsTabs(data);
      }

      timer = setTimeout(sync, 200);
    })();

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return [gistsTabs, setGistsTabsHandler];
}
