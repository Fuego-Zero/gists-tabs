import type { Bookmarks } from './widget/bookmark';
import type { Clocks } from './widget/clock';

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

export type Theme = 'dark' | 'light';
