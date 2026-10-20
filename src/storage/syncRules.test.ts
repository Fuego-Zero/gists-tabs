import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canvasHash,
  canvasKey,
  decidePull,
  decidePush,
  decideVerify,
  parseCanvas,
  type PullInput,
  type PushInput,
} from './syncRules.ts';

import type { GistsTabs } from '../types/index.ts';

const canvas = (name: string, extra?: Partial<GistsTabs>): GistsTabs => ({
  pages: [{
    id: 'p1',
    name,
    widgets: [{
      col: 0,
      data: { bookmarks: [{ icon: null, id: 'b1', title: 'GitHub', url: 'https://github.com' }], expanded: true },
      id: 'w1',
      name: '常用',
      row: 0,
      type: 'bookmarks',
    }],
  }],
  updateAt: 1,
  version: 1,
  ...extra,
});

test('parseCanvas 接受当前与旧版本结构', () => {
  const current = canvas('工作', { syncMeta: { deviceId: 'd', revision: 'r1', updateAt: 1 } });
  assert.deepEqual(parseCanvas(JSON.parse(JSON.stringify(current))), current);

  const legacy = parseCanvas({
    pages: [{ id: 'p', name: '首页', widgets: [{ col: 0, data: [{ id: 'c', timezone: 'Asia/Shanghai' }], id: 'w', row: 0, type: 'clocks' }] }],
    updateAt: 2,
  });
  assert.equal(legacy?.version, 0);
  assert.equal(legacy?.syncMeta, undefined);

  assert.deepEqual(parseCanvas({ updateAt: 3 }), { pages: [], syncMeta: undefined, updateAt: 3, version: 1 });
});

test('parseCanvas 拒绝结构不对的数据', () => {
  assert.equal(parseCanvas(null), null);
  assert.equal(parseCanvas([]), null);
  assert.equal(parseCanvas({ pages: {} }), null);
  assert.equal(parseCanvas({ pages: [{ id: 'p', name: 'x' }] }), null);
  assert.equal(parseCanvas({ pages: [{ id: 'p', name: 'x', widgets: [{ id: 'w', col: 0, row: 0, type: 'notes', data: {} }] }] }), null);
  assert.equal(parseCanvas({ pages: [{ id: 'p', name: 'x', widgets: [{ id: 'w', col: 0, row: 0, type: 'bookmarks', data: { bookmarks: [{ id: 1 }] } }] }] }), null);
});

test('parseCanvas 丢弃没有 revision 的 syncMeta', () => {
  assert.equal(parseCanvas({ ...canvas('x'), syncMeta: { deviceId: 'd' } })?.syncMeta, undefined);
});

test('canvasKey 忽略 syncMeta、updateAt 与键顺序', () => {
  const a = canvas('工作', { syncMeta: { deviceId: 'a', revision: 'r1', updateAt: 1 }, updateAt: 1 });
  const b = canvas('工作', { syncMeta: { deviceId: 'b', revision: 'r2', updateAt: 9 }, updateAt: 9 });
  const reordered = JSON.parse(JSON.stringify({ version: b.version, pages: b.pages })) as GistsTabs;
  assert.equal(canvasKey(a), canvasKey(b));
  assert.equal(canvasKey(a), canvasKey(reordered));
  assert.notEqual(canvasKey(a), canvasKey(canvas('生活')));
});

test('canvasHash 对相同内容稳定，对不同内容不同', async () => {
  const a = await canvasHash(canvas('工作', { updateAt: 1 }));
  assert.equal(a, await canvasHash(canvas('工作', { updateAt: 2 })));
  assert.notEqual(a, await canvasHash(canvas('生活')));
  assert.match(a, /^[0-9a-f]{64}$/);
});

const push = (patch: Partial<PushInput>): PushInput => ({
  anchor: 'r1',
  baseHash: 'base',
  cloudHash: 'base',
  cloudHasContent: true,
  cloudRevision: 'r1',
  legacyConfirmed: false,
  localHash: 'local',
  localIsInitial: false,
  ...patch,
});

test('decidePush：云端 revision 等于锚点时直接推', () => {
  assert.deepEqual(decidePush(push({})), { kind: 'push' });
});

