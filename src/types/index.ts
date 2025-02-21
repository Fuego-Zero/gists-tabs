import type { Bookmarks } from './widget/bookmark';
import type { Clocks } from './widget/clock';

export type WidgetDataMap = {
  bookmarks: Bookmarks;
  clocks: Clocks;
};

export type WidgetType = keyof WidgetDataMap;

export type Widget = {
  [K in WidgetType]: {
    col: number;
    data: WidgetDataMap[K];
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
  version: number;
};

export type Theme = 'dark' | 'light';
