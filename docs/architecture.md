# TraderAnalysis Frontend — 技术方案

> 更新日期：2026-10-12

---

## 1. 项目背景

TraderAnalysis 是一个股票技术分析系统。后端（FastAPI）负责获取行情数据、计算技术指标和评分；前端负责将这些数据以图表和数值面板的形式呈现给用户。

当前监控 **195 只标的**，覆盖 **26 组分类**（实测自 `/api/watchlist`：25 个具名分类 + 2 只 `category` 为空的标的自成一组）：

- 市场分布：美股 192 + 港股 3（HK.00700 / HK.01211 / HK.03690）
- 主要分类：financials(27) / consumer(19) / healthcare(18) / tech(14) / industrials(13) / sector_etf(11) / software(9) / mag7(8) / ai_infra(7) / cyclical(7) / commodity(6) / energy(6) / semiconductor(6) / crypto(5) / defensive_consumer(5) / utilities(5) / defensive(4) / market_gold_btc(4) / china_adr(3) / cloud(3) / emerging_market(3) / optical(3) / storage(3) / hk_stock(2) / space(2) / 空值(2)

### 1.1 核心用户场景

| 场景 | 描述 |
|------|------|
| 查看市场温度 | 综合评分（3 维度加权），判断市场当前处于恐慌/中性/贪婪状态，给出仓位建议；**可在美股大盘 / 黄金 / 比特币三个视图间切换** |
| 交易信号 | 空转多/多转空（EMA5/30 交叉）+ 主升浪龙头 + 主跌浪超卖 + 低估做多机会 |
| 利弗莫尔关键点 | **独立信号体系**：整理平台上沿突破/逼近/已在关键点上方/风险四分组，与 6 因子评分方向相反、不合并 |
| 个股技术分析 | 道氏三层趋势 + 支撑压力关键位 + 形态置信度 + 盈亏比 + 6 因子评分 + 基本面估值 |
| 查看 K 线图 | 选择标的和周期（4H/日K/周K），蜡烛图 + 多窗格指标 + **支撑压力位标注** + **利弗莫尔关键点叠加** |
| 信号回测 | **5 种策略模式**历史回测验证（趋势跟踪/买入持有/波段操作/EMA飘带多头/EMA飘带空头） |
| 市场复盘 | 日/周复盘报告 + 自媒体文案生成（小红书/知乎/公众号） |
| 我的持仓 | 实时持仓查询（依赖本机 OpenD） |
| 目标仓位 | 永久投资组合目标 vs 实际对比 + **五级**加仓建议（依赖本机 OpenD） |
| 标的池管理 | 增删改查标的，筛选/搜索，晨星折价排序，刷新快照 |

---

## 2. 技术选型

### 2.1 核心依赖

| 库 | 版本 | 作用 | 选型理由 |
|----|------|------|----------|
| **Vue 3** | ^3.5 | 前端框架 | Composition API 灵活，生态成熟，中文资料丰富 |
| **Vite** | ^5.4 | 构建工具 | 毫秒级热更新，内置代理，Vue 官方推荐 |
| **Ant Design Vue** | ^4.2 | UI 组件库 | 提供布局、卡片、表单、标签、描述列表、日期选择器等 60+ 组件 |
| **LightweightCharts** | ^4.2 | K 线图表（`IndicatorChart.vue`） | TradingView 出品，金融图表开箱即用，体积小 |
| **ECharts** | ^6.0 | 温度趋势图（`MarketTemperature.vue`） | 通用折线/多轴图表 |
| **Axios** | ^1.7 | HTTP 客户端 | 拦截器、超时控制、错误统一处理 |
| **Vue Router** | ^4.4 | 路由 | SPA 页面导航，支持懒加载（**无路由守卫** —— 认证已彻底移除，见 §4） |
| **Day.js** | 1.11.20 | 日期处理 | ⚠️ **不在 `package.json`**：作为 ant-design-vue 的传递依赖被安装，但 `Dashboard.vue:283` 直接 `import dayjs` —— 隐式依赖（见下方注） |

> ⚠️ **隐式依赖提示（2026-10-12 核对）**：`Dashboard.vue:283` 有 `import dayjs from 'dayjs'`（用于把 `?date=` 查询参数转成 DatePicker 的值），
> 但 `package.json` 的 `dependencies` 里**没有 dayjs**，版本 1.11.20 来自 `node_modules/` 里 ant-design-vue 带上来的那份。
> 当前 `npm install` / `npm ci` 都会装上它，**功能正常**；但语义上「直接 import 的包应当声明为直接依赖」，
> 否则一旦上游 ant-design-vue 去掉 dayjs（或改用别的日期库），构建会突然断掉。**建议把 `"dayjs": "^1.11.20"` 补进 `dependencies`**（属代码侧待办，非文档缺陷）。

### 2.2 图表库的实际使用情况

**K 线图表用的是 LightweightCharts，不是 ECharts。** 两者都在用，但分工不同：

| 库 | 版本 | 用在哪 | 说明 |
|---|---|---|---|
| **lightweight-charts** | ^4.2 | `IndicatorChart.vue`（K 线主图） | 单 `createChart` 实例 + `priceScaleId` 分派 |
| **echarts** | ^6.0 | `MarketTemperature.vue`（温度趋势图） | 普通折线图，无需多窗格 |

多窗格的实现方式：**不是**创建多个图表实例，而是在同一个 chart 上给副图 series 指定独立的 `priceScaleId`（`vol` / `macd` / `rsi`），再用 `chart.priceScale(id).applyOptions({ scaleMargins })` 把各自的纵向区间压缩到对应高度比例，从而叠出「主图 + 成交量 + MACD + RSI」的分层效果。由于共享同一个时间轴，**缩放/平移天然联动**，不需要 ECharts 那样用 `dataZoom` 手工同步。

