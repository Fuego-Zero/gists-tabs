import { type MouseEvent, useCallback, useEffect, useState } from 'react';

import type { Widget } from '@/types';

import type { WidgetColumnEdgePosition } from '../../../types';
import type { SortContextMenuState } from '../components/SortModeContextMenu';

type Params = {
  isSortMode: boolean;
  moveWidgetToColumnEdge: (widgetId: Widget['id'], edgePosition: WidgetColumnEdgePosition) => void;
};

const useSortContextMenu = (params: Params) => {
  const { isSortMode, moveWidgetToColumnEdge } = params;
  const [menu, setMenu] = useState<SortContextMenuState | null>(null);

  const close = useCallback(() => {
    setMenu(null);
  }, []);

  const open = useCallback(
    (event: MouseEvent<HTMLDivElement>, widgetId: Widget['id']) => {
      if (!isSortMode) return;

      event.preventDefault();
      event.stopPropagation();
      setMenu({
        left: event.clientX,
        top: event.clientY,
        widgetId,
      });
    },
    [isSortMode],
  );

  const select = useCallback(
    (widgetId: Widget['id'], value: WidgetColumnEdgePosition) => {
      moveWidgetToColumnEdge(widgetId, value);
    },
    [moveWidgetToColumnEdge],
  );

  useEffect(() => {
    if (!menu) return;

    window.addEventListener('blur', close);
    window.addEventListener('mousedown', close);

    return () => {
      window.removeEventListener('blur', close);
      window.removeEventListener('mousedown', close);
    };
  }, [close, menu]);

  useEffect(() => {
    if (isSortMode) return;

    setMenu(null);
  }, [isSortMode]);

  return {
    close,
    menu,
    open,
    select,
  };
};

export default useSortContextMenu;