test('decidePush：同一份数据被推了两次，revision 不同但内容相同时认领', () => {
  assert.deepEqual(decidePush(push({ cloudHash: 'local', cloudRevision: 'r2' })), { kind: 'adopt' });
});

test('decidePush：云端只是 revision 变了、内容仍是基线时照常推', () => {
  assert.deepEqual(decidePush(push({ cloudRevision: 'r2' })), { kind: 'push' });
});

test('decidePush：两边内容都变了才算冲突', () => {
  assert.deepEqual(decidePush(push({ cloudHash: 'other', cloudRevision: 'r2' })), { kind: 'conflict', reason: 'revision' });
  assert.deepEqual(
    decidePush(push({ anchor: null, baseHash: null, cloudHash: 'other', cloudRevision: 'r2' })),
    { kind: 'conflict', reason: 'no-anchor' },
  );
});

test('decidePush：没有基线哈希时不能把 revision 变化当成可推', () => {
  assert.deepEqual(
    decidePush(push({ baseHash: null, cloudHash: 'base', cloudRevision: 'r2' })),
    { kind: 'conflict', reason: 'revision' },
  );
});

test('decidePush：只有从没同步过的空首页才采用云端', () => {
  assert.deepEqual(decidePush(push({ anchor: null, baseHash: null, localIsInitial: true })), { kind: 'use-cloud' });
  // 同步过的设备清空画布是正常编辑
  assert.deepEqual(decidePush(push({ localIsInitial: true })), { kind: 'push' });
  // 云端没有内容时新装机照常推
  assert.deepEqual(
    decidePush(push({ anchor: null, baseHash: null, cloudHasContent: false, cloudRevision: null, localIsInitial: true })),
    { kind: 'push' },
  );
});

test('decidePush：旧格式云端有内容时需要确认才覆盖，内容相同时直接推', () => {
  assert.deepEqual(decidePush(push({ cloudHash: 'other', cloudRevision: null })), { kind: 'conflict', reason: 'legacy' });
  assert.deepEqual(decidePush(push({ cloudHash: 'other', cloudRevision: null, legacyConfirmed: true })), { kind: 'push' });
  assert.deepEqual(decidePush(push({ cloudHash: 'local', cloudRevision: null })), { kind: 'push' });
  // 本机采用过的旧格式云端没再变过
  assert.deepEqual(decidePush(push({ anchor: null, cloudRevision: null })), { kind: 'push' });
});

const pull = (patch: Partial<PullInput>): PullInput => ({
  anchor: 'r1',
  cloudHash: 'cloud',
  cloudHasContent: true,
  cloudRevision: 'r2',
  localHash: 'local',
  ...patch,
});

test('decidePull：云端没变时不动', () => {
  assert.equal(decidePull(pull({ cloudRevision: 'r1' })), 'none');
});

test('decidePull：云端变了就套用，内容相同只认领', () => {
  assert.equal(decidePull(pull({})), 'apply');
  assert.equal(decidePull(pull({ cloudHash: 'local' })), 'adopt');
  assert.equal(decidePull(pull({ anchor: null })), 'apply');
});

test('decidePull：旧格式云端为空时不清空本机', () => {
  assert.equal(decidePull(pull({ cloudHasContent: false, cloudRevision: null })), 'none');
  assert.equal(decidePull(pull({ cloudHash: 'local', cloudRevision: null })), 'none');
  assert.equal(decidePull(pull({ cloudRevision: null })), 'apply');
});

test('decideVerify：按 revision 与内容核对推送结果', () => {
  const base = { cloudHash: 'pushed', cloudRevision: 'new', previousRevision: 'old', pushedHash: 'pushed', pushedRevision: 'new' };
  assert.equal(decideVerify(base), 'ok');
  assert.equal(decideVerify({ ...base, cloudRevision: 'other' }), 'adopt');
  assert.equal(decideVerify({ ...base, cloudHash: 'stale', cloudRevision: 'old' }), 'ok');
  assert.equal(decideVerify({ ...base, cloudHash: 'other', cloudRevision: 'other' }), 'conflict');
});
