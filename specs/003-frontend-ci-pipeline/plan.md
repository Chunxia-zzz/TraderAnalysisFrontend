# Implementation Plan: 前端仓库接入 CI 流水线

**Branch**: `003-frontend-ci-pipeline` | **Date**: 2026-11-04 | **Spec**: [`spec.md`](./spec.md)

**Input**: Feature specification from `specs/003-frontend-ci-pipeline/spec.md`

## Summary

在 GitHub Actions 上接入一条与后端仓库同构的检查流水线：**锁文件安装 → ESLint → Vitest 单测 → 生产构建**，
外加独立的**全历史密钥扫描**。CI 不自己写命令，而是调用仓库内的 `scripts/check.sh`——
本地预检与 CI 跑的是同一个文件（满足 SC-002 的"同源"，而不是两份配置抄得像）。

接入前必须先把门禁所需的基础设施补齐：仓库当前**无 lint 配置、无测试**。因此本次同时新增
`eslint.config.js`、`vitest.config.js`、`tests/unit/` 与 5 个 devDependencies，并把存量规范违规清零。

## Technical Context

**Language/Version**: JavaScript（ESM，无 TypeScript）；Node 22（本地 v22.22.2，CI 固定 `22`）

**Primary Dependencies**: Vue 3.5 / Vite 5.4（运行时，本次**不新增任何运行时依赖**）
新增 devDependencies：`eslint@^10`、`@eslint/js@^10`、`eslint-plugin-vue@^10`、`vue-eslint-parser@^10`、`globals@^16`、`vitest@^5`

**Storage**: 无（纯静态 SPA；本次不碰数据层）

**Testing**: Vitest 5，`environment: node`，无浏览器、无后端、无网络

**Target Platform**: CI 为 `ubuntu-latest`；本地为 Windows + Git Bash（`scripts/check.sh` 两端都能跑）

**Project Type**: Single project（纯前端单仓，非前后端子目录结构）

**Performance Goals**: 单次流水线 ≤ 3 分钟（首次含冷缓存 ≤ 6 分钟）；本地预检 ≤ 90 秒（不含 `npm ci`）

**Constraints**:
- 不新增运行时依赖；devDependencies 只在构建期使用
- 不加覆盖率门禁、不加 Prettier、不加部署 job（理由见 spec「决策记录」）
- 不改业务代码语义；为过 lint 所做的改动仅限**不改变行为**的等价调整
- 构建的 `chunks > 500 kB` 告警是已知技术债，**不得**作为失败条件

**Scale/Scope**: `src/` 16 个文件 / 6588 行；1 个 workflow、1 个本地脚本、2 份工具配置、1 个测试目录、3 处文档

## Constitution Check

*GATE: 实施前逐条核对，实施后复检。不适用的也要写理由（constitution Governance 明确要求）。*

| 原则 | 判定 | 说明 |
|---|---|---|
| I. 空数据不是错误 | ✅ 不冲突 | 本次不改任何数据流；新增单测只断言「请求如何构造」，不断言响应体语义，因此不会把 `data: null` 的既有约定写死成另一种形态 |
| II. 两套信号体系在前端分开 | ✅ 不冲突（并被测试加固） | 新增的 API 层测试按端点分组，利弗莫尔用例只允许命中 `/api/livermore/*`，等于给「不得混入评分数据流」加了一道机器检查 |
| III. 口径与配色是固化的 | ✅ 不冲突 | 不触碰 `tokens.css` / 温度页配色。ESLint 若报这两个文件的问题，**只修语法级违规，不改任何色值或映射** |
| IV. 一个图表组件，一种多窗格做法 | ✅ 不冲突 | 不改图表；不新建 `KLineChart.vue`。lint 对 `IndicatorChart.vue` 的改动仅限 lint 要求的等价写法 |
| V. 文档与代码必须同时为真 | ✅ 适用，且**借机修正两处已失效描述** | README 增加流水线徽章与本地预检说明；`AGENTS.md` §3/§6 关于「`ScoresOverview.vue` 未挂载、`/scores-overview` 是死链」已与代码不符（001 已修好），按现状更正并加勘误行。`docs/architecture.md` 本次不改——它描述的是代码结构与数据流，本次未改变结构，理由记在 tasks 收尾项 |
| VI. 规范先行（Before code） | ✅ 满足 | 本 spec/plan/tasks 先于任何代码改动；实现提交必须晚于 `spec.md` |
| §二 安全与数据边界 | ✅ 满足 | `.github/workflows/` 内不出现任何 secret 字面量；密钥扫描用内置 `GITHUB_TOKEN`；spec/plan/文档不写入账户或仓位信息 |
| §三 质量门 | ✅ 扩展而非替换 | 原有三条 smoke 脚本仍是本地验收手段；本次新增的是「任何改动都要跑」的最小门 |

