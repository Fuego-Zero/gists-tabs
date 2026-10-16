import { VerticalAlignBottomOutlined, VerticalAlignTopOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import React from 'react';

import { t } from '@/i18n/translate';
import type { Widget } from '@/types';

import type { WidgetColumnEdgePosition } from '../../../../types';

export interface SortContextMenuState {
  left: number;
  top: number;
  widgetId: Widget['id'];
}

interface Props {
  menu: SortContextMenuState | null;
  onClose: () => void;
  onSelect: (widgetId: Widget['id'], value: WidgetColumnEdgePosition) => void;
}

const SORT_CONTEXT_MENU_ITEMS: { icon: React.ReactNode; label: 'bottom' | 'top'; value: WidgetColumnEdgePosition }[] = [
  {
    value: 'top',
    label: 'top',
    icon: <VerticalAlignTopOutlined />,
  },
  {
    value: 'bottom',
    label: 'bottom',
    icon: <VerticalAlignBottomOutlined />,
  },
];

const SortModeContextMenu = (props: Props) => {
  const { token } = theme.useToken();
  const { menu, onClose, onSelect } = props;

  if (!menu) {return null;}

  return (
    <div
      className="fixed z-[1000] min-w-[112px] overflow-hidden rounded-[6px] border py-[4px] shadow-[0_6px_16px_rgba(0,0,0,0.28)]"
      style={{
        left: menu.left,
        top: menu.top,
        background: token.colorBgElevated,
        borderColor: token.colorBorderSecondary,
        color: token.colorText,
      }}
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
          className="flex h-[32px] w-full items-center gap-[8px] border-0 bg-transparent px-[12px] text-left text-[14px] hover:bg-[color-mix(in_srgb,currentColor_8%,transparent)]"
          type="button"
          onClick={() => {
            onSelect(menu.widgetId, item.value);
            onClose();
          }}
        >
          <span className="opacity-45">{item.icon}</span>
          <span>{t(item.label)}</span>
        </button>
      ))}
    </div>
  );
};

export default React.memo(SortModeContextMenu);
