import type React from 'react';

import type { Bookmarks } from './widget/bookmark';
import type { Clocks } from './widget/clock';

export type ReactComponent<T = any> = React.ComponentType<T>;
export type ReactForwardRefComponent<F = any, T = any> = React.ForwardRefRenderFunction<F, T>;

/**
 * 获取组件的props类型
 */
export type GetReactComponentProps<T extends ReactComponent> = T extends ReactComponent<infer P> ? P : never;

type WidgetTypeMap = {
  bookmarks: Bookmarks;
  clocks: Clocks;
};

export type WidgetType = keyof WidgetTypeMap;

export type Widget = {
  [K in WidgetType]: {
    col: number;
    data: WidgetTypeMap[K];
    id: string;
    name: string;
    row: number;
    type: K;
  };
}[WidgetType];

export type Page = {
  id: string;
  name: string;
  widgets: Widget[];
};

export type GistsTabs = {
  pages: Page[];
  updateAt: number;
};