> ⚠️ 本节此前写作「已改用 ECharts 而非 LightweightCharts」，与代码不符，已于 2026-10-12 更正。
> 依赖 `lightweight-charts` 由 `IndicatorChart.vue` 实际使用，**不可从 `package.json` 移除**。
> （此前还称「旧组件 `KLineChart.vue` 保留未删除」——该文件**在仓库中并不存在**，一并更正。）

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
└── src/                          # 源代码（共 19 个文件）
    ├── main.js                   # 应用入口
    ├── App.vue                   # 根组件（顶部导航 + 下拉菜单 + 健康检查）
    ├── router/index.js           # 路由配置（11 条已注册）
    ├── api/trader.js             # API 调用层
    ├── styles/
    │   ├── theme.js              # ant-design-vue 主题 token
    │   └── tokens.css            # CSS 变量（配色 / 间距 / 字体）
    ├── components/               # 可复用组件
    │   └── IndicatorChart.vue    # lightweight-charts K 线图表组件（唯一组件）
    └── views/                    # 页面（★ = 已在 router 注册）
        ├── Home.vue              # ★ 首页（价值投资理念 + 主题切换；⚠️ 含一个指向未注册路由 /scores-overview 的按钮）
        ├── MarketTemperature.vue # ★ 市场温度仪表盘（美股大盘 / 黄金 / 比特币 三视图）
        ├── Chart.vue             # ★ 个股历史K线（支撑压力位 + 利弗莫尔关键点叠加）
        ├── MomentumLeaders.vue   # ★ 交易信号（空转多/多转空/主升浪/主跌浪/低估做多）
        ├── Livermore.vue         # ★ 利弗莫尔关键点（独立信号体系）
        ├── Dashboard.vue         # ★ 个股技术分析
        ├── Backtest.vue          # ★ 信号回测（5 种策略模式）
        ├── WatchlistManage.vue   # ★ 标的池管理
        ├── Review.vue            # ★ 市场复盘 + 自媒体文案
        ├── Position.vue          # ★ 我的持仓（依赖 OpenD）
        ├── Allocation.vue        # ★ 目标仓位（依赖 OpenD）
        └── ScoresOverview.vue    # 机会速览（未挂载）
```

> ⚠️ **勘误（2026-10-12）**：本树此前列出 `GridTrading.vue` / `Login.vue` / `StockFilter.vue` / `Settings.vue` / `components/KLineChart.vue`，
> 这些文件**在仓库中均不存在**（`find src -type f` 可验），已从文档删除。实测 `src/` 下 19 个文件（新增 `Livermore.vue` 后）、
> `components/` 下只有 `IndicatorChart.vue` 一个组件。

---

## 4. 认证系统

> **v2.8+ 状态：认证已彻底移除。** 所有页面公开访问，无路由守卫，无 token 管理。
> `src/api/trader.js` 的 axios 实例**没有任何认证拦截器**，`localStorage` 中也不存 token。
>
> ⚠️ **勘误（2026-10-12）**：本节此前写「Login.vue 和相关拦截器代码保留在代码库中，待后端恢复认证后可重新启用」——
> 实测 `src/views/Login.vue` **并不存在**，拦截器代码也已不在 `trader.js` 中，认证相关代码是**彻底移除**而非「暂时禁用」。
> 若日后要恢复登录，需从头新建登录页 + 拦截器 + 后端校验，**不能指望现成的残留代码**。

---

## 5. 页面与路由

### 5.1 路由表

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | Home.vue | 首页，价值投资理念 |
| `/market-temperature` | MarketTemperature.vue | 市场温度仪表盘（含黄金 / 比特币资产温度视图） |
| `/chart` | Chart.vue | 个股历史K线（含支撑压力位标注 + 利弗莫尔关键点叠加） |
| `/momentum-leaders` | MomentumLeaders.vue | 交易信号（空转多/多转空、主升浪龙头、主跌浪超卖、低估做多） |
| `/livermore` | Livermore.vue | 利弗莫尔关键点（独立信号体系；四分组 + 抽屉详情） |
| `/dashboard` | Dashboard.vue | 个股技术分析 |
| `/backtest` | Backtest.vue | 信号回测（5 种策略模式） |
| `/watchlist-manage` | WatchlistManage.vue | 标的池管理 |
| `/review` | Review.vue | 市场复盘 + 自媒体文案生成 |
| `/position` | Position.vue | 我的持仓（依赖 OpenD） |
| `/allocation` | Allocation.vue | 目标仓位（依赖 OpenD） |

所有路由使用懒加载（`() => import(...)`）。

> ⚠️ 本文档此前列出 `/scores-overview`、`/fundamental`、`/grid-trading` **三条已不在 `router/index.js` 中的路由**，且漏记 `/momentum-leaders`、`/review`、`/position`、`/allocation`，已于 2026-10-12 更正。
> 未注册路由但源文件仍在 `src/views/` 的**只有 `ScoresOverview.vue`**。
> （`Fundamental.vue` / `GridTrading.vue` / `Login.vue` / `StockFilter.vue` / `Settings.vue` 的文件在仓库中已不存在，见各节勘误。）
> `Fundamental.vue` 已于 2026-10-12 删除，原因见 §6.7。

### 5.2 布局

采用**顶部导航栏**布局：
- Logo 在左侧，导航链接在右侧
- 浅色主题（白色背景 `#fff` + **灰底选中态**）。⚠️ **不是「蓝色高亮」**：本项目强调色是深金 `--accent: #946800`，
  导航选中态用 `--bg-hover` 背景 + `font-weight: 600`，全程无蓝色高亮（见 `App.vue` 的 `.nav-item.router-link-active`）
- 内容区域最大宽度 1400px 居中
- 后端状态指示灯（绿/红点，`getHealth()` 轮询一次，`onMounted` 时调用）
- 导航项顺序：市场温度 / 交易信号（平级链接 → `/momentum-leaders`）/ 利弗莫尔 / **个股分析 ▾** / 信号回测 / **持仓配置 ▾** / 市场复盘（带 `beta` 徽标）/ 标的管理 + 健康指示灯
- 真正带 ▾ 的下拉**只有 2 个**：
  - 「个股分析」**仅 2 项**：个股技术分析 `/dashboard`、个股历史K线 `/chart`（早期文档写的"基本面"入口代码中不存在）
  - 「持仓配置」2 项：我的持仓 `/position`、目标仓位 `/allocation`

