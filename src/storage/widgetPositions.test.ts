import assert from 'node:assert/strict';
import test from 'node:test';

import { repairWidgetPositions } from './widgetPositions.ts';

const page = (widgets: unknown[]) => ({ pages: [{ id: 'p', name: '娱乐', widgets }] });

test('无效列放回第 0 列末尾', () => {
  const kept = { col: 0, id: 'a', row: 2 };
  const input = page([kept, { id: 'b', name: '泰拉瑞亚的复制' }]);
  const result = repairWidgetPositions(input);
  const widgets = (result.value as typeof input).pages[0].widgets;

  assert.equal(result.repaired, true);
  assert.notEqual(result.value, input);
  assert.equal(widgets[0], kept);
  assert.deepEqual(widgets[1], { col: 0, id: 'b', name: '泰拉瑞亚的复制', row: 3 });
});

test('多个需要修复的组件按原来的顺序排', () => {
  const result = repairWidgetPositions(page([
    { col: 0, id: 'a', row: 0 },
    { id: 'b' },
    { col: 5, id: 'c', row: 1 },
  ]));
  const widgets = (result.value as ReturnType<typeof page>).pages[0].widgets;

  assert.equal(widgets[1].col, 0);
  assert.equal(widgets[1].row, 1);
  assert.equal(widgets[2].col, 0);
  assert.equal(widgets[2].row, 2);
});

test('只缺 row 时保留原来的列', () => {
  const result = repairWidgetPositions(page([
    { col: 1, id: 'a', row: 4 },
    { col: 1, id: 'b' },
  ]));
  const widgets = (result.value as ReturnType<typeof page>).pages[0].widgets;

  assert.equal(widgets[1].col, 1);
  assert.equal(widgets[1].row, 5);
});

test('没有问题时返回原对象', () => {
  const input = page([{ col: 0, id: 'a', row: 0 }]);
  const result = repairWidgetPositions(input);

  assert.equal(result.repaired, false);
  assert.equal(result.value, input);
});

test('非预期结构原样返回', () => {
  assert.deepEqual(repairWidgetPositions(null), { repaired: false, value: null });
  assert.deepEqual(repairWidgetPositions([]), { repaired: false, value: [] });

  const bad = { pages: 'nope' };
  const result = repairWidgetPositions(bad);
  assert.equal(result.repaired, false);
  assert.equal(result.value, bad);
});
