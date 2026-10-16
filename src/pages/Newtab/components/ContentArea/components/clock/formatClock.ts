import type { AppLocale } from '@/i18n/translate';

const intlLocale: Record<AppLocale, string> = {
  en: 'en',
  zh_CN: 'zh-CN',
};

export function currentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function timeZoneLabel(timeZone: string, locale: AppLocale): string {
  const city = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;
  try {
    const parts = new Intl.DateTimeFormat(intlLocale[locale], {
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
  const loc = intlLocale[locale];
  try {
    const time = new Intl.DateTimeFormat(loc, {
      hour: '2-digit',
      hourCycle: locale === 'zh_CN' ? 'h23' : 'h12',
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
