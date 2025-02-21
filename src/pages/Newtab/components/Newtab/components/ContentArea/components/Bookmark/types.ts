import type { Bookmark, Bookmarks } from '@/types/widget/bookmark';

import type { WidgetsHandler } from '../../../../types';

export type BookmarkId = Bookmark['id'];
export type BookmarkData = Omit<Bookmark, 'id'>;

export type BookmarkProps = {
  data: Bookmarks;
  id: string;
  name: string;
} & Omit<WidgetsHandler, 'addWidget'>;

export type BookmarkHandler = {
  addBookmark: (url: string) => void;
  copyBookmark: (id: BookmarkId) => void;
  deleteBookmark: (id: BookmarkId, force?: boolean) => void;
  updateBookmark: (bookmarkId: BookmarkId, newData: BookmarkData) => void;
};
