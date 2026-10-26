import assert from 'node:assert/strict';
import test from 'node:test';

import { bookmarkImportTree, foldersById, widgetsFromFolders, type ChromeBookmarkNode } from './chromeBookmarks.ts';

const tree: ChromeBookmarkNode[] = [
  {
    children: [
      {
        children: [
          { id: 'l1', title: 'GitHub', url: 'https://github.com' },
          { id: 'bad', title: '脚本', url: 'javascript:alert(1)' },
          {
            children: [{ id: 'l2', title: '', url: 'https://example.com/docs' }],
            id: 'nested',
            title: '文档',
          },
        ],
        id: 'work',
        title: '工作',
      },
      { children: [], id: 'empty', title: '空文件夹' },
    ],
    id: 'root',
    title: '',
  },
];

test('只收文件夹里的可打开链接，并丢掉空文件夹', () => {
  const nodes = bookmarkImportTree(tree);
  const folders = [...foldersById(nodes).values()];
  assert.deepEqual(folders.map((folder) => folder.title), ['工作', '文档']);
  assert.deepEqual(folders[0].links, [{ title: 'GitHub', url: 'https://github.com' }]);
  assert.equal(folders[1].links[0].title, 'https://example.com/docs');
});

test('新书签组轮流进入三栏，并排在已有组件后面', () => {
  const folders = [...foldersById(bookmarkImportTree(tree)).values(), {
    id: 'extra',
    links: [{ title: 'MDN', url: 'https://developer.mozilla.org' }],
    title: '参考',
  }];
  let seq = 0;
  const widgets = widgetsFromFolders(folders, [{ col: 0, row: 2 }, { col: 1, row: 0 }], () => `id-${seq += 1}`);
  assert.deepEqual(widgets.map((widget) => [widget.name, widget.col, widget.row]), [
    ['工作', 0, 3],
    ['文档', 1, 1],
    ['参考', 2, 0],
  ]);
  assert.equal(widgets[0].data.bookmarks[0].icon, null);
  assert.equal(widgets[0].data.expanded, true);
});
