# Implementation Plan: 机会速览页面可达

**Branch**: `001-scores-overview-route` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-scores-overview-route/spec.md`

## Summary

`ScoresOverview.vue`（435 行）实现完整，但**未在路由表注册**，导致首页「机会速览」按钮落到空白页。

技术方案只有一句话：**在路由表补一条记录**，让既有页面可达。页面逻辑、视觉、后端接口均不改动。

唯一的附加工作是**防御性检查**：该页面把 `total_score` 等字段直接 `.toFixed()`，而后端契约
（`docs/reference/api.md` 通用约定）明确「数值字段无法计算时返回 `null`」—— 一旦命中会整页渲染失败，
违反 spec 的 FR-010。需要在已验证的位置加取值保护，而不是改展示逻辑。

## Technical Context

**Language/Version**: JavaScript（Vue 3 SFC，`<script setup>`），无 TypeScript

**Primary Dependencies**: vue ^3.5 · vue-router ^4.4 · ant-design-vue ^4.2 · axios ^1.7

**Storage**: N/A（纯前端 SPA，无本地持久化）

**Testing**: 零依赖 CDP 验收脚本（`scripts/smoke-*.mjs`，本机 Chrome 驱动）。**仓库无单测框架，本次不引入**

**Target Platform**: 现代桌面浏览器；Nginx 静态托管

**Project Type**: Web 前端 SPA（独立仓库；后端 API 已就绪，本次不改）

**Performance Goals**: 从首页点击到清单可见 ≤ 3 秒（SC-001）。本次**不新增依赖**，主包体积不变

**Constraints**:
- 不改后端
- 不改页面视觉
- 不新增顶部导航入口
- 路由用 `createWebHistory`，依赖服务器 SPA fallback

**Scale/Scope**: 单页面；195 只标的按分档呈现；改动约 10 行

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 判定 | 依据 / 本次如何满足 |
|---|---|---|
| **I. 空数据不是错误** | ✅ PASS | 页面第 234 行已按 `d.data === null` 取 `message` 走 `<a-empty>`。**本次不改这段**，仅在验收中确认 |
| **II. 两套信号体系分开** | ✅ PASS | 本页只消费 `/api/scores/overview` 与 `/api/tp-sl`，**完全未触碰** `/api/livermore/*`。无合并风险 |
| **III. 口径与配色固化** | ✅ PASS | 分档标签（严重超卖 ≥80 / 超卖 60~79 / 中性 <60）与 `score-pill high\|mid\|low` 保持原样，**不改配色** |
| **IV. 一个图表组件** | — 不适用 | 本页无任何图表。理由：改动仅涉及路由注册，不引入图表需求 |
| **V. 文档与代码同真** | ⚠️ 需动作 | 三处文档当前与"可达"事实矛盾，必须同步：① `README.md` 功能页表缺本页 ② `README.md` 死链说明需更新 ③ `docs/architecture.md` §6.4 标注「未挂载路由」需改为已挂载 |
| **VI. 规范先行** | ✅ PASS | 本 spec + plan 即该原则的产物；实现前已存在 |

**结论**：无违反项，**无需** Complexity Tracking。原则 V 的文档动作已写入 tasks。

## Project Structure

### Documentation (this feature)

```text
specs/001-scores-overview-route/
├── spec.md                    # 已产出（/speckit-specify）
├── plan.md                    # 本文件（/speckit-plan）
├── tasks.md                   # 待产出（/speckit-tasks）
└── checklists/
    └── requirements.md        # 已产出：规格质量自检
```

**本次刻意不产出**（避免仪式化的空文件）：

| 文档 | 为何不需要 |
|---|---|
| `research.md` | 无技术未知项。方案是既有页面 + 一条路由记录，不存在需要调研的选型 |
| `data-model.md` | 不新增/修改任何实体。数据形状由后端既有契约决定，前端只消费 |
| `contracts/` | 不新增接口，不改既有接口消费方式 |
| `quickstart.md` | 验收步骤直接写进 `tasks.md` 的验证任务，单页面功能不值得再拆一份文档 |

### Source Code (repository root)

```text
TraderAnalysisFrontend/
├── src/
│   ├── router/
│   │   └── index.js              ← 唯一必改：补一条 /scores-overview 路由
│   └── views/
│       └── ScoresOverview.vue    ← 不改展示逻辑；仅在确认 null 会崩时加取值保护
├── docs/
│   └── architecture.md           ← §3 项目结构注释、§6.4 标题需去掉「未挂载路由」
└── README.md                     ← 功能页表补一行；删除「死链」待处理项
```

**Structure Decision**: 沿用既有 `src/views/` + `src/router/index.js` 的单体结构。
不新建目录、不抽组件、不改 `src/api/trader.js`（`getScoresOverview` / `getTpSl` 已存在可直接用）。

## 已识别的技术风险（来自读代码，非猜测）

| 位置 | 风险 | 处置 |
|---|---|---|
| `ScoresOverview.vue:59,88,129,167` | `item.total_score.toFixed(1)`，后端契约允许 `total_score` 为 `null` → **整页渲染失败** | 加取值保护，`null` 时显示占位而非崩溃（FR-010） |
| `ScoresOverview.vue:96-98,136-138` | `stop_loss.price.toFixed(2)` 等，判空只判了 `error`，未判字段本身为 `null` | 同样加保护，走既有 `error` 分支展示提示（FR-006 异常场景） |
| `ScoresOverview.vue:20-29` | `overview.summary.*_count` 若后端缺 `summary` 会崩 | 加默认值兜底（FR-010） |
| `router/index.js` | `createWebHistory` 下刷新深链需服务器 fallback | **已验证**：`docs/guides/ops/nginx-trader.conf:9` 有 `try_files $uri $uri/ /index.html;`，**无需改动**（SC-003 满足） |
| `Home.vue:215` | 死链本身 | 路由注册后自动修复，**无需改 Home.vue** |

## Phase 0 / Phase 1 决策摘要

- **Phase 0（研究）**：跳过。无未知项；上述风险已通过读源码与后端契约确认，不属"待调研"。
- **Phase 1（设计）**：跳过独立设计文档。设计方案即"补一条路由 + 三处取值保护"，已在本文件完整表达。

## 验收方式（对应 spec 的 Success Criteria）

| 手段 | 覆盖 |
|---|---|
| 手动验证：首页点击 → 清单渲染 → 五个筛选切换 → 点击行进 K 线 | US1 / SC-002 |
| 手动验证：地址栏直接访问 + F5 刷新 | US1-AC4 / SC-003 |
| 手动验证：展开/收起止盈损，确认未跳转 | US2 / SC-005 |
| 手动验证：日期选择与清空 | US3 |
| 构造边界：选一个无数据的日期 | FR-009 / SC-004 |
| `npm run build` 通过 | 无编译/构建回归 |
| 既有 `smoke-*.mjs` 三个脚本 | 确认未波及 K 线/利弗莫尔（本页与它们无共享代码，预期全绿） |

> 不新增 CDP 脚本：本功能是单页面的路由可达性，手动验证成本低于写脚本，且 SC 均可人工判定。
> 若后续该页交互变复杂，再补 `scripts/smoke-scores-overview.mjs`。
