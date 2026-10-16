# 芸笺 · Gists Tabs

芸笺 · Gists Tabs 是一个 Chrome / Firefox 新标签页扩展：把浏览器首页变成你自己的多页工作台，在画布上放置书签、时钟等小组件。数据默认保存在本机扩展存储中；需要跨设备或备份时，可用自己的 GitHub Token 同步到个人 Gist。

## 功能概要

- 多页新标签画布
- 书签、时钟等小组件，支持拖拽排序
- Popup 快速添加书签
- Options：配置 GitHub Token 与云同步开关
- 本地存储；可选同步到个人 Gist
- 数据导入 / 导出
- 主题：light / dark，可在新标签页和设置页切换
- 界面语言：中文 / English

## 技术栈

Chrome / Firefox MV3 · React 19 · TypeScript · Ant Design 6 · Tailwind CSS 4 · WXT

当前版本见 `package.json`。

## 本地开发

前置：Node.js 与 npm。

| 命令 | 说明 |
|------|------|
| `npm run dev` | Chrome 开发构建 |
| `npm run dev:firefox` | Firefox 开发构建 |
| `npm run build` | 类型检查并产出 Chrome 生产构建 |
| `npm run build:firefox` | 类型检查并产出 Firefox 生产构建 |
| `npm run lint` | `tsc --noEmit` + ESLint |
| `npm test` | 存储快照读取的单元测试 |

Chrome 构建产物在 `.output/chrome-mv3`。Firefox 构建产物在 `.output/firefox-mv2` 或 `.output/firefox-mv3`，以命令实际输出目录为准。在浏览器中加载已解压的扩展时，选择对应目录即可。

## 许可证

MIT
