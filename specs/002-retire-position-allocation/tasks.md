---
description: "Task list for 002-retire-position-allocation"
---

# Tasks: 下线「持仓配置」功能（仅前端）

**Input**: Design documents from `/specs/002-retire-position-allocation/`

**Prerequisites**: plan.md ✅ · spec.md ✅（research / data-model / contracts 本变更不需要）

**Tests**: spec 未要求新增自动化测试。用既有 `smoke-*.mjs` 做"无新增失败"回归。

## Phase 1: 基线

- [X] **T001** 记录改动前基线：导航项文案清单；`smoke-ktype.mjs` 结果（已知 **5 通过 / 2 失败**，属既有问题，已用 stash 证明）；`/api/allocation` 返回码

## Phase 2: 删代码（同一批改动，顺序执行）

- [X] **T002** 删除 `src/views/Position.vue`
- [X] **T003** 删除 `src/views/Allocation.vue`
- [X] **T004** `src/App.vue:24-32` 删除「持仓配置」下拉整块（**保留** `handleMenuClick`，`个股分析` 下拉共用）
- [X] **T005** `src/App.vue:60-61` 删除 `positionRoutes` 与 `isPositionRoute`（已确认仅被上面那个下拉使用）
- [X] **T006** `src/router/index.js:49-58` 删两条路由，替换为两条墓碑：
      `{ path: '/position', redirect: '/' }`、`{ path: '/allocation', redirect: '/' }`
      —— **不要**加 catch-all，未知路径行为保持原样（spec FR-007）
- [X] **T007** `src/api/trader.js:102-108` 删 `getPosition` / `getAllocation` / `saveAllocationConfig` 及其段落注释

## Phase 3: 代码层验证

- [X] **T008** 零残留检查：`grep -rn "getPosition\|getAllocation\|saveAllocationConfig\|Position.vue\|Allocation.vue" src/` → **0 命中**
- [X] **T009** `npm run build` 通过（无 import 缺失、无未定义变量）

## Phase 4: 运行时验收

- [X] **T010** 浏览器验证导航：7 个入口，文案与顺序正确，**无**「持仓配置/我的持仓/目标仓位」；「个股分析」下拉仍可展开跳转（SC-001 / FR-006）
- [X] **T011** 浏览器验证旧地址：直接访问 `/position`、`/allocation`（含刷新）→ **落到首页且有内容**，不是空白（SC-002 / FR-005）
- [X] **T012** 回归：`node scripts/smoke-ktype.mjs` 失败项**仍为 2 项**（不新增失败）（SC-005）
- [X] **T013** 后端未被误删：`curl /api/allocation` 返回 **200**（SC-006 / FR-008）

## Phase 5: 文档同步（漏改即违反 constitution V）

- [X] **T014** `README.md`：65-66 删两行功能页；71-73 导航图去掉分支；76 「两个下拉」→「一个」；116-118 页面列→「⚠️ 当前无页面引用」；164-165 目录树删两行
- [X] **T015** `docs/architecture.md`：27-28 功能表；105-106 目录树；142-143 路由表；160/163 导航说明；484-486 页面列
- [X] **T016** `README.md` 导航结构段落里的 `├─ 我的持仓` / `└─ 目标仓位` 两行必须一并删除，否则图会错位
- [X] **T017** 后端 `docs/reference/api.md`：94 / 96 / 97 三行的页面列改为「⚠️ 当前无页面引用」
- [X] **T018** 后端 `README.md`：171 / 173 / 191 三行同上（若标了页面）
- [X] **T019** `spec.md` 状态改 `Implemented`

---

## Dependencies

- T002-T007 互不依赖但**必须一起提交**：单独删页面会让 build 失败
- T008 / T009 依赖 T002-T007 全部完成
- T010-T013 依赖 T009 通过
- T014-T018 与代码无关，可并行；但**必须与代码同批提交**，否则文档与代码不一致

## 提交方式（禁 `git add -A`）

```bash
git add src/App.vue src/router/index.js src/api/trader.js
git rm src/views/Position.vue src/views/Allocation.vue
git commit -m "refactor: 下线「持仓配置」功能——删入口/路由/页面，旧地址重定向首页
Spec: 002-retire-position-allocation"

git add README.md docs/architecture.md
git commit -m "docs: 同步持仓配置下线（前端）
Spec: 002-retire-position-allocation"
```

