import assert from 'node:assert/strict';
import test from 'node:test';

import { isInitialCanvas } from './initialCanvas.ts';

import type { GistsTabs } from '../types/index.ts';

const canvas = (page: GistsTabs['pages'][number]): GistsTabs => ({
  pages: [page],
  updateAt: 1,
  version: 1,
});

test('空的默认页算未初始化，不看当前显示语言', () => {
  assert.equal(isInitialCanvas(canvas({ id: '1', name: 'Home', nameKey: 'home', widgets: [] })), true);
  assert.equal(isInitialCanvas(canvas({ id: '1', name: '首页', widgets: [] })), true);
  assert.equal(isInitialCanvas(canvas({ id: '1', name: '主页', widgets: [] })), true);
});

test('有小组件、多页或改过名的画布不算未初始化', () => {
  assert.equal(
    isInitialCanvas(canvas({ id: '1', name: '首页', widgets: [{ col: 0, data: { bookmarks: [], expanded: true }, id: 'w', name: '', row: 0, type: 'bookmarks' }] })),
    false,
  );
  assert.equal(isInitialCanvas({
    pages: [
      { id: '1', name: '首页', widgets: [] },
      { id: '2', name: '第二页', widgets: [] },
    ],
    updateAt: 1,
    version: 1,
  }), false);
  assert.equal(isInitialCanvas(canvas({ id: '1', name: '工作', widgets: [] })), false);
});
