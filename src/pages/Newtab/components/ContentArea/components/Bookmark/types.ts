import type { MouseEventHandler, Ref } from 'react';

import type { Widget } from '@/types';
import type { Bookmark, Bookmarks } from '@/types/widget/bookmark';

import type { WidgetsHandler } from '../../../../types';
import type { MoveBookmarkParams } from '../../../../utils/bookmarkPosition';

export type BookmarkId = Bookmark['id'];
export type BookmarkData = Omit<Bookmark, 'id'>;

export type BookmarkProps = {
  containerRef?: Ref<HTMLDivElement>;
  data: Bookmarks;
  dragHandleRef?: Ref<HTMLDivElement>;
  forceCollapsed?: boolean;
  id: Widget['id'];
  isBookmarkDragging?: boolean;
  isTitleDragging?: boolean;
  moveBookmark: (params: MoveBookmarkParams) => void;
  moveWidgetToPageModal: (widgetId: Widget['id']) => void;
  name: string;
  onBookmarkDragEnd: () => void;
  onBookmarkDragStart: () => void;
  onTitleMouseDown?: MouseEventHandler<HTMLDivElement>;
} & Pick<WidgetsHandler, 'copyWidget' | 'delWidget' | 'editWidget'>;

export type BookmarkHandler = {
  addBookmark: (url: string) => void;
  copyBookmark: (id: BookmarkId) => void;
  deleteBookmark: (id: BookmarkId, force?: boolean) => void;
  updateBookmark: (bookmarkId: BookmarkId, newData: BookmarkData) => void;
};
