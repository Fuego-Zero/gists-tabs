import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  publicDir: 'src/public',
  modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],
  alias: {
    '@': 'src',
  },
  manifest: {
    name: '__MSG_extName__',
    short_name: '__MSG_extShortName__',
    description: '__MSG_extDescription__',
    default_locale: 'zh_CN',
    permissions: ['storage', 'tabs', 'activeTab', 'alarms'],
    action: {
      default_title: '__MSG_extActionTitle__',
      default_icon: {
        34: 'icon-34.png',
      },
    },
    icons: {
      128: 'icon-128.png',
    },
  },
});