## Notes

- **提交前建议先归档 001**：工作区里 001 的改动未提交，两个 feature 混在同一 diff 里无法单独 review。
- 后端两个接口保留但前端不再调用，`api.md` 要如实标「当前无页面引用」——这不是缺陷，是**已知的不对称状态**。
- 「目标仓位以后怎么改」这个问题本次不解决：页面没了之后，改配置只能走 `PUT /api/allocation` 或手改 `data/target_allocation.json`。已记入 spec 的 Out of Scope。

---

## Phase 6: Convergence

> **追加于 2026-11-02**，来源：`/speckit-converge` 对照 spec / plan / tasks / constitution 核查代码现状。
> 本节只追加，不改动上面任何任务。

### 核查结论

| 项 | 判定 | 证据 |
|---|---|---|
| FR-001 导航无「持仓配置」 | ✅ | CDP 实测：`.nav-item` **7 项**（市场温度/交易信号/利弗莫尔/个股分析/信号回测/市场复盘/标的管理），`持仓配置`、`我的持仓`、`目标仓位` 三个词在页面文本中**均不存在** |
| FR-002 两个页面文件不存在 | ✅ | `src/views/` 只剩 10 个文件；`src` 共 17 个文件（原 19） |
| FR-003 路由不再注册页面 | ✅ | 两条改为 `redirect: '/'`，无 `component` |
| FR-004 三个 API 导出已删 | ✅ | `grep` 零命中（含 `positionRoutes` / `isPositionRoute`） |
| FR-005 旧地址不白屏 | ✅ | `/position` → `path=/`、`mainLen=609`；`/allocation` 同 |
| FR-006 其余导航项不变 | ✅ | 7 项文案与顺序与基线一致，「个股分析」下拉保留（`handleMenuClick` 未误删） |
| FR-007 未知路径行为不变 | ✅ | `/not-exist` → `path` 不变、`mainLen=0`，与改动前一致（**仍是空白，属既有问题**） |
| FR-008 后端接口保留 | ✅ | `api_server.py:1659/1680/1697` 三个路由仍在；`git status src/` 无改动 |
| FR-009 文档同步 | ✅ | 前端 README 6 处、`architecture.md` 5 处、后端 `api.md` 3 处已改；残留 5 处命中全部是**下线说明本身** |
| SC-004 构建 | ✅ | `npm run build` 15.95s 通过 |

### 未闭合项（追加任务）

- [X] **T020** 〔LOW〕**spec 引用清单有一处写错**：spec.md 的「后端 · 仅文档」表列了 `README.md` 第 171/173/191 行需改「页面列」，
      但后端 `README.md` 的接口表**只有两列（端点 + 说明），没有页面列**。实现时已识别为 no-op。
      需把 spec 的那三行删掉或改为「无需改动」，避免下次照单执行时困惑。
      per plan「后端 README 3 处」(contradicts)

- [X] **T021** 〔MEDIUM〕**回归未能执行**：`scripts/smoke-ktype.mjs` 第 4 行硬编码导入
      `C:/Users/Administrator/.workbuddy/skills/cdp-ui-smoke/assets/cdp.mjs`，该技能已于今日被系统归档到
      `F:/WorkBuddyData/_skills-removed-20261101/cdp-ui-smoke/`，目录在两位候选位置均不存在 → `ERR_MODULE_NOT_FOUND`。
      **与本次改动无关**（`git status scripts/` 无改动），但 SC-005「失败项数量与改动前一致」因此**未取得证据**。
      待该技能恢复后补跑；或把脚本改为不依赖外部绝对路径（属独立议题）。
      per SC-005 (partial)

### 范围外观察（不追加任务）

- **`/not-exist` 等未知路径仍白屏**：本次刻意不加 catch-all（spec FR-007 要求行为不变）。
  这与 001 修的白屏是同源问题，值得单独立项，但不属于本次范围。
- **「目标仓位」失去修改入口**：页面删了，改配置只剩 `PUT /api/allocation` 或手改
  `data/target_allocation.json`。spec 已列为 Out of Scope，但这是真实的可用性缺口，建议后续决定。
- **001 与 002 的改动混在同一未提交工作区**：两个 feature 的 diff 无法单独 review，提交前建议先归档 001。
