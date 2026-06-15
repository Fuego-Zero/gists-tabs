import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useSortContextMenu from './useSortContextMenu';
import useSortDndLogger from './useSortDndLogger';
import useSortModeFlip from './useSortModeFlip';

import type { Widget } from '@/types';

import type {
  SortModeStartReason,
  SortModeStartResult,
  SortModeWidget,
  WidgetColumnEdgePosition,
  WidgetInsertPosition,
} from '../../../types';

export type WidgetDropPreview = {
  insertPosition: WidgetInsertPosition;
  sourceId: Widget['id'];
  targetId: Widget['id'];
};

type DragOriginWidget = Pick<SortModeWidget, 'col' | 'id' | 'row'>;

type Params = {
  displayWidgets: SortModeWidget[];
  isSortMode: boolean;
  moveWidgetPosition: (sourceId: Widget['id'], targetId: Widget['id'], insertPosition: WidgetInsertPosition) => void;
  moveWidgetToColumn: (widgetId: Widget['id'], targetCol: Widget['col']) => void;
  moveWidgetToColumnEdge: (widgetId: Widget['id'], edgePosition: WidgetColumnEdgePosition) => void;
  onSortModeStart: (reason?: SortModeStartReason) => SortModeStartResult;
};

const getColumns = (widgets: SortModeWidget[]) => {
  const column1: SortModeWidget[] = [];
  const column2: SortModeWidget[] = [];
  const column3: SortModeWidget[] = [];

  for (let i = 0; i < widgets.length; i++) {
    const widget = widgets[i];

    switch (widget.col) {
      case 0:
        column1.push(widget);
        break;

      case 1:
        column2.push(widget);
        break;

      case 2:
        column3.push(widget);
        break;
    }
  }

  column1.sort((a, b) => a.row - b.row);
  column2.sort((a, b) => a.row - b.row);
  column3.sort((a, b) => a.row - b.row);

  return [column1, column2, column3];
};

