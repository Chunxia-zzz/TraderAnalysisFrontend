# Feature Specification: 下线「持仓配置」功能（仅前端）

**Feature Branch**: `002-retire-position-allocation`

**Created**: 2026-11-02

**Status**: Implemented — 收敛项已全部闭合（见 tasks.md § Phase 6）

**Input**: User description: "目前「持仓配置」这个功能我认为不需要了，其包含「我的持仓」「目标仓位」两个子 tab 页面。我希望将其完全下线也就是不展示任何前端入口。"

## 背景

「持仓配置」是导航栏里的一个下拉，含两个页面：`/position`（我的持仓）、`/allocation`（目标仓位）。
两个页面都依赖本机 OpenD，在线上环境本就返回 `data: null` + 提示文案，实际只有本地能用。

用户决定**不再从界面提供这个功能**，但**后端接口保留**（见下方"明确不做"）。

## 决策记录（已与用户确认）

| 问题 | 决定 | 理由 |
|---|---|---|
| 前端入口/路由/页面/API 封装 | **彻底删除** | 软删除的代码会腐烂 —— `ScoresOverview.vue` 就是"代码留着但没入口"的先例，结果成了死链并潜伏 3 处 null 崩溃风险（见 001） |
| 后端 `/api/position` | **保留**，不改代码 | 删除成本低但保留成本近零；且是脚本查持仓的唯一途径 |
| 后端 `/api/allocation` | **保留**，不改代码 | **日更技能第 6 步「加仓档位结论」依赖它**，删了要连带改技能，收益不对等 |
| `allocation.py` 与 `data/target_allocation.json` | **保留** | 后者是 `AGENTS.md` §5.9 指定的仓位意图唯一来源 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 导航里不再出现「持仓配置」 (Priority: P1)

用户打开任意页面，顶栏导航只剩：市场温度 / 交易信号 / 利弗莫尔 / 个股分析 ▾ / 信号回测 / 市场复盘 / 标的管理。
原来的「持仓配置 ▾」下拉消失了，连同它的两个子项。

**Why this priority**: 这是用户提出本次需求的原始意图 —— "不展示任何前端入口"。没有它，需求没被满足。

**Independent Test**: 打开 `/`，检查导航项文案，确认无「持仓配置」「我的持仓」「目标仓位」。

**Acceptance Scenarios**:

1. **Given** 应用已加载，**When** 用户看顶栏导航，**Then** 不存在「持仓配置」下拉，也不存在「我的持仓」「目标仓位」两个子项
2. **Given** 应用已加载，**When** 用户在任意页面停留，**Then** 导航栏其余 7 个入口的文案、顺序、跳转行为**均不变**

### User Story 2 - 旧地址不白屏 (Priority: P1)

用户浏览器里可能存着 `/position` 或 `/allocation` 的书签，或者从历史记录点进来。
这些地址打开后应**落到首页**，而不是一片空白。

**Why this priority**: 删路由会直接制造白屏 —— 这正是 001 修复的那个缺陷形态（`<main>` 里只剩 `<!---->`）。
**不能一边修死链、一边造新死链。**

**Independent Test**: 地址栏直接访问 `/position` 与 `/allocation`，页面都停在首页并正常渲染内容。

**Acceptance Scenarios**:

1. **Given** 路由已删除，**When** 用户访问 `/position`，**Then** 落到首页（`/`）且页面有正常内容，**不是**空白
2. **Given** 路由已删除，**When** 用户访问 `/allocation`，**Then** 落到首页（`/`）且页面有正常内容，**不是**空白
3. **Given** 用户访问一个从未存在过的路径（如 `/not-exist`），**When** 页面加载，**Then** 行为**与改动前一致**（本次不改变未知路径的兜底策略）

### Edge Cases