---

## 6. 各页面详细说明

### 6.1 Home.vue — 首页

**无后端 API 调用**（`Home.vue` 的 import 只有 `vue`；页面上的所有数值都是硬编码的展示值）。

**六段式落地页**，源码里用 `<!-- ═══ S1..S6 ═══ -->` 分段标记，与下表一一对应。整页带**暗/浅主题切换**：`isDark` 状态写入 `localStorage.home-theme`，根节点 `.home[data-theme="dark|light"]` 切换。

| 段 | 源码注释 | 内容 | 跳转 |
|---|---|---|---|
| S1 | `HERO` | 「持有最好的公司」大标题 + `hero-glow` / `hero-grid` 背景 + 主 CTA | → `/market-temperature` |
| S2 | `CAPABILITIES` | 核心能力 3 张卡：技术评分 / 市场温度 / 信号回测 | → `/dashboard`、`/market-temperature`、`/backtest` |
| S3 | `MARKET TEMPERATURE` | 内联 SVG 仪表盘（`linearGradient#gGrad`）+ 三个统计数 | —（纯展示） |
| S4 | `SCORING RADAR` | 六边形 SVG 雷达图（4 层环 + 3 轴 + 数据多边形），讲 **6 因子评分** | —（纯展示） |
| S5 | `WORKFLOW` | 工作流程 4 步：数据采集 / 指标计算 / 信号评分 / 执行建议 | — |
| S6 | `CTA` | 「开始做出更聪明的决策」+ 4 个按钮：市场温度 / **机会速览** / 主升浪龙头 / 信号回测 | 见 §6.4 死链说明 |

> ⚠️ **图形都是手写 SVG，不用图表库**：S3 的仪表与 S4 的雷达图均为内联 `<svg>`，**不走 ECharts / lightweight-charts**（二者只分别用在 MarketTemperature 与 Chart 页）。
>
> ⚠️ **S3 的数值是静态演示值**：`gaugeVal` / `bullN` / `neutN` / `bearN` 的注释即写明「仪表盘数值（展示用静态值）」，
> 滚动进入视口时由 `countUp()` 做一次缓动计数动画（目标 `57 / 14 / 5 / 3`），**与后端真实温度无关**。
>
> ⚠️ **S4 的「六维」指 6 因子评分，不是市场温度的维度**：市场温度是**三维 50/35/15**（见 §6.3）；
> 这里的六边形 6 个顶点对应 `total_score` 的 6 个技术因子。二者不要混为一谈。
>
> ⚠️ **S6 的「机会速览」是死链** —— `/scores-overview` 未注册路由，详见 §6.4。
>
> ⚠️ 本节此前只写「向下滚动区块（核心能力三支柱/市场温度）」，**漏掉了 S3/S4/S5/S6 四段与主题切换**，
> 且与 `design-spec-v1-clean-financial.md` §3.7 的「6 段」描述自相矛盾；已按源码补全（2026-10-12）。

### 6.2 Login.vue — 已不存在（2026-10-12 勘误）

**该页面与认证体系已从代码库彻底移除**，不是"暂时禁用"：

- `src/views/Login.vue` 文件不存在，`router/index.js` 中无任何登录路由，`App.vue` 与 `Home.vue` 中也没有登录入口
- `src/api/trader.js` 无认证拦截器，无 token 存取
- 文档此处此前引用的 `POST /api/auth/login` 端点在 `api_server.py` 中也**不存在**
  （后端仅保留 `users` 表 2 行数据，无鉴权中间件；所有 API 公开可访问）

> 若日后要恢复登录：需新建登录页 + axios 拦截器 + 后端鉴权端点，**不能依赖任何现成残留代码**。

### 6.3 MarketTemperature.vue — 市场温度仪表盘

**API 调用：**
- `GET /api/market-temperature` — 最新评分（美股大盘）
- `GET /api/market-temperature/history?days=60` — 历史趋势
- `GET /api/asset-temperature/history?asset=GLD|BTC&days=60` — **黄金 / 比特币资产温度历史**（切到对应视图时才请求）

**三种视图**（顶部 `.view-switcher` 切换，`TABS = market / gold / btc`）：

| 视图 | 说明 |
|---|---|
| 美股大盘 | 走 `MARKET_TEMP_CODES = SPY + QQQ` 的三维度温度 |
| 黄金 | `asset=GLD` 的资产温度 |
| 比特币 | `asset=BTC` 的资产温度 |

**美股大盘视图结构：**
1. **Hero 卡** — 左：温度分（/100）+ 8 级状态 + 行动建议；右：**3 个维度块**（日线技术[50%] / 周线技术[35%] / 价格位置[15%]，各带数值与进度条）
2. **Hero 底栏** — 建议仓位 / 数据日期 / 杠杆建议（满足条件才显示）/ `SPY K线 ↗` / `QQQ K线 ↗` / **CNN Fear & Greed Index ↗**（外链）
3. **标的卡片（2 列）** — SPY + QQQ
4. **历史趋势图** — ECharts 折线（`ref="chartRef"`，高 300px）
5. **VIX 提示条**（`v-if="data"`）— 文案：**「交易时请观察VIX期货价格，30以上为极度恐慌，35以上往往是抄底的绝佳机会」**
   （**仅提示文字，VIX 不参与温度计算**）
   > ⚠️ 本节此前只引了前半句（截到「极度恐慌」为止），漏掉「35以上往往是抄底的绝佳机会」，已按 `MarketTemperature.vue:91` 补全（2026-10-12）。

**黄金 / 比特币视图结构：**
1. **Hero 卡** — 资产温度分 + 状态 + 行动建议；右侧同样是 3 个维度块（`ASSET_DIMS`，与 `MARKET_DIMS` 同源）
2. **Hero 底栏** — 当前价格 / 数据日期 / `查看K线图 ↗`
3. **资产历史趋势图**（ECharts）
4. **技术指标卡（6 项）** — 当前价格 / 日线 RSI6 / 周线 RSI6 / MA200 偏离 / ATH 回撤 / 52 周位置 + 备注文案

