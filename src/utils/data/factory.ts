import { uuid } from '..';

import type { Page, Widget, WidgetDataMap, WidgetType } from '@/types';

export const createId = () => uuid();

/**
 * 创建页面
 */
export const createPage = (name: Page['name'], widgets: Page['widgets'] = []): Page => ({
  id: createId(),
  name,
  widgets,
});

const WIDGET_DATA: { [K in WidgetType]: WidgetDataMap[K] } = {
  bookmarks: {
    bookmarks: [],
    expanded: true,
  },
  clocks: {
    clocks: [],
  },
};

/**
 * 创建部件
 */
function createWidget<T extends WidgetType>(
  name: Widget['name'],
  type: T,
  row: Widget['row'],
  col: Widget['col'],
  data?: WidgetDataMap[T],
): Widget {
  return {
    id: createId(),
    name,
    type,
    row,
    col,
    data: data ?? WIDGET_DATA[type],
  } as Widget;
}

export { createWidget };
