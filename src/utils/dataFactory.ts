import { uuid } from '.';

import type { Page, Widget, WidgetType } from '@/types';

export const createId = () => uuid();

/**
 * 创建页面
 */
export const createPage = (name: Page['name'], widgets: Page['widgets'] = []): Page => ({
  id: createId(),
  name,
  widgets,
});

const WIDGET_DATA: Record<WidgetType, any> = {
  bookmarks: [],
  clocks: [],
};

/**
 * 创建部件
 */
export const createWidget = (
  name: Widget['name'],
  type: Widget['type'],
  row: Widget['row'],
  col: Widget['col'],
  data?: Widget['data'],
): Widget => ({
  id: createId(),
  name,
  type,
  row,
  col,
  data: data ?? WIDGET_DATA[type],
});
