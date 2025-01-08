import { createId } from '@/utils/dataFactory';

import type { Bookmark } from '@/types/widget/bookmark';

/**
 * 创建书签
 */
export const createBookmark = ({ title, icon, url }: Omit<Bookmark, 'id'>): Bookmark => ({
  id: createId(),
  icon,
  title,
  url,
});
