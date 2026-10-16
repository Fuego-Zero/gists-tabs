import type { SyncMeta } from './sync';
import type { Bookmarks } from './widget/bookmark';
import type { Clocks } from './widget/clock';

export interface WidgetDataMap {
  bookmarks: Bookmarks;
  clocks: Clocks;
}

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

export interface Page {
  id: string;
  name: string;
  /** 自动创建的第一页。显示名由界面语言决定，不拿「主页」这个字符串做判断。 */
  nameKey?: 'home';
  widgets: Widget[];
}

export interface GistsTabs {
  pages: Page[];
  syncMeta?: SyncMeta;
  updateAt: number;
  version: number;
}

export type Theme = 'dark' | 'light';

export type { SyncConflictPayload, SyncMeta, SyncSnapshot, SyncState, SyncStatus } from './sync';
