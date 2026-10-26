import { useCallback, useEffect } from 'react';

import Storage from '@/classes/Storage';
import { useStorageItem } from '@/hooks/useStorageItem';
import { resolveLocale } from '@/i18n/locales';
import { setActiveLocale, t } from '@/i18n/translate';
import { isInitialCanvas, tagLegacyHome } from '@/storage/initialCanvas';
import { gistsTabsItem, localeItem } from '@/storage/items';
import { repairWidgetPositions } from '@/storage/widgetPositions';
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
        const locale = resolveLocale(await localeItem.getValue());
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

      const repaired = repairWidgetPositions(data);
      let next: GistsTabs = repaired.repaired ? repaired.value as GistsTabs : data;
      let changed = repaired.repaired;

      const home = next.pages.length === 1 ? tagLegacyHome(next.pages[0]) : next.pages[0];
      if (isInitialCanvas(next) && home && home.nameKey === 'home' && next.pages[0].nameKey !== 'home') {
        next = { ...next, pages: [home] };
        changed = true;
      }

      if (next.version !== VERSION) {
        next = upgradeGistsTabsToV1(next);
        changed = true;
      }

      if (changed) {await Storage.setGistsTabs(next);}
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
