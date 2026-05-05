# TraderAnalysis Frontend

股票技术分析前端，基于 Vue 3，对接后端 FastAPI 服务。提供市场温度仪表盘、交易机会速览、K 线图、个股技术分析等功能。

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
#    市场温度: http://localhost:5173/market-temperature
#    机会速览: http://localhost:5173/scores-overview
#    K线图: http://localhost:5173/chart
#    个股分析: http://localhost:5173/dashboard
```

### 生产构建

```bash
npm run build    # 输出到 dist/ 目录
npm run preview  # 本地预览生产构建
```

## 功能页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 品牌 slogan + 快速入口 |
| 市场温度 | `/market-temperature` | 3 维度综合评分（日线技术面/周线技术面/价格位置），8 级状态映射，仓位建议，SPY/QQQ 指标，历史趋势图 |
| 机会速览 | `/scores-overview` | 全标的评分分布，按信号分组（强买/买入/观望），支持日期切换，点击跳转详情 |
| K 线图 | `/chart` | 标的选择 + 蜡烛图 + MA/布林带/成交量/MACD/RSI 多窗格联动，指标可切换显隐 |
| 个股技术分析 | `/dashboard` | 6 维度连续评分（进度条展示），技术指标数值面板，支持日期选择查看历史评分 |

## 技术栈

| 用途 | 库 | 说明 |
|------|-----|------|
| 框架 | Vue 3 | Composition API + `<script setup>` |
| 构建 | Vite 5 | 开发服务器 + 生产构建 |
| UI 组件 | Ant Design Vue 4 | 布局、卡片、表单、标签、日期选择器等 |
| 图表 | ECharts 6 | K 线 + 多窗格技术指标 + 市场温度趋势 |
| HTTP | Axios | API 请求，带错误拦截 |
| 路由 | Vue Router 4 | 页面导航 |

## 后端 API

前端通过 Vite 代理转发请求到 `http://localhost:8000`，无需处理跨域。

| 接口 | 说明 | 页面 |
|------|------|------|
| `GET /api/market-temperature` | 市场温度最新评分 | MarketTemperature |
| `GET /api/market-temperature/history` | 市场温度历史 | MarketTemperature |
| `GET /api/scores/overview` | 全标的评分速览 | ScoresOverview |
| `GET /api/scores/latest` | 个股评分（支持 date 参数） | Dashboard |
| `GET /api/indicators` | K 线 + 全部指标 | Chart |
| `GET /api/indicators/latest` | 最新一根指标值 | Dashboard |
| `GET /api/watchlist` | 标的池（41 只） | 标的选择器 |

## 目录结构

```
src/
├── api/trader.js              # 所有后端 API 调用函数
├── components/
│   └── IndicatorChart.vue     # ECharts 多窗格图表组件
├── views/
│   ├── Home.vue               # 首页
│   ├── MarketTemperature.vue  # 市场温度仪表盘
│   ├── ScoresOverview.vue     # 交易机会速览
│   ├── Chart.vue              # K 线图查询页
│   └── Dashboard.vue          # 个股技术分析
├── router/index.js            # 路由配置
├── App.vue                    # 根组件（顶部导航布局）
└── main.js                    # 入口文件
```

详细技术方案见 [docs/architecture.md](docs/architecture.md)。
