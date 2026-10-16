import assert from 'node:assert/strict';
import test from 'node:test';

import { commitSnapshot } from './snapshotCache.ts';

test('过期的首次读取不能覆盖更新的值', () => {
  const cache = new Map<string, unknown>();
  assert.equal(commitSnapshot(cache, 'local:gistsTabs', { pages: [] }, true), false);
  assert.equal(cache.has('local:gistsTabs'), false);

  assert.equal(commitSnapshot(cache, 'local:gistsTabs', { pages: ['newer'] }, false), true);
  assert.equal(commitSnapshot(cache, 'local:gistsTabs', { pages: ['stale'] }, true), false);
  assert.deepEqual(cache.get('local:gistsTabs'), { pages: ['newer'] });
});
