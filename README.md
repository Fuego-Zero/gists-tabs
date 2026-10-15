# 芸笺 · Gists Tabs

芸笺 · Gists Tabs 是一个 Chrome 新标签页扩展：把浏览器首页变成你自己的多页工作台，在画布上放置书签、时钟等小组件。数据默认保存在本机扩展存储中；需要跨设备或备份时，可用自己的 GitHub Token 同步到个人 Gist。

## 功能概要

- 多页新标签画布
- 书签、时钟等小组件，支持拖拽排序
- Popup 快速添加书签
- Options：配置 GitHub Token 与云同步开关
- 本地存储；可选同步到个人 Gist
- 数据导入 / 导出
- 主题：light / dark

## 技术栈

Chrome MV3 · React 18 · TypeScript · Ant Design 5 · Tailwind · Webpack

当前版本见 `package.json`。

## 本地开发

前置：Node.js 与 Yarn。

| 命令 | 说明 |
|------|------|
| `yarn dev` | 清理后启动开发构建 |
| `yarn build` | 类型检查并产出生产构建 |
| `yarn lint` | `tsc --noEmit` + ESLint |

构建产物在 `build/`。在 Chrome 中加载已解压的扩展时，选择该目录即可。

## 许可证

MIT
