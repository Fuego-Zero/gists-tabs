import { clone } from '@/utils';

import type { Page, Widget } from '@/types';

import type { WidgetColumnEdgePosition, WidgetInsertPosition } from '../types';

const normalizeColumnRows = (columnWidgets: Widget[]) => {
  columnWidgets.forEach((widget, row) => {
    widget.row = row;
  });
};

export const moveWidgetPositionInList = (
  widgets: Page['widgets'],
  sourceId: Widget['id'],
  targetId: Widget['id'],
  insertPosition: WidgetInsertPosition,
): Page['widgets'] => {
  if (sourceId === targetId) return widgets;

  const nextWidgets = clone(widgets);
  const source = nextWidgets.find((item) => item.id === sourceId);
  const target = nextWidgets.find((item) => item.id === targetId);

  if (!source || !target) return widgets;

  const previousPositions = new Map(nextWidgets.map((widget) => [widget.id, { col: widget.col, row: widget.row }]));
  const sourceCol = source.col;
  const targetCol = target.col;
  const targetColumn = nextWidgets
    .filter((widget) => widget.col === targetCol && widget.id !== sourceId)
    .sort((a, b) => a.row - b.row);
  const targetIndex = targetColumn.findIndex((widget) => widget.id === targetId);

  if (targetIndex === -1) return widgets;

  source.col = targetCol;
  targetColumn.splice(insertPosition === 'after' ? targetIndex + 1 : targetIndex, 0, source);
  normalizeColumnRows(targetColumn);

  if (sourceCol !== targetCol) {
    normalizeColumnRows(
      nextWidgets.filter((widget) => widget.col === sourceCol && widget.id !== sourceId).sort((a, b) => a.row - b.row),
    );
  }

  const hasPositionChanged = nextWidgets.some((widget) => {
    const previousPosition = previousPositions.get(widget.id);

    return previousPosition?.col !== widget.col || previousPosition?.row !== widget.row;
  });

  return hasPositionChanged ? nextWidgets : widgets;
};

export const moveWidgetToColumnEdgeInList = (
  widgets: Page['widgets'],
  widgetId: Widget['id'],
  edgePosition: WidgetColumnEdgePosition,
): Page['widgets'] => {
  const nextWidgets = clone(widgets);
  const source = nextWidgets.find((item) => item.id === widgetId);

  if (!source) return widgets;

  const previousPositions = new Map(nextWidgets.map((widget) => [widget.id, { col: widget.col, row: widget.row }]));
  const columnWidgets = nextWidgets
    .filter((widget) => widget.col === source.col && widget.id !== widgetId)
    .sort((a, b) => a.row - b.row);

  if (edgePosition === 'top') {
    columnWidgets.unshift(source);
  } else {
    columnWidgets.push(source);
  }

  normalizeColumnRows(columnWidgets);

  const hasPositionChanged = nextWidgets.some((widget) => {
    const previousPosition = previousPositions.get(widget.id);

    return previousPosition?.col !== widget.col || previousPosition?.row !== widget.row;
  });

  return hasPositionChanged ? nextWidgets : widgets;
};
