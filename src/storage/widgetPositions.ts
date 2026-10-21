const FIRST_COLUMN = 0;
const LAST_COLUMN = 2;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isColumn(value: unknown): value is number {
  return value === FIRST_COLUMN || value === 1 || value === LAST_COLUMN;
}

function isRow(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 补上历史数据里没有位置的组件。col 不是 0、1、2 时放到第 0 列，row 排到该列末尾。
 * 只改位置字段；结构不对的部分原样返回，由画布校验决定是否接受。
 * 同一份数据每次修出来都一样。
 */
export function repairWidgetPositions(value: unknown): { repaired: boolean; value: unknown } {
  if (!isObject(value) || !Array.isArray(value.pages)) {return { repaired: false, value };}

  let repaired = false;
  const pages = value.pages.map((page) => {
    if (!isObject(page) || !Array.isArray(page.widgets)) {return page;}

    const orphans = page.widgets.filter((widget) => isObject(widget) && (!isColumn(widget.col) || !isRow(widget.row)));
    if (orphans.length === 0) {return page;}

    repaired = true;
    const nextRow = new Map<number, number>();
    for (const widget of page.widgets) {
      if (!isObject(widget) || !isColumn(widget.col) || !isRow(widget.row)) {continue;}

      nextRow.set(widget.col, Math.max(nextRow.get(widget.col) ?? -1, widget.row));
    }

    return {
      ...page,
      widgets: page.widgets.map((widget) => {
        if (!isObject(widget) || (isColumn(widget.col) && isRow(widget.row))) {return widget;}

        const col = isColumn(widget.col) ? widget.col : FIRST_COLUMN;
        const row = (nextRow.get(col) ?? -1) + 1;
        nextRow.set(col, row);
        return { ...widget, col, row };
      }),
    };
  });

  return repaired ? { repaired: true, value: { ...value, pages } } : { repaired: false, value };
}