### 6.4 ScoresOverview.vue — 机会速览（⚠️ 未挂载路由）

> ⚠️ **该页未在 `router/index.js` 注册**，源文件仍在 `src/views/`。且 `Home.vue:215` 有一个
> `<router-link to="/scores-overview">机会速览</router-link>` 指向它 —— **这是个死链**（点击落到空白/兜底），
> 属已知待处理问题（代码侧，非文档问题）。

**API 调用：** `GET /api/scores/overview`（支持 `date` 筛选） + `GET /api/tp-sl`（点击「止盈损」时按需单只请求）

**筛选标签（5 个）：** 全部 / **严重超卖且站上MA5** / 严重超卖 / 超卖 / 中性
（对应 `all` / `actionable` / `strong_buy` / `buy` / `no_action`，各自带计数）
> ⚠️ 本节此前把第 2 个标签写成「可执行」，实际文案是 **「严重超卖且站上MA5」**（`ScoresOverview.vue:20`），
> 与下方第 1 个区块的标题一致；已更正（2026-10-12）。

**页面结构（4 个区块，随筛选标签显隐）：**
1. **严重超卖且站上 MA5** — `overview.actionable`，徽章「评分达标 + 站上MA5」
   > ⚠️ 本节此前写「蓝色高亮」，**与代码不符**：该区块的 `class` 是 `card section`，与其余三块**完全同构**，
   > `.section-title` 用 `var(--text)`、`.section-badge` 默认灰底灰字，**区块本身没有任何颜色高亮**。
   > 蓝色只出现在两处：① 对应的**筛选标签** `.filter-tab.blue` 激活态背景（`ScoresOverview.vue:308`）
   > ② 中性区块里 `momentum_score >= 70` 的「动量 XX」徽章（`.badge-blue`）。已更正（2026-10-12）。
2. **严重超卖** — `overview.strong_buy`，绿色徽章 `≥ 80`
3. **超卖** — `overview.buy`，金色徽章 `60 ~ 79`
4. **中性** — `overview.no_action`，徽章 `< 60`；该区块内对 `momentum_score >= 70` 的行显示
   「动量 XX」蓝色徽章（**不是独立的「主升浪龙头区」** —— 该区块只存在于 MomentumLeaders.vue）

**止盈止损交互：** 各区块行右侧有「止盈损」按钮，点击展开显示止损价(含距离%)、止盈价、R:R比。按需单只请求，不批量加载。

**跳转：** 点击行 → `router.push({ name: 'chart', query: { code } })`，即跳 **`/chart?code=...`**（**不是 Dashboard**）。

### 6.5 Chart.vue — K 线图查询页

**API 调用：** `GET /api/indicators`（K 线+指标） + `GET /api/analysis`（关键位） + `GET /api/livermore/detail`（利弗莫尔关键点） + `GET /api/watchlist`

标的选择器 + 蜡烛图 + MA/布林带/EMA多空带/成交量/MACD/RSI 多窗格联动，指标可切换显隐。

> `/api/indicators`、`/api/analysis`、`/api/livermore/detail` **三路并行拉取**（`Promise.all`），
> 后两者各自 `catch` → `null`，任一失败只清空对应数据、不影响 K 线渲染。
> **利弗莫尔只在 `ktype === '1d'` 时请求**：其箱体、周线潮汐、ATR 全部建立在日线尺度上，
> 4H/1W 下画出来的水平线会与当前周期语义不符，索性不请求（省一次往返）。

**EMA多空带：** 只创建 **EMA5 与 EMA30 两条 line series**，两者之间的区域由自定义 `EmaRibbonPrimitive` 填充：
`ema5 > ema30`（多头）填**青绿** `rgba(38,166,154,0.20)`，`ema5 < ema30`（空头）填**红** `rgba(239,83,80,0.20)`。
**不存在** ema10/15/20/25 四条线（文档此前写「6 条均线独立着色」有误，且多头/空头填充色写反了）。

**支撑压力位标注（2026-10-12 新增）：**

> ⚠️ **命名说明**：该功能用后端 `technical_analysis.find_support_resistance()` 的
> **Swing Pivot 聚类**结果标注，**不是利弗莫尔（Livermore）的关键点模型**。
> 二者名称相近但语义不同（前者是双向对称的静态价位，后者是带量能确认的趋势突破触发价）。
> 因此 UI 与文档统一称「支撑压力位」，不冠以「利弗莫尔」之名。详见 `../../TraderAnalysis/docs/api.md` 的 `/api/analysis` 说明。

| 元素 | 说明 |
|---|---|
| 水平线 | 支撑绿色 `#26a69a` / 压力红色 `#ef5350`；每侧最多 3 道（`MAX_LEVEL_LINES`） |
| 选取优先级 | 最近一道（`is_nearest`）> 强度（`strength`）降序 |
| 线型 | 最近一道 / MA60 关键位 → 实线 + 加粗 + 显示价格轴标签；其余 → 虚线且不占轴标签 |
| pivot 标记 | 用 `bars_ago` 反推 K 线序号（`idx = data.length - 1 - bars_ago`），支撑在下 `arrowUp`、压力在上 `arrowDown`，强度 ≥2 才带文字 |
| 开关 | `visible.levels`，默认开；关闭后图表与明细卡片同时隐藏 |
| 明细卡片 | 图表下方支撑/压力双栏：价格、label、距现价 pct、强度、MA60/最近徽章、道氏上下文 + 盈亏比区域 |

> ⚠️ **`setMarkers()` 每次调用会覆盖前值**。EMA 转多/转空标记与关键位 pivot 标记必须统一写入缓冲区，按 K 线序号升序**一次性提交**，分成两次调用会丢标记。

**利弗莫尔关键点叠加（2026-10-12 新增）：**

