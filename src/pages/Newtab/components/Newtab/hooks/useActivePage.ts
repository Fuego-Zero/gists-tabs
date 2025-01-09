import { useCallback, useEffect, useState } from 'react';

import Storage from '@/classes/Storage';

import type { GistsTabs } from '@/types';

export default function useActivePage(
  gistTabs: GistsTabs,
): [activePageId: string, setActivePageId: (id: string) => void] {
  const [activePageId, setActivePageId] = useState('');

  useEffect(() => {
    Storage.getActivePageId().then((data) => {
      setActivePageId(data);
    });
  }, []);

  const setActivePageIdHandler = useCallback((id: string) => {
    setActivePageId(id);
    Storage.setActivePageId(id);
  }, []);

  useEffect(() => {
    //* 用于处理当前激活的页面被删除的情况
    (async () => {
      if (gistTabs.pages.length === 0) return;
      if (gistTabs.pages.find((page) => page.id === activePageId)) return;
      setActivePageId(gistTabs.pages[0].id);
    })();
  }, [activePageId, gistTabs]);

  return [activePageId, setActivePageIdHandler];
}
