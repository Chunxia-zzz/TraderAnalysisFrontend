# TraderAnalysis Frontend — 技术方案

> 更新日期：2026-05-11

---

## 1. 项目背景

TraderAnalysis 是一个股票技术分析系统。后端（FastAPI）负责获取行情数据、计算技术指标和评分；前端负责将这些数据以图表和数值面板的形式呈现给用户。

当前监控 **41 只标的**（覆盖大盘/黄金/比特币/存储/光通信/MAG7/加密/半导体/太空/云/中概/防守消费等 10 个分类），后端支持按标的代码查询。

### 1.1 核心用户场景

| 场景 | 描述 |
|------|------|
| 查看市场温度 | 综合评分（3 维度加权），判断市场当前处于恐慌/中性/贪婪状态，给出仓位建议 |
| 交易机会速览 | 一眼看清所有标的评分分布，可执行机会（止跌确认）+ 主升浪龙头 |
| 个股技术分析 | 查看某标的最新技术指标数值和评分（6 维度连续映射） |
| 基本面分析 | 全标的基本面评分速览（5 因子），单只详情弹窗 |
| 信号回测 | 3 种策略模式历史回测验证（买入并持有/技术指标买卖/跟随止盈） |
| 查看 K 线图 | 选择标的和周期，查看蜡烛图及叠加的技术指标 |
| 网格交易 | 网格策略运行状态监控、参数查看、交易记录 |
| 标的池管理 | 增删改查标的，筛选/搜索，推荐策略，刷新快照 |

---

## 2. 技术选型

### 2.1 核心依赖

| 库 | 版本 | 作用 | 选型理由 |
|----|------|------|----------|
| **Vue 3** | ^3.5 | 前端框架 | Composition API 灵活，生态成熟，中文资料丰富 |
| **Vite** | ^5.4 | 构建工具 | 毫秒级热更新，内置代理，Vue 官方推荐 |
| **Ant Design Vue** | ^4.2 | UI 组件库 | 提供布局、卡片、表单、标签、描述列表、日期选择器等 60+ 组件 |
| **ECharts** | ^6.0 | 图表渲染 | 原生支持 K 线蜡烛图 + 多窗格联动，适合金融场景 |
| **Axios** | ^1.7 | HTTP 客户端 | 拦截器、超时控制、错误统一处理 |
| **Vue Router** | ^4.4 | 路由 | SPA 页面导航，支持懒加载 + 路由守卫 |
| **Day.js** | — | 日期处理 | Ant Design Vue DatePicker 依赖 |

### 2.2 为什么用 ECharts 而不是 LightweightCharts

项目最初使用了 TradingView 的 LightweightCharts。后来后端 API 新增了 MACD、RSI、成交量等需要**独立子图窗格**展示的指标，LightweightCharts 不原生支持多窗格联动，实现复杂且效果差。ECharts 通过 `grid` + `dataZoom` 可以在一个图表实例内实现多个窗格共享时间轴、联动缩放，是更合适的选择。

> LightweightCharts 的依赖仍保留在 package.json 中，对应的旧组件 `KLineChart.vue` 也保留未删除，当前未被使用。

---

## 3. 项目结构

```
TraderAnalysisFrontend/
│
├── index.html                    # HTML 入口，Vite 从这里启动
├── package.json                  # 依赖声明和 npm 脚本
├── vite.config.js                # Vite 配置（开发代理、端口）
│
├── public/                       # 静态资源（直接复制到 dist/）
│   └── favicon.ico
│
├── docs/                         # 文档目录
│   └── architecture.md           # 本文件
│
└── src/                          # 源代码
    ├── main.js                   # 应用入口
    ├── App.vue                   # 根组件（顶部导航 + 下拉菜单 + 健康检查）
    ├── router/index.js           # 路由配置
    ├── api/trader.js             # API 调用层
    ├── components/               # 可复用组件
    │   ├── IndicatorChart.vue    # ECharts 图表组件
    │   └── KLineChart.vue        # 旧图表组件（未使用）
    └── views/                    # 页面
        ├── Home.vue              # 首页（价值投资理念）
        ├── MarketTemperature.vue # 市场温度仪表盘
        ├── ScoresOverview.vue    # 机会速览（价值）+ 可执行机会 + 主升浪
        ├── Dashboard.vue         # 个股技术分析
        ├── Fundamental.vue       # 个股基本面分析
        ├── Backtest.vue          # 信号回测（3 策略模式）
        ├── Chart.vue             # 个股历史K线
        ├── GridTrading.vue       # 网格交易监控
        ├── WatchlistManage.vue   # 标的池管理
        ├── Login.vue             # 登录页（暂时禁用）
        ├── StockFilter.vue       # 条件选股（暂时隐藏）
        └── Settings.vue          # 设置（暂时隐藏）
```

