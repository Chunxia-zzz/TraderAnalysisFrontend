# TraderAnalysis Frontend Constitution

> 本文件是**原则层**：约束 AI 在这个仓库里做决策时的边界与优先级。
> 操作细节在仓库根 `AGENTS.md`，现状描述在 `docs/architecture.md`，事前意图在 `specs/<feature>/`。
>
> 与后端仓库 `F:\TraderAnalysis` 的 `constitution.md` **同源但不同文**：
> 两边共享"两套信号体系""口径方向""文档同真"三条，其他各自不同。
> **后端是 API 契约的唯一权威**，前端这份不重复定义接口语义。

---

## Core Principles

### I. 空数据不是错误 (NON-NEGOTIABLE)

所有接口无数据时返回 **HTTP 200 + `{data: null, message: "提示文案"}`**，**不是 404**。

约束：

- 不得把 `data: null` 当异常处理（不弹"请求失败"、不抛到错误边界、不显示红色告警）。
- 应展示 `message` 里的提示文案，并保持页面结构可用。
- 新增页面沿用同一约定，不要发明第二种"无数据"表示法（如 204、空数组 + 200 混用）。

**判定**：任一 `src/api/trader.js` 函数的调用方，对 `data === null` 分支有明确的用户可见文案，且不落在错误 UI 上。

### II. 两套信号体系在前端同样分开 (NON-NEGOTIABLE)

`/momentum-leaders`（6 因子 / EMA 交叉 / 主升主跌）与 `/livermore`（关键点突破）是**两套独立体系**，方向相反，**不得合并展示、不得共用一张统计卡**。

约束：

- 利弗莫尔数据只能来自 `/api/livermore/*`，不得混入评分或信号列表的数据流。
- **「支撑压力位」≠「利弗莫尔关键点」**：前者是 Swing Pivot 聚类，后者是平台突破体系。
  K 线页上两者可以同时画，但必须有视觉区分（线型/色/图例），不能看起来像同一套东西。
- 术语必须在**四处**一致：组件与 API 字段名、页面文案、图例、文档。

**判定**：`/livermore` 页与 `/momentum-leaders` 页无共享的数据请求；K 线页两类标注在图例中可区分。

### III. 口径与配色是固化的，不是随手可调

**市场温度：分数越高 = 越恐慌 = 越值得加仓**（2026-10-19 口径反转，与后端一致）。

约束：

- 配色语义已固化：**高分 = 机会（蓝）/ 低分 = 贪婪（红）**。这是本项目刻意选择的方向，
  与 A 股"红涨"习惯相反 —— **不要"顺手改成红涨绿跌"**。
- 改任何一处配色或状态映射（8 级状态、仓位建议文案），必须同步改
  `scripts/smoke-livermore.mjs` 里的**文字对比度断言**，否则下次验收会误报或漏报。
- 跨 2026-10-19 的温度分数不可直接比较，图表横轴若跨该日期需显式标注。

**判定**：`node scripts/smoke-livermore.mjs` 的对比度断言通过；温度页配色与 `src/styles/tokens.css` 一致。

### IV. 一个图表组件，一种多窗格做法

`src/components/IndicatorChart.vue` 是**唯一**的 K 线图表组件。多窗格（成交量/MACD/RSI）的实现方式是：
**同一个 chart 实例** + 副图 series 各自指定 `priceScaleId`，再用 `scaleMargins` 压缩垂直区间。

约束：

- **不要**为新的图表需求再建一个 `KLineChart.vue` 之类的组件；扩展现有组件。
- **不要**改成多实例 + 手工同步时间轴 —— 当前方案共享时间轴，缩放平移天然联动。
- `lightweight-charts` 不可从 `package.json` 移除（`IndicatorChart.vue` 实际使用）。
  温度趋势图用 ECharts，两者的分工不要互换。

**判定**：`src/components/` 下只有 `IndicatorChart.vue` 一个图表组件；其中只有一个 `createChart` 调用。

### V. 文档与代码必须同时为真

约束：

