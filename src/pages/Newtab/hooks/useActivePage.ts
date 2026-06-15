import { useCallback, useEffect, useState } from 'react';

import Storage from '@/classes/Storage';

import type { GistsTabs } from '@/types';

export default function useActivePage(
  gistTabs: GistsTabs,
): [activePageId: string, setActivePageId: (id: string) => void] {
  const [activePageId, setActivePageId] = useState('');

  useEffect(() => {
    // active page 独立持久化，刷新新标签页后保持用户上次所在页面。
    Storage.getActivePageId().then((data) => {
      setActivePageId(data);
    });
  }, []);

  const setActivePageIdHandler = useCallback((id: string) => {
    setActivePageId(id);
    Storage.setActivePageId(id);
  }, []);

  useEffect(() => {
    //* 当前激活页面被删除时，自动回退到第一个页面，避免内容区空白。
    (async () => {
      if (gistTabs.pages.length === 0) return;
      if (gistTabs.pages.find((page) => page.id === activePageId)) return;
      setActivePageId(gistTabs.pages[0].id);
    })();
  }, [activePageId, gistTabs]);

  return [activePageId, setActivePageIdHandler];
}