> ⚠️ 与上面的「支撑压力位」**并存但语义不同**：这里是「突破触发价」与「离场价」，单向、带量能前提。
> 页面上两块并排展示并在卡片底部明确写了「两者算法不同，勿混称」。

| 元素 | 说明 |
|---|---|
| 水平线 | 只画 3 个 role：`pivotal`（关键点，深金 `#946800`，加粗虚线）/ `platform_lower`（箱体下沿，褐色 `#8d6e63` 点线）/ `stop`（止损，暗红 `#a40e26` 虚线） |
| **刻意不画** | `prior_high`（通常与压力位几乎重合 — 实测 AAPL 前高 344.57 vs 压力 344.30，差 0.08%）与 `pyramid_1..3`（3 道线会让图面过载） |
| 价格轴标签 | **只有 `pivotal` 与 `stop`** 占标签。⚠️ lightweight-charts v4 的 `title` **只通过价格轴标签渲染**，置 `axisLabelVisible = false` 等于连标题一起消失 → 想让线「有名字」就必须占一格 |
| 开关 | `visible.livermore`，默认开；关闭后图表水平线与下方明细卡片**同时隐藏** |
| 明细卡片 | 6 个字段：关键点（含距现价%）/ 状态（含反转 or 连续关键点）/ 整理箱体（上下沿 + 根数 + 振幅）/ 止损位（0.5×ATR）/ 周线潮汐（含波浪与 MA 周期）/ 量能·相对强度（量比 + RS60 + ★龙头）；下方是金字塔加仓位（3 级，已到的标红）与当前信号标签 |
| 无有效平台时 | 卡片收窄为「原因提示 + 周线潮汐 + 数据深度」两个字段，**不渲染一整片 `--` 占位**（此时 API 的 `levels` 为空数组，图上一条线都不画） |

### 6.6 Dashboard.vue — 个股技术分析

**API 调用：** `GET /api/scores/latest` + `GET /api/analysis` + `GET /api/fundamental` + `GET /api/watchlist`

> ⚠️ 本文档此前写「`GET /api/indicators/latest` + `GET /api/scores/latest` + `GET /api/watchlist`」，
> 实测 `Dashboard.vue:285` 的 import 为 `getAnalysis, getScoresLatest, getWatchlist, getFundamental`，
> **`getIndicatorsLatest` 从未被本页调用**（全仓无任何页面引用它），已更正。

**页面构成（3 张卡）：** 标的选择器 + 日期选择 → **基本面估值卡**（分析师目标价 / 晨星公允价值 / 上行空间）→
**道氏技术面卡**（三层趋势 + 支撑压力关键位 + 盈亏比 + 形态置信度 + 量能）→ **综合评分卡**（6 因子分解进度条）。支持日期选择查看历史。

### 6.7 Fundamental.vue — 已删除（2026-10-12）

该页面原计划做「全标的基本面速览 + 单只详情」，但从未挂载路由，且依赖的
`GET /api/fundamental/overview`、`GET /api/fundamental/latest` **后端端点并不存在**：

- `src/api/trader.js` 只有 `getFundamental(code, date)` → `GET /api/fundamental`（单只）
- `watchlist` 表中 `forward_pe` / `peg_ratio` / `roe` / `market_cap` **填充率 0/195**
- `fundamental_data` 表仅 1 行历史测试数据（US.NVDA 2026-05-07），5 因子中的 4 个无数据来源

即该页面在数据层就无法工作，其 `import { getFundamentalOverview, getFundamentalLatest }` 是悬空引用。
2026-10-12 已删除该文件（Git 历史可恢复：`git show <commit>:src/views/Fundamental.vue`）。

> 现存的基本面信息（晨星公允价值 / 分析师目标价）已在 **Dashboard.vue** 中展示，走 `getFundamental()`。
> 若要恢复「全池估值速览」页，应新建独立后端端点，数据源只能用 `morningstar_fair_value`(165/195)
> 与 `analyst_target_mean`(161/195) 两项，不要沿用已废弃的 5 因子假设。

### 6.8 Backtest.vue — 信号回测

**API 调用：** `GET /api/backtest/run` + `GET /api/watchlist`

**策略模式（5 种）：**
- **趋势跟踪（推荐）** — `trend` 模式，跟随均线(MA5/10/20)止盈，可选站上MA5入场确认
- **买入并持有** — `hold` 模式，固定持仓天数(1-250天)
- **波段操作** — `swing` 模式，评分下降退出+最大持仓天数
- **EMA飘带多头** — `ribbon_long` 模式，空转多买入、多转空卖出
- **EMA飘带空头** — `ribbon_short` 模式，多转空做空、空转多平空

**交易明细表列：** 信号日期 / 入场价 / 退出日期 / 退出价 / 收益率 / 持仓天数 / 退出原因 / 信号

**退出原因标签（`EXIT_REASON_LABELS`，9 个）：** 持有到期 / 评分下降 / 达最大天数 / 未完成 / 跌破MA5 / 跌破MA10 / 跌破MA20 / 飘带转空 / 飘带转多

未完成交易(status=incomplete)自动过滤不展示。

> ⚠️ 本文档此前写「3 种策略模式」，漏了 `ribbon_long` / `ribbon_short`；退出原因也漏了「飘带转空/飘带转多」与「未完成」，已于 2026-10-12 更正。
> 后端 `backtest.py:37` 的 `mode` 注释同样列出 5 种（`hold | swing | trend | ribbon_long | ribbon_short`），前后端一致；
> 但 `cli.py:362` 与 `api_server.py:475` 的 **help 文案仍只写 3 种**（参数本身可透传，非功能缺陷，属文案滞后）。

### 6.9 GridTrading.vue — 已不存在

**该页面的前端文件与 API 封装均已移除**：

- `src/views/GridTrading.vue` 不存在，`router/index.js` 中无 `/grid-trading` 路由
- `src/api/trader.js` 中无 `getGridStatus` / `getGridOrders`
- 后端 `/api/grid/status`、`/api/grid/orders` 端点**仍存在**，DB 中 `grid_config`(2) / `grid_state`(2) 表仍有数据

