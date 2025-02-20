import { useEffect } from 'react';

import { DEFAULT_Z_INDEX } from './constant';
import useContextmenuHandle from './hooks/useContextmenuHandle';

import type { UseContextMenuParams } from './types';

export function useContextMenu(params: UseContextMenuParams) {
  const { onSelect, onCancel, onChoose, el = window, zIndex = DEFAULT_Z_INDEX, items = [] } = params;

  const onContextmenuHandle = useContextmenuHandle(items, zIndex, onSelect, onCancel, onChoose);

  useEffect(() => {
    el.addEventListener('contextmenu', onContextmenuHandle as EventListenerOrEventListenerObject);

    return () => {
      el.removeEventListener('contextmenu', onContextmenuHandle as EventListenerOrEventListenerObject);
    };
  }, [el, onContextmenuHandle]);
}
