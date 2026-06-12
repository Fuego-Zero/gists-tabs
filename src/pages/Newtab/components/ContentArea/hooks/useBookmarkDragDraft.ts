import { useCallback, useRef, useState } from 'react';

import { clone } from '@/utils';

import { moveBookmarkInWidgets } from '../../../utils/bookmarkPosition';

import type { Page, Widget } from '@/types';

import type { WidgetsHandler } from '../../../types';
import type { MoveBookmarkParams } from '../../../utils/bookmarkPosition';

type Params = {
  saveWidgetsData: WidgetsHandler['saveWidgetsData'];
  widgets: Page['widgets'];
};

const getBookmarkIds = (widget: Extract<Widget, { type: 'bookmarks' }>) =>
  widget.data.bookmarks.map(({ id }) => id).join('|');

const getChangedBookmarkWidgetsData = (
  baseWidgets: Page['widgets'],
  draftWidgets: Page['widgets'],
): { data: Widget['data']; id: Widget['id'] }[] => {
  const changedWidgetsData: { data: Widget['data']; id: Widget['id'] }[] = [];

  // 只比较 bookmark id 顺序和归属，避免拖拽保存时误覆盖标题、展开状态等其它字段。
  draftWidgets.forEach((widget) => {
    if (widget.type !== 'bookmarks') return;

    const baseWidget = baseWidgets.find((item) => item.id === widget.id);
    if (baseWidget?.type !== 'bookmarks') return;
    if (getBookmarkIds(baseWidget) === getBookmarkIds(widget)) return;

    changedWidgetsData.push({ id: widget.id, data: widget.data });
  });

  return changedWidgetsData;
};

const useBookmarkDragDraft = (params: Params) => {
  const { saveWidgetsData, widgets } = params;
  const [draftWidgets, setDraftWidgets] = useState<Page['widgets'] | null>(null);
  const baseWidgetsRef = useRef<Page['widgets'] | null>(null);
  const draftWidgetsRef = useRef<Page['widgets'] | null>(null);

  const startDrag = useCallback(() => {
    if (draftWidgetsRef.current) return;

    // Bookmark 内部拖拽使用独立草稿渲染；真实数据只在 drop/end 后统一提交。
    const nextWidgets = clone(widgets);
    baseWidgetsRef.current = nextWidgets;
    draftWidgetsRef.current = nextWidgets;
    setDraftWidgets(nextWidgets);
  }, [widgets]);

  const moveBookmark = useCallback(
    (moveParams: MoveBookmarkParams) => {
      // 使用 ref 保存最新草稿，避免连续拖拽时 React state 异步更新导致落点丢失。
      const currentWidgets = draftWidgetsRef.current ?? clone(widgets);
      const nextWidgets = moveBookmarkInWidgets(currentWidgets, moveParams);

      draftWidgetsRef.current = nextWidgets;
      setDraftWidgets(nextWidgets);
    },
    [widgets],
  );

  const endDrag = useCallback(() => {
    const currentDraftWidgets = draftWidgetsRef.current;
    const baseWidgets = baseWidgetsRef.current ?? widgets;

    // 先清 ref，防止嵌套 drop/end 重入时重复提交同一份草稿。
    draftWidgetsRef.current = null;
    baseWidgetsRef.current = null;

    if (!currentDraftWidgets) {
      setDraftWidgets(null);

      return;
    }

    const changedWidgetsData = getChangedBookmarkWidgetsData(baseWidgets, currentDraftWidgets);
    if (changedWidgetsData.length > 0) {
      saveWidgetsData(changedWidgetsData);
    }

    setDraftWidgets(null);
  }, [saveWidgetsData, widgets]);

  return {
    draftWidgets,
    endDrag,
    isDragging: Boolean(draftWidgets),
    moveBookmark,
    startDrag,
  };
};

export default useBookmarkDragDraft;
