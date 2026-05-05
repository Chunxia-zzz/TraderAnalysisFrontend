# TraderAnalysis Frontend — 技术方案

> 更新日期：2026-05-05

---

## 1. 项目背景

TraderAnalysis 是一个股票技术分析系统。后端（FastAPI）负责获取行情数据、计算技术指标和评分；前端负责将这些数据以图表和数值面板的形式呈现给用户。

当前监控 **41 只标的**（覆盖大盘/黄金/比特币/存储/光通信/MAG7/加密/半导体/太空/云/中概/防守消费等 10 个分类），后端支持按标的代码查询。

### 1.1 核心用户场景

| 场景 | 描述 |
|------|------|
| 查看市场温度 | 综合评分（3 维度加权），判断市场当前处于恐慌/中性/贪婪状态，给出仓位建议 |
| 交易机会速览 | 一眼看清所有标的评分分布，哪些触发买入信号 |
| 查看 K 线图 | 选择标的和周期，查看蜡烛图及叠加的技术指标 |
| 个股技术分析 | 查看某标的最新技术指标数值和评分（6 维度连续映射） |
| 切换指标显隐 | 通过页面按钮控制均线、布林带、成交量、MACD、RSI 的显示/隐藏 |

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
| **Vue Router** | ^4.4 | 路由 | SPA 页面导航，支持懒加载 |
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
    ├── App.vue                   # 根组件（顶部导航布局）
    ├── router/index.js           # 路由配置
    ├── api/trader.js             # API 调用层
    ├── components/               # 可复用组件
    │   ├── IndicatorChart.vue    # ECharts 图表组件
    │   └── KLineChart.vue        # 旧图表组件（未使用）
    └── views/                    # 页面
        ├── Home.vue              # 首页（品牌 slogan）
        ├── MarketTemperature.vue # 市场温度仪表盘
        ├── ScoresOverview.vue    # 交易机会速览
        ├── Chart.vue             # K 线图查询页
        └── Dashboard.vue         # 个股技术分析
