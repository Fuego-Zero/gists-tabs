import { useCallback, useEffect, useState } from 'react';

import Storage from '@/classes/Storage';
import { clone } from '@/utils';
import { createPage } from '@/utils/dataFactory';

import type { GistsTabs } from '@/types';

export default function useGistTabs(): [gistsTabs: GistsTabs, setGistsTabs: (data: GistsTabs) => void] {
  const [gistsTabs, setGistsTabs] = useState<GistsTabs>({
    pages: [],
    updateAt: -1,
  });

  useEffect(() => {
    (async () => {
      let data = await Storage.getGistsTabs();

      //* 如果没有数据，就需要走初始化数据流程
      if (!data) {
        console.log('初始化数据流程');

        data = {
          pages: [createPage('首页')],
          updateAt: Date.now(),
        };

        await Storage.setGistsTabs(data);
      }

      setGistsTabs(data);
    })();
  }, []);

  const setGistsTabsHandler = useCallback((data: GistsTabs) => {
    data.updateAt = Date.now();
    setGistsTabs(clone(data));
    Storage.setGistsTabs(data);
  }, []);

  return [gistsTabs, setGistsTabsHandler];
}
