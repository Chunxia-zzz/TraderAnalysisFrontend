# Implementation Plan: 下线「持仓配置」功能（仅前端）

**Branch**: `002-retire-position-allocation` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-retire-position-allocation/spec.md`

## Summary

删除前端 2 个页面、2 条路由、3 个 API 封装、1 个导航下拉，并为两条旧路径留 `redirect: '/'` 墓碑，
避免删路由后产生白屏。后端代码零改动，只同步 3 处文档的「页面」列。

**本 plan 刻意精简**：删除型变更没有设计方案可讨论，风险全在"漏删/漏改引用"。因此下文只保留
Constitution Check 与风险清单，不产出 research.md / data-model.md / contracts/。

## Technical Context

**Language/Version**: JavaScript（Vue 3 SFC，`<script setup>`）

**Primary Dependencies**: vue-router ^4.4（`redirect` 配置项为本方案唯一依赖特性）

**Storage**: N/A

**Testing**: 零依赖 CDP 脚本；本次复用 `smoke-*.mjs` 做"无新增失败"的回归判据

**Target Platform**: 现代浏览器 + Nginx 静态托管（`try_files` 已存在，深链可回退）

**Constraints**: 不改后端；不改其余 7 个导航项；不改未知路径兜底策略

**Scale/Scope**: 删 2 个视图文件、改 3 个源码文件、改 11 处前端文档、改 3 处后端文档

## Constitution Check

| 原则 | 判定 | 依据 |
|---|---|---|
| **I. 空数据不是错误** | — 不适用 | 删除消费方，不新增任何空态处理。重定向不发起请求 |
| **II. 两套信号体系分开** | — 不适用 | 不涉及评分/利弗莫尔任何数据流 |
| **III. 口径与配色固化** | — 不适用 | 不涉及温度页与配色 |
| **IV. 一个图表组件** | — 不适用 | 无图表改动 |
| **V. 文档与代码同真** | ⚠️ 需动作 | **本变更的主体风险**：11 处前端文档 + 3 处后端文档写着不存在的页面。漏改即违反 |
| **VI. 规范先行** | ✅ PASS | 本 spec + plan 即产物；实现前已存在 |

**结论**：无违反项，无需 Complexity Tracking。

## Project Structure

```text
TraderAnalysisFrontend/
├── src/
│   ├── App.vue                  ← 删下拉块 + positionRoutes/isPositionRoute
│   ├── router/index.js          ← 删 2 条路由，加 2 条 redirect
│   ├── api/trader.js            ← 删 3 个导出
│   └── views/
│       ├── Position.vue         ← 删除
│       └── Allocation.vue       ← 删除
├── README.md                    ← 6 处
└── docs/architecture.md         ← 5 处

TraderAnalysis/（后端，只改文档）
├── docs/reference/api.md        ← 3 处（第 94/96/97 行页面列）
└── README.md                    ← 3 处（第 171/173/191 行）
```

**Structure Decision**: 沿用既有目录，不新建任何文件（除 2 条 redirect 路由）。

## 风险清单（来自读代码，非猜测）

| 风险 | 处置 |
|---|---|
| `positionRoutes` / `isPositionRoute` 可能被下拉以外的地方引用 | 删除前先 grep 确认；只在 App.vue 内则一并删 |
| 删 API 导出后若有残留调用 → 构建失败 | `npm run build` 是硬校验 |
| 删路由后 `/position` 白屏（重复 001 的缺陷） | 加 `redirect: '/'`，并用浏览器实测两个旧地址 |
| 后端接口被误删 | 显式验证 `/api/allocation` 仍 200 |
| 未知路径行为被顺手改变 | **不加** catch-all；`/not-exist` 行为与改动前一致（仍是空白），已写入 spec 的 Out of Scope |

## 验收方式

| 手段 | 覆盖 |
|---|---|
| 浏览器实测导航文案与项数 | US1 / SC-001 |
| 直接访问 `/position`、`/allocation`（含刷新） | US2 / SC-002 |
| `grep -rn "getPosition\|getAllocation\|saveAllocationConfig\|Position.vue\|Allocation.vue" src/` 零命中 | SC-003 |
| `npm run build` | SC-004 |
| 3 个既有 smoke 脚本，失败项数与改动前一致 | SC-005 |
| `curl /api/allocation` 返回 200 | SC-006 |
