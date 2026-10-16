export const BOOKMARK_DRAG_TYPE = 'bookmark';

export interface BookmarkDragPreviewData {
  icon: null | string;
  title: string;
  url: string;
  width: number;
}

export interface BookmarkDragItem {
  bookmarkId: string;
  lastInsertPosition?: 'after' | 'before';
  lastTargetBookmarkId?: string;
  lastTargetWidgetId?: string;
  preview: BookmarkDragPreviewData;
  sourceWidgetId: string;
}