- `README.md` 与 `docs/architecture.md` 描述的是**当前代码**，不是设想。
- 发现文档与代码不符：改文档，并在原处保留原文 + `> ⚠️ 勘误（日期）：…`。**不删历史结论**。
- 每次开发结束同步更新 `README.md`（功能页 / API 表）与 `docs/architecture.md`；无需改动时说明理由。
- 文档里点名的"不存在的文件"必须真的不存在 —— 这个仓库已经踩过两次（`KLineChart.vue`、`Login.vue`）。

**判定**：`README.md` 的 API 函数表与 `src/api/trader.js` 导出一一对应，无遗漏无虚构。

### VI. 规范先行（Before code）

**非平凡变更先有 `specs/<feature>/spec.md`，再写代码。**

必须先写规范的变更（任一项命中即是）：

- 新增页面或路由
- 改动 `src/api/trader.js` 的对外函数签名或调用方式
- 改动图表组件的绘制/交互能力（标注层、周期切换、窗格）
- 改动温度/信号的口径展示或配色语义
- 引入新依赖

**豁免**：文案更正、样式微调（不改语义）、单行 bug、版本号、注释。

**跨仓库变更**：涉及接口契约的改动，**先在后端仓库写 spec 并实现**，前端 spec 只描述"消费哪个接口的哪个字段"。

**判定**：`git log` 中该 feature 的 `spec.md` 早于实现提交；`plan.md` 的 Constitution Check 已逐条勾选。

---

## 二、安全与数据边界（不可协商）

- **不得入库**：`.env*` 中的真实值、token、任何密钥；`node_modules/`、`dist/`、`*.log`、`.claude/`。
- **文档与 spec 中不得出现**真实账户标识、资产数值、持仓数量与成本。
- **仓位意图**（目标权重、标定区间、分批比例、加仓闸门）不写进 `README.md` / `docs/` / `specs/`。
  `/position`、`/allocation` 两个页面渲染的是**运行时数据**，文档只描述字段与来源，不写具体数值。
- 示例数据必须虚构，并标注"示例数据为虚构值"。

---

## 三、开发工作流与质量门

**环境**：

```bash
npm install && npm run dev        # http://localhost:5173
# 后端须同时在 8000 运行；端口冲突时用 BACKEND_PORT 同时设前后端
```

dev 模式 API 统一走 vite proxy（`VITE_API_BASE_URL` 留空）。**不要在 env 文件里写死后端地址** ——
会绕过代理，改端口时两处不同步。

**质量门**：

| 改动涉及 | 必跑 |
|---|---|
| 任意改动 | `npm run build` 通过（`chunks > 500 kB` 警告可忽略，属已知） |
| `/livermore` 或 K 线标注 | `node scripts/smoke-livermore.mjs`（98 项） |
| K 线支撑压力位 | `node scripts/smoke-keylevels.mjs`（14 项） |
| 周期切换 | `node scripts/smoke-ktype.mjs`（12 项） |

验收脚本前置：**前端 5173 与后端 8000 都在运行**，用本机 Chrome 驱动，不装 npm 依赖。

**部署注意**（改静态资源必须知道）：

- `index.html` 必须 `no-cache`，否则新部署后请求已删除的旧 chunk → 白屏。
- **不要用 `expires` 指令**（会输出两个同名 Cache-Control 头），只用 `add_header`。
- 改完用 `curl -sD- -o/dev/null <url> | grep -ci cache-control` 断言为 **1**。

**提交**：`feat:` / `fix:` / `docs:` / `chore:` / `refactor:` 前缀；禁用 `git add -A`。

---

## Governance

**优先级**：本文件 > `AGENTS.md`（操作层）> `docs/architecture.md`（描述层）> `specs/<feature>/` > 单次对话指令。

**跨仓库优先级**：接口契约以**后端仓库**为准。前端文档与后端 `docs/reference/api.md` 冲突时，以后端为准并修正前端。

**修订**：改本文件需说明**为什么**改（不是改了什么）；原则增删 → MAJOR，内容调整 → MINOR，措辞澄清 → PATCH。
与后端共享的三条原则（II 两套信号 / III 口径方向 / V 文档同真），改动时两边一起改。

**合规检查**：`plan.md` 的 Constitution Check 段落逐条勾选，不适用的也要写一行理由。

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
