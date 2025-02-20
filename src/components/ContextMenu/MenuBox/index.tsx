import type { CSSProperties } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import classNames from 'classnames';

import PageCard from '@/components/PageCard';

import type { ForwardRefHTML } from '@/types/utils';

import type { ContextMenuItem, MenuBoxProps } from '../types';

import style from './style.module.scss';

function MenuBox<T>(props: MenuBoxProps<T>) {
  const { emitter, items, left, top } = props;

  const elRef = useRef<ForwardRefHTML<typeof PageCard>>(null);
  const [isHeightSafe, setIsHeightSafe] = useState(true);
  const [isWidthSafe, setIsWidthSafe] = useState(true);

  const menuBoxStyle = useMemo(() => {
    const _style: CSSProperties = {
      top: `${top}px`,
    };

    if (isWidthSafe) {
      _style.left = `${left}px`;
    } else {
      _style.right = 0;
    }

    if (!isHeightSafe) {
      _style.transform = 'translateY(-100%)';
    }

    return _style;
  }, [isHeightSafe, isWidthSafe, left, top]);

  const close = useCallback(() => {
    emitter.emit('destroy');
  }, [emitter]);

  function onSelect(item: ContextMenuItem<T>) {
    if (item.disabled) return;
    emitter.emit('select', item.value);
    close();
  }

  const contextmenuHandle = useCallback((event: MouseEvent) => {
    if (elRef.current?.contains(event.target as Node)) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const mousedownHandle = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (elRef.current?.contains(event.target as Node)) return;

      emitter.emit('cancel');
      close();
    },
    [close, emitter],
  );

  function checkSafe(el: Element) {
    const rect = el.getBoundingClientRect();
    const { top, left, height, width } = rect;

    if (top + height > window.innerHeight) setIsHeightSafe(false);
    if (left + width > window.innerWidth) setIsWidthSafe(false);
  }

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    el.addEventListener('contextmenu', contextmenuHandle);
    document.addEventListener('mousedown', mousedownHandle);
    checkSafe(el);

    return () => {
      el.removeEventListener('contextmenu', contextmenuHandle);
      document.removeEventListener('mousedown', mousedownHandle);
    };
  }, [contextmenuHandle, mousedownHandle]);

  if (items.length === 0) {
    setTimeout(() => {
      close();
    });
    return null;
  }

  return (
    <PageCard ref={elRef} className={style.MenuBox} style={menuBoxStyle}>
      {items.map((item, index) => (
        <div
          key={index}
          className={classNames('menuItem', {
            disabled: item.disabled,
          })}
          onClick={() => {
            onSelect(item);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelect(item);
          }}
        >
          <div className="icon">{item.icon}</div>
          <div className="label">{item.title}</div>
        </div>
      ))}
    </PageCard>
  );
}

export default memo(MenuBox) as typeof MenuBox;
