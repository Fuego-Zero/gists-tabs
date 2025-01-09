import { useCallback } from 'react';

import { createPage } from '@/utils/dataFactory';

import type { GistsTabs, Page } from '@/types';

type PageId = Page['id'];

export type PagesHandler = {
  addPage: () => void;
  copyPage: (pageId: PageId) => void;
  delPage: (pageId: PageId) => void;
  editPage: (pageId: PageId, name: PageId) => void;
};

export default function usePagesHandler(gistsTabs: GistsTabs, setGistsTabs: (data: GistsTabs) => void): PagesHandler {
  const addPage = useCallback(() => {
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
      const target = createPage(`${name} 的复制`, widgets);
      gistsTabs.pages.push(target);

      setGistsTabs(gistsTabs);
    },
    [gistsTabs, setGistsTabs],
  );

  return { addPage, delPage, editPage, copyPage };
}
