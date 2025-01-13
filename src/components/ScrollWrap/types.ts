import type { RefObject } from 'react';

import type { Theme } from '@/types';
import type { ReactProps } from '@/types/utils';

export type ScrollBoundaryEventName = 'bottom' | 'left' | 'right' | 'top';

export type UseHandlerParams = {
  content: RefObject<HTMLElement | undefined>;
  onBoundary: (eventName: ScrollBoundaryEventName) => void;
  onScroll: (data: ScrollStatus, xy: XY) => void;
};

export type XY = 'x' | 'y';
export type EL = {
  boundaryEventName: {
    end: ScrollBoundaryEventName;
    start: ScrollBoundaryEventName;
  };
  content: {
    client: 'clientHeight' | 'clientWidth';
    position: 'scrollLeft' | 'scrollTop';
    scroll: 'scrollHeight' | 'scrollWidth';
  };
  mouse: {
    position: 'clientX' | 'clientY';
  };
  thumb: {
    position: 'left' | 'top';
    size: 'height' | 'width';
  };
};

export type ScrollStatus = {
  /**
   * 滚动百分比
   */
  percent: number;
  /**
   * 滚动值
   */
  value: number;
};

export type ScrollWrapProps = ReactProps<
  {
    defaultHideScrollbar?: boolean;
    height?: number | string;
    theme?: Theme;
    width?: number | string;
    zIndex?: number;
  } & {
    onBottom?: () => void;
    onLeft?: () => void;
    onRight?: () => void;
    onScrollX?: (data: ScrollStatus) => void;
    onScrollY?: (data: ScrollStatus) => void;
    onTop?: () => void;
  }
>;

type Fn = () => void;
export type ExposeMethods = { toBottom: Fn; toLeft: Fn; toRight: Fn; toTop: Fn };
