import { createId } from '@/utils/data/factory';

import type { Bookmark } from '@/types/widget/bookmark';

// 书签 item 统一从这里生成，保证手动添加、复制等路径都有独立 id。
export const createBookmark = ({ title, icon, url }: Omit<Bookmark, 'id'>): Bookmark => ({
  id: createId(),
  icon,
  title,
  url,
});
