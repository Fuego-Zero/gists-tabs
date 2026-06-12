import type { Page, Widget } from '@/types';

import type { SortModeWidget, WidgetColumnEdgePosition, WidgetInsertPosition } from '../types';

// sort mode 只需要轻量字段，避免渲染 Bookmark 内部大列表带来的性能压力。
export const createSortModeWidgets = (widgets: Page['widgets']): SortModeWidget[] =>
  widgets.map(({ col, id, name, row, type }) => ({ col, id, name, row, type }));

const buildWidgetIndexMap = <T extends SortModeWidget>(widgets: T[]) =>
  new Map(widgets.map((widget, index) => [widget.id, index] as const));

const applyWidgetPosition = <T extends SortModeWidget>(
  nextWidgets: T[],
  widgetIndexMap: Map<Widget['id'], number>,
  widget: T,
  col: Widget['col'],
  row: Widget['row'],
) => {
  if (widget.col === col && widget.row === row) return false;

  const index = widgetIndexMap.get(widget.id);
  if (index === undefined) return false;

  nextWidgets[index] = { ...widget, col, row };

  return true;
};

const applyColumnRows = <T extends SortModeWidget>(
  nextWidgets: T[],
  widgetIndexMap: Map<Widget['id'], number>,
  columnWidgets: T[],
  col: Widget['col'],
) =>
  // row 是列内连续序号，任何移动后都按当前列顺序重新压实，避免留下空洞。
  columnWidgets.reduce(
    (hasChanged, widget, row) => applyWidgetPosition(nextWidgets, widgetIndexMap, widget, col, row) || hasChanged,
    false,
  );

const getColumnWidgets = <T extends SortModeWidget>(widgets: T[], col: Widget['col'], excludeWidgetId?: Widget['id']) =>
  widgets.filter((widget) => widget.col === col && widget.id !== excludeWidgetId).sort((a, b) => a.row - b.row);

export const moveWidgetPositionInList = <T extends SortModeWidget>(
  widgets: T[],
  sourceId: Widget['id'],
  targetId: Widget['id'],
  insertPosition: WidgetInsertPosition,
): T[] => {
  if (sourceId === targetId) return widgets;

  const source = widgets.find((item) => item.id === sourceId);
  const target = widgets.find((item) => item.id === targetId);

  if (!source || !target) return widgets;

  const nextWidgets = [...widgets];
  const widgetIndexMap = buildWidgetIndexMap(widgets);
  const sourceCol = source.col;
  const targetCol = target.col;
  // 先从目标列移除 source，再按 before/after 插入，兼容同列和跨列移动。
  const targetColumn = getColumnWidgets(widgets, targetCol, sourceId);
  const targetIndex = targetColumn.findIndex((widget) => widget.id === targetId);

  if (targetIndex === -1) return widgets;

  targetColumn.splice(insertPosition === 'after' ? targetIndex + 1 : targetIndex, 0, source);

  let hasPositionChanged = applyColumnRows(nextWidgets, widgetIndexMap, targetColumn, targetCol);

  if (sourceCol !== targetCol) {
    // 跨列移动时，源列被拿走一个元素，也需要重新计算 row。
    hasPositionChanged =
      applyColumnRows(nextWidgets, widgetIndexMap, getColumnWidgets(widgets, sourceCol, sourceId), sourceCol) ||
      hasPositionChanged;
  }

  return hasPositionChanged ? nextWidgets : widgets;
};

export const moveWidgetToColumnEdgeInList = <T extends SortModeWidget>(
  widgets: T[],
  widgetId: Widget['id'],
  edgePosition: WidgetColumnEdgePosition,
): T[] => {
  const source = widgets.find((item) => item.id === widgetId);

  if (!source) return widgets;

  const nextWidgets = [...widgets];
  const widgetIndexMap = buildWidgetIndexMap(widgets);
  const columnWidgets = getColumnWidgets(widgets, source.col, widgetId);

  if (edgePosition === 'top') {
    columnWidgets.unshift(source);
  } else {
    columnWidgets.push(source);
  }

  const hasPositionChanged = applyColumnRows(nextWidgets, widgetIndexMap, columnWidgets, source.col);

  return hasPositionChanged ? nextWidgets : widgets;
};

export const moveWidgetToColumnInList = <T extends SortModeWidget>(
  widgets: T[],
  widgetId: Widget['id'],
  targetCol: Widget['col'],
): T[] => {
  const source = widgets.find((item) => item.id === widgetId);

  if (!source) return widgets;

  const nextWidgets = [...widgets];
  const widgetIndexMap = buildWidgetIndexMap(widgets);
  const sourceCol = source.col;
  // 空列承接区没有具体 target，统一把拖入的卡片放到目标列尾部。
  const targetColumn = getColumnWidgets(widgets, targetCol, widgetId);

  targetColumn.push(source);

  let hasPositionChanged = applyColumnRows(nextWidgets, widgetIndexMap, targetColumn, targetCol);

  if (sourceCol !== targetCol) {
    hasPositionChanged =
      applyColumnRows(nextWidgets, widgetIndexMap, getColumnWidgets(widgets, sourceCol, widgetId), sourceCol) ||
      hasPositionChanged;
  }

  return hasPositionChanged ? nextWidgets : widgets;
};
