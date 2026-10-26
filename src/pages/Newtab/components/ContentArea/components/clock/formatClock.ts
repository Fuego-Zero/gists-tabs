import type { AppLocale } from '@/i18n/locales';

// 与 LOCALE_META.intlTag 一致。单独列出是为了让不经打包器的单测能直接加载这个文件。
const clockLocale: Record<AppLocale, string> = {
  de: 'de',
  en: 'en',
  es: 'es',
  fr: 'fr',
  ja: 'ja',
  ko: 'ko',
  pt_BR: 'pt-BR',
  ru: 'ru',
  zh_CN: 'zh-CN',
  zh_TW: 'zh-TW',
};

export function currentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function timeZoneLabel(timeZone: string, locale: AppLocale): string {
  const city = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;
  try {
    const parts = new Intl.DateTimeFormat(clockLocale[locale], {
      timeZone,
      timeZoneName: 'shortGeneric',
    }).formatToParts(new Date());
    const generic = parts.find((part) => part.type === 'timeZoneName')?.value;
    if (!generic || generic === city) {return city;}

    return `${city} · ${generic}`;
  } catch {
    return city;
  }
}

export function formatClockTime(timeZone: string, locale: AppLocale, date: Date): { date: string; time: string } {
  const loc = clockLocale[locale];
  try {
    const time = new Intl.DateTimeFormat(loc, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone,
    }).format(date);
    const day = new Intl.DateTimeFormat(loc, {
      day: 'numeric',
      month: 'short',
      timeZone,
      weekday: 'short',
    }).format(date);
    return { date: day, time };
  } catch {
    return { date: '', time: '--:--:--' };
  }
}

export function timeZoneOptions(locale: AppLocale): { label: string; options: { label: string; value: string }[] }[] {
  const groups = new Map<string, { label: string; value: string }[]>();
  for (const zone of Intl.supportedValuesOf('timeZone')) {
    const region = zone.split('/')[0] || 'Other';
    const options = groups.get(region) ?? [];
    options.push({ label: `${timeZoneLabel(zone, locale)} · ${zone}`, value: zone });
    groups.set(region, options);
  }

  return [...groups.entries()].map(([label, options]) => ({ label, options }));
}