---

## 4. 认证系统

> **v2.8+ 状态：认证暂时禁用。** 所有页面公开访问，无路由守卫，无 token 管理。
> Login.vue 和相关拦截器代码保留在代码库中，待后端恢复认证后可重新启用。

---

## 5. 页面与路由

### 5.1 路由表

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | Home.vue | 首页，价值投资理念 |
| `/market-temperature` | MarketTemperature.vue | 市场温度仪表盘 |
| `/scores-overview` | ScoresOverview.vue | 机会速览（价值）+ 可执行机会 + 主升浪 |
| `/dashboard` | Dashboard.vue | 个股技术分析 |
| `/fundamental` | Fundamental.vue | 个股基本面分析 |
| `/backtest` | Backtest.vue | 信号回测（3 种策略模式） |
| `/chart` | Chart.vue | 个股历史K线 |
| `/grid-trading` | GridTrading.vue | 网格交易监控 |
| `/watchlist-manage` | WatchlistManage.vue | 标的池管理 |

所有路由使用懒加载（`() => import(...)`）。

### 5.2 布局

采用**顶部导航栏**布局：
- Logo 在左侧，导航链接在右侧
- 浅色主题（白色背景 + 蓝色高亮）
- 内容区域最大宽度 1400px 居中
- 后端状态指示灯（绿/红点）
- "个股分析"为下拉菜单（包含技术分析/基本面/历史K线）

---

## 6. 各页面详细说明

### 6.1 Home.vue — 首页

品牌展示页，价值投资理念 + "查看市场温度"按钮 + 登录按钮（未登录时显示）。无后端 API 调用。

### 6.2 Login.vue — 登录页

**API 调用：** `POST /api/auth/login`

居中卡片表单（用户名 + 密码），登录成功后存储 token/role 并跳转首页。后端登录失败返回 200 + `{data: null, message}`，前端判断 `access_token` 是否存在。

### 6.3 MarketTemperature.vue — 市场温度仪表盘

**API 调用：**
- `GET /api/market-temperature` — 最新评分
- `GET /api/market-temperature/history?days=60` — 历史趋势

**页面结构：**
1. **快速链接** — CNN Fear & Greed Index + VIX 期货价格提示
2. **顶部概览** — 综合评分、市场状态标签、建议仓位、操作建议、杠杆提示
3. **维度拆解（3 行）** — 日线技术面[50%] / 周线技术面[35%] / 价格位置[15%]
4. **标的卡片（2 列）** — SPY + QQQ：价格、日RSI、周RSI、MA200偏离度
5. **历史趋势图** — ECharts 折线图，综合评分 + 建议仓位双 Y 轴

### 6.4 ScoresOverview.vue — 机会速览（价值）

**API 调用：** `GET /api/scores/overview`

**页面结构（v2.9+）：**
1. **可执行机会区** — 评分达标(≥60) + 站上MA5确认止跌，蓝色高亮
2. **主升浪龙头区** — 动量评分≥70，红色高亮，显示动量分数
3. **强烈买入(≥80)** — 带MA5状态标签
4. **建议买入(60~79)** — 带MA5状态标签
5. **观望(<60)** — 高动量标的显示动量徽章

支持日期切换，点击跳转 Dashboard 详情。

### 6.5 Chart.vue — K 线图查询页

**API 调用：** `GET /api/indicators` + `GET /api/watchlist`

标的选择器 + 蜡烛图 + MA/布林带/成交量/MACD/RSI 多窗格联动，指标可切换显隐。

### 6.6 Dashboard.vue — 个股技术分析

**API 调用：** `GET /api/indicators/latest` + `GET /api/scores/latest` + `GET /api/watchlist`

6 维度连续评分（进度条），技术指标数值面板，支持日期选择查看历史。

### 6.7 Fundamental.vue — 基本面分析

**API 调用：**
- `GET /api/fundamental/overview` — 全标的基本面速览
- `GET /api/fundamental/latest?code=XXX` — 单只详情

**页面结构：**
1. **统计卡片** — 低估/合理/高估/跳过 数量
2. **三组分区表格** — UNDERVALUED / FAIR / OVERVALUED
3. **详情弹窗** — 5因子评分分解 + 估值/分析师/成长性/财务健康明细

**5 因子（满分 100）：** 估值折价(30) / PE合理性(20) / 成长性(20) / 财务健康(15) / 分析师共识(15)

### 6.8 Backtest.vue — 信号回测

**API 调用：** `GET /api/backtest/run` + `GET /api/watchlist`

