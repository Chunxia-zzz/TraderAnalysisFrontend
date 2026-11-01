---
description: "Task list for 001-scores-overview-route"
---

# Tasks: 机会速览页面可达

**Input**: Design documents from `/specs/001-scores-overview-route/`

**Prerequisites**: plan.md ✅ · spec.md ✅（research.md / data-model.md / contracts/ 本功能不需要，理由见 plan.md「刻意不产出」表）

**Tests**: 本 spec **未要求自动化测试**，故不排测试编写任务。验收按 plan.md「验收方式」表手工执行。
CDP 脚本（`scripts/smoke-scores-overview.mjs`）留待该页交互变复杂时再补。

**Organization**: 按用户故事分组，每个故事可独立完成与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[Story]**: 所属用户故事（US1 / US2 / US3）
- 路径均为仓库相对路径

## Path Conventions

单仓库单项目：`src/`、`scripts/`、`docs/` 均在仓库根。无 `backend/`、`frontend/` 双层。

---

## Phase 1: Setup

**Purpose**: 先把"坏"复现出来，再改。否则改完无法证明修的是不是这个问题。

- [X] **T001** 启动前端 5173 与后端 8000，从首页点击「机会速览」，**确认落到空白页**（复现死链，截图留证）
- [X] **T002** 记录改动前基线：`npm run build` 通过，记下主包体积（当前约 1531 KB），供收尾对比

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 本功能没有需要搭建的基础设施（无新依赖、无新目录、无新接口）。
唯一的前置是**后端接口在本机可用** —— 否则下面的验收全部无法判定。

**⚠️ CRITICAL**: 不完成 T003，US1/US2/US3 的验收结论都不可信。

- [X] **T003** 确认本机两个接口正常：`GET /api/scores/overview`、`GET /api/tp-sl?code=...`；
      并**额外确认一个返回 `data: null` 的场景**（挑一个无评分数据的日期），因为 T005/T006 的兜底逻辑要靠它验证

**Checkpoint**: 接口可用 → 可开始实现

---

## Phase 3: User Story 1 - 从首页进入机会速览 (Priority: P1) 🎯 MVP

**Goal**: 页面可达 + 分档清单与筛选正确 + 单只标的数据缺失不崩

**Independent Test**: 从首页点击进入 → 五个筛选切换 → 条数与行数一致 → 点击行跳 K 线 → 地址栏直接访问并刷新正常

### Implementation for User Story 1

- [X] **T004** [US1] 在 `src/router/index.js` 的 `routes` 数组末尾补一条：
      `path: '/scores-overview'` · `name: 'scores-overview'` · `component: () => import('../views/ScoresOverview.vue')`
      —— 用懒加载，与其余 11 条路由写法一致（FR-001）
- [X] **T005** [US1] 在 `src/views/ScoresOverview.vue` 为 `total_score` 加取值保护：
      第 59 / 88 / 129 / 167 行的 `item.total_score.toFixed(1)`，`null` 时显示占位符而非抛错（FR-010）
- [X] **T006** [US1] 在 `src/views/ScoresOverview.vue` 为 `overview.summary.*_count`
      （第 20-29 行）加默认值兜底，缺 `summary` 时按 0 显示而不崩（FR-010）

### Verification for User Story 1

- [X] **T007** [US1] 验证 US1-AC1/AC2/AC3：首页点击可进入；五个筛选按钮条数与实际渲染行数**逐项核对**；
      点击任一行跳转到 `/chart?code=<代码>`（SC-002）
- [X] **T008** [US1] 验证 US1-AC4：地址栏直接输入 `/scores-overview` 并 F5 刷新，页面正常
      （dev 下 Vite 自带 history fallback；线上已确认 `nginx-trader.conf:9` 有 `try_files`，无需改配置）（SC-003）
- [ ] **T009** [US1] 验证 FR-009/FR-010：用 T003 找到的无数据日期，确认页面显示后端 `message` 文案
      且**不是**错误告警、不是崩溃（SC-004）

**Checkpoint**: US1 完成即 MVP 可用 —— 死链已修复，页面可正常使用

---

## Phase 4: User Story 2 - 就地查看止盈止损 (Priority: P2)

**Goal**: 展开/收起可用，且不误触发跳转；数据不可用时有提示

**Independent Test**: 在「严重超卖」或「超卖」分档点「止盈损」→ 展开三项数值 → 再点收起 → 全程未跳转

### Implementation for User Story 2

- [X] **T010** [US2] 在 `src/views/ScoresOverview.vue` 为止盈损字段加保护：
      第 96-98 与 136-138 行的 `stop_loss.price` / `take_profit.price` / `risk_reward_ratio`，
      字段为 `null` 时走既有 `error` 分支展示提示，而不是 `.toFixed()` 抛错（FR-006 异常场景）

### Verification for User Story 2

