import { useCallback } from 'react';

import { createPage } from '@/utils/data/factory';

import type { GistsTabs, Page } from '@/types';

import type { PageId, PagesHandler } from '../types';

export default function usePagesHandler(gistsTabs: GistsTabs, setGistsTabs: (data: GistsTabs) => void): PagesHandler {
  const addPage = useCallback(() => {
    // 页面名称用当前数量做后缀，保持新建行为轻量，不额外弹窗命名。
    gistsTabs.pages.push(createPage(`新页面 ${gistsTabs.pages.length}`));
    setGistsTabs({ ...gistsTabs });
  }, [gistsTabs, setGistsTabs]);

  const delPage = useCallback(
    (pageId: PageId) => {
      gistsTabs.pages = gistsTabs.pages.filter(({ id }) => id !== pageId);
      setGistsTabs(gistsTabs);
    },
    [gistsTabs, setGistsTabs],
  );

  const editPage = useCallback(
    (pageId: PageId, name: Page['name']) => {
      const source = gistsTabs.pages.find(({ id }) => id === pageId);
      if (!source) return;

      source.name = name;
      setGistsTabs(gistsTabs);
    },
    [gistsTabs, setGistsTabs],
  );

  const copyPage = useCallback(
    (pageId: PageId) => {
      const source = gistsTabs.pages.find(({ id }) => id === pageId);
      if (!source) return;

      const { name, widgets } = source;
      // createPage 内部会重新生成页面和 widget id，复制页不会和源页面共享身份。
      const target = createPage(`${name} 的复制`, widgets);
      gistsTabs.pages.push(target);

      setGistsTabs(gistsTabs);
    },
    [gistsTabs, setGistsTabs],
  );

  return { addPage, delPage, editPage, copyPage };
}
