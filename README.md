# TraderAnalysis Frontend

股票分析前端，基于 Vue 3，对接后端 FastAPI 服务。提供市场温度、交易信号（空转多/多转空/主升浪龙头/主跌浪超卖/低估做多）、道氏趋势个股分析、基本面估值、利弗莫尔关键点、信号回测、标的管理等功能。

> **两套并行的信号体系**（前端也刻意分成两块展示）：① **6 因子评分**（纯均值回归，买超卖）；
> ② **利弗莫尔关键点**（买突破，独立页面 `/livermore` + K 线叠加）。两者方向相反，不合并。
> ⚠️ `/chart` 上的「支撑压力位」是 Swing Pivot 聚类，**与利弗莫尔关键点不是一回事**，页面上已明确区分。

🔗 [体验地址](http://47.106.175.84/)

## 快速启动

### 前提条件

- **Node.js** >= 18（推荐 20+），附带 npm
- **后端服务**运行在 `http://localhost:8000`（FastAPI，接口文档：http://localhost:8000/docs）
  - 后端端口冲突时：先 `BACKEND_PORT=8001` 起后端，再 `BACKEND_PORT=8001` 启动前端（vite proxy 会代理到对应端口，见 `vite.config.js`）

### 三步启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（默认 http://localhost:5173；端口被占可加 -- --port 5174）
npm run dev

# 3. 打开浏览器访问
#    首页: http://localhost:5173/
```

> dev 模式 API 统一走 vite proxy（`.env.development` 的 `VITE_API_BASE_URL` 留空），
> 不要在 env 文件里写死后端地址，否则会绕过代理、改端口时两处不同步。

### 生产构建

```bash
npm run build    # 输出到 dist/ 目录
npm run preview  # 本地预览生产构建
```

> **构建时那条 `chunks are larger than 500 kB` 警告可以忽略** —— 它是 Vite 的默认建议阈值，
> 不是错误，不影响功能与正确性。主包较大（1531 KB）的根因是 `src/main.js` 全量注册了
> ant-design-vue（`app.use(Antd)`），tree-shaking 失效；真正解法是改按需导入，但收益与回归风险
> 不成比例，**暂不处理**。
>
> 线上已通过 **Nginx gzip** 把传输量降到 480 KB（整页首屏 1688 KB → 575 KB，省 66%）——
> 这是服务器配置，与产物大小无关。配置与坑见 `docs/architecture.md` §9.3。

## 功能页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 价值投资理念展示（六段式落地页 + 暗/浅主题切换，**纯静态，不走任何后端接口**） |
| 市场温度 | `/market-temperature` | 顶部三视图切换（**美股大盘 / 黄金 / 比特币**）：3 维度综合评分、8 级状态映射、仓位建议、SPY/QQQ 指标、历史趋势图；黄金与比特币视图走资产温度（价格/日RSI6/周RSI6/MA200偏离/ATH回撤/52周位置 6 项指标）。**口径（2026-10-19 反转）：分数越高 = 越恐慌 = 越值得加仓**（与个股评分同向；高分蓝=机会，低分红=贪婪） |
| 交易信号 | `/momentum-leaders` | 空转多/多转空（EMA5/30交叉）+ 主升浪龙头 + 主跌浪超卖 + 低估做多 |
| 利弗莫尔 | `/livermore` | **独立信号体系**：关键点突破/逼近/已在关键点上方/风险四分组，口径说明卡 + 统计条 + 抽屉详情（关键点全景/金字塔加仓位/潮汐与相对强度） |
| 个股分析 | `/dashboard` | 道氏三层趋势 + 基本面估值（分析师+晨星）+ 关键位置盈亏比 + 形态置信度 + 综合评分 |
| 信号回测 | `/backtest` | **5 种策略模式**回测（趋势跟踪/买入并持有/波段操作/EMA飘带多头/EMA飘带空头），统计+交易明细 |
| 个股历史K线 | `/chart` | 蜡烛图 + MA/布林带/EMA多空带/成交量/MACD/RSI 多窗格联动 + **支撑压力位标注**（Swing Pivot 聚类）+ **利弗莫尔关键点叠加**（关键点/箱体下沿/止损，仅日线），支持 4H/日K/周K |
| 标的管理 | `/watchlist-manage` | 标的池增删改查 + 筛选 + 晨星折价排序 + 刷新快照 |
| 市场复盘 | `/review` | 日/周复盘报告 + 自媒体文案生成 |
| 我的持仓 | `/position` | 实时持仓查询（依赖本机 OpenD） |
| 目标仓位 | `/allocation` | 永久组合目标 vs 实际对比 + **五级**加仓建议（强烈买入/建议加仓/有差距等回调/已达标或超配/偏贵等回调，依赖本机 OpenD） |

## 导航结构

```
市场温度 | 交易信号 | 利弗莫尔 | 个股分析 ▾ | 信号回测 | 持仓配置 ▾ | 市场复盘 (beta) | 标的管理
                              ├─ 个股技术分析 (/dashboard)   ├─ 我的持仓 (/position)
                              └─ 个股历史K线 (/chart)        └─ 目标仓位 (/allocation)
```

> 「交易信号」是**平级链接**（指向 `/momentum-leaders`），不是下拉菜单；真正带 ▾ 的只有「个股分析」与「持仓配置」两个下拉。
> 「市场复盘」菜单项右侧带 `beta` 徽标。

## 认证

> **v2.8+**: 认证相关代码（登录页、axios 拦截器、后端鉴权端点）**已从代码库移除**，非"暂时禁用"。所有页面与 API 公开访问，无需登录。若需恢复，须从头重建。

## 技术栈

| 用途 | 库 | 说明 |
|------|-----|------|
| 框架 | Vue 3 | Composition API + `<script setup>` |
| 构建 | Vite 5 | 开发服务器 + 生产构建 |
| UI 组件 | Ant Design Vue 4 | 布局、卡片、表单、标签、表格等 |
| 图表 | lightweight-charts 4 | K 线主图 + 成交量/MACD/RSI 多窗格联动 |
| 图表 | ECharts 6 | 市场温度趋势图 |
| HTTP | Axios | API 请求 |
| 路由 | Vue Router 4 | 页面导航 |
| 日期 | Day.js | 日期处理。⚠️ **未写进 `package.json`**（由 ant-design-vue 传递安装），但 `Dashboard.vue` 直接 `import dayjs` —— 见 `docs/architecture.md` §2.1 注 |

## 后端 API

下表逐条对应 `src/api/trader.js` 的 33 个导出函数（**已核对无遗漏、无虚构**）。

| 接口 | 说明 | 页面 |
|------|------|------|
| `GET /health` | 健康检查（顶栏在线指示灯） | App.vue |
| `GET /api/market-temperature` | 市场温度（3 维度综合） | MarketTemperature |
| `GET /api/market-temperature/history` | 温度历史趋势 | MarketTemperature |
| `GET /api/asset-temperature/history` | 黄金/比特币资产温度历史 | MarketTemperature |
| `GET /api/analysis` | 道氏三层趋势 + 支撑/压力关键位（Swing Pivot 聚类）+ 形态置信度 + 盈亏比（1d/4h/1w） | Chart / Dashboard |
| `GET /api/indicators` | K 线 + 技术指标（1d/4h/1w） | Chart |
| `GET /api/scores/latest` | 6 因子评分（支持日期筛选） | Dashboard |
| `GET /api/scores/overview` | 全标的评分速览 + 动量龙头 | MomentumLeaders / ScoresOverview |
| `GET /api/fundamental` | 基本面估值（分析师目标价 + 晨星公允价值） | Dashboard |
| `GET /api/ema-cross-signals` | EMA5/30 交叉信号（空转多/多转空） | MomentumLeaders |
| `GET /api/daily-picks` | 高置信度低估做多机会 | MomentumLeaders |
| `GET /api/tp-sl` | 止盈止损位计算 | ScoresOverview |
| `GET /api/livermore/signals` | 利弗莫尔关键点信号（独立体系，四分组） | **Livermore** |
| `GET /api/livermore/detail` | 利弗莫尔关键点全景 + 可画线 `levels` | Livermore（抽屉）/ **Chart（K 线叠加）** |
| `GET /api/position` | 实时持仓（**依赖本机 OpenD**） | Position |
| `GET /api/allocation` | 永久组合目标与偏离 + 加仓建议（**依赖本机 OpenD**） | Allocation |
| `PUT /api/allocation` | 保存目标仓位配置 | Allocation |
| `GET /api/backtest/run` | 信号回测（5 种模式） | Backtest |
| `GET /api/review` | 日/周复盘报告 | Review |
| `GET /api/content-generator` | 自媒体文案生成 | Review |
| `GET /api/content-templates` | 文案模板列表 | Review |
| `PUT /api/content-templates/{key}` | 保存文案模板 | Review |
| `DELETE /api/content-templates/{key}` | 删除文案模板 | Review |
| `GET /api/watchlist` | 标的池（含晨星折价、最新收盘价、分类标签） | Chart / Dashboard / Backtest / WatchlistManage |
| `POST /api/watchlist` | 新增标的（内部调 Futu 补全快照，**需 OpenD**） | WatchlistManage |
| `PATCH /api/watchlist/{code}` | 编辑标的（仅白名单字段） | WatchlistManage |
| `DELETE /api/watchlist/{code}` | 删除标的 | WatchlistManage |
| `POST /api/watchlist/refresh-snapshot` | 批量刷新快照（**需 OpenD**） | WatchlistManage |

**定义了但当前无页面引用的 API 函数**（保留备用，改动时须知）：
`getIndicatorsLatest`、`getWatchlistDetail`、`batchAddWatchlist`、`getTradeSignals`、`getBottomSignals`。
> 前三个曾在本 README 与 `docs/architecture.md` 里被标为 Dashboard / WatchlistManage 使用，**属文档错误**（已更正）。

**后端有、前端完全没封装**的端点（`src/api/trader.js` 里**没有任何对应函数**）：
`/api/top-signals`、`/api/position-states`、`/api/sell-log`、`/api/grid/status`、`/api/grid/orders`。

> ⚠️ 另有两个端点 `/api/trade-signals`、`/api/bottom-signals`，前端**已封装**为 `getTradeSignals` / `getBottomSignals`，
> 但**无页面调用** —— 它们属于上面「定义了但当前无页面引用」那 5 个函数，**不要与本节这 5 个混为一类**
> （前者是「有函数没人用」，后者是「连函数都没有」）。

所有接口无数据时返回 **HTTP 200 + `{data: null, message: "提示文案"}`**（不是 404）。

## 目录结构

```
src/                          # 共 19 个文件
├── api/trader.js              # 所有后端 API 调用函数
├── styles/
│   ├── theme.js               # ant-design-vue 主题 token
│   └── tokens.css             # CSS 变量
├── components/
│   └── IndicatorChart.vue     # lightweight-charts 多窗格图表组件（唯一组件；含支撑压力位 + 利弗莫尔关键点绘制）
├── views/                     # ★ = 已在 router 注册
│   ├── Home.vue               # ★ 首页
│   ├── MarketTemperature.vue  # ★ 市场温度仪表盘
│   ├── MomentumLeaders.vue    # ★ 交易信号（空转多/多转空/主升浪龙头/主跌浪超卖）
│   ├── Livermore.vue          # ★ 利弗莫尔关键点（独立信号体系）
│   ├── Chart.vue              # ★ K 线图查询页（支撑压力位 + 利弗莫尔关键点叠加）
│   ├── Dashboard.vue          # ★ 道氏趋势个股分析
│   ├── Backtest.vue           # ★ 信号回测
│   ├── WatchlistManage.vue    # ★ 标的池管理
│   ├── Review.vue             # ★ 市场复盘 + 文案生成
│   ├── Position.vue           # ★ 我的持仓（依赖 OpenD）
│   ├── Allocation.vue         # ★ 目标仓位（依赖 OpenD）
│   └── ScoresOverview.vue     # 机会速览（未挂载）
├── router/index.js            # 路由配置（11 条已注册）
├── App.vue                    # 根组件（导航 + 健康检查）
└── main.js                    # 入口文件
```

> ⚠️ 2026-10-12 勘误：此前列出的 `components/KLineChart.vue` 与 `views/` 下的
> `Fundamental.vue` / `GridTrading.vue` / `Login.vue` / `StockFilter.vue` / `Settings.vue`
> **在仓库中均不存在**，已从文档删除。
>
> ⚠️ `ScoresOverview.vue` 未挂载路由，但 `Home.vue` 里有一个 `<router-link to="/scores-overview">机会速览</router-link>`
> 指向它 → **这是个死链**（点击落到空白）。属已知待处理问题。

## 文档索引

| 文件 | 性质 |
|---|---|
| `README.md`（本文件） | 现状说明，**与代码一致** |
| `docs/architecture.md` | 现状技术方案，**与代码一致**，页面细节以它为准 |
| `docs/design-spec-v1-clean-financial.md` | **v1 视觉改造设计稿（2026-06-18）**。色板/字体/Ant token/全局 CSS 已落地且逐值一致；但 §2、§3 的逐页布局描述**已与现状脱节**（Home、Dashboard 改动最大，Grid Trading 页已删除）。开头 §0 有现状对照表，**不要拿它当现状依据** |

## 端到端验收（零依赖 CDP）

`scripts/` 下是自包含的浏览器验收脚本，用本机 Chrome + Node 内置 WebSocket 驱动，
不装任何 npm 依赖。**前置：前端 5173 与后端 8000 都已在运行**。

```bash
node scripts/smoke-keylevels.mjs   # K 线支撑压力位标注（14 项）
node scripts/smoke-ktype.mjs       # 1d/4h/1w 周期切换（12 项）
node scripts/smoke-livermore.mjs   # 利弗莫尔模块（98 项）
```

`smoke-livermore.mjs` 覆盖：`/livermore` 四分组切换与表头列自适应、抽屉 5 区块、潮汐过滤开关、
K 线页利弗莫尔叠加（**用 canvas 指纹证明线确实画上去了**，DOM 看不到 canvas 绘制）、
**文字对比度断言**（防「前景色 == 背景色」的主题变量误用）、
边界（无整理平台标的 / 港股 / 4H 周期不再请求）。截图输出到 `F:/TraderAnalysis/logs/`。

详细技术方案见 [docs/architecture.md](docs/architecture.md)。
