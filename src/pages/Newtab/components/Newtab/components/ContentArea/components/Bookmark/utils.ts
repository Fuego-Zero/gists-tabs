function extractFavicon(htmlText: string): null | string {
  const pattern = /<link[^>]*rel=["'](?:shortcut\s+icon|icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i;
  const matches = htmlText.match(pattern);
  if (matches && matches[1]) return matches[1];
  return null;
}

export const analyzeURL = async (url: string) => {
  const htmlText = await fetch(url).then(async (res) => {
    const { status } = res;
    const text = res.text();
    if (status >= 200 && status < 300) return text;
    return Promise.reject(text);
  });

  const [title = '书签名称'] = htmlText.match(/(?<=<title.*>).*(?=<\/title>)/g) || [];
  let icon = extractFavicon(htmlText);

  if (icon && !icon.startsWith('http')) {
    const base = new URL(icon, url);
    icon = base.href;
  }

  return {
    title,
    icon,
  };
};
