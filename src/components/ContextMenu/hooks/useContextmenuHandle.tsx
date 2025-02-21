import React from 'react';
import { createRoot } from 'react-dom/client';

import { EventEmitter } from '@/utils/EventEmitter';

import MenuBox from '../MenuBox';

import type { ContextMenuItems, Instance, MenuBoxProps, OnCancel, OnChoose, OnSelect } from '../types';

let instance: Instance = null;

export default function useContextmenuHandle<T>(
  items: ContextMenuItems<T>,
  zIndex: number,
  onSelect?: OnSelect<T>,
  onCancel?: OnCancel,
  onChoose?: OnChoose,
) {
  return (event: MouseEvent) => {
    if (items.length === 0) return;

    event.preventDefault();
    event.stopPropagation();
    onChoose?.();

    if (instance !== null) instance.destroy();

    const emitter: MenuBoxProps<T>['emitter'] = new EventEmitter();

    const el = document.createElement('div');
    el.style.position = 'relative';
    el.style.zIndex = `${zIndex}`;
    document.body.appendChild(el);

    const menuBoxProps = {
      items,
      left: event.clientX,
      top: event.clientY,
      emitter,
    };

    const root = createRoot(el);
    root.render(<MenuBox<T> {...menuBoxProps} />);

    function destroy() {
      root.unmount();
      document.body.removeChild(el);
      instance = null;
    }

    emitter.once('destroy', destroy);
    emitter.once('select', ({ value, event }) => {
      onSelect?.(value, event);
    });
    emitter.once('cancel', () => {
      onCancel?.();
    });

    instance = {
      app: root,
      el,
      destroy,
    };
  };
}