> 即：**网格交易的后端与数据还在，前端展示层已拆掉**。若要在前端恢复，可用现成的两个后端端点重建页面；
> 但 `docs/grid-trading-engine-design.md` 是设计文档，不代表已实现的前端功能。

### 6.10 WatchlistManage.vue — 标的池管理

**API 调用：** `GET/POST/PATCH/DELETE /api/watchlist` + `POST /api/watchlist/refresh-snapshot`

**表格列（8 列，实测 `columns`）**：代码 / 名称 / 分类 / 分析师目标 / 晨星公允 / 晨星折价 / 备注 / 操作。
支持分类、市场筛选与搜索，晨星折价排序，删除确认，刷新快照。

**弹窗字段差异（易写错）：**
- **编辑弹窗** 含「推荐策略」选择（`recommended_strategy`，对应 `watchlist` 表的同名列）
- **新增弹窗**（代码/分类/状态/标签等）**不含**推荐策略字段

> ⚠️ 本文档此前写「表格展示…显示推荐策略(hold_10d/hold_20d/swing/trend_ma5/ma10/ma20)」——
> 表格里**没有推荐策略列**；也写「新增/编辑弹窗含策略选择」，实际**只有编辑弹窗有**。均已于 2026-10-12 更正。

> ⚠️ 此前写「条件选股(StockFilter.vue)和设置(Settings.vue)暂时隐藏，代码保留」——**这两个文件在仓库中不存在**，功能是彻底移除而非隐藏（2026-10-12 更正）。

### 6.11 Livermore.vue — 利弗莫尔关键点（2026-10-12 新增）

**API 调用：** `GET /api/livermore/signals`（列表） + `GET /api/livermore/detail`（抽屉详情）

> ⚠️ **这是独立信号体系**，与 6 因子评分 `total_score` **方向相反**（评分买超卖、本页买突破）。
> 信号不并入评分、独立落 `livermore_signal_log`、独立接口。页面顶部口径说明卡第 4 行专门写了「⚠️ 独立体系」。

**页面结构（自上而下）：**

| 区块 | 说明 |
|---|---|
| 工具栏 | 日期选择器（`allowClear`，清空=最新）/ 潮汐过滤开关 / 刷新按钮 / `?` 口径提示 + 右侧统计 chip（突破·逼近·上方·风险·被潮汐挡） |
| 口径说明卡 | 4 行：关键点定义（箱体内**收盘价**最高点）/ 两类关键点（反转 vs 连续）/ 配套规则（量比≥1.5、潮汐顺势、止损 0.5×ATR、金字塔 1/2/3×ATR）/ **⚠️ 独立体系** |
| 结论条 | 扫描 `N/M` 只、无平台数、突破数（连续/反转）、逼近数、风险数、潮汐分布（涨/退/不明）、龙头数、基准 SPY 60 日 |
| 分组切换 | `seg` 自定义控件（非 ant 组件），带计数与分组说明；**表头列随分组自适应** |
| 表格 | 排名 / 代码（★ 标龙头）/ 名称 / 现价 / 关键点 / 距关键点 / 箱体 / 量比 / 潮汐·波浪 / RS60 / 强度（含进度条）；每行右侧「K线」按钮跳 `/chart?code=` |
| 抽屉详情 | 5 块：当前信号（含 `detail.action`）→ 关键点全景 → 金字塔加仓位 → 趋势与相对强度 → 「打开 K 线图」 |

**四个分组与表头自适应：**

| 分组 | `countKey` | 表头差异 | 说明 |
|---|---|---|---|
| 关键点突破 | `breakouts` | 标准列 | 收盘首次越过整理平台上沿 —— 利弗莫尔的买点，放量确认才可靠 |
| 逼近关键点 | `near` | 标准列 | 在关键点下方 2% 以内，尚未突破 —— 预备名单 |
| 已在关键点上方 | `above` | 标准列 | 已突破并延续（突破后 2 根以上）—— 回踩关键点不破可加仓 |
| 风险信号 | `dangers` | **隐藏「箱体」与「强度」列，改显示「信号」列** | 假突破收回 / 跌破关键点止损 / 高位放量滞涨 —— 应减仓或离场 |

**交互细节：**

- 切换分组时若该分组无数据，**自动跳到第一个有内容的分组**（避免用户看到空白以为是 bug）
- 空态文案按分组区分（不是统一的"暂无数据"）
- 潮汐过滤开关对应 `?all=1`：关闭后做多信号数**只增不减**（风险信号不受潮汐限制）
- 抽屉里 `pano.pivotal` 为空时改显示 `skip_reason` 警告，不渲染整片占位

**踩坑（已固化在 `scripts/smoke-livermore.mjs`）：**

- ⚠️ **激活分组文字会隐形**：`.seg-item.active:not(.danger)` 曾用 `color: var(--text)` 配
  `background: var(--bg-emphasis)`，本主题里两者**都是 `#1f2328`** → 必须用浅色前景。验收脚本已加对比度断言兜底
- ant-design 在两个中文字之间会**自动插空格**（按钮文本实际是「查 询」），脚本里按文本匹配前须去空白
- ant-design 的 Drawer 关闭后**不移除 DOM 节点**，只能按可见性断言，不能断言节点消失

---

## 7. API 调用层

### `src/api/trader.js`

所有后端请求集中在这一个文件中。

**Axios 实例配置：**
- baseURL：从环境变量 `VITE_API_BASE_URL` 读取，**默认空字符串 `''`**（此时靠 `vite.config.js` 的
  dev proxy 把 `/api`、`/health` 转发到 `http://localhost:8000`）
  > ⚠️ 此前文档写「默认 `http://localhost:8000`」，与 `trader.js:4` 的 `|| ''` 不符，已更正。
- 超时：10 秒（回测接口 30 秒）
- 无认证拦截器（认证相关代码已移除，非"暂时禁用"）

**导出函数**（与 `src/api/trader.js` 逐一对应）：