- **代码残留**：删除后 `src/` 内不应再有指向这两个页面或三个 API 函数的引用；有残留就会出现"import 一个不存在的文件导致构建失败"。
- **导航激活态**：原导航项有 `isPositionRoute` 激活样式逻辑，删除后该计算属性若仍被引用会报错或变成死代码。
- **文档半真**：文档若仍写着「页面：Position.vue」，就是"文档说有、实际没有"，违反 constitution V。
- **后端接口仍需可用**：前端删了不等于后端能删。必须验证接口仍返回 200（防误删连带）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 导航栏 MUST NOT 再出现「持仓配置」下拉及其两个子项
- **FR-002**: `src/` 下 MUST NOT 再存在 `Position.vue`、`Allocation.vue` 两个页面文件
- **FR-003**: 路由表 MUST NOT 再注册 `/position`、`/allocation` 两个页面路由
- **FR-004**: `src/api/trader.js` MUST NOT 再导出 `getPosition`、`getAllocation`、`saveAllocationConfig`
- **FR-005**: 访问 `/position` 或 `/allocation` MUST 重定向到首页，**不得**白屏
- **FR-006**: 导航栏其余入口（市场温度 / 交易信号 / 利弗莫尔 / 个股分析 / 信号回测 / 市场复盘 / 标的管理）行为 MUST 保持不变
- **FR-007**: 未知路径（如 `/not-exist`）的兜底行为 MUST 与本次改动前一致
- **FR-008**: 后端 `/api/position` 与 `/api/allocation` MUST 保持可用（本次不改后端代码）
- **FR-009**: 所有描述"哪个页面消费该接口"的文档 MUST 同步为「当前无页面引用」

### 引用清单（删除/修改的完整范围）

**前端 · 代码（删）**

| 文件 | 改动 |
|---|---|
| `src/views/Position.vue` | 删除文件 |
| `src/views/Allocation.vue` | 删除文件 |
| `src/router/index.js:49-58` | 删除两条路由，新增两条 redirect |
| `src/api/trader.js:102-108` | 删除 3 个导出函数及其注释 |
| `src/App.vue:24-32` | 删除下拉菜单块 |
| `src/App.vue:60` | 删除 `positionRoutes` 与其计算属性（若无其他引用） |

**前端 · 文档（改）**

| 文件 | 行 | 内容 |
|---|---|---|
| `README.md` | 65-66 | 功能页表删两行 |
| `README.md` | 71-73 | 导航结构图去掉「持仓配置」分支 |
| `README.md` | 76 | 「真正带 ▾ 的只有…两个下拉」→ 改为只剩「个股分析」一个 |
| `README.md` | 116-118 | API 表：页面列改为「⚠️ 当前无页面引用」 |
| `README.md` | 164-165 | 目录树删两行 |
| `docs/architecture.md` | 27-28 | 功能表删两行 |
| `docs/architecture.md` | 105-106 | 目录树删两行 |
| `docs/architecture.md` | 142-143 | 路由表删两行 |
| `docs/architecture.md` | 160、163 | 导航说明去掉「持仓配置」 |
| `docs/architecture.md` | 484-486 | API 表页面列改为「当前无页面引用」 |

**后端 · 仅文档（不改代码）**

| 文件 | 行 | 内容 |
|---|---|---|
| `docs/reference/api.md` | 94、96、97 | 页面列 `Position.vue` / `Allocation.vue` → 「⚠️ 当前无页面引用」 |

> 🔧 **勘误（2026-11-02 实现时发现）**：本表原列了三行后端文档，其中
> `README.md` 171/173/191 与 `AGENTS.md` 100 **实际无需改动** ——
> 后端 `README.md` 的接口表只有「端点 + 说明」两列，**没有页面列**；
> `AGENTS.md` 第 100 行本来就是 `GET /api/allocation` 的表述。
> 原判断来自 grep 命中后直接断定"要改"，未核对表结构。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 导航栏入口数从 8 个降为 7 个，且**不含**任何"持仓/仓位"字样
- **SC-002**: 直接访问 `/position`、`/allocation` 两个旧地址，**100%** 落到首页且渲染正常（不是空白）
- **SC-003**: `grep -rn "getPosition\|getAllocation\|saveAllocationConfig\|Position.vue\|Allocation.vue" src/` **0 命中**
- **SC-004**: `npm run build` 通过（无 import 缺失、无未定义变量）
- **SC-005**: 既有 3 个 smoke 脚本**失败项数量与改动前一致**（不新增失败）
- **SC-006**: 后端 `/api/allocation` 仍返回 200（未被误删）

## Assumptions

- 用户接受"后端保留两个前端不再调用的接口"这一不对称状态；它们仍可被脚本直接调用。
- 旧书签的兼容方式选择**重定向到首页**，而不是显示 404 页面 —— 依据是 001 刚修完白屏缺陷，不应重新制造空白页。
- 导航栏其余 7 项的顺序与文案本次不动。

## 明确不做（Out of Scope）

- **不改任何后端代码**：`allocation.py`、`/api/position`、`/api/allocation` 全部保留
- 不动 `data/target_allocation.json`
- 不改日更技能（第 6 步仍走 `/api/allocation`）
- 不改其余 7 个导航项
- 不引入 404 页面组件（未知路径兜底策略保持不变）
- 不处理「目标仓位配置以后怎么改」这个后续问题（见下方遗留）
