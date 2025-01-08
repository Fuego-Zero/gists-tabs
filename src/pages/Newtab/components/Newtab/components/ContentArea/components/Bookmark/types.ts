import type { Bookmark, Bookmarks } from '@/types/widget/bookmark';

import type { WidgetsHandler } from '../../../../hooks/useWidgetsHandler';

export type BookmarkId = Bookmark['id'];
export type BookmarkData = Omit<Bookmark, 'id'>;

export type Props = {
  data: Bookmarks;
  id: string;
  name: string;
} & Omit<WidgetsHandler, 'addWidget'>;
