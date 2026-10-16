import { notification } from 'antd';

import { t } from '@/i18n/translate';

function extractFavicon(htmlText: string): null | string {
  // 只做轻量解析，优先识别常见 icon/shortcut icon，失败时回退默认图标。
  const pattern = /<link[^>]*rel=["'](?:shortcut\s+icon|icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i;
  const matches = pattern.exec(htmlText);
  if (matches && matches[1]) {return matches[1];}

  return null;
}

export const analyzeURL = async (url: string) => {
  let title = t('defaultBookmark');
  let icon = null;

  try {
    const htmlText = await fetch(url, { signal: AbortSignal.timeout(8000) }).then(async (res) => {
      const { status } = res;
      const text = res.text();
      if (status >= 200 && status < 300) {return text;}

      return Promise.reject(text);
    });

    title = (htmlText.match(/(?<=<title.*>).*(?=<\/title>)/g) || [])[0] ?? title;
    icon = extractFavicon(htmlText);

    if (icon && !icon.startsWith('http')) {
      // favicon 可能是相对路径，需要根据原 URL 补成可直接访问的绝对地址。
      const base = new URL(icon, url);
      icon = base.href;
    }
  } catch (error) {
    notification.error({
      message: t('parseFail'),
      description: t('parseFailDesc'),
    });
  }

  return {
    title,
    icon,
  };
};
