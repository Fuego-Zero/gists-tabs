import { clone } from '@/utils';

import type { Page, Widget } from '@/types';

import type { BookmarkId } from '../components/ContentArea/components/Bookmark/types';
import type { WidgetInsertPosition } from '../types';

export type MoveBookmarkParams = {
  bookmarkId: BookmarkId;
  insertPosition?: WidgetInsertPosition;
  sourceWidgetId: Widget['id'];
  targetBookmarkId?: BookmarkId;
  targetWidgetId: Widget['id'];
};

const getBookmarkIds = (widget: Widget) => {
  if (widget.type !== 'bookmarks') return '';

  return widget.data.bookmarks.map(({ id }) => id).join('|');
};

export const moveBookmarkInWidgets = (widgets: Page['widgets'], params: MoveBookmarkParams): Page['widgets'] => {
  const { bookmarkId, insertPosition = 'after', sourceWidgetId, targetBookmarkId, targetWidgetId } = params;

  if (sourceWidgetId === targetWidgetId && bookmarkId === targetBookmarkId) return widgets;

  const nextWidgets = clone(widgets);
  const sourceWidget = nextWidgets.find((widget) => widget.id === sourceWidgetId);
  const targetWidget = nextWidgets.find((widget) => widget.id === targetWidgetId);

  if (sourceWidget?.type !== 'bookmarks' || targetWidget?.type !== 'bookmarks') return widgets;

  const previousBookmarkIds = new Map(nextWidgets.map((widget) => [widget.id, getBookmarkIds(widget)]));
  const sourceBookmarks = sourceWidget.data.bookmarks;
  const sourceIndex = sourceBookmarks.findIndex((bookmark) => bookmark.id === bookmarkId);

  if (sourceIndex === -1) return widgets;

  const [bookmark] = sourceBookmarks.splice(sourceIndex, 1);
  const targetBookmarks = targetWidget.data.bookmarks;
  let targetIndex = targetBookmarks.length;

  if (targetBookmarkId) {
    targetIndex = targetBookmarks.findIndex((targetBookmark) => targetBookmark.id === targetBookmarkId);
    if (targetIndex === -1) return widgets;
    if (insertPosition === 'after') targetIndex += 1;
  }

  targetBookmarks.splice(targetIndex, 0, bookmark);

  const hasChanged = nextWidgets.some((widget) => previousBookmarkIds.get(widget.id) !== getBookmarkIds(widget));

  return hasChanged ? nextWidgets : widgets;
};
