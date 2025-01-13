import type { CSSProperties, Ref } from 'react';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import classNames from 'classnames';

import { isString } from '@/utils/typeUtil';

import useHandler from './hooks/useHandler';
import useScrollbar from './hooks/useScrollbar';

import type { ExposeMethods, ScrollBoundaryEventName, ScrollStatus, ScrollWrapProps, XY } from './types';

import styles from './style.module.scss';

export * from './types';

function ScrollWrap(props: ScrollWrapProps, ref: Ref<ExposeMethods>) {
  const {
    height = '100%',
    width = '100%',
    zIndex = 0,
    theme = 'light',
    children,
    defaultHideScrollbar,
    className,
  } = props;

  const wrapStyle = useMemo<CSSProperties>(
    () => ({
      height: isString(height) ? height : `${height}px`,
      width: isString(width) ? width : `${width}px`,
      zIndex,
    }),
    [height, width, zIndex],
  );

  const wrap = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const thumbX = useRef<HTMLDivElement>(null);
  const thumbY = useRef<HTMLDivElement>(null);

  const { calcShowBar, isShowScrollbarX, isShowScrollbarY } = useScrollbar();

  const resetThumbX = useRef(() => {});
  const resetThumbY = useRef(() => {});
  const resizeObserver = useRef(
    new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === content.current) {
          calcShowBar(entry.target.parentElement!);
        }

        if (entry.target === wrap.current) {
          calcShowBar(entry.target);
        }

        resetThumbX.current();
        resetThumbY.current();
      });
    }),
  );

  //* 元素尺寸发生改变的监听，需要重新计算滑块的尺寸
  useEffect(() => {
    const ob = resizeObserver.current;

    ob.observe(wrap.current!);
    ob.observe(content.current!);

    return () => {
      ob.disconnect();
    };
  }, []);

  // #region onEmit

  function onBoundary(eventName: ScrollBoundaryEventName) {
    const { onBottom, onLeft, onRight, onTop } = props;

    switch (eventName) {
      case 'top':
        return onTop?.();
      case 'bottom':
        return onBottom?.();
      case 'left':
        return onLeft?.();
      case 'right':
        return onRight?.();
    }
  }

  function onScroll(data: ScrollStatus, xy: XY) {
    const { onScrollX, onScrollY } = props;

    if (xy === 'x') {
      onScrollX?.(data);
    } else if (xy === 'y') {
      onScrollY?.(data);
    }
  }

  // #endregion

  const { thumbHandlerX, thumbHandlerY, toTop, toBottom, toLeft, toRight } = useHandler({
    onBoundary,
    onScroll,
    content: wrap,
  });
  useImperativeHandle(ref, () => ({ toTop, toBottom, toLeft, toRight }), [toBottom, toLeft, toRight, toTop]);

  useEffect(() => {
    let off = () => {};

    if (isShowScrollbarX) {
      if (!(wrap.current && thumbX.current && thumbHandlerX.current)) return;
      const res = thumbHandlerX.current?.(wrap.current, thumbX.current);
      ({ setThumb: resetThumbX.current, off } = res);
    }

    return () => {
      off();
    };
  }, [isShowScrollbarX, thumbHandlerX]);

  useEffect(() => {
    let off = () => {};

    if (isShowScrollbarY) {
      if (!(wrap.current && thumbY.current)) return;
      const res = thumbHandlerY.current(wrap.current, thumbY.current);
      ({ setThumb: resetThumbY.current, off } = res);
    }

    return () => {
      off();
    };
  }, [isShowScrollbarY, thumbHandlerY]);

  return (
    <div
      className={classNames('ScrollWrap', className, styles.ScrollWrap, theme, {
        defaultHideScrollbar: !defaultHideScrollbar,
      })}
      style={wrapStyle}
    >
      <div ref={wrap} className="wrap">
        <div ref={content}>{children}</div>
      </div>
      {isShowScrollbarX && (
        <div className="scrollbar scrollbarX">
          <div ref={thumbX} className="thumb"></div>
        </div>
      )}
      {isShowScrollbarY && (
        <div className="scrollbar scrollbarY">
          <div ref={thumbY} className="thumb"></div>
        </div>
      )}
    </div>
  );
}

export default forwardRef(ScrollWrap);
