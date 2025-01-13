import { useRef } from 'react';

import { PROPS_MAP } from '../constant';

import type { RemoveParameterByType } from '@/types/utils';

import type { UseHandlerParams, XY } from '../types';

export default function useHandler(params: UseHandlerParams) {
  const { onBoundary, onScroll, content } = params;

  /**
   * 用于给滑块初始化
   *
   * @description 包含滑动事件注入，尺寸计算
   * @param content 容器元素
   * @param thumb 滑块元素
   * @param xy 轴类型
   */
  function thumbHandler(content: HTMLElement, thumb: HTMLElement, xy: XY) {
    const props = PROPS_MAP[xy];

    const client = content[props.content.client];
    const scroll = content[props.content.scroll];

    let thumbSize = +(client * 0.25).toFixed(2);
    let wrapDelta = client - thumbSize;

    thumb.style[props.thumb.size] = `${thumbSize}px`;

    let contentDelta = scroll - client;
    let lastPosition = content[props.content.position];

    function setThumb() {
      const client = content[props.content.client];
      const scroll = content[props.content.scroll];

      thumbSize = +(client * 0.25).toFixed(2);
      wrapDelta = client - thumbSize;
      thumb.style[props.thumb.size] = `${thumbSize}px`;

      contentDelta = scroll - client;

      const position = content[props.content.position];

      const percent = position / contentDelta;
      const value = wrapDelta * percent;
      thumb.style[props.thumb.position] = `${value}px`;

      if (!(lastPosition === position)) onScroll({ percent, value }, xy);

      if (position === 0 && position < lastPosition) onBoundary(props.boundaryEventName.start);

      //! 该处使用 Math.ceil 是因为在不同系统缩放比例下面浏览器返回的值会有细微误差，导致无法精确计算，因为该误差很小，所以直接抹掉
      if (Math.ceil(position) + client === scroll && position > lastPosition) onBoundary(props.boundaryEventName.end);

      lastPosition = position;
    }

    function onMousedown(event: MouseEvent) {
      const mousePosition = event[props.mouse.position];
      const currentPosition = content[props.content.position];

      function onMouseMove(event: MouseEvent) {
        const delta = event[props.mouse.position] - mousePosition;
        content[props.content.position] = currentPosition + (delta / wrapDelta) * contentDelta;
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }

    content.addEventListener('scroll', setThumb);
    thumb.addEventListener('mousedown', onMousedown);

    return {
      setThumb,
      off: () => {
        content.removeEventListener('scroll', setThumb);
        thumb.removeEventListener('mousedown', onMousedown);
      },
    };
  }

  const thumbHandlerY = useRef<RemoveParameterByType<typeof thumbHandler, 'y'>>(
    (content: HTMLElement, thumb: HTMLElement) => thumbHandler(content, thumb, 'y'),
  );
  const thumbHandlerX = useRef<RemoveParameterByType<typeof thumbHandler, 'x'>>(
    (content: HTMLElement, thumb: HTMLElement) => thumbHandler(content, thumb, 'x'),
  );

  // #region toPosition

  function toTop() {
    if (!content.current) return;
    content.current.scrollTop = 0;
  }

  function toBottom() {
    if (!content.current) return;
    content.current.scrollTop = content.current.scrollHeight - content.current.clientHeight;
  }

  function toLeft() {
    if (!content.current) return;
    content.current.scrollLeft = 0;
  }

  function toRight() {
    if (!content.current) return;
    content.current.scrollLeft = content.current.scrollWidth - content.current.clientWidth;
  }

  // #endregion

  return {
    thumbHandlerX,
    thumbHandlerY,
    toTop,
    toBottom,
    toLeft,
    toRight,
  };
}
