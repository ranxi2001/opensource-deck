<p align="center">
  <img src="docs/assets/readme-banner.png" alt="OpenSourceDeck - 个人开源贡献工作台" />
</p>

<p align="center">
  简体中文 &middot; <a href="README_EN.md">English</a>
</p>

<p align="center">
  <a href="https://onefly.top/opensource-deck/"><img src="https://img.shields.io/badge/live_dashboard-open-1f7a55?style=flat-square" alt="打开在线工作台" /></a>
  <a href="https://github.com/ranxi2001/opensource-deck/actions/workflows/ci.yml"><img src="https://github.com/ranxi2001/opensource-deck/actions/workflows/ci.yml/badge.svg" alt="CI 状态" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2f6feb?style=flat-square" alt="MIT 许可证" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a?style=flat-square" alt="Node.js 24 或更高版本" />
  <img src="https://img.shields.io/badge/GitHub_access-read--only-7357bd?style=flat-square" alt="只读访问 GitHub" />
</p>

<p align="center">
  <strong>无需复杂配置，只要 Fork，你就拥有了自己的开源工作台。</strong><br />
  自动汇总分散在 GitHub Issues、Pull Requests、Review 和 CI 中的贡献动态。
</p>

<p align="center">
  <a href="https://onefly.top/opensource-deck/">在线体验</a> &middot;
  <a href="#快速开始github-pages">快速开始</a> &middot;
  <a href="docs/ARCHITECTURE.md">架构</a> &middot;
  <a href="docs/DEPLOYMENT.md">部署</a> &middot;
  <a href="CHANGELOG.md">更新日志</a> &middot;
  <a href="CONTRIBUTING.md">参与贡献</a>
</p>

> [!NOTE]
> **v0.1 公共模式已经上线。** 私有仓库访问需要单独配置 OAuth 中继，官方公开部署未启用该功能。

## 快速开始：GitHub Pages

推荐直接 Fork 本仓库，使用内置 GitHub Actions 构建你的专属工作台。工作流会自动把 Fork 所有者识别为默认 GitHub 用户，并根据仓库名计算 Pages 路径，**不需要修改任何项目文件**，后续可以直接同步上游更新。

