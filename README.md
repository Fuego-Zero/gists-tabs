# 芸笺

基于 GitHub Gists 管理数据的 Chrome 新标签页扩展（仓库名仍为 `gists-tabs`）。

## 技术栈

Chrome MV3 · React 18 · TypeScript · Ant Design 5 · Tailwind · Webpack

## 分支策略（GitHub flow）

本仓库已从 gitflow 切换为 **GitHub flow**。

### 主干

- **唯一长期主干：`master`**（本轮不改名为 `main`）。
- 新工作一律从 `master` 拉取功能分支。
- **`develop` 已停用**：不再从 `develop` 拉新分支，也不再向 `develop` 合并。远程 `develop` 的删除须经 Fuego 按钮确认后再执行。

### 功能分支命名

| 前缀 | 用途 |
|------|------|
| `feat/` | 新功能 |
| `fix/` | 缺陷 |
| `chore/` | 脚手架、依赖、命名、文档流程等 |
| `docs/` | 纯文档 |

规则：一个功能/改动一个分支；分支名短横线小写（例如 `chore/readme-yunjian`）；不设长驻 release / hotfix 分支。

### 审后 PR 流程

1. 从 `master` 拉功能分支，本地开发（期间默认不推送）。
2. 功能完成后，经 **Fuego 按钮确认** 再推送并开 PR（base = `master`）。
3. `@芸笺-审核` 只读审：通过 / 有条件通过 / 打回。
4. 通过后由 **Fuego 在网页点合并**；合并后删除远程功能分支（删除亦须确认）。
5. 不设 bot 自动合并；不向 `develop` 合并。

### 本地说明（本分支落地）

- 当前开发请基于 `master` / 本仓库的功能分支。
- 若本地仍停留在 `develop`，请切回 `master` 再开新分支。
- **不要**自行推送；**不要**自行删除远程 `develop`。