```

---

## 4. 页面与路由

### 4.1 路由表

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | Home.vue | 首页，品牌 slogan + 入口按钮 |
| `/market-temperature` | MarketTemperature.vue | 市场温度仪表盘 |
| `/scores-overview` | ScoresOverview.vue | 全标的评分速览 |
| `/chart` | Chart.vue | K 线图查询页 |
| `/dashboard` | Dashboard.vue | 个股技术分析（评分+指标） |

所有路由使用懒加载（`() => import(...)`）。

### 4.2 布局

采用**顶部导航栏**布局：
- Logo 在左侧，导航链接在右侧
- 浅色主题（白色背景 + 蓝色高亮）
- 内容区域最大宽度 1200px 居中

---

## 5. 各页面详细说明

### 5.1 Home.vue — 首页

品牌展示页，slogan + "查看市场温度"按钮。无 API 调用。

### 5.2 MarketTemperature.vue — 市场温度仪表盘

**API 调用：**
- `GET /api/market-temperature` — 最新评分
- `GET /api/market-temperature/history?days=60` — 历史趋势

**页面结构：**
1. **快速链接** — CNN Fear & Greed Index + VIX 期货价格提示
2. **顶部概览** — 综合评分（大号数字+颜色标识）、市场状态标签、建议仓位、操作建议、杠杆提示
3. **维度拆解（3 行）** — 日线技术面[50%] / 周线技术面[35%] / 价格位置[15%]，带进度条
4. **标的卡片（2 列）** — SPY + QQQ：价格、日RSI、周RSI、MA200偏离度
5. **历史趋势图** — ECharts 折线图，综合评分 + 建议仓位双 Y 轴

**评分→状态映射（8 级）：**
| 区间 | 状态 | 操作建议 |
|------|------|---------|
| 0~5 | 极端恐慌 | 融资+期权超配 |
| 5~15 | 极度恐慌 | 重仓逆势买入 |
| 15~30 | 偏悲观 | 积极加仓 |
| 30~45 | 略偏冷 | 适度加仓 |
| 45~55 | 中性 | 维持仓位 |
| 55~70 | 略偏热 | 适度减仓 |
| 70~85 | 偏贪婪 | 积极减仓 |
| 85~100 | 极度贪婪 | 大幅减仓 |

**注意：** 已废弃维度（vol_score/volume_score/safe_haven_score）固定为 null，前端自动过滤不展示。

### 5.3 ScoresOverview.vue — 交易机会速览

**API 调用：**
- `GET /api/scores/overview` — 全标的评分分组

**页面结构：**
1. **顶部工具栏** — 日期选择器 + 统计标签（总数/强买/买入/观望）
2. **三个分组区块**：
   - 强烈买入（≥90分）— 绿色边框
   - 建议买入（70~89分）— 橙色边框
   - 观望（<70分）— 灰色边框
3. 每个标的卡片显示代码 + 分数，点击跳转到 Dashboard 详情页

**跳转联动：** 点击标的时通过 query 参数传递 `code` 和 `date` 到 Dashboard 页。

### 5.4 Chart.vue — K 线图查询页

**API 调用：**
- `GET /api/indicators` — K 线+指标数据
- `GET /api/watchlist` — 标的下拉列表

**页面结构：**
1. **查询表单** — 标的选择器（支持搜索）、周期选择（日K/周K）、天数输入、查询按钮
2. **指标开关栏** — 彩色标签按钮，点击切换显隐：MA5/10/20/60、BOLL、成交量、MACD、RSI
3. **图表区域** — IndicatorChart 组件（多窗格联动）

### 5.5 Dashboard.vue — 个股技术分析

**API 调用：**
- `GET /api/indicators/latest` — 最新技术指标
- `GET /api/scores/latest` — 评分（支持 date 参数）
- `GET /api/watchlist` — 标的列表

**页面结构：**
1. **工具栏** — 标的选择器 + 日期选择器
2. **评分卡片** — 综合评分（/100）+ 信号标签 + 6 维度进度条
3. **技术指标卡片** — OHLC + 成交量
4. **均线 & 布林带卡片** — MA5/10/20/60 + BOLL 上/中/下
5. **MACD & RSI 卡片** — DIF、DEA、MACD、RSI14

**评分维度（6 维度连续映射，满分 100）：**
| 维度 | 权重 | 进度条颜色规则 |
|------|------|--------------|
| 周线RSI | 25 | ratio>0.7 绿色高亮 |
| 日线MACD百分位 | 20 | ratio>0.7 绿色高亮 |
| 布林带位置 | 15 | ratio>0.7 绿色高亮 |
| 日线RSI | 20 | ratio>0.7 绿色高亮 |
| 周线MACD百分位 | 10 | ratio>0.7 绿色高亮 |
| MA250偏离 | 10 | ratio>0.7 绿色高亮 |

**信号映射：** ≥90 STRONG_BUY / ≥70 BUY / <70 NO_ACTION

**URL query 支持：** `?code=US.NVDA&date=2026-03-27` 可从外部直接跳转到指定标的和日期。

---

## 6. API 调用层

### `src/api/trader.js`

所有后端请求集中在这一个文件中，方便维护。

**Axios 实例配置：**
- baseURL：从环境变量读取，默认 `http://localhost:8000`
- 超时：10 秒
- 错误拦截器：统一打印错误日志

**导出函数：**

| 函数 | 请求 | 用在哪里 |
|------|------|----------|
| `getWatchlist()` | `GET /api/watchlist` | Chart / Dashboard 标的选择器 |
| `getIndicators(code, ktype, days)` | `GET /api/indicators` | Chart.vue |
| `getIndicatorsLatest(code, ktype)` | `GET /api/indicators/latest` | Dashboard.vue |
| `getScoresLatest(code, date?)` | `GET /api/scores/latest` | Dashboard.vue |
| `getScoresOverview(date?)` | `GET /api/scores/overview` | ScoresOverview.vue |
| `getMarketTemperature()` | `GET /api/market-temperature` | MarketTemperature.vue |
| `getMarketTemperatureHistory(days)` | `GET /api/market-temperature/history` | MarketTemperature.vue |

**无数据处理：** 后端无数据时返回 HTTP 200 + `{data: null, message: "..."}`，前端判断 `data === null` 展示 message 提示（同时兼容旧版 404 响应）。

---

## 7. 组件

### `src/components/IndicatorChart.vue`

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

**动态布局：** 当副图被关闭时，组件自动重新计算布局，主图扩大填充空间。

---

## 8. 开发指南

### 8.1 本地开发

```bash
# 确保后端在运行：http://localhost:8000/docs
npm install
npm run dev
# 浏览器访问 http://localhost:5173
```

Vite 代理 `/api` → `http://localhost:8000`，前端代码无需写完整后端地址。

### 8.2 新增页面步骤

1. 在 `src/views/` 创建 `.vue` 文件
2. 在 `src/router/index.js` 添加路由
3. 在 `src/App.vue` 导航栏添加链接
4. 如需新接口，在 `src/api/trader.js` 添加函数

### 8.3 生产部署

```bash
npm run build   # 生成 dist/ 目录
```

`dist/` 是纯静态文件，可用 Nginx/Caddy 托管。API 请求需通过反向代理转发到后端。
