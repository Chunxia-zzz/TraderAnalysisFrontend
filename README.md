# TraderAnalysis Frontend

股票分析前端，基于 Vue 3，对接后端 FastAPI 服务。提供市场温度、交易机会速览、个股技术分析、信号回测、止盈止损、标的管理等功能。

## 快速启动

### 前提条件

- **Node.js** >= 18（推荐 20+），附带 npm
- **后端服务**运行在 `http://localhost:8000`（FastAPI，接口文档：http://localhost:8000/docs）

### 三步启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 3. 打开浏览器访问
#    首页: http://localhost:5173/
```

### 生产构建

```bash
npm run build    # 输出到 dist/ 目录
npm run preview  # 本地预览生产构建
```

## 功能页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 价值投资理念展示 |
| 市场温度 | `/market-temperature` | 3 维度综合评分，8 级状态映射，仓位建议，SPY/QQQ 指标，历史趋势图 |
| 机会速览（价值） | `/scores-overview` | 全标的评分分布（强买/买入/观望）+ 可执行机会 + 主升浪龙头 + 止盈止损 |
| 个股技术分析 | `/dashboard` | 6 维度连续评分，技术指标数值面板 |
| 信号回测 | `/backtest` | 3 种策略模式回测（趋势跟踪/买入并持有/波段操作），统计+交易明细 |
| 个股历史K线 | `/chart` | 蜡烛图 + MA/布林带/EMA多空带/成交量/MACD/RSI 多窗格联动 |
| 标的管理 | `/watchlist-manage` | 标的池增删改查 + 筛选 + 推荐策略 + 刷新快照 |
| ~~个股基本面分析~~ | `/fundamental` | *暂时隐藏* |
| ~~网格交易~~ | `/grid-trading` | *暂时隐藏* |

## 导航结构

```
市场温度 | 机会速览（价值） | 个股分析 ▾ | 信号回测 | 标的管理
                              ├─ 个股技术分析
                              └─ 个股历史K线
```

## 认证

> **v2.8+**: 认证模块暂时禁用。所有页面公开访问，无需登录。

## 技术栈

| 用途 | 库 | 说明 |
|------|-----|------|
| 框架 | Vue 3 | Composition API + `<script setup>` |
| 构建 | Vite 5 | 开发服务器 + 生产构建 |
| UI 组件 | Ant Design Vue 4 | 布局、卡片、表单、标签、表格等 |
| 图表 | ECharts 6 | K 线 + 多窗格技术指标 + 市场温度趋势 |
| HTTP | Axios | API 请求 |
| 路由 | Vue Router 4 | 页面导航 |

## 后端 API

| 接口 | 说明 | 页面 |
|------|------|------|
| `GET /api/market-temperature` | 市场温度 | MarketTemperature |
| `GET /api/market-temperature/history` | 温度历史 | MarketTemperature |
| `GET /api/scores/overview` | 评分速览+可执行+主升浪 | ScoresOverview |
| `GET /api/scores/latest` | 个股评分 | Dashboard |
| `GET /api/indicators` | K 线+指标 | Chart |
| `GET /api/indicators/latest` | 最新指标 | Dashboard |
| `GET /api/backtest/run` | 信号回测 | Backtest |
| `GET /api/tp-sl` | 止盈止损 | ScoresOverview |
| `GET /api/watchlist` | 标的池 | 多处 |
| `POST/PATCH/DELETE /api/watchlist` | 标的管理 | WatchlistManage |
| `GET /health` | 健康检查 | App.vue |

## 目录结构

```
src/
├── api/trader.js              # 所有后端 API 调用函数
├── components/
│   ├── IndicatorChart.vue     # ECharts 多窗格图表组件
│   └── KLineChart.vue         # 旧图表组件（未使用）
├── views/
│   ├── Home.vue               # 首页
│   ├── MarketTemperature.vue  # 市场温度仪表盘
│   ├── ScoresOverview.vue     # 机会速览（价值）
│   ├── Chart.vue              # K 线图查询页
│   ├── Dashboard.vue          # 个股技术分析
│   ├── Fundamental.vue        # 基本面分析（暂时隐藏）
│   ├── Backtest.vue           # 信号回测
│   ├── GridTrading.vue        # 网格交易（暂时隐藏）
│   ├── WatchlistManage.vue    # 标的池管理
│   ├── Login.vue              # 登录页（暂时禁用）
│   ├── StockFilter.vue        # 条件选股（暂时隐藏）
│   └── Settings.vue           # 设置（暂时隐藏）
├── router/index.js            # 路由配置
├── App.vue                    # 根组件（导航 + 健康检查）
└── main.js                    # 入口文件
```

详细技术方案见 [docs/architecture.md](docs/architecture.md)。
