import { formatLastError, t } from '@/i18n/translate';
import type { SyncCommandResult } from '@/messaging';
import type { SyncState, SyncStatus } from '@/types/sync';

/** 同步提示共用一个 key，后来的结果覆盖前面的，不会叠成多条。 */
export const SYNC_NOTICE_KEY = 'sync-notice';

const ERROR_LABEL: Partial<Record<SyncStatus, 'errSync' | 'statusAuthFailed' | 'statusRateLimited'>> = {
  auth_failed: 'statusAuthFailed',
  failed: 'errSync',
  rate_limited: 'statusRateLimited',
};

export interface SyncNoticeApi {
  error: (content: { content: string; key: string }) => void;
  loading: (content: { content: string; duration: number; key: string }) => void;
  success: (content: { content: string; key: string }) => void;
}

/**
 * 自动同步的错误提示。非错误状态，或错误原因已被清掉时返回 null。
 * 手动同步会先清掉原因再开始，这一下不是一次新的失败。
 */
export function syncErrorContent(state: SyncState | null): string | null {
  if (!state?.lastError) {return null;}

  const label = ERROR_LABEL[state.status];
  if (!label) {return null;}

  const detail = formatLastError(state.lastError);
  return detail ? `${t(label)}：${detail}` : t(label);
}

/** 同一次错误（状态和原因都没变）只提醒一次。 */
export function syncErrorSignature(state: SyncState | null): null | string {
  if (!syncErrorContent(state) || !state) {return null;}

  return `${state.status}:${state.lastError ?? ''}`;
}

function withReason(failText: string, reason?: string): string {
  if (!reason || reason === failText) {return failText;}

  return `${failText}：${formatLastError(reason)}`;
}

/**
 * 手动同步只占一条提示：先显示「同步中」，结束后原地变成结果。
 */
export async function runSyncCommand(
  message: SyncNoticeApi,
  command: () => Promise<SyncCommandResult>,
  text: { failText: string; okText: string },
): Promise<void> {
  message.loading({ content: t('statusSyncing'), duration: 0, key: SYNC_NOTICE_KEY });
  try {
    const result = await command();
    if (result.ok) {
      message.success({ content: text.okText, key: SYNC_NOTICE_KEY });
      return;
    }

    message.error({ content: withReason(text.failText, result.reason), key: SYNC_NOTICE_KEY });
  } catch (error) {
    console.error('同步操作失败', error);
    message.error({ content: text.failText, key: SYNC_NOTICE_KEY });
  }
}