- [X] **T011** [US2] 验证 US2-AC1/AC2/AC4：展开出现止损/止盈/风险回报比；再次点击收起；
      **确认展开过程页面未跳转**（SC-005）
- [ ] **T012** [US2] 验证 US2-AC3：挑一个止盈损数据不可用的标的，点击后展示可读提示而非空白或报错弹窗

**Checkpoint**: US2 完成 —— 该页独有能力可用

---

## Phase 5: User Story 3 - 回看历史某一天 (Priority: P3)

**Goal**: 日期筛选与清空可用

**Independent Test**: 选历史日期 → 清单变化；清空 → 回到最新

> 该功能已由现有代码实现，**预期无需改代码**。若验证发现问题，再补一条实现任务，不预先臆造。

### Verification for User Story 3

- [ ] **T013** [US3] 验证 US3-AC1/AC2：选择历史日期后清单切换；清空日期后回到最新一天

**Checkpoint**: US3 完成 —— 三个故事均可独立运行

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] **T014** 更新 `README.md`「功能页面」表，补一行「机会速览 / `/scores-overview` / 按评分分档的机会清单 + 止盈止损」（原则 V）
- [X] **T015** 更新 `README.md` 目录结构注释，删去「`ScoresOverview.vue` 未挂载路由 → 这是个死链（已知待处理问题）」的表述（原则 V）
- [X] **T016** [P] 更新 `docs/architecture.md`：§3 项目结构里 `ScoresOverview.vue # 机会速览（未挂载）` 去掉「未挂载」；
      §6.4 标题「机会速览（⚠️ 未挂载路由）」同步改（原则 V）
- [X] **T017** `npm run build` 通过，主包体积与 T002 基线对比无异常增长（本次不新增依赖，预期基本持平）
- [X] **T018** 跑 `node scripts/smoke-livermore.mjs` / `smoke-keylevels.mjs` / `smoke-ktype.mjs`，
      确认未波及 K 线页与利弗莫尔页（本功能与它们无共享代码，预期全绿）
- [X] **T019** `specs/001-scores-overview-route/spec.md` 的 `Status` 改为 `Implemented`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**：无依赖，立即开始
- **Foundational (Phase 2)**：依赖 Setup → **阻塞全部用户故事**（接口不通则验收无意义）
- **US1 (Phase 3)**：依赖 Phase 2 → 它是 US2 的前置（页面不可达时无法验证 US2）
- **US2 (Phase 4)**：依赖 US1（同一文件，且需页面可达）
- **US3 (Phase 5)**：仅验证，依赖 US1
- **Polish (Phase N)**：依赖所有故事完成

### 关键约束

- **T004 → T005 → T006 → T010 全部改同一个文件**（`ScoresOverview.vue` 或 `router/index.js`），
  **不可并行**，必须顺序执行，否则冲突。
- 文档任务里**只有 T016 可并行**（改 `docs/architecture.md`）；T014 与 T015 都改 `README.md`，必须顺序执行。

### 单文件顺序

```
T004 → T005 → T006   (US1 实现)
T010                 (US2 实现，同文件，须在 T006 之后)
T014 → T015 · T016   (文档，README 两处须顺序)
```

---

## Implementation Strategy

### MVP First（仅 US1）

1. 完成 T001-T003（复现 + 接口确认）
2. 完成 T004-T006（路由 + 两处兜底）
3. **STOP 并验证** T007-T009
4. 此时死链已修复、页面可用 → 可先行提交

### Incremental Delivery

1. US1 → 验证 → 提交（`fix:` 死链）
2. US2 → 验证 → 提交（`fix:` 止盈损兜底）
3. US3 → 验证（预期无代码改动）
4. Polish → 文档 + 构建 → 提交（`docs:`）

### 提交方式（遵守 AGENTS.md §5）

禁用 `git add -A`，逐个添加：

```bash
git add src/router/index.js src/views/ScoresOverview.vue
git commit -m "fix: 机会速览路由未注册导致首页死链，并补 null 取值保护"

git add README.md docs/architecture.md
git commit -m "docs: 机会速览已可达——同步功能页表与架构文档"
```

---

## Notes

- `[P]` 已在「关键约束」里修正过：本项目多数任务落在**同两个文件**，并行的机会实际为零。
- 每个故事结束都停在 checkpoint 验证，不要一口气做完再验。
- T005/T006/T010 的改动原则：**只加取值保护，不改展示结构与文案**。顺手改样式属扩围，违反 spec 的 Out of Scope。
- 若 T003 发现后端接口本身有问题（例如 `summary` 字段缺失），**停下来另开一个后端 feature**，
  不要在前端任务里临时改后端 —— 那是跨仓库变更，规则见 `specs/README.md`。

---

## Phase 6: Convergence

