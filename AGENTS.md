# 芸笺 · Agent / 协作约定

面向项目组协作 bot 与协作者。人读的产品介绍见 [README.md](./README.md)。

## 项目路径与角色

- 本地路径：`D:\Own\gists-tabs`
- 角色：总控 / 设计 / 开发 / 审核；日常由总控在群里调度
- 群为主通道；被 @ 须立刻回「收到」并接活
- 推送、开 PR、删除远程分支等须经 Fuego 按钮确认

## 分支策略（GitHub flow）

本仓库已从 gitflow 切换为 **GitHub flow**。

- **唯一长期主干：`master`**（本轮不改名为 `main`）
- 新工作一律从 `master` 拉取功能分支
- **`develop` 已停用**：不再从 `develop` 拉新分支，也不再向 `develop` 合并。远程 `develop` 当前策略为**先留着暂不删**；若删除，须经 Fuego 按钮确认

若本地仍停留在 `develop`，请切回 `master` 再开新分支。

## 功能分支命名

| 前缀 | 用途 |
|------|------|
| `feat/` | 新功能 |
| `fix/` | 缺陷 |
| `chore/` | 脚手架、依赖、命名、文档流程等 |
| `docs/` | 纯文档 |

规则：一个功能 / 改动一个分支；分支名短横线小写（例如 `chore/readme-formal`）；不设长驻 release / hotfix 分支。

## 审后 PR 流程

1. 从 `master` 拉功能分支，本地开发（期间默认不推送）
2. 功能完成后，经 **Fuego 按钮确认** 再推送并开 PR（base = `master`）
3. `@芸笺-审核` 只读审：通过 / 有条件通过 / 打回
4. 通过后由 **Fuego 在网页点合并**；合并后删除远程功能分支（删除亦须确认）
5. 不设 bot 自动合并；不向 `develop` 合并

## 临时文件

- `.tmp/` 已写入 `.gitignore`，不得提交
- 整体进度 TODO 维护在 `.tmp/TODO.md`（不提交、不开 PR）；开发在节点同步更新

## 文档边界（备忘）

- `package.json` 的 `repository.url` 仍可能写旧名 `gist-tabs`，**另开 chore 再改**
- 清脚手架、扩展显示名等不在本约定文档范围内，另开任务
