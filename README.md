# TraderAnalysis Frontend

股票技术指标分析前端，基于 Vue 3，对接后端 FastAPI 服务，以 K 线图 + 多窗格技术指标图表展示交易数据。

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
#    概览页: http://localhost:5173/dashboard
#    K线图: http://localhost:5173/chart
```

### 生产构建

```bash
npm run build    # 输出到 dist/ 目录
npm run preview  # 本地预览生产构建
```

## 项目做了什么

1. **概览页 (Dashboard)** — 展示 SNDK 最新技术指标数值（价格、均线、布林带、MACD、RSI）和评分
2. **K 线图页 (Chart)** — 输入标的代码，查询并展示：
   - 主图：K 线蜡烛图 + MA5/10/20/60 均线 + 布林带
   - 副图：成交量、MACD（DIF/DEA/柱状图）、RSI14
   - 所有指标可通过页面上的**开关按钮**独立控制显隐
   - 支持鼠标拖拽缩放，四个窗格联动

## 技术栈

| 用途 | 库 | 说明 |
|------|-----|------|
| 框架 | Vue 3 | Composition API + `<script setup>` |
| 构建 | Vite 5 | 开发服务器 + 生产构建 |
| UI 组件 | Ant Design Vue 4 | 布局、卡片、表单、标签等界面元素 |
| 图表 | ECharts 6 | K 线 + 多窗格技术指标（MACD/RSI/成交量） |
| HTTP | Axios | API 请求，带错误拦截 |
| 路由 | Vue Router 4 | 页面导航 |

## 后端 API

前端通过 Vite 代理转发请求到 `http://localhost:8000`，无需处理跨域。

| 接口 | 说明 | 示例 |
|------|------|------|
| `GET /api/indicators` | K 线 + 全部指标 | `?code=US.SNDK&ktype=1d&days=250` |
| `GET /api/indicators/latest` | 最新一根指标值 | `?code=US.SNDK&ktype=1d` |
| `GET /api/scores/latest` | 最新评分 | `?code=US.SNDK` |
| `GET /api/watchlist` | 已入库标的列表 | 无参数 |

## 环境变量

通过 `.env` 文件配置，Vite 会自动加载：

| 文件 | 变量 | 默认值 |
|------|------|--------|
| `.env.development` | `VITE_API_BASE_URL` | `http://localhost:8000` |
| `.env.production` | `VITE_API_BASE_URL` | 需替换为实际生产地址 |

## 目录结构

```
src/
├── api/trader.js              # 所有后端 API 调用函数
├── components/
│   ├── IndicatorChart.vue     # ECharts 多窗格图表（主力组件）
│   └── KLineChart.vue         # LightweightCharts 图表（旧，保留未使用）
├── views/
│   ├── Dashboard.vue          # 概览页
│   └── Chart.vue              # K 线图查询页
├── router/index.js            # 路由配置
├── App.vue                    # 根组件（侧边栏布局）
└── main.js                    # 入口文件
```

详细技术方案见 [docs/architecture.md](docs/architecture.md)。
