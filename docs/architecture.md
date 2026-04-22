# TraderAnalysis Frontend — 技术方案

> 更新日期：2026-04-22

---

## 1. 项目背景

TraderAnalysis 是一个股票技术分析系统。后端（FastAPI）负责获取行情数据、计算技术指标和评分；前端负责将这些数据以图表和数值面板的形式呈现给用户。

当前主要分析标的为 **US.SNDK**，后端支持按标的代码查询。

### 1.1 核心用户场景

| 场景 | 描述 |
|------|------|
| 查看 K 线图 | 用户输入标的代码，选择周期(日K/周K)和天数，查看蜡烛图及叠加的技术指标 |
| 切换指标显隐 | 通过页面按钮控制均线、布林带、成交量、MACD、RSI 的显示/隐藏 |
| 查看概览 | 一眼看到最新的价格、均线、MACD、RSI 数值和综合评分 |

---

## 2. 技术选型

### 2.1 核心依赖

| 库 | 版本 | 作用 | 选型理由 |
|----|------|------|----------|
| **Vue 3** | ^3.5 | 前端框架 | Composition API 灵活，生态成熟，中文资料丰富 |
| **Vite** | ^5.4 | 构建工具 | 毫秒级热更新，内置代理，Vue 官方推荐 |
| **Ant Design Vue** | ^4.2 | UI 组件库 | 提供布局(Layout)、卡片(Card)、表单(Input/Select)、标签(Tag)、描述列表(Descriptions) 等 60+ 组件，开箱即用 |
| **ECharts** | ^6.0 | 图表渲染 | 原生支持 K 线蜡烛图 + 多窗格(grid)联动，适合金融场景 |
| **Axios** | ^1.7 | HTTP 客户端 | 拦截器、超时控制、错误统一处理 |
| **Vue Router** | ^4.4 | 路由 | SPA 页面导航，支持懒加载 |

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
├── .env.development              # 开发环境变量（后端地址）
├── .env.production               # 生产环境变量
│
├── public/                       # 静态资源（直接复制到 dist/）
│   └── favicon.ico
│
├── docs/                         # 文档目录
│   └── architecture.md           # 本文件
│
└── src/                          # 源代码
    ├── main.js                   # 应用入口
    ├── App.vue                   # 根组件
    ├── router/index.js           # 路由配置
    ├── api/trader.js             # API 调用层
    ├── components/               # 可复用组件
    │   ├── IndicatorChart.vue    # ECharts 图表组件
    │   └── KLineChart.vue        # 旧图表组件（未使用）
    └── views/                    # 页面
        ├── Dashboard.vue         # 概览页
        └── Chart.vue             # K 线图查询页
```

---

## 4. 各文件详细说明

### 4.1 配置文件

#### `index.html`
Vite 的 HTML 入口。包含一个 `<div id="app">` 挂载点和一个 `<script>` 标签引入 `src/main.js`。不需要手动修改。

#### `vite.config.js`
Vite 构建配置。关键内容：
- 开发服务器端口：**5173**
- API 代理：将 `/api`、`/v1`、`/health` 开头的请求转发到 `http://localhost:8000`，这样前端开发时不需要处理跨域问题

#### `.env.development` / `.env.production`
环境变量文件。`VITE_API_BASE_URL` 控制 Axios 的 baseURL：
- 开发环境：`http://localhost:8000`
- 生产环境：需替换为实际部署的后端地址

#### `package.json`
npm 脚本：
- `npm run dev` — 启动开发服务器（带热更新）
- `npm run build` — 构建生产版本到 `dist/` 目录
- `npm run preview` — 本地预览生产构建结果

---

### 4.2 应用入口

#### `src/main.js`
Vue 应用的启动文件。做三件事：
1. 创建 Vue 应用实例
2. 注册 Ant Design Vue 组件库（全局注册，所有 `a-xxx` 组件都可直接使用）
3. 注册 Vue Router，挂载到 `#app`

