import { isArray } from '../typeUtil';

import type { GistsTabs } from '@/types';
import type { Bookmark } from '@/types/widget/bookmark';
import type { Clock } from '@/types/widget/clock';

/**
 * 升级数据版本
 */
function upgradeGistsTabsToV1(data: GistsTabs): GistsTabs {
  const { pages, updateAt, version } = data;
  if (version === 1) return data;

  pages.forEach((page) => {
    page.widgets.forEach((widget) => {
      if (widget.type === 'bookmarks' && isArray<Bookmark>(widget.data)) {
        widget.data = {
          bookmarks: widget.data,
          expanded: true,
        };
      } else if (widget.type === 'clocks' && isArray<Clock>(widget.data)) {
        widget.data = {
          clocks: widget.data,
        };
      }
    });
  });

  return {
    pages,
    updateAt,
    version: 1,
  };
}

export { upgradeGistsTabsToV1 };
