import { useStorageItem } from '@/hooks/useStorageItem';
import { type AppLocale, resolveLocale } from '@/i18n/locales';
import { localeItem } from '@/storage/items';

const UNSET_LOCALE = null;

/** 已保存的语言优先；没选过时跟随浏览器界面语言。 */
export function useLocale(): AppLocale {
  const stored = useStorageItem(localeItem, UNSET_LOCALE);
  return resolveLocale(stored);
}