无违规项 → **Complexity Tracking 留空**。

## 技术方案

### 1. 为什么 CI 只调 `scripts/check.sh`

两份配置（CI 一份、本地一份）必然漂移——这是"本地绿、CI 红"的根因。做法：

```
scripts/check.sh   ← 唯一真相源（安装 → lint → test → build）
        ↑
  ┌─────┴─────┐
GitHub Actions   开发者本地
(直接 bash 它)    (直接 bash 它)
```

`check.sh` 的内部顺序是"便宜的在前、昂贵的在后"，任一步 `set -e` 直接退出：

| 顺序 | 步骤 | 命令 | 失败含义 |
|---|---|---|---|
| 1 | 依赖安装 | `npm ci`（`node_modules/` 不存在或传 `--fresh` 时才执行） | 锁文件与 `package.json` 不同步 |
| 2 | 规范检查 | `npm run lint` | 代码违规 |
| 3 | 单元测试 | `npm run test:unit` | 逻辑/契约回归 |
| 4 | 生产构建 | `npm run build` | 无法产出可部署产物 |

CI 里 `node_modules/` 必然不存在，所以第 1 步必然执行——同一份脚本在两端行为一致，不是靠约定。

### 2. ESLint 选型与强度

- **flat config**（`eslint.config.js`，ESLint 10 只支持 flat）
- 基础：`@eslint/js` 的 `recommended`（`no-unused-vars`、`no-undef` 等真问题）
- Vue：`eslint-plugin-vue` 的 **`flat/essential`**
- 环境：`.js`/`.vue` 用 `globals.browser`；`tests/`、`scripts/`、`vite.config.js`、`vitest.config.js` 用 `globals.node`
- 覆盖范围：`src/**/*.{js,vue}` + `vite.config.js` + `vitest.config.js` + `scripts/**/*.mjs` + `tests/**/*.js`

**为什么不用 `flat/recommended`**：它包含大量纯风格规则（`attributes-order`、`html-indent` 等），
会在 6588 行存量代码上产出成百条违例。为避免"改门禁强度去迁就代码"，也避免"改一遍业务代码只为对齐缩进"，
本次取 `essential`（只保留能挡住真 bug 的规则）并在 `AGENTS.md` 记录：**要升级强度需单独提 spec**。

### 3. 单测范围（≥15 条，全部离线）

| 测试文件 | 覆盖什么 | 为什么值得测 |
|---|---|---|
| `tests/unit/api.spec.js` | `src/api/trader.js` 全部导出的 **method + URL + params 构造**（mock `axios`） | 这是前端唯一的数据出入口；参数构造错了页面就是空白，但构建不会报错 |
| `tests/unit/livermore-api.spec.js` | 利弗莫尔相关请求只命中 `/api/livermore/*`，且不产生评分类请求 | 把 constitution §二 的"两套体系不混"变成可执行断言 |
| `tests/unit/router.spec.js` | 路由表引用的每个 `../views/X.vue` 真实存在；`src/views/` 下每个页面都被路由引用 | 直接复现过的事故类型（挂载了不存在的组件 / 页面存在却无路由） |
| `tests/unit/docs-api-sync.spec.js` | `README.md` 的「后端 API」表与 `trader.js` 的端点集合一致（路径模板归一化后比对） | constitution §五 的判定标准原文就是这条，但此前只能靠人看 |

不测组件渲染：`@vue/test-utils` + jsdom 会引入 3 个依赖与一大批脆弱的快照断言，
对一个 10 页的看板收益不成比例（如需组件级验证，现有 CDP 脚本更接近真实浏览器）。

### 4. 流水线编排

`.github/workflows/ci.yml`，两个 job，与后端仓库形成对称：

```yaml
check:      ubuntu-latest + node 22 + cache: npm
            steps: checkout → setup-node → bash scripts/check.sh → upload-artifact(dist)
security:   ubuntu-latest, checkout(fetch-depth: 0) → gitleaks-action@v2
```

