import type { SyncStatus } from '@/types/sync';

import { en, type MessageKey, zhCN } from './messages';

export type AppLocale = 'en' | 'zh_CN';

const dictionaries: Record<AppLocale, Record<MessageKey, string>> = {
  en,
  zh_CN: zhCN,
};

let currentLocale: AppLocale = 'zh_CN';

const statusKey: Record<SyncStatus, MessageKey> = {
  auth_failed: 'statusAuthFailed',
  conflict: 'statusConflict',
  failed: 'statusFailed',
  pending: 'statusPending',
  rate_limited: 'statusRateLimited',
  synced: 'statusSynced',
  syncing: 'statusSyncing',
};

/** 由界面在渲染前写入，供事件回调里的 t() 使用。 */
export function setActiveLocale(locale: AppLocale) {
  currentLocale = locale;
}

export function t(key: MessageKey): string {
  return dictionaries[currentLocale][key] ?? zhCN[key];
}

/** 存进 syncState 的限流错误。界面用 formatLastError 翻译，不把某一种语言写死在存储里。 */
export const RATE_LIMIT_ERROR_PREFIX = 'rate-limit:';

export function formatLastError(lastError?: string): string {
  if (!lastError) {return '';}

  if (lastError.startsWith(RATE_LIMIT_ERROR_PREFIX)) {
    return `${t('rateLimitHttp')} ${lastError.slice(RATE_LIMIT_ERROR_PREFIX.length)}`;
  }

  return lastError;
}

/** 自动创建的第一页用 nameKey 标识。改名后清掉 nameKey，之后只显示用户写的 name。 */
export function pageTitle(page: { name: string; nameKey?: 'home' }): string {
  if (page.nameKey === 'home') {return t('home');}

  return page.name;
}

export function syncStatusLabel(status: SyncStatus): string {
  return t(statusKey[status]);
}
