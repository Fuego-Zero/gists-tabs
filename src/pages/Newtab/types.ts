import type { Page, Widget, WidgetType } from '@/types';

export type PageId = Page['id'];
export type SortModeStartReason = 'drag' | 'manual';
export type SortModeStartResult = {
  alreadySortMode: boolean;
  createDraftMs: number;
  reason: SortModeStartReason;
  syncMs: number;
  widgetCount: number;
};
export type SortModeWidget = Pick<Widget, 'col' | 'id' | 'name' | 'row' | 'type'>;
export type WidgetColumnEdgePosition = 'bottom' | 'top';
export type WidgetInsertPosition = 'after' | 'before';

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
  moveWidgetPosition: (sourceId: Widget['id'], targetId: Widget['id'], insertPosition: WidgetInsertPosition) => void;
  moveWidgetToPage: (widgetId: Widget['id'], pageId: PageId) => void;
  saveWidgetPositions: (positions: Pick<Widget, 'col' | 'id' | 'row'>[]) => void;
  saveWidgetsData: (widgetsData: { data: Widget['data']; id: Widget['id'] }[]) => void;
};
