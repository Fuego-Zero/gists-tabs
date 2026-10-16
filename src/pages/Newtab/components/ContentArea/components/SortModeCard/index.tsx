import { EditOutlined, MenuOutlined, VerticalAlignBottomOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import React from 'react';

interface Props {
  dragHandleRef: React.RefCallback<HTMLDivElement>;
  isTitleDragging: boolean;
  name: string;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
  onDragMouseDown: React.MouseEventHandler<HTMLDivElement>;
}

const SortModeCard = (props: Props) => {
  const { token } = theme.useToken();
  const { dragHandleRef, isTitleDragging, name, onContextMenu, onDragMouseDown } = props;

  return (
    <div
      ref={dragHandleRef}
      className={`overflow-hidden rounded-[8px] border transition-colors duration-150 select-none cursor-grab active:cursor-grabbing ${
        isTitleDragging ? 'shadow-[0_2px_8px_rgba(0,0,0,0.28)] ring-1 ring-[#1677ff]/40' : ''
      }`}
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary, color: token.colorText }}
      onContextMenu={onContextMenu}
      onMouseDown={onDragMouseDown}
    >
      <div className="flex h-[61px] items-center justify-between border-b px-[12px]" style={{ borderColor: token.colorBorderSecondary }}>
        <div className="mx-[-8px] my-[-4px] min-w-0 flex-1 truncate rounded-[6px] px-[8px] py-[4px] font-medium">
          {name}
        </div>
        <div className="ml-[12px] flex items-center gap-[8px] opacity-45">
          <VerticalAlignBottomOutlined />
          <EditOutlined />
          <MenuOutlined />
        </div>
      </div>
    </div>
  );
};

export default React.memo(SortModeCard);
