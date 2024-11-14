import React from 'react';

import { App, ConfigProvider } from 'antd';

import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';

import type { ReactComponent } from '@/types';

import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const themeProps = {
  theme: {
    token: {
      colorPrimary: '#1677ff',
    },
  },
  locale: zhCN,
};

/**
 * 应用主题（HOC）
 *
 * @description 用于组件需要使用 ConfigProvider 配置的HOC，不支持泛型组件！
 */
function withTheme<P extends {}>(Component: ReactComponent<P>) {
  return (props: P) => (
    <ConfigProvider {...themeProps}>
      <App component={false}>
        <Component {...props} />
      </App>
    </ConfigProvider>
  );
}

/**
 * 应用主题（组件）
 *
 * @description 用于组件需要使用 ConfigProvider 配置的包裹组件。
 */
function WithTheme(props: { children: React.ReactNode }) {
  return (
    <ConfigProvider {...themeProps}>
      <App component={false}>{props.children}</App>
    </ConfigProvider>
  );
}

export { WithTheme, withTheme };
export default withTheme;