**策略模式（3 种）：**
- **止跌买入，持有至跌破卖出（推荐）** — trailing_stop 模式，跟随均线(MA5/10/20/60)止盈，可选站上MA5入场确认
- **买入并持有** — hold 模式，固定持仓天数(1-250天)
- **技术指标买入卖出** — signal_exit 模式，退出阈值+最大持仓天数

**页面结构：** 参数表单 → 统计概览(胜率/收益率/利润因子等) → 交易明细表

### 6.9 GridTrading.vue — 网格交易

**API 调用：** `GET /api/grid/status` + `GET /api/grid/orders`

**页面结构：**
1. 状态概览（标的、运行状态、环境、最新价）
2. 网格参数（价格上下限、网格数量、间距、每格数量、最大持仓）
3. 实时状态（当前持仓、成本、当日盈亏、交易次数）
4. 网格线可视化
5. 交易记录表

### 6.10 WatchlistManage.vue — 标的池管理

**API 调用：** `GET/POST/PATCH/DELETE /api/watchlist` + `POST /api/watchlist/refresh-snapshot`

表格展示全部标的，支持分类/市场筛选和搜索。显示推荐策略(hold_10d/hold_20d/swing/trend_ma5/ma10/ma20)。新增/编辑弹窗含策略选择，删除确认，刷新快照。

> 条件选股(StockFilter.vue)和设置(Settings.vue)暂时隐藏，代码保留。

---

## 7. API 调用层

### `src/api/trader.js`

所有后端请求集中在这一个文件中。

**Axios 实例配置：**
- baseURL：从环境变量 `VITE_API_BASE_URL` 读取，默认 `http://localhost:8000`
- 超时：10 秒（回测接口 30 秒）
- 无认证拦截器（认证暂时禁用）

**导出函数：**

| 函数 | 请求 | 页面 |
|------|------|------|
| `getHealth()` | `GET /health` | App.vue |
| `getWatchlist(params?)` | `GET /api/watchlist` | 多处 |
| `getWatchlistDetail(code)` | `GET /api/watchlist/{code}` | — |
| `addWatchlistStock(payload)` | `POST /api/watchlist` | WatchlistManage |
| `updateWatchlistStock(code, payload)` | `PATCH /api/watchlist/{code}` | WatchlistManage |
| `deleteWatchlistStock(code)` | `DELETE /api/watchlist/{code}` | WatchlistManage |
| `batchAddWatchlist(payload)` | `POST /api/watchlist/batch` | WatchlistManage |
| `refreshSnapshot(code?)` | `POST /api/watchlist/refresh-snapshot` | WatchlistManage |
| `stockFilterSearch(params)` | `GET /api/stock-filter/search` | StockFilter |
| `stockFilterInfo(code)` | `GET /api/stock-filter/info` | StockFilter |
| `getFundamentalLatest(code)` | `GET /api/fundamental/latest` | Fundamental |
| `getFundamentalOverview()` | `GET /api/fundamental/overview` | Fundamental |
| `getIndicators(code, ktype, days)` | `GET /api/indicators` | Chart |
| `getIndicatorsLatest(code, ktype)` | `GET /api/indicators/latest` | Dashboard |
| `getScoresLatest(code, date?)` | `GET /api/scores/latest` | Dashboard |
| `getScoresOverview(date?)` | `GET /api/scores/overview` | ScoresOverview |
| `getMarketTemperature()` | `GET /api/market-temperature` | MarketTemperature |
| `getMarketTemperatureHistory(days)` | `GET /api/market-temperature/history` | MarketTemperature |
| `getBacktestRun(params)` | `GET /api/backtest/run` | Backtest |
| `getGridStatus(configId)` | `GET /api/grid/status` | GridTrading |
| `getGridOrders(configId, limit)` | `GET /api/grid/orders` | GridTrading |

---

## 8. 组件

### `src/components/IndicatorChart.vue`

基于 ECharts 的多窗格联动图表组件。

**Props：** `data`(Array) / `height`(Number, 默认800) / `visible`(Object, 各指标显隐)

**图表结构：** 主图(K线+MA+布林) → 成交量 → MACD → RSI → DataZoom（四窗格联动）

---

## 9. 开发指南

### 9.1 本地开发

```bash
npm install
npm run dev   # http://localhost:5173
```

### 9.2 新增页面步骤

1. 在 `src/views/` 创建 `.vue` 文件
2. 在 `src/router/index.js` 添加路由（需认证的不加 `meta: { public: true }`）
3. 在 `src/App.vue` 导航栏添加链接
4. 如需新接口，在 `src/api/trader.js` 添加函数

### 9.3 生产部署

```bash
npm run build   # 生成 dist/ 目录
```

`dist/` 是纯静态文件，可用 Nginx/Caddy 托管。API 请求需通过反向代理转发到后端。