> **追加于 2026-11-01**，来源：`/speckit-converge` 对照 spec / plan / tasks / constitution 逐条核查代码现状。
> 本节**只追加**，不改动上面任何任务；上面仍为 `[ ]` 的 T009 / T012 / T013 是「无实机证据」，与本节区分开。
>
> 核查范围：FR-001~011（11 条）、SC-001~005（5 条）、US1~US3 验收场景（10 条）、
> plan 技术决策（5 条）、constitution 原则（6 条，IV 不适用）。

- [X] **T020** 〔HIGH〕**「全部」视图重复渲染**：`actionable` 的 6 只全部同时属于 `buy`，导致「全部」筛选中它们出现两次 —— 按钮显示 **201**，实际渲染 **207** 行（CDP 实测）。改动方向二选一，**优先 ①**（不动视觉）：
      ① 渲染 `buy` 分档时排除 `actionable` 里已有的代码；
      ② 把「可执行机会」降级为 `buy` 行上的徽标，不再单独成段。
      per SC-002 (contradicts)

- [X] **T021** 〔MEDIUM〕**分档标题与真实口径矛盾**：`actionable` 的 6 只评分为 **60.1~70.6**，全部落在「超卖」(60~79) 区间，但标题写的是「**严重超卖**且站上MA5」（严重超卖定义是 ≥80）。**先确认要哪一种口径再动手**，不要直接改字：
      ① 改文案 → 「超卖且站上MA5」（承认它取自 60~79）；
      ② 改筛选 → 真的只取 ≥80 且站上 MA5（数量会显著减少，需重新看是否还有意义）。
      per FR-003 / Constitution III (contradicts)

- [ ] **T022** 〔MEDIUM〕**冷启动首次请求 ~20s，超出前端 10s 超时**：后端首次响应 20.1s（服务端返回 200），而 `src/api/trader.js` 是 `timeout: 10000`，因此服务重启后**第一次**打开该页会显示「获取数据失败」；预热后同一接口 **0.142s**。
      处置优先级：① 后端侧预热；② 若必须前端放宽超时，需注意 plan 的 Structure Decision 写明「不改 `src/api/trader.js`」，改的话要同步记录理由。
      per SC-001 (partial)

- [ ] **T023** 〔MEDIUM〕**补齐三处无实机证据的验证**（无头 Chrome 无法驱动 Ant DatePicker，合成事件与真实键盘事件均失败，不能算已验证）：
      ① 选一个无评分日期 → 确认空态文案来自后端 `message`、**不是**错误样式（FR-009 / US1-AC4）
      ② 选历史日期 → 清单切换；清空 → 回到最新（US3-AC1/AC2）
      ③ 找一只止盈损不可用的标的 → 确认提示可读、不崩（US2-AC3 / FR-006）
      per FR-009 / US3 / FR-006 (partial)

- [ ] **T024** 〔MEDIUM〕**后端响应契约不一致**（跨仓库，需在后端仓库另开 spec，不在本仓库改）：
      `/api/scores/overview` **有数据时 payload 在顶层、无数据时才返回 `{data:null,message}`**；
      `/api/tp-sl` **恒为扁平**。两者都与后端 `docs/reference/api.md` 的「所有接口统一返回 200，无数据时通过 `data: null` + `message` 表示」不符。
      前端已在 `normalizeOverview()` 与 `toggleTpSl()` 里做双向兼容，功能不受影响，但契约漂移会让下一个消费方再次踩坑。
      per Constitution V / 后端 api.md (contradicts)

- [X] **T025** 〔LOW〕**文档数字过期**：`README.md` 称主包 **1531 KB**，本次实测 **1568.01 kB**（`ScoresOverview` 已正确拆成独立 chunk 9.45 kB，不是本次引入的增长）。更新数字或注明测量时间/口径。
      per Constitution V (partial)

### 已确认满足、无需追加的项

| 项 | 证据 |
|---|---|
| FR-001 死链修复 | 改动前 `#app > main` 内仅 `<!---->`；改动后渲染 207 行、四个分档区块齐全 |
| FR-002 / FR-004 分档与筛选 | 五个按钮 6 / 39 / 50 / 112 与各区块行数**逐项一致**（「全部」除外，见 T020） |
| FR-005 点击跳转 | CDP 实测 `path=/chart`、`search=?code=US.T` |
| FR-007 展开不误跳转 | 展开止盈损后 `location.pathname` 未变（SC-005 满足） |
| FR-011 深链刷新 | 直接访问 `/scores-overview` 正常渲染；线上 `nginx-trader.conf:9` 有 `try_files` |
| 构建 | `npm run build` 通过，24.93s |

### 范围外观察（不追加任务）

- `smoke-ktype.mjs` **5 通过 / 2 失败**（4H、周K 压力位数值与 API 实测不符）。已用 `git stash` 对比：**改动前后失败项完全相同**，属既有问题，与本次无关。

