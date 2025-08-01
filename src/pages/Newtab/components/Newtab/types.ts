import type { Page, Widget, WidgetType } from '@/types';

export type PageId = Page['id'];

export type PagesHandler = {
  addPage: () => void;
  copyPage: (pageId: PageId) => void;
  delPage: (pageId: PageId) => void;
  editPage: (pageId: PageId, name: PageId) => void;
};

export type WidgetsHandler = {
  addWidget: (type: WidgetType, col: number, row: number) => void;
  copyWidget: (widgetId: Widget['id']) => void;
  delWidget: (widgetId: Widget['id']) => void;
  editWidget: (widgetId: Widget['id'], data: Partial<Omit<Widget, 'id'>>) => void;
  moveWidgetToPage: (widgetId: Widget['id'], pageId: PageId) => void;
};