1. [Fork 本仓库](https://github.com/ranxi2001/opensource-deck/fork)。
2. 进入 Fork 后的 **Actions** 页面；如果 GitHub 提示工作流尚未启用，点击启用。
3. 打开 **Settings → Pages**，将 **Source** 设置为 **GitHub Actions**。
4. 回到 **Actions**，选择 **Sync and deploy Pages**，点击 **Run workflow** 首次运行。
5. 工作流完成后，打开 `https://<你的用户名>.github.io/<仓库名>/`。如果仓库名是 `<你的用户名>.github.io`，则直接打开 `https://<你的用户名>.github.io/`。

此后工作流会每小时自动刷新公开数据。生成的账户数据只进入 Pages 构建产物，不会提交到你的仓库。个人账号 Fork 无需额外配置；如果 Fork 位于组织账号下，可在仓库 Actions Variables 中设置 `OSDECK_GITHUB_USER`，指定要展示的个人 GitHub 用户名，同样无需修改项目文件。自定义域名和私有仓库模式参见[部署文档](docs/DEPLOYMENT.md)。

## 工作台预览

[![OpenSourceDeck 桌面端工作台](docs/assets/dashboard-desktop.png)](https://onefly.top/opensource-deck/)

<details>
<summary>查看移动端工作台</summary>
<br />
<p align="center">
  <img src="docs/assets/dashboard-mobile.png" width="390" alt="OpenSourceDeck 移动端工作台" />
</p>
</details>

## 功能亮点

- 根据 GitHub 账户活动自动发现贡献事项，无需手工维护仓库列表。
- 默认使用简体中文界面。
- 从近期活跃项目中发现最近 30 天更新的开放 Issue，并支持按仓库、关键词、指派状态和贡献标签筛选。
- 始终以完整的 `owner/name` 标识仓库。
- 将事项分为“需要操作”“等待上游”“进行中”“已完成”和“已暂缓”。
- 使用确定的来源事实和原因代码解释每个状态。
- 集中展示失败或等待中的 CI、Review 请求、修改请求、合并冲突、标签、角色和近期活动。
- 提供响应式项目导航、筛选、详情、快捷链接、主题和键盘命令搜索。
- 提供只读的 `osdeck` CLI 和随仓库分发的 Agent Skill，用于终端分拣和结构化自动化。

## 访问模式

### 公共用户名

在账户面板输入任意 GitHub 用户名，浏览器会匿名、只读地查询近期公开活动。为避免超出 GitHub 匿名 API 限额，实时视图最多读取 20 个近期活跃仓库，并优先为最近更新的 5 个作者或 Reviewer 开放 PR 补充当前 head 的 CI、Review、评论和合并状态。其他事项会明确显示数据不完整，不会把未知状态当作成功或“等待上游”。

近期 Issue 发现会扫描其中前 8 个仓库；认证采集最多扫描 20 个仓库。候选事项只使用 assignee、开放的关联 PR、`good first issue`、`help wanted` 等公开信号。未指派只表示 GitHub 没有 Assignee；若已有开放 PR，界面会同时显示该实现活动。开始贡献前仍需查看讨论、重叠 PR 和项目贡献政策。

仓库所有者的部署快照由 GitHub Actions 使用仓库级 `GITHUB_TOKEN` 每小时生成，并且只包含公开数据。顶部刷新按钮会保留完整快照和候选 Issue，只重新读取最近 10 个作者或 Reviewer 开放 PR 的当前 head、CI、Review、评论和合并状态。因此上传新 commit 后，可以直接手动刷新跟踪 CI，无需等待下一次 Pages 同步。若重点 PR 超过 10 个，其余项目保留上次同步数据；也可以在 Actions 页面手动运行 **Sync and deploy Pages** 完成全量同步。

### GitHub 登录与私有仓库

`worker/` 下的可选中继实现了带 PKCE 的 GitHub OAuth、服务端授权码交换、精确来源校验，以及由 AES-GCM 加密的 HttpOnly 会话 Cookie。GitHub Token 不会返回前端，也不会写入 Pages 构建产物。

私有模式需要 GitHub OAuth App 和已部署的中继，参见[部署文档](docs/DEPLOYMENT.md)。推荐使用同站自定义域名，因为浏览器可能拦截跨站会话 Cookie。

## CLI

源码分发的 CLI 需要 Node.js 24 或更高版本，目前尚未发布到 npm。克隆仓库后构建并链接：

```bash
npm ci
npm link
osdeck summary
```

开发期间也可以不链接，直接运行：

```bash
npm run cli -- summary
npm run cli -- work --state needs_action
npm run cli -- issues --signal contribution_label
```

CLI 会依次读取 `--source`、`OSDECK_SOURCE`、本地公共缓存，最后回退到官方部署快照。所有检查命令都支持适合 Agent 使用的 `--json` 输出：

```bash
osdeck summary --json
osdeck work --project owner/repo --json
osdeck issues --signal unassigned --limit 100 --json
osdeck show 'owner/repo#123' --json
osdeck url 'owner/repo#123'
```

使用 `osdeck sync --user <login>` 刷新公共缓存。可选的 `GITHUB_TOKEN` 或 `GH_TOKEN` 可以提高公开数据的速率限制和增强程度，但 CLI 始终排除私有仓库，并且绝不写入 Token。私有仓库请使用浏览器中的 OAuth 模式。

## Agent Skill

配套 Skill 位于 `skills/opensource-deck/`。它会指导兼容的 Agent 使用结构化 CLI 输出、检查数据新鲜度和截断状态、保守解释队列原因，并在开始贡献前验证 GitHub 上的实时归属状态。

本地安装 Codex 时，可以通过符号链接暴露仓库内的 Skill，无需复制：

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
ln -s "$PWD/skills/opensource-deck" \
  "${CODEX_HOME:-$HOME/.codex}/skills/opensource-deck"
```

之后使用 `$opensource-deck` 调用。安装或发布 Skill 必须由用户明确执行，本仓库不会修改全局 Agent 设置。

## 本地开发

环境要求：Node.js 24 或更高版本。

```bash
npm ci
npm run dev
```

默认开发视图使用仓库中提交的公共样例数据。如需采集当前公共快照且不提交它：

```bash
GITHUB_TOKEN="$(gh auth token)" npm run sync -- --output public/data/live.json
VITE_DATA_FILE=data/live.json npm run dev
```

不要使用具备私有仓库访问权限的 Token 生成静态 Pages 快照。

## 验证

```bash
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
```

`npm run check` 覆盖格式、Lint、TypeScript、单元/组件/安全测试、生产构建和 Cloudflare Worker dry-run。Playwright 覆盖桌面端与移动端交互、Axe 无障碍检查和横向溢出检查。

## 仓库结构

| 路径                     | 用途                              |
| ------------------------ | --------------------------------- |
| `src/domain/`            | 带版本的 Schema、分类、聚合与筛选 |
| `scripts/`               | GitHub 数据采集和原子快照生成     |
| `cli/`                   | 面向用户与 Agent 的只读命令接口   |
| `skills/opensource-deck` | 随仓库分发的 Agent 工作流         |
| `src/components/`        | 工作台与账户访问界面              |
| `worker/`                | 私有仓库模式使用的可选 OAuth 中继 |
| `e2e/`                   | Playwright 与可复用的 CDP 验证    |
| `.github/workflows/`     | CI、公共快照和 Pages 部署         |
| `docs/PRD.md`            | 产品需求与验收约定                |
| `docs/ARCHITECTURE.md`   | 运行时、数据、认证与信任边界      |
| `docs/DEPLOYMENT.md`     | Pages 与可选 OAuth 中继配置       |

## 产品原则

- **只读**：OpenSourceDeck 绝不修改上游 GitHub 状态。
- **可解释**：使用确定的原因代码，不使用不透明的分数。
- **公共构建产物**：私有仓库数据绝不进入静态构建输出。
- **安全会话**：私有 Token 仅保存在中继加密的 HttpOnly Cookie 中。
- **工作台优先**：应用打开后直接进入工作视图，而不是营销页面。

## 参考项目

OpenSourceDeck 参考了 [PersonalDashboard](https://github.com/roshkhatri/PersonalDashboard)、[gh-dash](https://github.com/dlvhdr/gh-dash) 和 [Octobox](https://github.com/octobox/octobox) 的产品思路。本项目为独立实现，不包含它们的源代码。

## 参与贡献与安全

提交改动前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。如需报告安全漏洞或私有数据泄露，请不要创建公开 Issue，而应遵循 [SECURITY.md](SECURITY.md)。

## 许可证

[MIT](LICENSE)
