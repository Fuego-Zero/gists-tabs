import { notification } from 'antd';

function extractFavicon(htmlText: string): null | string {
  const pattern = /<link[^>]*rel=["'](?:shortcut\s+icon|icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i;
  const matches = htmlText.match(pattern);
  if (matches && matches[1]) return matches[1];
  return null;
}

export const analyzeURL = async (url: string) => {
  let title = '默认书签名称';
  let icon = null;

  try {
    const htmlText = await fetch(url).then(async (res) => {
      const { status } = res;
      const text = res.text();
      if (status >= 200 && status < 300) return text;
      return Promise.reject(text);
    });

    title = (htmlText.match(/(?<=<title.*>).*(?=<\/title>)/g) || [])[0] ?? title;
    icon = extractFavicon(htmlText);

    if (icon && !icon.startsWith('http')) {
      const base = new URL(icon, url);
      icon = base.href;
    }
  } catch (error) {
    notification.error({
      message: '解析失败',
      description: '无法解析该网址，采用默认名称和图标',
    });
  }

  return {
    title,
    icon,
  };
};
