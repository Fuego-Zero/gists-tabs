import { useCallback, useMemo, useState } from 'react';

import type { Bookmark, Bookmarks } from '@/types/widget/bookmark';

export default function useDetailHandler(data: Bookmarks) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  const bookmarkMap = useMemo<Map<string, Bookmark>>(
    () =>
      data.bookmarks.reduce((map, item) => {
        map.set(item.id, item);
        return map;
      }, new Map()),
    [data],
  );

  const selectedBookmark = useMemo(() => bookmarkMap.get(selectedId), [bookmarkMap, selectedId]);

  const selectBookmark = useCallback((id: Bookmark['id']) => {
    setSelectedId(id);
    setIsOpen(true);
  }, []);

  const unselectBookmark = useCallback(() => {
    setSelectedId('');
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    selectBookmark,
    unselectBookmark,
    selectedBookmark,
  };
}
