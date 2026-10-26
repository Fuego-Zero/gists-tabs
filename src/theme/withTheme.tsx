import { App, type AppProps, ConfigProvider, theme } from 'antd';
import type { Locale } from 'antd/es/locale';
import deDE from 'antd/locale/de_DE';
import enUS from 'antd/locale/en_US';
import esES from 'antd/locale/es_ES';
import frFR from 'antd/locale/fr_FR';
import jaJP from 'antd/locale/ja_JP';
import koKR from 'antd/locale/ko_KR';
import ptBR from 'antd/locale/pt_BR';
import ruRU from 'antd/locale/ru_RU';
import zhCN from 'antd/locale/zh_CN';
import zhTW from 'antd/locale/zh_TW';
import dayjs from 'dayjs';
import React, { useLayoutEffect } from 'react';

import { useLocale } from '@/hooks/useLocale';
import { useStorageItem } from '@/hooks/useStorageItem';
import { type AppLocale, localeMeta } from '@/i18n/locales';
import { setActiveLocale, t } from '@/i18n/translate';
import { themeItem } from '@/storage/items';
import type { ReactComponent } from '@/types/utils';

import 'dayjs/locale/de';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/ru';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/zh-tw';

const themeToken = {
  token: {
    colorPrimary: '#1677ff',
  },
};

// antd 默认让整行列表接收点击，会挡住提示下方的顶栏；提示条本身仍保留点击与悬停。
const messageConfig: AppProps['message'] = {
  styles: { listContent: { pointerEvents: 'none' } },
};

function ThemeFrame(props: { children: React.ReactNode }) {
  const { token } = theme.useToken();

  useLayoutEffect(() => {
    document.body.style.backgroundColor = token.colorBgLayout;
    document.body.style.color = token.colorText;
  }, [token.colorBgLayout, token.colorText]);

  return props.children;
}

const antdLocale: Record<AppLocale, Locale> = {
  de: deDE,
  en: enUS,
  es: esES,
  fr: frFR,
  ja: jaJP,
  ko: koKR,
  pt_BR: ptBR,
  ru: ruRU,
  zh_CN: zhCN,
  zh_TW: zhTW,
};

function ThemeRoot(props: { children: React.ReactNode }) {
  const mode = useStorageItem(themeItem, 'light');
  const locale = useLocale();
  setActiveLocale(locale);
  dayjs.locale(localeMeta(locale).dayjs);

  useLayoutEffect(() => {
    document.documentElement.lang = localeMeta(locale).intlTag;
    document.title = t('appTitle');
  }, [locale]);

  return (
    <ConfigProvider
      locale={antdLocale[locale]}
      theme={{
        ...themeToken,
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        components: {
          Layout: {
            headerBg: mode === 'dark' ? '#141414' : '#ffffff',
            headerHeight: 48,
          },
          ...(mode === 'dark'
            ? {
                Menu: {
                  itemColor: 'rgba(255, 255, 255, 0.65)',
                  itemHoverColor: '#ffffff',
                  itemSelectedColor: '#ffffff',
                  itemSelectedBg: '#1677ff',
                  horizontalItemSelectedColor: '#ffffff',
                  horizontalItemSelectedBg: '#1677ff',
                  horizontalItemHoverColor: '#ffffff',
                  activeBarHeight: 0,
                },
              }
            : {}),
        },
      }}
    >
      <App component={false} message={messageConfig}>
        <ThemeFrame>{props.children}</ThemeFrame>
      </App>
    </ConfigProvider>
  );
}

/**
 * 应用主题（HOC）
 *
 * @description 用于组件需要使用 ConfigProvider 配置的HOC，不支持泛型组件！
 */
function withTheme<P extends {}>(Component: ReactComponent<P>) {
  return (props: P) => (
    <ThemeRoot>
      <Component {...props} />
    </ThemeRoot>
  );
}

/**
 * 应用主题（组件）
 *
 * @description 用于组件需要使用 ConfigProvider 配置的包裹组件。
 */
function WithTheme(props: { children: React.ReactNode }) {
  return <ThemeRoot>{props.children}</ThemeRoot>;
}

export { WithTheme, withTheme };
export default withTheme;
