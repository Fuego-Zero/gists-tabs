export const BOOKMARK_DRAG_TYPE = 'bookmark';

export type BookmarkDragItem = {
  bookmarkId: string;
  lastInsertPosition?: 'after' | 'before';
  lastTargetBookmarkId?: string;
  lastTargetWidgetId?: string;
  sourceWidgetId: string;
};