- `paths-ignore: ['docs/**', '**/*.md']`：纯文档不触发（FR-009）。**注意** `specs/**` 里的 `*.md` 同样被覆盖。
- `concurrency`: 与后端一致，同分支串行、`cancel-in-progress: false`
- 产物：`retention-days: 7`，仅 `check` 成功时上传（失败在构建前就没有 `dist/`，自然不产出）
- **不做 OS 矩阵**：纯 JS 无平台分支代码（无路径分隔符断言、无权限位、无平台二进制名），
  Windows 侧由开发者本地的 `check.sh` 覆盖。这与后端做矩阵的理由不冲突——后端有 `kill_unix/kill_windows` 分支。

### 5. 文档改动清单

| 文件 | 改什么 |
|---|---|
| `README.md` | 顶部加 CI 徽章；新增「质量门与 CI」小节：本地预检命令 + 四步对应关系 + 不做什么（无覆盖率门禁/无 CD） |
| `AGENTS.md` | §9 常用命令加 `bash scripts/check.sh`；§5 硬性约定加一条"push 前跑预检"；§3/§6 修正 `/scores-overview` 死链与路由数量这两处失效描述（加勘误行） |
| `docs/architecture.md` | **不改**。它描述目录结构与数据流，本次未改变；理由写入 tasks 收尾项 |
| `specs/003-*/tasks.md` | 门禁反向验证的实测记录（SC-005 要求留档） |

### 6. 已知风险与对策

| 风险 | 对策 |
|---|---|
| `dayjs` 被 `Dashboard.vue` import 但不在 `package.json`（靠 antd 传递依赖） | 不改业务代码（属既存技术债）；但**手工验证** `npm ci` 后构建仍通过。若某天 antd 去掉该依赖，CI 会在构建步骤红——这正是我们想要的信号 |
| 存量违规数未知，可能远超预期 | 先跑一次 `npx eslint src` 计数。若 >100 条且集中在风格类，把该规则 `off` 并记录，而不是批量改业务代码 |
| `eslint@10` 与 `eslint-plugin-vue@10` 的 peer 兼容 | 安装后立即 `npx eslint --version` + 跑一次真实 lint 验证；装不起来就退 `eslint@9` + 同版插件 |
| gitleaks 在个人仓库的授权 | 免费额度覆盖个人仓库；若首跑报授权错，改为 `gitleaks` CLI 直跑（不依赖 action 的商业授权） |
| 单测读取 README 做比对（doc sync） | 用宽松归一化（去 `{code}`/`${code}` 差异、只比对路径集合）；若 README 结构调整导致误报，宁可放宽也不删测试 |
| 推送后 CI 红但无人看 | README 徽章 + 个人仓库无分支保护是事实；对策是让红得显眼，并在 `AGENTS.md` 写明"红就是没做完" |

## Project Structure

### Documentation (this feature)

```text
specs/003-frontend-ci-pipeline/
├── spec.md              # 做什么、验收标准
├── plan.md              # 本文件：怎么做 + Constitution Check
├── checklists/
│   └── requirements.md  # spec 质量核对
└── tasks.md             # 可执行任务 + 验证记录
```

### Source Code (repository root)

```text
.github/workflows/ci.yml      # 新增：check + security 两个 job
scripts/check.sh              # 新增：唯一真相源（安装→lint→test→build）
eslint.config.js              # 新增：flat config
vitest.config.js              # 新增：node 环境
tests/unit/
├── api.spec.js
├── livermore-api.spec.js
├── router.spec.js
└── docs-api-sync.spec.js
package.json                  # 改：新增 lint / test:unit / check 脚本与 6 个 devDeps
package-lock.json             # 改：npm install 后重算
README.md                     # 改：徽章 + 质量门小节
AGENTS.md                     # 改：常用命令 / 硬性约定 / 两处勘误
```

**Structure Decision**: 单仓单项目结构。测试放仓库根 `tests/unit/`（而非 `src/` 内共置），
与 `scripts/` 的验收脚本形成"纯离线单测 vs 需真实浏览器的端到端"两条明确分界。

## 分阶段交付（对应 ci-onboarding 渐进路线）

| 阶段 | 内容 | 本次是否做 |
|---|---|---|
| L1 | 锁文件安装 + lint + 单测 + 构建 | ✅ |
| L2 | 构建产物上传 + 缓存 + 路径过滤 + 密钥扫描 | ✅ |
| L3 | 覆盖率门禁 / OS 矩阵 | ❌ 明确不做，理由见 spec 决策记录 |
| L4 | 容器化 + 镜像发布 | ❌ 静态站点无此需求 |
| L5 | CD 部署 | ❌ 用户明确选择"只做 CI" |
