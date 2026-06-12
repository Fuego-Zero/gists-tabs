import React from 'react';

import { EditOutlined, MenuOutlined, VerticalAlignBottomOutlined } from '@ant-design/icons';

type Props = {
  dragHandleRef: React.RefCallback<HTMLDivElement>;
  isTitleDragging: boolean;
  name: string;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
  onDragMouseDown: React.MouseEventHandler<HTMLDivElement>;
};

const SortModeCard = (props: Props) => {
  const { dragHandleRef, isTitleDragging, name, onContextMenu, onDragMouseDown } = props;

  return (
    <div
      ref={dragHandleRef}
      className={`overflow-hidden rounded-[8px] border border-[rgba(5,5,5,0.06)] bg-white transition-colors duration-150 select-none cursor-grab active:cursor-grabbing ${
        isTitleDragging ? 'shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-1 ring-[rgba(0,0,0,0.08)]' : ''
      }`}
      onContextMenu={onContextMenu}
      onMouseDown={onDragMouseDown}
    >
      <div className="flex h-[61px] items-center justify-between border-b border-[rgba(5,5,5,0.06)] px-[12px]">
        <div className="mx-[-8px] my-[-4px] min-w-0 flex-1 truncate rounded-[6px] px-[8px] py-[4px] font-medium text-[rgba(0,0,0,0.88)]">
          {name}
        </div>
        <div className="ml-[12px] flex items-center gap-[8px] text-[rgba(0,0,0,0.25)]">
          <VerticalAlignBottomOutlined />
          <EditOutlined />
          <MenuOutlined />
        </div>
      </div>
    </div>
  );
};

export default React.memo(SortModeCard);
