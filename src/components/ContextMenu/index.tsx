import React, { memo, useEffect, useRef } from 'react';

import RC from '../RC';
import { DEFAULT_Z_INDEX } from './constant';
import useContextmenuHandle from './hooks/useContextmenuHandle';

import type { ContextMenuProps } from './types';

export * from './hook';

function ContextMenu<T = any>(props: ContextMenuProps<T>) {
  const {
    click = false,
    contextmenu = true,
    hover = false,
    items = [],
    zIndex = DEFAULT_Z_INDEX,
    onCancel,
    onChoose,
    onSelect,
    children,
  } = props;

  const elRef = useRef<HTMLDivElement>(null);

  const onContextmenuHandle = useContextmenuHandle(items, zIndex, onSelect, onCancel, onChoose);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    if (contextmenu) el.addEventListener('contextmenu', onContextmenuHandle);
    if (click) el.addEventListener('click', onContextmenuHandle);
    if (hover) el.addEventListener('mouseenter', onContextmenuHandle);

    return () => {
      el.removeEventListener('contextmenu', onContextmenuHandle);
      el.removeEventListener('click', onContextmenuHandle);
      el.removeEventListener('mouseenter', onContextmenuHandle);
    };
  }, [click, contextmenu, hover, onContextmenuHandle]);

  return (
    <RC.Wrap ref={elRef} name="ContextMenu">
      {children}
    </RC.Wrap>
  );
}

export default memo(ContextMenu) as typeof ContextMenu;