| 分组 | 函数 | 请求 | 页面 |
|------|------|------|------|
| 健康检查 | `getHealth()` | `GET /health` | App.vue |
| 标的池 | `getWatchlist(params?)` | `GET /api/watchlist` | 多处 |
| 标的池 | `getWatchlistDetail(code)` | `GET /api/watchlist/{code}` | — |
| 标的池 | `addWatchlistStock(payload)` | `POST /api/watchlist` | WatchlistManage |
| 标的池 | `updateWatchlistStock(code, payload)` | `PATCH /api/watchlist/{code}` | WatchlistManage |
| 标的池 | `deleteWatchlistStock(code)` | `DELETE /api/watchlist/{code}` | WatchlistManage |
| 标的池 | `batchAddWatchlist(payload)` | `POST /api/watchlist/batch` | ⚠️ 无页面引用 |
| 标的池 | `refreshSnapshot(code?)` | `POST /api/watchlist/refresh-snapshot` | WatchlistManage |
| 技术指标 | `getIndicators(code, ktype, days)` | `GET /api/indicators` | Chart |
| 技术指标 | `getIndicatorsLatest(code, ktype)` | `GET /api/indicators/latest` | ⚠️ 无页面引用 |
| 评分 | `getScoresLatest(code, date?)` | `GET /api/scores/latest` | Dashboard |
| 评分 | `getScoresOverview(date?)` | `GET /api/scores/overview` | MomentumLeaders / ScoresOverview |
| EMA 交叉 | `getEmaCrossSignals(date?)` | `GET /api/ema-cross-signals` | MomentumLeaders |
| 市场温度 | `getMarketTemperature()` | `GET /api/market-temperature` | MarketTemperature |
| 市场温度 | `getMarketTemperatureHistory(days)` | `GET /api/market-temperature/history` | MarketTemperature |
| 市场温度 | `getAssetTemperatureHistory(asset, days)` | `GET /api/asset-temperature/history` | MarketTemperature |
| 止盈止损 | `getTpSl(code, params?)` | `GET /api/tp-sl` | ScoresOverview |
| 信号回测 | `getBacktestRun(params)` | `GET /api/backtest/run` | Backtest |
| **技术分析** | **`getAnalysis(code, date?, ktype?)`** | **`GET /api/analysis`** | **Dashboard / Chart** |
| **利弗莫尔** | **`getLivermoreSignals({date?, source?, allTide?, refresh?})`** | **`GET /api/livermore/signals`** | **Livermore** |
| **利弗莫尔** | **`getLivermoreDetail(code)`** | **`GET /api/livermore/detail`** | **Chart / Livermore** |
| 交易信号 | `getTradeSignals(code, date?)` | `GET /api/trade-signals` | ⚠️ 无页面引用 |
| 交易信号 | `getBottomSignals(code, days)` | `GET /api/bottom-signals` | ⚠️ 无页面引用 |
| 基本面 | `getFundamental(code, date?)` | `GET /api/fundamental` | Dashboard |
| 每日优选 | `getDailyPicks(date?)` | `GET /api/daily-picks` | MomentumLeaders |
| 内容生成 | `getContentGenerator(code, platform?, date?)` | `GET /api/content-generator` | Review |
| 内容生成 | `getReview(type, date?)` | `GET /api/review` | Review |
| 内容生成 | `listContentTemplates()` | `GET /api/content-templates` | Review |
| 内容生成 | `saveContentTemplate(key, payload)` | `PUT /api/content-templates/{key}` | Review |
| 内容生成 | `deleteContentTemplate(key)` | `DELETE /api/content-templates/{key}` | Review |
| 持仓（OpenD） | `getPosition(env, currency?)` | `GET /api/position` | Position |
| 目标仓位（OpenD） | `getAllocation(env)` | `GET /api/allocation` | Allocation |
| 目标仓位（OpenD） | `saveAllocationConfig(payload)` | `PUT /api/allocation` | Allocation |

> ⚠️ **勘误（2026-10-12）**：本文档此前列出 `getFundamentalLatest` / `getFundamentalOverview` / `stockFilterSearch` / `stockFilterInfo` / `getGridStatus` / `getGridOrders`，**`src/api/trader.js` 中均不存在**，已删除。
> 连带处理：唯一引用前两者的 `views/Fundamental.vue` 是悬空引用（其依赖的后端端点也不存在）→ **该文件已于 2026-10-12 删除**，详见 §6.7。
>
> 超时设置：`getBacktestRun` / `getDailyPicks` / `getContentGenerator` / `getReview` / `getPosition` / `getAllocation` / `saveAllocationConfig` / **`getLivermoreSignals`（全池扫描实测 2.1s，含缓存）** 为 30s，其余走默认 10s。

---

## 8. 组件

### `src/components/IndicatorChart.vue`

基于 **lightweight-charts v4** 的多窗格联动 K 线组件（单 `createChart` 实例 + `priceScaleId` 分派，见 §2.2）。

**Props：**

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `data` | Array | `[]` | `/api/indicators` 返回的 `data` 数组 |
| `height` | Number | `800` | 期望高度，实际高度由 `totalHeight` 取大值决定 |
| `levels` | Object | `{supports:[], resistances:[]}` | 支撑压力位，字段见 `/api/analysis` |
| `livermore` | Object | `{levels:[], panorama:null}` | 利弗莫尔关键点，字段见 `/api/livermore/detail`（**只用到 `levels`**，`panorama` 由 `Chart.vue` 的明细卡消费） |
| `visible` | Object | 见下 | `ma5/ma10/ma20/ma60/boll/ema/vol/macd/rsi/levels/livermore` |

`visible` 的**实际默认值**（`IndicatorChart.vue:19-25`）：`ma5/ma10/ma20/ma60 = false`、`boll = false`，
其余 `ema / vol / macd / rsi / levels / livermore = true`。即**开图默认只显示 EMA 多空带 + 三个副图 + 关键位 + 利弗莫尔**，
MA 与布林带需手动开启。