const useWidgetSortDnd = (params: Params) => {
  const {
    displayWidgets,
    isSortMode,
    moveWidgetPosition,
    moveWidgetToColumn,
    moveWidgetToColumnEdge,
    onSortModeStart,
  } = params;
  const [dragOriginWidget, setDragOriginWidget] = useState<DragOriginWidget | null>(null);
  const [draggingWidgetId, setDraggingWidgetId] = useState<Widget['id'] | null>(null);
  const [dropPreview, setDropPreview] = useState<WidgetDropPreview | null>(null);
  // hover 事件频率很高，先写入 ref，再用 requestAnimationFrame 合并到一次排序计算。
  const hoverFrameIdRef = useRef<null | number>(null);
  const pendingHoverRef = useRef<WidgetDropPreview | null>(null);

  const renderWidgets = useMemo<SortModeWidget[]>(() => {
    if (!dragOriginWidget || dragOriginWidget.id !== draggingWidgetId) return displayWidgets;

    // 排序时真实数据会移动，但被拖拽卡片视觉上仍留在初始位置，由自定义预览跟随鼠标。
    return displayWidgets.map((widget) =>
      widget.id === dragOriginWidget.id
        ? {
            ...widget,
            col: dragOriginWidget.col,
            row: dragOriginWidget.row,
          }
        : widget,
    );
  }, [displayWidgets, dragOriginWidget, draggingWidgetId]);

  const columns = useMemo(() => getColumns(renderWidgets), [renderWidgets]);

  const { beginDrag, recordHover, scheduleDragEndClear } = useSortDndLogger({
    columns,
    displayWidgetCount: displayWidgets.length,
    draggingWidgetId,
    isSortMode,
  });

  const { cancelAnimations, setItemRef, snapshotAffectedItemRects } = useSortModeFlip({
    displayWidgets,
    draggingWidgetId,
    isSortMode,
  });

  const {
    close: closeSortContextMenu,
    menu: sortContextMenu,
    open: openSortContextMenu,
    select: selectSortContextMenu,
  } = useSortContextMenu({
    isSortMode,
    moveWidgetToColumnEdge,
  });

  const flushDragHover = useCallback(
    (options?: { animate?: boolean; record?: boolean; showPreview?: boolean }) => {
      const { animate = true, record = true, showPreview = true } = options ?? {};
      const pendingHover = pendingHoverRef.current;

      hoverFrameIdRef.current = null;
      pendingHoverRef.current = null;

      if (!pendingHover) return;

      const { sourceId, targetId, insertPosition } = pendingHover;
      const hoverStartedAt = performance.now();
      const sourceWidget = displayWidgets.find(({ id }) => id === sourceId);
      const targetWidget = displayWidgets.find(({ id }) => id === targetId);

      // 先记录受影响元素的位置，再提交排序，layout effect 中用 FLIP 做位移动画。
      if (animate && isSortMode) {
        snapshotAffectedItemRects(sourceId, targetId);
      }

      moveWidgetPosition(sourceId, targetId, insertPosition);

      if (showPreview) {
        // dropPreview 只负责落点占位；真实排序草稿由上层 moveWidgetPosition 维护。
        setDropPreview((preview) => {
          if (
            preview?.sourceId === sourceId &&
            preview.targetId === targetId &&
            preview.insertPosition === insertPosition
          ) {
            return preview;
          }

          return pendingHover;
        });
      }

      if (record) {
        recordHover({
          crossColumn: Boolean(sourceWidget && targetWidget && sourceWidget.col !== targetWidget.col),
          hoverStartedAt,
          insertPosition,
          sourceId,
          syncMs: performance.now() - hoverStartedAt,
          targetId,
        });
      }
    },
    [displayWidgets, isSortMode, moveWidgetPosition, recordHover, snapshotAffectedItemRects],
  );

  const startDrag = useCallback(
    (widgetId: Widget['id']) => {
      const dragStartRequestedAt = performance.now();
      const originWidget = displayWidgets.find(({ id }) => id === widgetId);
      // 普通模式第一次拖动 card 时会同步进入 sort mode。
      const startResult = onSortModeStart('drag');

      beginDrag(widgetId, startResult, dragStartRequestedAt);
      setDragOriginWidget(originWidget ? { col: originWidget.col, id: originWidget.id, row: originWidget.row } : null);
      setDraggingWidgetId(widgetId);
      setDropPreview(null);
      closeSortContextMenu();
    },
    [beginDrag, closeSortContextMenu, displayWidgets, onSortModeStart],
  );

  const endDrag = useCallback(() => {
    const hasPendingHover = Boolean(pendingHoverRef.current);

    if (hoverFrameIdRef.current !== null) {
      cancelAnimationFrame(hoverFrameIdRef.current);
      hoverFrameIdRef.current = null;
    }

    scheduleDragEndClear({
      clear: () => {
        cancelAnimations();

        if (hasPendingHover) {
          // 鼠标松开前最后一帧 hover 可能还没 flush，结束时补一次无动画提交，避免丢落点。
          flushDragHover({ animate: false, record: false, showPreview: false });
        }

        setDraggingWidgetId(null);
        setDragOriginWidget(null);
        setDropPreview(null);
      },
      dropPreviewActive: Boolean(dropPreview || hasPendingHover),
    });
  }, [cancelAnimations, dropPreview, flushDragHover, scheduleDragEndClear]);

  const hoverDrag = useCallback(
    (sourceId: Widget['id'], targetId: Widget['id'], insertPosition: WidgetInsertPosition) => {
      if (sourceId === targetId) return;

      pendingHoverRef.current = { sourceId, targetId, insertPosition };

      if (hoverFrameIdRef.current !== null) return;

      hoverFrameIdRef.current = requestAnimationFrame(() => {
        flushDragHover();
      });
    },
    [flushDragHover],
  );

  const hoverEmptyColumn = useCallback(
    (sourceId: Widget['id'], targetCol: Widget['col']) => {
      if (!isSortMode) return;

      const sourceWidget = displayWidgets.find(({ id }) => id === sourceId);
      if (!sourceWidget || sourceWidget.col === targetCol) return;

      if (hoverFrameIdRef.current !== null) {
        cancelAnimationFrame(hoverFrameIdRef.current);
        hoverFrameIdRef.current = null;
      }

      pendingHoverRef.current = null;
      cancelAnimations();
      setDropPreview(null);
      // 空列没有具体 target card，直接移动到该列尾部，由 position 工具压实 row。
      moveWidgetToColumn(sourceId, targetCol);
    },
    [cancelAnimations, displayWidgets, isSortMode, moveWidgetToColumn],
  );

  useEffect(
    () => () => {
      if (hoverFrameIdRef.current !== null) {
        cancelAnimationFrame(hoverFrameIdRef.current);
      }
    },
    [],
  );

  return {
    closeSortContextMenu,
    columns,
    draggingWidgetId,
    dropPreview,
    endDrag,
    hoverDrag,
    hoverEmptyColumn,
    openSortContextMenu,
    selectSortContextMenu,
    setItemRef,
    sortContextMenu,
    startDrag,
  };
};

export default useWidgetSortDnd;
