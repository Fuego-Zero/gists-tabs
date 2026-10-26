export const APP_LOCALES = ['en', 'zh_CN', 'zh_TW', 'ja', 'ko', 'es', 'pt_BR', 'de', 'fr', 'ru'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

interface LocaleMeta {
  /** dayjs 语言包名称。 */
  dayjs: string;
  /** 传给 Intl 和 toLocaleString 的标签。 */
  intlTag: string;
  /** 设置页下拉里显示的本名。 */
  nativeName: string;
}

export const LOCALE_META: Record<AppLocale, LocaleMeta> = {
  de: { dayjs: 'de', intlTag: 'de', nativeName: 'Deutsch' },
  en: { dayjs: 'en', intlTag: 'en', nativeName: 'English' },
  es: { dayjs: 'es', intlTag: 'es', nativeName: 'Español' },
  fr: { dayjs: 'fr', intlTag: 'fr', nativeName: 'Français' },
  ja: { dayjs: 'ja', intlTag: 'ja', nativeName: '日本語' },
  ko: { dayjs: 'ko', intlTag: 'ko', nativeName: '한국어' },
  pt_BR: { dayjs: 'pt-br', intlTag: 'pt-BR', nativeName: 'Português' },
  ru: { dayjs: 'ru', intlTag: 'ru', nativeName: 'Русский' },
  zh_CN: { dayjs: 'zh-cn', intlTag: 'zh-CN', nativeName: '简体中文' },
  zh_TW: { dayjs: 'zh-tw', intlTag: 'zh-TW', nativeName: '繁體中文' },
};

export function localeMeta(locale: AppLocale): LocaleMeta {
  return LOCALE_META[locale];
}

export function intlTag(locale: AppLocale): string {
  return LOCALE_META[locale].intlTag;
}

/** 浏览器语言标签映射到界面语言。匹配不到时用英文。 */
export function matchLocale(uiLanguage: string): AppLocale {
  const value = uiLanguage.replaceAll('_', '-').toLowerCase();
  if (value.startsWith('zh')) {
    if (value.includes('tw') || value.includes('hk') || value.includes('mo') || value.includes('hant')) {
      return 'zh_TW';
    }

    return 'zh_CN';
  }

  if (value.startsWith('pt')) {return 'pt_BR';}

  const prefix = value.split('-')[0];
  const byPrefix: Record<string, AppLocale> = {
    de: 'de',
    en: 'en',
    es: 'es',
    fr: 'fr',
    ja: 'ja',
    ko: 'ko',
    ru: 'ru',
  };
  return byPrefix[prefix] ?? 'en';
}

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value);
}

/** 扩展页面里用 Chrome 的界面语言，测试或非扩展环境退回浏览器语言。 */
export function readUiLanguage(): string {
  const fromChrome = globalThis.chrome?.i18n?.getUILanguage?.();
  if (fromChrome) {return fromChrome;}

  return globalThis.navigator?.language || 'en';
}

export function resolveLocale(stored: null | string | undefined): AppLocale {
  if (stored && isAppLocale(stored)) {return stored;}

  return matchLocale(readUiLanguage());
}
