import type { SyncStatus } from '@/types/sync';

import type { AppLocale } from './locales';
import { de } from './messages/de';
import { en } from './messages/en';
import { es } from './messages/es';
import { fr } from './messages/fr';
import { ja } from './messages/ja';
import { ko } from './messages/ko';
import { ptBR } from './messages/ptBR';
import { ru } from './messages/ru';
import { type MessageKey, zhCN } from './messages/zhCN';
import { zhTW } from './messages/zhTW';

export type { AppLocale, MessageKey };

const dictionaries: Record<AppLocale, Record<MessageKey, string>> = {
  de,
  en,
  es,
  fr,
  ja,
  ko,
  pt_BR: ptBR,
  ru,
  zh_CN: zhCN,
  zh_TW: zhTW,
};

let currentLocale: AppLocale = 'en';

const statusKey: Record<SyncStatus, MessageKey> = {
  auth_failed: 'statusAuthFailed',
  conflict: 'statusConflict',
  failed: 'statusFailed',
  pending: 'statusPending',
  rate_limited: 'statusRateLimited',
  synced: 'statusSynced',
  syncing: 'statusSyncing',
};

const snapshotReasonKey: Record<string, MessageKey> = {
  'conflict-cloud': 'snapConflictCloud',
  'conflict-local': 'snapConflictLocal',
  'conflict-use-cloud': 'snapConflictUseCloud',
  'manual-pull': 'snapManualPull',
  'pre-push': 'snapPrePush',
  pull: 'snapPull',
  'pull-init': 'snapPullInit',
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

/** 存进 syncState 的可翻译错误。值是 MessageKey，展示时再按当前语言取出。 */
export const I18N_ERROR_PREFIX = 'i18n:';

export function i18nError(key: MessageKey): string {
  return `${I18N_ERROR_PREFIX}${key}`;
}

export function formatLastError(lastError?: string): string {
  if (!lastError) {return '';}

  if (lastError.startsWith(RATE_LIMIT_ERROR_PREFIX)) {
    return `${t('rateLimitHttp')} ${lastError.slice(RATE_LIMIT_ERROR_PREFIX.length)}`;
  }

  if (lastError.startsWith(I18N_ERROR_PREFIX)) {
    const key = lastError.slice(I18N_ERROR_PREFIX.length);
    if (isMessageKey(key)) {return t(key);}
  }

  return lastError;
}

function isMessageKey(key: string): key is MessageKey {
  return key in zhCN;
}

export function snapshotReasonLabel(reason: string): string {
  const key = snapshotReasonKey[reason];
  return key ? t(key) : reason;
}

/** 自动创建的第一页用 nameKey 标识。改名后清掉 nameKey，之后只显示用户写的 name。 */
export function pageTitle(page: { name: string; nameKey?: 'home' }): string {
  if (page.nameKey === 'home') {return t('home');}

  return page.name;
}

export function syncStatusLabel(status: SyncStatus): string {
  return t(statusKey[status]);
}
