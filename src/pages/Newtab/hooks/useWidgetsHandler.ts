import { useMemo } from 'react';

import { clone } from '@/utils';
import { createId, createWidget } from '@/utils/data/factory';

import { moveWidgetPositionInList } from '../utils/widgetPosition';

import type { GistsTabs, Page, Widget, WidgetDataMap, WidgetType } from '@/types';

import type { PageId, WidgetsHandler } from '../types';

export default function useWidgetsHandler(
  gistsTabs: GistsTabs,
  setGistsTabs: (data: GistsTabs) => void,
  activePageId: Page['id'],
): { widgets: Page['widgets'] } & WidgetsHandler {
  const widgets = useMemo(
    () => gistsTabs.pages.find((page) => page.id === activePageId)?.widgets ?? [],
    [gistsTabs, activePageId],
  );

  const addWidget = (type: WidgetType, col: number, row: number) => {
    widgets.push(createWidget('', type, row, col));
    setGistsTabs(gistsTabs);
  };

  const delWidget = (widgetId: Widget['id']) => {
    const index = widgets.findIndex((item) => item.id === widgetId);
    if (index === -1) return;

    widgets.splice(index, 1);

    setGistsTabs(gistsTabs);
  };

  const copyWidget = (widgetId: Widget['id']) => {
    const index = widgets.findIndex((item) => item.id === widgetId);
    if (index === -1) return;

    const source = widgets[index];
    const { col, data, name, row, type } = source;

    const newData: Widget['data'] = clone(data);

    // 复制 widget 时内部 item 必须重新生成 id，否则后续拖拽/编辑会把原件和副本混在一起。
    if (type === 'bookmarks') {
      (newData as WidgetDataMap['bookmarks']).bookmarks.forEach((item) => {
        item.id = createId();
      });
    } else if (type === 'clocks') {
      (newData as WidgetDataMap['clocks']).clocks.forEach((item) => {
        item.id = createId();
      });
    }

    const target = createWidget(`${name} 复制`, type, row + 1, col, newData);
    const sortedWidgets = widgets.filter((widget) => widget.col === col).sort((a, b) => a.row - b.row);

    // 副本插到原卡片下一行；如果后面已有卡片，逐个向下顺延 row。
    let lastRow = target.row;
    sortedWidgets.forEach((item) => {
      if (item.row !== lastRow) return;
      lastRow++;
      item.row = lastRow;
    });

    widgets.push(target);
    setGistsTabs(gistsTabs);
  };

  const editWidget = (widgetId: Widget['id'], data: Partial<Pick<Widget, 'data' | 'name'>>) => {
    const widget = widgets.find((item) => item.id === widgetId);
    if (!widget) return;

    Object.assign(widget, data);
    setGistsTabs(gistsTabs);
  };

  const saveWidgetsData: WidgetsHandler['saveWidgetsData'] = (widgetsData) => {
    const dataMap = new Map(widgetsData.map(({ data, id }) => [id, data]));
    let hasChanged = false;

    // 只保存 widget.data，供 Bookmark 内部拖拽这类局部数据变更使用。
    widgets.forEach((widget) => {
      const data = dataMap.get(widget.id);
      if (!data || widget.data === data) return;

      widget.data = data as Widget['data'];
      hasChanged = true;
    });

    if (!hasChanged) return;

    setGistsTabs(gistsTabs);
  };

  const moveWidgetToPage = (widgetId: Widget['id'], pageId: PageId) => {
    const widget = widgets.find((item) => item.id === widgetId);
    if (!widget) return;

    const page = gistsTabs.pages.find((item) => item.id === pageId);
    if (!page) return;

    widgets.splice(
      widgets.findIndex((item) => item.id === widgetId),
      1,
    );

    // 跨页面移动保留原列，row 放到目标页对应列末尾。
    const filteredData = page.widgets.filter(({ col }) => col === widget.col);
    widget.row = filteredData.length;
    page.widgets.push(widget);

    setGistsTabs(gistsTabs);
  };

  const moveWidgetPosition: WidgetsHandler['moveWidgetPosition'] = (sourceId, targetId, insertPosition) => {
    const nextWidgets = moveWidgetPositionInList(widgets, sourceId, targetId, insertPosition);
    if (nextWidgets === widgets) return;

    const page = gistsTabs.pages.find((item) => item.id === activePageId);
    if (!page) return;

    page.widgets = nextWidgets;
    setGistsTabs(gistsTabs);
  };

  const saveWidgetPositions: WidgetsHandler['saveWidgetPositions'] = (positions) => {
    const page = gistsTabs.pages.find((item) => item.id === activePageId);
    if (!page) return;

    // sort mode 保存只写回位置，避免覆盖排序过程中其它组件产生的数据变更。
    const positionMap = new Map(positions.map(({ col, id, row }) => [id, { col, row }]));
    let hasChanged = false;

    page.widgets.forEach((widget) => {
      const position = positionMap.get(widget.id);
      if (!position) return;

      if (widget.col !== position.col || widget.row !== position.row) {
        hasChanged = true;
      }

      widget.col = position.col;
      widget.row = position.row;
    });

    if (!hasChanged) return;

    setGistsTabs(gistsTabs);
  };

  return {
    widgets,
    addWidget,
    delWidget,
    copyWidget,
    editWidget,
    saveWidgetsData,
    moveWidgetPosition,
    moveWidgetToPage,
    saveWidgetPositions,
  };
}
