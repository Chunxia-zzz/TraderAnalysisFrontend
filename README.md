# TraderAnalysis Frontend

股票分析前端，基于 Vue 3，对接后端 FastAPI 服务。提供市场温度、交易机会速览、K 线图、个股技术分析、基本面分析、标的管理、条件选股等功能。

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
#    首页（公开）: http://localhost:5173/
#    登录: http://localhost:5173/login
```

### 生产构建

```bash
npm run build    # 输出到 dist/ 目录
npm run preview  # 本地预览生产构建
```

## 功能页面

| 页面 | 路由 | 认证 | 说明 |
|------|------|------|------|
| 首页 | `/` | 公开 | 价值投资理念 + 登录入口 |
| 登录 | `/login` | 公开 | JWT 登录 |
| 市场温度 | `/market-temperature` | 需登录 | 3 维度综合评分，8 级状态映射，仓位建议，SPY/QQQ 指标，历史趋势图 |
| 机会速览 | `/scores-overview` | 需登录 | 全标的技术面评分分布，按信号分组（强买/买入/观望），支持日期切换 |
| K 线图 | `/chart` | 需登录 | 蜡烛图 + MA/布林带/成交量/MACD/RSI 多窗格联动 |
| 个股技术分析 | `/dashboard` | 需登录 | 6 维度连续评分，技术指标数值面板 |
| 基本面分析 | `/fundamental` | 需登录 | 5 因子基本面评分速览（低估/合理/高估），单只详情弹窗 |
| 条件选股 | `/stock-filter` | 需登录 | 按市值/PE/价格/行业筛选，一键加入标的池（需 OpenD） |
| 标的管理 | `/watchlist-manage` | admin | 标的池增删改查 + 筛选 + 刷新快照 |
| 设置 | `/settings` | 需登录 | 用户信息 + 修改密码 |

## 认证

- 首页公开，所有功能页需登录
- 登录后 JWT token 存入 localStorage，Axios 自动附加到请求头
- 收到 401 自动跳转登录页
- admin 角色可见「标的管理」入口

## 技术栈

| 用途 | 库 | 说明 |
|------|-----|------|
| 框架 | Vue 3 | Composition API + `<script setup>` |
| 构建 | Vite 5 | 开发服务器 + 生产构建 |
| UI 组件 | Ant Design Vue 4 | 布局、卡片、表单、标签、表格等 |
| 图表 | ECharts 6 | K 线 + 多窗格技术指标 + 市场温度趋势 |
| HTTP | Axios | API 请求，认证拦截器 |
| 路由 | Vue Router 4 | 页面导航 + 路由守卫 |

## 后端 API

前端通过 Vite 代理转发请求到 `http://localhost:8000`，无需处理跨域。

| 接口 | 说明 | 页面 |
|------|------|------|
| `POST /api/auth/login` | 登录 | Login |
| `GET /api/auth/me` | 当前用户 | Settings |
| `POST /api/auth/change-password` | 修改密码 | Settings |
| `GET /api/market-temperature` | 市场温度 | MarketTemperature |
| `GET /api/market-temperature/history` | 温度历史 | MarketTemperature |
| `GET /api/scores/overview` | 评分速览 | ScoresOverview |
| `GET /api/scores/latest` | 个股评分 | Dashboard |
| `GET /api/indicators` | K 线+指标 | Chart |
| `GET /api/indicators/latest` | 最新指标 | Dashboard |
| `GET /api/fundamental/overview` | 基本面速览 | Fundamental |
| `GET /api/fundamental/latest` | 基本面详情 | Fundamental |
| `GET /api/watchlist` | 标的池 | 多处 |
| `POST/PATCH/DELETE /api/watchlist` | 标的管理 | WatchlistManage |
| `GET /api/stock-filter/search` | 条件选股 | StockFilter |
| `GET /health` | 健康检查 | App.vue |

## 目录结构

```
src/
├── api/trader.js              # 所有后端 API 调用函数（20个）
├── components/
│   └── IndicatorChart.vue     # ECharts 多窗格图表组件
├── views/
│   ├── Home.vue               # 首页
│   ├── Login.vue              # 登录页
│   ├── MarketTemperature.vue  # 市场温度仪表盘
│   ├── ScoresOverview.vue     # 交易机会速览
│   ├── Chart.vue              # K 线图查询页
│   ├── Dashboard.vue          # 个股技术分析
│   ├── Fundamental.vue        # 基本面分析
│   ├── WatchlistManage.vue    # 标的池管理
│   ├── StockFilter.vue        # 条件选股
│   └── Settings.vue           # 设置
├── router/index.js            # 路由配置 + 认证守卫
├── App.vue                    # 根组件（导航 + 健康检查 + 登出）
└── main.js                    # 入口文件
```

详细技术方案见 [docs/architecture.md](docs/architecture.md)。
