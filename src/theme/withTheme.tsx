import { App, type AppProps, ConfigProvider, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import React, { useLayoutEffect } from 'react';

import { useStorageItem } from '@/hooks/useStorageItem';
import { setActiveLocale } from '@/i18n/translate';
import { localeItem, themeItem } from '@/storage/items';
import type { ReactComponent } from '@/types/utils';

import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';

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

function ThemeRoot(props: { children: React.ReactNode }) {
  const mode = useStorageItem(themeItem, 'light');
  const locale = useStorageItem(localeItem, 'zh_CN');
  setActiveLocale(locale);
  dayjs.locale(locale === 'en' ? 'en' : 'zh-cn');

  return (
    <ConfigProvider
      locale={locale === 'en' ? enUS : zhCN}
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