#### `src/App.vue`
根组件，定义了整个应用的外壳布局：
- **左侧边栏**：导航菜单（概览、K 线图），可折叠
- **顶部 Header**：显示后端连接状态（绿点=已连接，红点=离线）
- **中间内容区**：`<router-view>` 渲染当前页面
- **底部 Footer**：版权信息

启动时调用 `GET /health` 检测后端是否在线。

#### `src/router/index.js`
定义两条路由：
| 路径 | 组件 | 说明 |
|------|------|------|
| `/dashboard` | Dashboard.vue | 概览页（默认首页，`/` 重定向到这里） |
| `/chart` | Chart.vue | K 线图查询页 |

使用懒加载（`() => import(...)`），页面只在访问时才加载。

---

### 4.3 API 调用层

#### `src/api/trader.js`

所有后端请求集中在这一个文件中，方便维护。

**Axios 实例配置：**
- baseURL：从环境变量读取，默认 `http://localhost:8000`
- 超时：10 秒
- 错误拦截器：统一打印错误日志

**导出的函数（当前使用的）：**

| 函数 | 请求 | 参数 | 用在哪里 |
|------|------|------|----------|
| `getIndicators(code, ktype, days)` | `GET /api/indicators` | code=标的代码, ktype=1d/1w, days=天数 | Chart.vue |
| `getIndicatorsLatest(code, ktype)` | `GET /api/indicators/latest` | code, ktype | Dashboard.vue |
| `getScoresLatest(code)` | `GET /api/scores/latest` | code | Dashboard.vue |
| `getWatchlist()` | `GET /api/watchlist` | 无 | 暂未使用 |

**保留的旧函数（对接旧版 `/v1` 接口，当前未使用）：**
`getHealth`, `getLatest`, `getHistory`, `getLatestSignal`

---

### 4.4 组件

#### `src/components/IndicatorChart.vue`

**核心图表组件**，基于 ECharts，接收后端返回的数据数组，渲染多窗格联动图表。

**Props：**
| 名称 | 类型 | 说明 |
|------|------|------|
| `data` | Array | 后端 `/api/indicators` 返回的 `data` 数组 |
| `height` | Number | 图表高度（px），默认 800 |
| `visible` | Object | 各指标显隐控制，如 `{ ma5: true, macd: false, ... }` |

**图表结构：**
```
┌──────────────────────────────┐
│  主图：K 线 + MA + 布林带     │  ← 始终显示
├──────────────────────────────┤
│  成交量：柱状图 + VOL MA20    │  ← 可隐藏
├──────────────────────────────┤
│  MACD：DIF/DEA 线 + 柱状图   │  ← 可隐藏
├──────────────────────────────┤
│  RSI：RSI14 + 超买/超卖线    │  ← 可隐藏
├──────────────────────────────┤
│  ═══ 时间轴滑块(DataZoom) ═══ │  ← 拖拽缩放，四窗格联动
└──────────────────────────────┘
```

**动态布局：** 当副图（成交量/MACD/RSI）被关闭时，组件会自动重新计算布局，主图扩大填充空间。

**颜色规范：**
| 元素 | 颜色 |
|------|------|
| 上涨（阳线） | 红色 `#ef5350` |
| 下跌（阴线） | 绿色 `#26a69a` |
| MA5 | 橙色 `#ff9800` |
| MA10 | 蓝色 `#2196f3` |
| MA20 | 粉色 `#e91e63` |
| MA60 | 紫色 `#9c27b0` |
| 布林带 | 棕色 `#795548` |
| DIF | 橙色 `#ff9800` |
| DEA | 蓝色 `#2196f3` |
| RSI14 | 深橙 `#ff5722` |

#### `src/components/KLineChart.vue`（旧，未使用）

基于 LightweightCharts 的旧版图表组件，仅支持 K 线 + SMA/EMA + 布林带，不支持 MACD/RSI 子图。保留供参考，当前没有页面引用它。

---

### 4.5 页面

#### `src/views/Chart.vue` — K 线图查询页

