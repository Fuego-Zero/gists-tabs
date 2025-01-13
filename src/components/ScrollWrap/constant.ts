import type { EL, XY } from './types';

export const PROPS_MAP: Record<XY, EL> = {
  x: {
    content: {
      scroll: 'scrollWidth',
      client: 'clientWidth',
      position: 'scrollLeft',
    },
    mouse: {
      position: 'clientX',
    },
    thumb: {
      size: 'width',
      position: 'left',
    },
    boundaryEventName: {
      end: 'right',
      start: 'left',
    },
  },
  y: {
    content: {
      scroll: 'scrollHeight',
      client: 'clientHeight',
      position: 'scrollTop',
    },
    mouse: {
      position: 'clientY',
    },
    thumb: {
      size: 'height',
      position: 'top',
    },
    boundaryEventName: {
      end: 'bottom',
      start: 'top',
    },
  },
};
