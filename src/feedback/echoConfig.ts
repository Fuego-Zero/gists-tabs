import type { Locale } from '@echo-feedback/sdk';

import packageJson from '../../package.json' with { type: 'json' };
import type { AppLocale } from '../i18n/locales';

/** 回声服务的公开 Origin，不带路径。 */
export const echoServerUrl = 'https://echo.fuego.site';

/** 公开项目标识，不是管理员密钥。 */
export const echoProjectAk = 'DMZSXc5UsHxym5XfkXxG5Q_1evJRLXp_U9JqRxlHQHY';

export const echoProjectVersion: string = packageJson.version;

/** 回声表单只有简体中文和英文。简体与繁体都用简体，其余界面语言用英文。 */
export function toEchoLocale(locale: AppLocale): Locale {
  if (locale === 'zh_CN' || locale === 'zh_TW') {
    return 'zh-CN';
  }

  return 'en';
}
