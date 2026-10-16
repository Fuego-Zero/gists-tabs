import { useCallback, useEffect } from 'react';

import Storage from '@/classes/Storage';
import { useStorageItem } from '@/hooks/useStorageItem';
import { setActiveLocale, t } from '@/i18n/translate';
import { gistsTabsItem, localeItem } from '@/storage/items';
import { isInitialCanvas, tagLegacyHome } from '@/storage/initialCanvas';
import type { GistsTabs } from '@/types';
import { createPage } from '@/utils/data/factory';
import { upgradeGistsTabsToV1 } from '@/utils/data/upgrade';

const VERSION = 1;

const EMPTY_GISTS_TABS: GistsTabs = {
  pages: [],
  updateAt: -1,
  version: VERSION,
};

let ensurePromise: Promise<void> | null = null;

/** 缺省主页和 v1 升级只跑一次，避免每个订阅组件各写一份主页。 */
function ensureGistsTabs() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      let data = await Storage.getGistsTabs();
      if (!data) {
        const locale = (await localeItem.getValue()) ?? 'zh_CN';
        setActiveLocale(locale);
        const home = createPage(t('home'));
        home.nameKey = 'home';
        data = {
          pages: [home],
          updateAt: Date.now(),
          version: VERSION,
        };
        await Storage.setGistsTabs(data);
        return;
      }

      const home = data.pages.length === 1 ? tagLegacyHome(data.pages[0]) : data.pages[0];
      if (isInitialCanvas(data) && home && home.nameKey === 'home' && data.pages[0].nameKey !== 'home') {
        await Storage.setGistsTabs({ ...data, pages: [home] });
        return;
      }

      if (data.version === VERSION) {return;}

      await Storage.setGistsTabs(upgradeGistsTabsToV1(data));
    })();
  }

  return ensurePromise;
}

export default function useGistsTabs(): [gistsTabs: GistsTabs, setGistsTabs: (data: GistsTabs) => Promise<void>] {
  const gistsTabs = useStorageItem(gistsTabsItem, EMPTY_GISTS_TABS);

  useEffect(() => {
    void ensureGistsTabs();
  }, []);

  const setGistsTabsHandler = useCallback((data: GistsTabs) => {
    data.updateAt = Date.now();
    return Storage.setGistsTabs(data);
  }, []);

  return [gistsTabs ?? EMPTY_GISTS_TABS, setGistsTabsHandler];
}
