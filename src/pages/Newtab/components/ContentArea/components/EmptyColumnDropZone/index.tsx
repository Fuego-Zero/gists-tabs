import React, { useCallback } from 'react';
import { useDrop } from 'react-dnd';

import { WIDGET_DRAG_TYPE } from '../../dnd';

import type { Widget } from '@/types';

import type { WidgetDragItem } from '../../dnd';

type Props = {
  col: Widget['col'];
  onHover: (sourceId: Widget['id'], targetCol: Widget['col']) => void;
};

const EmptyColumnDropZone = (props: Props) => {
  const { col, onHover } = props;

  const [{ isOver }, drop] = useDrop<WidgetDragItem, void, { isOver: boolean }>(
    () => ({
      accept: WIDGET_DRAG_TYPE,
      hover: (item) => {
        onHover(item.id, col);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [col, onHover],
  );

  const setDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      drop(node);
    },
    [drop],
  );

  return (
    <div
      ref={setDropRef}
      className={`flex h-[76px] items-center rounded-[8px] border-2 border-dashed px-[12px] transition-colors duration-150 ${
        isOver
          ? 'border-[#1677ff] bg-[#e6f4ff] shadow-[0_0_0_3px_rgba(22,119,255,0.12),inset_0_0_0_1px_rgba(22,119,255,0.2)]'
          : 'border-[rgba(5,5,5,0.12)] bg-[rgba(0,0,0,0.02)]'
      }`}
    >
      <div
        className={`h-[8px] w-full rounded-full transition-colors duration-150 ${
          isOver ? 'bg-[rgba(22,119,255,0.24)]' : 'bg-[rgba(0,0,0,0.06)]'
        }`}
      />
    </div>
  );
};

export default React.memo(EmptyColumnDropZone);
