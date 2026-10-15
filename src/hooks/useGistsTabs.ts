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

  // User edits only (sets dirty). onChanged / engine writebacks update React only — do not re-persist via this handler.
  const setGistsTabsHandler = useCallback((data: GistsTabs) => {
    data.updateAt = Date.now();
    setGistsTabs(clone(data));
    Storage.setGistsTabs(data);
  }, []);

  useEffect(() => {
    (async () => {
      let data = await Storage.getGistsTabs();

      if (!data) {
        data = {
          pages: [createPage('主页')],
          updateAt: Date.now(),
          version: VERSION,
        };

        await Storage.setGistsTabs(data);
      }

      if (data.version === VERSION) {
        setGistsTabs(data);
        return;
      }

      data = upgradeGistsTabsToV1(data);
      setGistsTabsHandler(data);
    })();
  }, [setGistsTabsHandler]);

  // Cross-tab sync via chrome.storage.onChanged (React only; never Storage.setGistsTabs — avoids re-dirty after synced)
  useEffect(() => {
    const onChanged: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== 'local') return;
      if (!changes.gistsTabs) return;
      const next = changes.gistsTabs.newValue as GistsTabs | undefined;
      if (!next) return;
      setGistsTabs((prev) => {
        if (prev.updateAt === next.updateAt && prev.syncMeta?.revision === next.syncMeta?.revision) {
          return prev;
        }
        return next;
      });
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  return [gistsTabs, setGistsTabsHandler];
}
