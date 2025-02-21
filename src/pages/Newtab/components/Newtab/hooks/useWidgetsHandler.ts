import { useCallback, useMemo } from 'react';

import { clone } from '@/utils';
import { createId, createWidget } from '@/utils/data/factory';

import type { GistsTabs, Page, Widget, WidgetDataMap, WidgetType } from '@/types';

export type WidgetsHandler = {
  addWidget: (type: WidgetType, col: number, row: number) => void;
  copyWidget: (widgetId: Widget['id']) => void;
  delWidget: (widgetId: Widget['id']) => void;
  editWidget: (widgetId: Widget['id'], data: Partial<Omit<Widget, 'id'>>) => void;
};

export default function useWidgetsHandler(
  gistsTabs: GistsTabs,
  setGistsTabs: (data: GistsTabs) => void,
  activePageId: Page['id'],
): { widgets: Page['widgets'] } & WidgetsHandler {
  const widgets = useMemo(
    () => gistsTabs.pages.find((page) => page.id === activePageId)?.widgets ?? [],
    [gistsTabs, activePageId],
  );

  const addWidget = useCallback(
    (type: WidgetType, col: number, row: number) => {
      widgets.push(createWidget('', type, row, col));
      setGistsTabs(gistsTabs);
    },
    [gistsTabs, setGistsTabs, widgets],
  );

  const delWidget = useCallback(
    (widgetId: Widget['id']) => {
      const index = widgets.findIndex((item) => item.id === widgetId);
      if (index === -1) return;

      widgets.splice(index, 1);

      setGistsTabs(gistsTabs);
    },
    [gistsTabs, setGistsTabs, widgets],
  );

  const copyWidget = useCallback(
    (widgetId: Widget['id']) => {
      const index = widgets.findIndex((item) => item.id === widgetId);
      if (index === -1) return;

      const source = widgets[index];
      const { col, data, name, row, type } = source;

      const newData: Widget['data'] = clone(data);

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

      let lastRow = target.row;
      sortedWidgets.forEach((item) => {
        if (item.row !== lastRow) return;
        lastRow++;
        item.row = lastRow;
      });

      widgets.push(target);
      setGistsTabs(gistsTabs);
    },
    [gistsTabs, setGistsTabs, widgets],
  );

  const editWidget = useCallback(
    (widgetId: Widget['id'], data: Partial<Pick<Widget, 'data' | 'name'>>) => {
      const widget = widgets.find((item) => item.id === widgetId);
      if (!widget) return;

      Object.assign(widget, data);
      setGistsTabs(gistsTabs);
    },
    [gistsTabs, setGistsTabs, widgets],
  );

  return { widgets, addWidget, delWidget, copyWidget, editWidget };
}
