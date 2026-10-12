# TraderAnalysis Frontend

股票分析前端，基于 Vue 3，对接后端 FastAPI 服务。提供市场温度、交易信号（空转多/多转空/主升浪龙头/主跌浪超卖/低估做多）、道氏趋势个股分析、基本面估值、信号回测、标的管理等功能。

🔗 [体验地址](http://47.106.175.84/)

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
| 交易信号 | `/momentum-leaders` | 空转多/多转空（EMA5/30交叉）+ 主升浪龙头 + 主跌浪超卖 + 低估做多 |
| 个股分析 | `/dashboard` | 道氏三层趋势 + 基本面估值（分析师+晨星）+ 关键位置盈亏比 + 形态置信度 + 综合评分 |
| 信号回测 | `/backtest` | 3 种策略模式回测（趋势跟踪/买入并持有/波段操作），统计+交易明细 |
| 个股历史K线 | `/chart` | 蜡烛图 + MA/布林带/EMA多空带/成交量/MACD/RSI 多窗格联动 + **支撑压力位标注**（水平线 + pivot 标记 + 明细卡片），支持 4H/日K/周K |
| 标的管理 | `/watchlist-manage` | 标的池增删改查 + 筛选 + 晨星折价排序 + 刷新快照 |
| 市场复盘 | `/review` | 日/周复盘报告 + 自媒体文案生成 |
| 我的持仓 | `/position` | 实时持仓查询（依赖本机 OpenD） |
| 目标仓位 | `/allocation` | 永久组合目标 vs 实际对比 + 四级加仓建议（依赖本机 OpenD） |

## 导航结构

```
市场温度 | 交易信号 ▾(空转多/多转空/主升浪龙头/主跌浪超卖/低估做多) | 个股分析 ▾ | 信号回测 | 标的管理
                              ├─ 个股技术分析
                              └─ 个股历史K线
```

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

## 后端 API

| 接口 | 说明 | 页面 |
|------|------|------|
| `GET /api/market-temperature` | 市场温度 | MarketTemperature |
| `GET /api/market-temperature/history` | 温度历史 | MarketTemperature |
| `GET /api/analysis` | 道氏趋势 + 支撑/压力关键位（Swing Pivot 聚类）+ 形态置信度 + 盈亏比（1d/4h/1w） | Dashboard / Chart |
| `GET /api/fundamental` | 基本面估值（分析师+晨星） | Dashboard |
| `GET /api/scores/latest` | 6 因子评分 | Dashboard |
| `GET /api/scores/overview` | 评分速览+动量龙头 | MomentumLeaders |
| `GET /api/ema-cross-signals` | EMA 交叉信号（空转多/多转空） | MomentumLeaders |
| `GET /api/daily-picks` | 高置信度低估做多机会 | MomentumLeaders |
| `GET /api/indicators` | K 线+指标（1d/4h/1w） | Chart |
| `GET /api/analysis` | 支撑/压力关键位（供 K 线图标注） | Chart |
| `GET /api/backtest/run` | 信号回测 | Backtest |
| `GET /api/watchlist` | 标的池（含晨星折价） | WatchlistManage |
| `POST/PATCH/DELETE /api/watchlist` | 标的管理 | WatchlistManage |
| `GET /health` | 健康检查 | App.vue |

## 目录结构

```
src/                          # 共 18 个文件
├── api/trader.js              # 所有后端 API 调用函数
├── styles/
│   ├── theme.js               # ant-design-vue 主题 token
│   └── tokens.css             # CSS 变量
├── components/
│   └── IndicatorChart.vue     # lightweight-charts 多窗格图表组件（唯一组件）
├── views/                     # ★ = 已在 router 注册
│   ├── Home.vue               # ★ 首页
│   ├── MarketTemperature.vue  # ★ 市场温度仪表盘
│   ├── MomentumLeaders.vue    # ★ 交易信号（空转多/多转空/主升浪龙头/主跌浪超卖）
│   ├── Chart.vue              # ★ K 线图查询页（含支撑压力位标注）
│   ├── Dashboard.vue          # ★ 道氏趋势个股分析
│   ├── Backtest.vue           # ★ 信号回测
│   ├── WatchlistManage.vue    # ★ 标的池管理
│   ├── Review.vue             # ★ 市场复盘 + 文案生成
│   ├── Position.vue           # ★ 我的持仓（依赖 OpenD）
│   ├── Allocation.vue         # ★ 目标仓位（依赖 OpenD）
│   └── ScoresOverview.vue     # 机会速览（未挂载）
├── router/index.js            # 路由配置
├── App.vue                    # 根组件（导航 + 健康检查）
└── main.js                    # 入口文件
```

> ⚠️ 2026-10-12 勘误：此前列出的 `components/KLineChart.vue` 与 `views/` 下的
> `Fundamental.vue` / `GridTrading.vue` / `Login.vue` / `StockFilter.vue` / `Settings.vue`
> **在仓库中均不存在**，已从文档删除。

详细技术方案见 [docs/architecture.md](docs/architecture.md)。
