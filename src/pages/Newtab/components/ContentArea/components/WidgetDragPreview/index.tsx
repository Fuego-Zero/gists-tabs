import React from 'react';
import { useDragLayer } from 'react-dnd';

import { EditOutlined, MenuOutlined, VerticalAlignBottomOutlined } from '@ant-design/icons';

import { WIDGET_DRAG_TYPE } from '../../dnd';

import type { WidgetDragItem } from '../../dnd';

const isWidgetDragItem = (item: WidgetDragItem | null): item is WidgetDragItem =>
  Boolean(item && typeof item.title === 'string' && typeof item.width === 'number');

const WidgetDragPreview = () => {
  const { currentOffset, isDragging, item, itemType } = useDragLayer((monitor) => ({
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
    item: monitor.getItem<WidgetDragItem | null>(),
    itemType: monitor.getItemType(),
  }));

  if (itemType !== WIDGET_DRAG_TYPE || !isDragging || !currentOffset || !isWidgetDragItem(item)) return null;

  return (
    <div
      className="fixed left-0 top-0 z-[9999] pointer-events-none"
      style={{ transform: `translate3d(${currentOffset.x}px, ${currentOffset.y}px, 0)` }}
    >
      <div
        className="overflow-hidden rounded-[8px] border border-[rgba(5,5,5,0.06)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-[rgba(22,119,255,0.2)]"
        style={{ width: Math.max(item.width, 240) }}
      >
        <div className="flex h-[61px] items-center justify-between border-b border-[rgba(5,5,5,0.06)] px-[12px]">
          <div className="min-w-0 flex-1 truncate font-medium text-[rgba(0,0,0,0.88)]">{item.title}</div>
          <div className="ml-[12px] flex items-center gap-[8px] text-[rgba(0,0,0,0.45)]">
            <VerticalAlignBottomOutlined />
            <EditOutlined />
            <MenuOutlined />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(WidgetDragPreview);
