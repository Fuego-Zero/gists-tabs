import type { GistsTabs, Page } from '@/types';

/** 旧版本写进存储的默认页名。只用于认出历史数据，新数据用 nameKey。 */
const LEGACY_HOME_NAMES = new Set(['首页', '主页']);

export function isInitialCanvas(data: GistsTabs | null | undefined): boolean {
  if (!data || data.pages.length !== 1) {return false;}

  const page = data.pages[0];
  if (page.widgets.length !== 0) {return false;}

  return page.nameKey === 'home' || LEGACY_HOME_NAMES.has(page.name);
}

export function tagLegacyHome(page: Page): Page {
  if (page.nameKey === 'home' || !LEGACY_HOME_NAMES.has(page.name)) {return page;}

  return { ...page, nameKey: 'home' };
}
