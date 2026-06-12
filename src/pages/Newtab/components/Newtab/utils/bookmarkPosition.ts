import type { Page, Widget } from '@/types';

import type { BookmarkId } from '../components/ContentArea/components/Bookmark/types';
import type { WidgetInsertPosition } from '../types';

type BookmarkWidget = Extract<Widget, { type: 'bookmarks' }>;
type BookmarkList = BookmarkWidget['data']['bookmarks'];

export type MoveBookmarkParams = {
  bookmarkId: BookmarkId;
  insertPosition?: WidgetInsertPosition;
  sourceWidgetId: Widget['id'];
  targetBookmarkId?: BookmarkId;
  targetWidgetId: Widget['id'];
};

const getBookmarkIds = (bookmarks: BookmarkList) => bookmarks.map(({ id }) => id).join('|');

const isSameBookmarkOrder = (currentBookmarks: BookmarkList, nextBookmarks: BookmarkList) =>
  getBookmarkIds(currentBookmarks) === getBookmarkIds(nextBookmarks);

export const moveBookmarkInWidgets = (widgets: Page['widgets'], params: MoveBookmarkParams): Page['widgets'] => {
  const { bookmarkId, insertPosition = 'after', sourceWidgetId, targetBookmarkId, targetWidgetId } = params;

  if (sourceWidgetId === targetWidgetId && bookmarkId === targetBookmarkId) return widgets;

  const sourceWidgetIndex = widgets.findIndex((widget) => widget.id === sourceWidgetId);
  const targetWidgetIndex = widgets.findIndex((widget) => widget.id === targetWidgetId);

  if (sourceWidgetIndex === -1 || targetWidgetIndex === -1) return widgets;

  const sourceWidget = widgets[sourceWidgetIndex];
  const targetWidget = widgets[targetWidgetIndex];
  if (sourceWidget?.type !== 'bookmarks' || targetWidget?.type !== 'bookmarks') return widgets;

  const sourceBookmarks = sourceWidget.data.bookmarks;
  const sourceIndex = sourceBookmarks.findIndex((bookmark) => bookmark.id === bookmarkId);

  if (sourceIndex === -1) return widgets;

  const bookmark = sourceBookmarks[sourceIndex];
  const nextSourceBookmarks = sourceBookmarks.filter((item) => item.id !== bookmarkId);
  const targetBookmarks = sourceWidgetIndex === targetWidgetIndex ? nextSourceBookmarks : targetWidget.data.bookmarks;
  let targetIndex = targetBookmarks.length;

  if (targetBookmarkId) {
    targetIndex = targetBookmarks.findIndex((targetBookmark) => targetBookmark.id === targetBookmarkId);
    if (targetIndex === -1) return widgets;
    if (insertPosition === 'after') targetIndex += 1;
  }

  const nextTargetBookmarks = [...targetBookmarks];
  nextTargetBookmarks.splice(targetIndex, 0, bookmark);

  if (sourceWidgetIndex === targetWidgetIndex) {
    if (isSameBookmarkOrder(sourceBookmarks, nextTargetBookmarks)) return widgets;

    const nextWidgets = [...widgets];
    nextWidgets[sourceWidgetIndex] = {
      ...sourceWidget,
      data: {
        ...sourceWidget.data,
        bookmarks: nextTargetBookmarks,
      },
    };

    return nextWidgets;
  }

  const nextWidgets = [...widgets];
  nextWidgets[sourceWidgetIndex] = {
    ...sourceWidget,
    data: {
      ...sourceWidget.data,
      bookmarks: nextSourceBookmarks,
    },
  };
  nextWidgets[targetWidgetIndex] = {
    ...targetWidget,
    data: {
      ...targetWidget.data,
      bookmarks: nextTargetBookmarks,
    },
  };

  return nextWidgets;
};
