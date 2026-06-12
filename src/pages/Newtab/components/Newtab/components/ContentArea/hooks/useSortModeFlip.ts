import { useCallback, useLayoutEffect, useRef } from 'react';

import type { Widget } from '@/types';

import type { SortModeWidget } from '../../../types';

type Params = {
  displayWidgets: SortModeWidget[];
  draggingWidgetId: Widget['id'] | null;
  isSortMode: boolean;
};

const useSortModeFlip = (params: Params) => {
  const { displayWidgets, draggingWidgetId, isSortMode } = params;
  const displayWidgetsRef = useRef<SortModeWidget[]>([]);
  const itemRefs = useRef(new Map<Widget['id'], HTMLDivElement>());
  const previousItemRectsRef = useRef(new Map<Widget['id'], Pick<DOMRect, 'left' | 'top'>>());
  const runningAnimationsRef = useRef(new Map<Widget['id'], Animation>());

  displayWidgetsRef.current = displayWidgets;

  const getAffectedWidgetIds = useCallback((sourceId: Widget['id'], targetId: Widget['id']) => {
    const currentWidgets = displayWidgetsRef.current;
    const sourceWidget = currentWidgets.find(({ id }) => id === sourceId);
    const targetWidget = currentWidgets.find(({ id }) => id === targetId);

    if (!sourceWidget || !targetWidget) return [];

    if (sourceWidget.col === targetWidget.col) {
      const startRow = Math.min(sourceWidget.row, targetWidget.row);
      const endRow = Math.max(sourceWidget.row, targetWidget.row);

      return currentWidgets
        .filter(({ col, row }) => col === sourceWidget.col && row >= startRow && row <= endRow)
        .map(({ id }) => id);
    }

    return currentWidgets
      .filter(({ col, row }) => {
        if (col === sourceWidget.col) return row >= sourceWidget.row;
        if (col === targetWidget.col) return row >= targetWidget.row;

        return false;
      })
      .map(({ id }) => id);
  }, []);

  const snapshotAffectedItemRects = useCallback(
    (sourceId: Widget['id'], targetId: Widget['id']) => {
      const rects = new Map<Widget['id'], Pick<DOMRect, 'left' | 'top'>>();

      getAffectedWidgetIds(sourceId, targetId).forEach((widgetId) => {
        const node = itemRefs.current.get(widgetId);
        if (!node) return;

        const { left, top } = node.getBoundingClientRect();
        rects.set(widgetId, { left, top });
      });

      previousItemRectsRef.current = rects;
    },
    [getAffectedWidgetIds],
  );

  const cancelAnimations = useCallback(() => {
    previousItemRectsRef.current = new Map();
    runningAnimationsRef.current.forEach((animation) => {
      animation.cancel();
    });
    runningAnimationsRef.current.clear();
  }, []);

  const setItemRef = useCallback(
    (widgetId: Widget['id']) => (node: HTMLDivElement | null) => {
      if (node) {
        itemRefs.current.set(widgetId, node);
      } else {
        itemRefs.current.delete(widgetId);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (!isSortMode || !draggingWidgetId) {
      previousItemRectsRef.current = new Map();
      runningAnimationsRef.current.forEach((animation) => {
        animation.cancel();
      });
      runningAnimationsRef.current.clear();

      return;
    }

    const previousRects = previousItemRectsRef.current;
    if (previousRects.size === 0) return;

    previousItemRectsRef.current = new Map();

    previousRects.forEach((previousRect, widgetId) => {
      if (widgetId === draggingWidgetId) return;

      const node = itemRefs.current.get(widgetId);
      if (!node) return;

      const { left, top } = node.getBoundingClientRect();
      const deltaX = previousRect.left - left;
      const deltaY = previousRect.top - top;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

      runningAnimationsRef.current.get(widgetId)?.cancel();

      const animation = node.animate(
        [{ transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
        {
          duration: 140,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        },
      );

      runningAnimationsRef.current.set(widgetId, animation);

      const clearAnimation = () => {
        if (runningAnimationsRef.current.get(widgetId) === animation) {
          runningAnimationsRef.current.delete(widgetId);
        }
      };

      animation.oncancel = clearAnimation;
      animation.onfinish = clearAnimation;
    });
  }, [displayWidgets, draggingWidgetId, isSortMode]);

  return {
    cancelAnimations,
    setItemRef,
    snapshotAffectedItemRects,
  };
};

export default useSortModeFlip;