**业务功能：**
用户输入标的代码、选择周期和天数，点击查询后展示技术指标图表。页面打开时自动加载 `US.SNDK` 的 250 日数据。

**页面结构：**
1. **查询表单** — 标的代码输入框（默认 `US.SNDK`）、周期选择（日K/周K）、天数输入（10-500，默认 250）、查询按钮
2. **指标开关栏** — 彩色标签按钮，点击切换指标显隐：
   - 均线组：MA5、MA10（默认开）、MA20、MA60（默认关）
   - 布林带：BOLL（默认开）
   - 副图组：成交量、MACD、RSI（默认全开）
3. **图表区域** — IndicatorChart 组件

**数据流：**
```
用户点击查询
  → 调用 getIndicators(code, ktype, days)
  → 后端返回 { code, ktype, data: [...] }
  → data 传入 IndicatorChart 组件渲染
```

#### `src/views/Dashboard.vue` — 概览页

**业务功能：**
展示 US.SNDK 的最新技术指标数值和评分，页面打开时自动加载。

**页面结构：**
1. **评分卡片** — 综合评分（颜色标识：>=70 绿色, <=30 红色, 中间黄色）+ 趋势/动量/波动分项
2. **技术指标卡片** — 日期、OHLC 价格、成交量
3. **均线 & 布林带卡片** — MA5/10/20/60、BOLL 上/中/下轨
4. **MACD & RSI 卡片** — DIF、DEA、MACD、RSI14

---

## 5. 后端 API 接口

后端为 FastAPI 服务，运行在 `http://localhost:8000`，接口文档：`http://localhost:8000/docs`。

### 5.1 接口列表

#### `GET /api/indicators`
返回某标的某周期最近 N 根 K 线及全部技术指标，日期升序。

| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `code` | 是 | — | 标的代码，如 `US.SNDK` |
| `ktype` | 否 | `1d` | 周期，`1d`=日K，`1w`=周K |
| `days` | 否 | `60` | K 线数量，1-500 |

响应示例（单条数据）：
```json
{
  "code": "US.SNDK",
  "ktype": "1d",
  "data": [
    {
      "date": "2026-04-21",
      "open": 927.85, "high": 938.78, "low": 899.2, "close": 903.49,
      "volume": 10245937,
      "ma5": 909.74, "ma10": 892.99, "ma20": 778.34, "ma60": 672.19,
      "ma120": 469.81, "ma250": 258.51,
      "rsi14": 65.02,
      "dif": 74.89, "dea": 64.57, "macd": 20.63,
      "boll_upper": 1028.16, "boll_mid": 778.34, "boll_lower": 528.52,
      "vol_ma20": 17199597
    }
  ]
}
```

#### `GET /api/indicators/latest`
返回最新一根的所有指标值。参数：`code`（必填）、`ktype`（可选）。

#### `GET /api/scores/latest`
返回最新一次评分。参数：`code`（必填）。

#### `GET /api/watchlist`
返回所有已入库标的列表。无参数。

---

## 6. 开发指南

### 6.1 本地开发流程

```bash
# 确保后端在运行
# http://localhost:8000/docs 能打开说明后端正常

# 安装前端依赖
npm install

# 启动开发服务器
npm run dev

# 浏览器访问 http://localhost:5173
```

Vite 开发服务器会自动把 `/api` 开头的请求代理到后端（`http://localhost:8000`），所以前端代码里不需要写完整的后端地址。

### 6.2 新增页面的步骤

1. 在 `src/views/` 下创建新的 `.vue` 文件
2. 在 `src/router/index.js` 中添加路由
3. 在 `src/App.vue` 的侧边栏菜单中添加入口
4. 如果需要调用新的后端接口，在 `src/api/trader.js` 中添加函数

### 6.3 生产部署

```bash
npm run build   # 生成 dist/ 目录
```

`dist/` 是纯静态文件，可以用 Nginx、Caddy 或任何静态文件服务器托管。API 请求需通过反向代理转发到后端。
