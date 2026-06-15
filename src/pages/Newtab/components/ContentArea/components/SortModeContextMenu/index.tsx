import React from 'react';

import { VerticalAlignBottomOutlined, VerticalAlignTopOutlined } from '@ant-design/icons';

import type { Widget } from '@/types';

import type { WidgetColumnEdgePosition } from '../../../../types';

export type SortContextMenuState = {
  left: number;
  top: number;
  widgetId: Widget['id'];
};

type Props = {
  menu: SortContextMenuState | null;
  onClose: () => void;
  onSelect: (widgetId: Widget['id'], value: WidgetColumnEdgePosition) => void;
};

const SORT_CONTEXT_MENU_ITEMS: { icon: React.ReactNode; label: string; value: WidgetColumnEdgePosition }[] = [
  {
    value: 'top',
    label: '置顶',
    icon: <VerticalAlignTopOutlined />,
  },
  {
    value: 'bottom',
    label: '置底',
    icon: <VerticalAlignBottomOutlined />,
  },
];

const SortModeContextMenu = (props: Props) => {
  const { menu, onClose, onSelect } = props;

  if (!menu) return null;

  return (
    <div
      className="fixed z-[1000] min-w-[112px] overflow-hidden rounded-[6px] border border-[rgba(5,5,5,0.08)] bg-white py-[4px] shadow-[0_6px_16px_rgba(0,0,0,0.12)]"
      style={{ left: menu.left, top: menu.top }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
    >
      {SORT_CONTEXT_MENU_ITEMS.map((item) => (
        <button
          key={item.value}
          className="flex h-[32px] w-full items-center gap-[8px] border-0 bg-transparent px-[12px] text-left text-[14px] text-[rgba(0,0,0,0.88)] hover:bg-[rgba(0,0,0,0.04)]"
          type="button"
          onClick={() => {
            onSelect(menu.widgetId, item.value);
            onClose();
          }}
        >
          <span className="text-[rgba(0,0,0,0.45)]">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default React.memo(SortModeContextMenu);
