import assert from 'node:assert/strict';
import test from 'node:test';

import { BACKOFF_BASE_MS, BACKOFF_CAP_MS } from '../types/sync.ts';

import { nextRetryDelayMs, RATE_LIMIT_FALLBACK_MS } from './retryDelay.ts';

test('普通失败按次数拉长，最长 10 分钟', () => {
  assert.equal(BACKOFF_BASE_MS, 5_000);
  assert.equal(BACKOFF_CAP_MS, 10 * 60 * 1000);
  assert.equal(nextRetryDelayMs({ failureCount: 0, kind: 'transient' }), BACKOFF_BASE_MS);
  assert.equal(nextRetryDelayMs({ failureCount: 1, kind: 'transient' }), BACKOFF_BASE_MS * 2);
  assert.equal(nextRetryDelayMs({ failureCount: 2, kind: 'transient' }), BACKOFF_BASE_MS * 4);
  assert.equal(nextRetryDelayMs({ failureCount: 20, kind: 'transient' }), BACKOFF_CAP_MS);
});

test('限流优先使用响应头，不受 10 分钟上限截断', () => {
  const now = 1_000_000;
  assert.equal(nextRetryDelayMs({
    failureCount: 0,
    kind: 'rate_limit',
    now,
    retryAfterMs: 90 * 60 * 1000,
  }), 90 * 60 * 1000);
  assert.equal(nextRetryDelayMs({
    failureCount: 3,
    kind: 'rate_limit',
    now,
    resetAtMs: now + 45 * 60 * 1000,
  }), 45 * 60 * 1000);
});

test('限流没有恢复时间时至少等 1 分钟', () => {
  assert.equal(nextRetryDelayMs({
    failureCount: 0,
    kind: 'rate_limit',
    now: 1_000_000,
    resetAtMs: 1_000_000,
    retryAfterMs: 0,
  }), RATE_LIMIT_FALLBACK_MS);
});
