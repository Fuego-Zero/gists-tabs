/** 与 types/sync.ts 的 BACKOFF_BASE_MS 保持一致，测试会核对两边。 */
const TRANSIENT_RETRY_BASE_MS = 5_000;
/** 与 types/sync.ts 的 BACKOFF_CAP_MS 保持一致。 */
const TRANSIENT_RETRY_CAP_MS = 10 * 60 * 1000;

/** 响应里没有限流恢复时间时，至少等一分钟，避免立刻再打已经超额的接口。 */
export const RATE_LIMIT_FALLBACK_MS = 60 * 1000;

export interface RetryDelayInput {
  failureCount: number;
  kind: 'rate_limit' | 'transient';
  now?: number;
  resetAtMs?: number;
  retryAfterMs?: number;
}

/**
 * 计算下一次自动重试要等多久。
 * 限流听从响应头，可以长于普通失败的 10 分钟上限。
 * 普通失败按 5 秒、10 秒、20 秒拉长。
 */
export function nextRetryDelayMs(input: RetryDelayInput): number {
  if (input.kind === 'rate_limit') {
    const now = input.now ?? Date.now();
    const fromReset = input.resetAtMs ? input.resetAtMs - now : 0;
    const fromHeader = Math.max(input.retryAfterMs ?? 0, fromReset);
    if (fromHeader > 0) {return fromHeader;}

    return RATE_LIMIT_FALLBACK_MS;
  }

  const step = Math.max(input.failureCount, 0);
  return Math.min(TRANSIENT_RETRY_CAP_MS, TRANSIENT_RETRY_BASE_MS * 2 ** step);
}