**布局：** 主图最少 `MAIN_MIN = 360`，每个副图 `SUB_H = 130`，总高 `max(height, 360 + 副图数 × 130)`。副图纵向位置由 `getMargins()` 计算 `scaleMargins` 得出。

**图表结构：** 主图（K线 + MA + 布林 + EMA 多空带）→ 成交量（含 vol_ma20）→ MACD（柱 + DIF/DEA）→ RSI6（含 70/30 虚线参考线）；共享时间轴，缩放/平移天然联动。

**图例：** 不使用图表内置图例，而是独立 DOM（`legendRef`），由 `buildLegendHTML()` 按当前可见指标拼装，跟随十字光标更新数值。

**EMA多空带渲染：** **只有 EMA5 与 EMA30 两条 line series**（`ema5Series` / `ema30Series`），
中间区域由自定义 Primitive `EmaRibbonPrimitive` 填充：多头（ema5 在上）填青绿 `rgba(38,166,154,0.20)`，
空头填红 `rgba(239,83,80,0.20)`；同时输出「转多 / 转空」标记（ema5 上穿/下穿 ema30 时）。
> ⚠️ 此前文档写「6 条 EMA 线（ema5/10/15/20/25/30）独立着色」与「多头填浅红、空头填浅绿」，**两点都与代码不符**，已更正。

**标记机制（关键约束）：** `setMarkers()` 每次调用**覆盖**前值。EMA 转多/转空标记与关键位 pivot 标记统一推入 `markerBuf`，最后按 K 线序号升序**一次性提交**；分两次调用会丢标记。

**支撑压力位：** 见 §6.5「支撑压力位标注」。要点：`pickLevels()` 按「最近一道 > 强度」取前 `MAX_LEVEL_LINES = 3` 道；强位（`is_nearest` 或 `is_key`）用实线加粗 + 显示轴标签，弱位用虚线不显标签；pivot 标记用 `bars_ago` 反推序号定位。

**利弗莫尔关键点（`drawLivermore()`）：** 见 §6.5「利弗莫尔关键点叠加」。要点：`LIV_MAIN_ROLES` 白名单只放 `pivotal` / `platform_lower` / `stop`（**不含 `prior_high` 与金字塔位**，理由见 §6.5 表格），配色在 `LIV_COLORS`；因为 v4 的 `title` 只能靠价格轴标签渲染，所以 `axisLabelVisible` 为 `role !== 'platform_lower'`。

**`watch` 依赖：** `[() => props.data, () => props.visible, () => props.levels, () => props.livermore]`（`deep: true`）—— 新增数据源时**必须一并加进 watch**，否则切换开关不重绘。

---

## 9. 开发指南

### 9.1 本地开发

```bash
npm install
npm run dev   # http://localhost:5173
```

### 9.2 新增页面步骤

1. 在 `src/views/` 创建 `.vue` 文件
2. 在 `src/router/index.js` 添加路由（**没有 `meta` 概念** —— 认证体系已彻底移除，无路由守卫、无需 `meta: { public: true }`）
3. 在 `src/App.vue` 导航栏添加链接
4. 如需新接口，在 `src/api/trader.js` 添加函数

### 9.3 生产部署

```bash
npm run build   # 生成 dist/ 目录
```

`dist/` 是纯静态文件，可用 Nginx/Caddy 托管。API 请求需通过反向代理转发到后端。

**线上实际生效的 Nginx 配置**（2026-10-12 新增，完整说明见后端 `README.md` §5）：

| 文件 | 关键内容 |
|---|---|
| `/etc/nginx/conf.d/gzip.conf` | `gzip on` + `gzip_types` 含 `application/javascript`（nginx 默认只压 `html`，不写等于没压）+ `gzip_proxied any`（`/api` 也压缩） |
| `/etc/nginx/conf.d/trader.conf` | `/assets/` → `immutable` 强缓存；`index.html` → `no-cache` |

> ⚠️ 两条改动静态资源时**必须知道**的规则：
> 1. **`index.html` 必须 `no-cache`** —— 本项目的 chunk 名带内容 hash，若 `index.html` 被启发式缓存住，
>    新部署后页面仍会请求**已删除的旧 chunk → 白屏**。
> 2. **不要用 `expires` 指令** —— 它自带 `Cache-Control: max-age=...`，再叠 `add_header Cache-Control` 会输出
>    两个同名头。只用 `add_header`，并用 `curl -sD- -o/dev/null <url> | grep -ci cache-control` 断言为 1。

实测效果：主包传输 1 531 KB → 480 KB，整页首屏 1 688 KB → **575 KB（省 66%）**。

### 9.4 端到端验收（零依赖 CDP）

`scripts/` 下是自包含的浏览器验收脚本，用本机 Chrome + Node 内置 WebSocket 驱动，**不装任何 npm 依赖**。
前置：前端 5173 与后端 8000 都在运行。

```bash
node scripts/smoke-keylevels.mjs   # K 线支撑压力位标注（14 项）
node scripts/smoke-ktype.mjs       # 1d/4h/1w 周期切换（12 项）
node scripts/smoke-livermore.mjs   # 利弗莫尔模块（98 项）
```

`smoke-livermore.mjs` 的三个关键手法，后续写验收脚本可直接复用：

| 手法 | 解决的问题 |
|---|---|
| **canvas 指纹**（`toDataURL()` 抽稀采样成整数哈希） | 水平线画在 canvas 上，DOM 里查不到 → 关开关前后比较指纹，**证明线确实被绘制**，而非只是"没报错" |
| **WCAG 对比度断言**（背景色按 alpha 逐层合成到 body） | 兜住「前景色 == 背景色 → 文字隐形」这类主题变量误用（本次真抓到过一次） |
| **边界标的断言** | 无整理平台的 `US.ARM`（不出现 `--` 占位、字段收窄为 2）、港股 `HK.01211`、4H 周期不请求利弗莫尔 |

截图输出到 `F:/TraderAnalysis/logs/`（`livermore-page.png` / `livermore-chart.png`）。
