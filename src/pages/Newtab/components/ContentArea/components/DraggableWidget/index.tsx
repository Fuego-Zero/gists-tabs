import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

import { WIDGET_DRAG_TYPE } from '../../dnd';
import { infoSortDndLog, roundMs } from '../../utils/sortDndLog';

import type { Widget } from '@/types';

import type { WidgetInsertPosition } from '../../../../types';
import type { WidgetDragItem } from '../../dnd';

type Props = {
  children: (params: {
    containerRef: React.RefCallback<HTMLDivElement>;
    dragHandleRef: React.RefCallback<HTMLDivElement>;
    isDragging: boolean;
    isSourcePreviewHidden: boolean;
    onTitleMouseDown: React.MouseEventHandler<HTMLDivElement>;
  }) => React.ReactNode;
  hideSourcePreviewOnDragStart: boolean;
  onDragEnd: () => void;
  onDragHover: (sourceId: Widget['id'], targetId: Widget['id'], insertPosition: WidgetInsertPosition) => void;
  onDragStart: (widgetId: Widget['id']) => void;
  previewTitle: string;
  widgetId: Widget['id'];
};

const DraggableWidget = (props: Props) => {
  const { children, hideSourcePreviewOnDragStart, onDragEnd, onDragHover, onDragStart, previewTitle, widgetId } = props;
  const [isSourcePreviewHidden, setIsSourcePreviewHidden] = useState(false);
  const canDragRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const didStartDragRef = useRef(false);
  const dragHandleRef = useRef<HTMLDivElement | null>(null);
  const dragStartFrameIdRef = useRef<null | number>(null);
  const pointerDownAtRef = useRef<null | number>(null);

  const [{ isDragging }, drag, preview] = useDrag<WidgetDragItem, void, { isDragging: boolean }>(
    () => ({
      type: WIDGET_DRAG_TYPE,
      // 只有标题区域 mouse down 后才允许拖拽，避免点击卡片内容时误进入 sort mode。
      canDrag: () => canDragRef.current,
      item: () => {
        const itemStartedAt = performance.now();
        const width = containerRef.current?.getBoundingClientRect().width ?? 320;

        didStartDragRef.current = true;
        if (hideSourcePreviewOnDragStart) {
          setIsSourcePreviewHidden(true);
        }

        // 先让浏览器创建 drag item，再下一帧进入 sort mode，避免首帧源卡片预览断掉。
        dragStartFrameIdRef.current = window.requestAnimationFrame(() => {
          dragStartFrameIdRef.current = null;
          onDragStart(widgetId);
        });

        infoSortDndLog(
          'drag backend item',
          {
            itemSetupMs: roundMs(performance.now() - itemStartedAt),
            sincePointerDownMs:
              pointerDownAtRef.current === null ? null : roundMs(itemStartedAt - pointerDownAtRef.current),
            width: roundMs(width),
            widgetId,
          },
          { verbose: true },
        );

        return { id: widgetId, title: previewTitle, width };
      },
      end: () => {
        const endStartedAt = performance.now();

        if (dragStartFrameIdRef.current) {
          window.cancelAnimationFrame(dragStartFrameIdRef.current);
          dragStartFrameIdRef.current = null;
        }

        canDragRef.current = false;
        didStartDragRef.current = false;
        pointerDownAtRef.current = null;
        setIsSourcePreviewHidden(false);
        onDragEnd();

        infoSortDndLog(
          'drag backend end',
          { cleanupSyncMs: roundMs(performance.now() - endStartedAt), widgetId },
          { verbose: true },
        );
      },
      isDragging: (monitor) => monitor.getItem()?.id === widgetId,
      collect: (monitor) => ({
        isDragging: monitor.getItem()?.id === widgetId && monitor.isDragging(),
      }),
      previewOptions: {
        anchorX: 0,
        anchorY: 0,
      },
    }),
    [hideSourcePreviewOnDragStart, onDragEnd, onDragStart, previewTitle, widgetId],
  );

  useEffect(() => {
    // 使用自定义 DragLayer 预览，隐藏 HTML5 backend 默认截图。
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);

  const [, drop] = useDrop<WidgetDragItem>(
    () => ({
      accept: WIDGET_DRAG_TYPE,
      canDrop: (item) => item.id !== widgetId,
      hover: (item, monitor) => {
        const element = containerRef.current;
        const clientOffset = monitor.getClientOffset();

        if (!monitor.canDrop()) return;
        if (!element || !clientOffset) return;

        const hoverRect = element.getBoundingClientRect();
        const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2;
        const hoverClientY = clientOffset.y - hoverRect.top;
        const insertPosition: WidgetInsertPosition = hoverClientY > hoverMiddleY ? 'after' : 'before';

        // React DnD hover 会高频触发，同一目标同一落点不重复通知上层。
        if (item.lastTargetId === widgetId && item.lastInsertPosition === insertPosition) return;

        item.lastTargetId = widgetId;
        item.lastInsertPosition = insertPosition;
        onDragHover(item.id, widgetId, insertPosition);
      },
    }),
    [onDragHover, widgetId],
  );

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      drag(drop(node));
    },
    [drag, drop],
  );

  const setDragHandleRef = useCallback((node: HTMLDivElement | null) => {
    dragHandleRef.current = node;
  }, []);

  const handleTitleMouseDown = useCallback<React.MouseEventHandler<HTMLDivElement>>(
    (event) => {
      if (event.button !== 0) return;

      const pointerDownAt = performance.now();

      pointerDownAtRef.current = pointerDownAt;
      canDragRef.current = true;
      didStartDragRef.current = false;

      infoSortDndLog(
        'pointer down',
        {
          previewSetupMs: roundMs(performance.now() - pointerDownAt),
          previewStrategy: 'custom-layer',
          widgetId,
        },
        { verbose: true },
      );

      const clearCanDrag = () => {
        canDragRef.current = false;

        // 只是按下但没有形成拖拽时，要还原临时状态，避免卡片透明度残留。
        if (!didStartDragRef.current) {
          pointerDownAtRef.current = null;
          setIsSourcePreviewHidden(false);
        }

        window.removeEventListener('mouseup', clearCanDrag);
      };

      window.addEventListener('mouseup', clearCanDrag, { once: true });
    },
    [widgetId],
  );

  return (
    <>
      {children({
        containerRef: setContainerRef,
        dragHandleRef: setDragHandleRef,
        isDragging,
        isSourcePreviewHidden,
        onTitleMouseDown: handleTitleMouseDown,
      })}
    </>
  );
};

export default DraggableWidget;
