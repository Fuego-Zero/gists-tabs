import React, { useCallback, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

import type { Widget } from '@/types';

import type { WidgetInsertPosition } from '../../../../types';

const WIDGET_DRAG_TYPE = 'widget';

type WidgetDragItem = {
  id: Widget['id'];
  lastInsertPosition?: WidgetInsertPosition;
  lastTargetId?: Widget['id'];
  width: number;
};

type Props = {
  children: (params: {
    containerRef: React.RefCallback<HTMLDivElement>;
    isDragging: boolean;
    onTitleMouseDown: React.MouseEventHandler<HTMLDivElement>;
    titleRef: React.RefCallback<HTMLDivElement>;
  }) => React.ReactNode;
  onDragEnd: () => void;
  onDragHover: (sourceId: Widget['id'], targetId: Widget['id'], insertPosition: WidgetInsertPosition) => void;
  onDragStart: (widgetId: Widget['id']) => void;
  widgetId: Widget['id'];
};

const DraggableWidget = (props: Props) => {
  const { children, onDragEnd, onDragHover, onDragStart, widgetId } = props;
  const canDragRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartFrameIdRef = useRef<null | number>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);

  const [{ isDragging }, drag, preview] = useDrag<WidgetDragItem, void, { isDragging: boolean }>(
    () => ({
      type: WIDGET_DRAG_TYPE,
      canDrag: () => canDragRef.current,
      item: () => {
        dragStartFrameIdRef.current = window.requestAnimationFrame(() => {
          dragStartFrameIdRef.current = null;
          onDragStart(widgetId);
        });

        return { id: widgetId, width: containerRef.current?.getBoundingClientRect().width ?? 320 };
      },
      end: () => {
        if (dragStartFrameIdRef.current) {
          window.cancelAnimationFrame(dragStartFrameIdRef.current);
          dragStartFrameIdRef.current = null;
        }

        canDragRef.current = false;
        onDragEnd();
      },
      isDragging: (monitor) => monitor.getItem()?.id === widgetId,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      previewOptions: {
        anchorX: 0,
        anchorY: 0,
        captureDraggingState: true,
      },
    }),
    [onDragEnd, onDragStart, widgetId],
  );

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
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

  const setTitleRef = useCallback((node: HTMLDivElement | null) => {
    titleRef.current = node;
  }, []);

  const handleTitleMouseDown = useCallback<React.MouseEventHandler<HTMLDivElement>>((event) => {
    if (event.button !== 0) return;

    canDragRef.current = true;

    const clearCanDrag = () => {
      canDragRef.current = false;
      window.removeEventListener('mouseup', clearCanDrag);
    };

    window.addEventListener('mouseup', clearCanDrag, { once: true });
  }, []);

  return (
    <>
      {children({
        containerRef: setContainerRef,
        isDragging,
        onTitleMouseDown: handleTitleMouseDown,
        titleRef: setTitleRef,
      })}
    </>
  );
};

export default DraggableWidget;
