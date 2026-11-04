# TraderAnalysis Frontend

[![ci](https://github.com/Chunxia-zzz/TraderAnalysisFrontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Chunxia-zzz/TraderAnalysisFrontend/actions/workflows/ci.yml)

股票分析前端，基于 Vue 3，对接后端 FastAPI 服务。提供市场温度、交易信号（空转多/多转空/主升浪龙头/主跌浪超卖/低估做多）、道氏趋势个股分析、基本面估值、利弗莫尔关键点、信号回测、标的管理等功能。

> **两套并行的信号体系**（前端也刻意分成两块展示）：① **6 因子评分**（纯均值回归，买超卖）；
> ② **利弗莫尔关键点**（买突破，独立页面 `/livermore` + K 线叠加）。两者方向相反，不合并。
> ⚠️ `/chart` 上的「支撑压力位」是 Swing Pivot 聚类，**与利弗莫尔关键点不是一回事**，页面上已明确区分。

🔗 [体验地址](http://47.106.175.84/)

## 快速启动

### 前提条件

- **Node.js** >= 20.19（`npm run lint` 用的 ESLint 10 要求这个下限；CI 固定 Node 22。只跑 `dev`/`build` 时 18 也能用，但会偏离 CI 版本）
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

> ⚠️ **本地 `npm run build` 只用于自查，不要手工把 `dist/` 传上线。**
> 上线由流水线执行，见下一节「部署与回滚」。

> **构建时那条 `chunks are larger than 500 kB` 警告可以忽略** —— 它是 Vite 的默认建议阈值，
> 不是错误，不影响功能与正确性。主包较大（**1568 KB**，2026-11-01 实测 `npm run build`；
> 此前记为 1531 KB，属旧测量值）的根因是 `src/main.js` 全量注册了
> ant-design-vue（`app.use(Antd)`），tree-shaking 失效；真正解法是改按需导入，但收益与回归风险
> 不成比例，**暂不处理**。
>
> 线上已通过 **Nginx gzip** 把传输量降到 480 KB（整页首屏 1688 KB → 575 KB，省 66%）——
> 这是服务器配置，与产物大小无关。配置与坑见 `docs/architecture.md` §9.3。

## 质量门与 CI

**push 前跑一条命令：**

```bash
npm run check          # = bash scripts/check.sh
```

它依次做四件事，任一步失败立即停（退出码非 0）：

| 顺序 | 步骤 | 命令 | 抓什么 |
|---|---|---|---|
| 1 | 依赖安装 | `npm ci` | 锁文件与 `package.json` 不同步（新增依赖忘了提交 lock） |
| 2 | 代码规范 | `npm run lint` | ESLint 能判定的真问题：未定义变量、未使用变量、模板语法错误 |
| 3 | 单元测试 | `npm run test:unit` | API 层请求构造、路由表与页面文件一致、README 与 API 表一致 |
| 4 | 生产构建 | `npm run build` | 打包失败、无法产出 `dist/` |

**CI 与本地是同一个文件。** `.github/workflows/ci.yml` 的 `check` job 不另写命令，直接执行
`bash scripts/check.sh --fresh`。所以「本地绿、CI 红」只可能来自环境差异（Node 版本、依赖下载），
不会来自「两份配置写得不一样」。

各步骤单独跑：

```bash
npm run lint           # 只查规范
npm run test:unit      # 只跑单测（纯离线，不需要后端与浏览器）
bash scripts/check.sh --fresh   # 强制 npm ci 从零安装，验证锁文件（CI 每次都这么跑）
```

**这条流水线刻意不做的事**（都是权衡结果，不是遗漏，改之前请先读 `specs/003-frontend-ci-pipeline/`）：

- **不做覆盖率门禁**：覆盖率主体是组件渲染，而单测只覆盖 api/路由/文档一致性这层薄逻辑。
  在个位数覆盖率上设阈值是假门禁。
- **不做部署（CD）**：线上仍由 `git push` 到服务器 bare repo + hook 部署。CI 不含任何上线动作。
- **不跑 `scripts/smoke-*.mjs`**：它们需要本机 Chrome + 前端 5173 + 后端 8000，在 CI 里必超时。
  它们仍是**本地**验收手段（见文末「端到端验收」）。
- **不加 Prettier**：ESLint 只开了 `essential`（挡真 bug 的规则），纯风格规则会要求重排 6500+ 行存量代码，
  收益与噪音不成比例。

> CI 成功后可在运行页面下载当次的 `dist` 产物（保留 7 天），用于核对线上跑的是哪一版。

## 部署与回滚

### 什么时候上线

**只要代码进了 `main` 且四道检查全绿，就自动上线**，不需要第二次推送：

```
git push GitHub (main)
   └─ check：npm ci → eslint → 62 条单测 → vite build → 上传 dist-<sha>
        └─ deploy（needs: check）→ tar 到 /var/www/trader-frontend.new
             → 校验 → mv 交换（旧版留作 .prev）→ 健康检查 → 完成
```

- **PR 不部署**：只有 `push` 到 `main` 才部署。PR 通过检查也不动线上。
- **检查红就不上线**：`deploy` job 显示 `skipped`，线上一个字节都不变。
- 上线的是 **CI 构建的那份产物**（artifact `dist-<sha>`），服务器不再跑 `npm ci` / `npm run build`。
- 部署后自动健康检查四项：首页 200、`#app` 挂载点存在、`index.html` 的 `Cache-Control` **恰好 1 个**、
  页面引用的首个 JS 资源可取回。任一不过 → **自动换回上一版**。

服务器目录：

| 路径 | 作用 |
|---|---|
| `/var/www/trader-frontend` | 线上，Nginx 静态根（本次未改 Nginx 配置） |
| `/var/www/trader-frontend.prev` | 上一版，回滚锚点，只保留 1 份 |
| `/var/www/trader-frontend.new` | 暂存，上传先到这里，校验通过才交换 |

> ⚠️ **判断线上是不是最新版，别比对本机构建的 chunk 名。** Windows 工作区是 CRLF、CI checkout 是 LF，
> 源码换行不同 → `index-XXXX.js` 的内容哈希不同（实测 `index-B3fBnsiR.js` vs `index-BGAl7ZYY.js`）。
> 正确的依据：部署记录里的 commit sha、或 `stat /var/www/trader-frontend/index.html` 的 mtime。

### 回滚（≤2 条命令，不需要重新构建）

```bash
# 在服务器上执行
ssh root@47.106.175.84
rm -rf /var/www/trader-frontend && mv /var/www/trader-frontend.prev /var/www/trader-frontend
```

没有 `.prev` 时会明确报「无上一版可回滚」——**先确认目录存在，别在没锚点时删线上**：

```bash
ssh root@47.106.175.84 'test -d /var/www/trader-frontend.prev && echo 可回滚 || echo 无上一版'
```

### 推服务器不再上线

服务器 bare repo 的 `post-receive` 已改成只打印说明、不再构建与覆盖（原 hook 备份为
`post-receive.bak-20261104`）。`git push` 到服务器只更新裸库，**线上不会变**。

> 背景：原 hook 是 `checkout → npm ci → npm run build → rm -rf 线上 → cp`，且没有 `set -e`。
> 构建中途失败时 `dist/` 已被 Vite 清空，`rm -rf` 又已删掉线上 → **白屏**。
> 见 `specs/004-deploy-on-green/`。

### 首次配置（已由 2026-11-04 完成，换机器/换仓库时需要）

GitHub → Settings → Secrets and variables → Actions → `DEPLOY_SSH_KEY`：
部署专用 ed25519 私钥全文（无 passphrase）。对应的公钥带注释 `gh-actions@trader-frontend`
在服务器 `/root/.ssh/authorized_keys`。

可选：加仓库变量 `DEPLOY_HOST` 覆盖服务器地址（默认 `47.106.175.84`）。

## 功能页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 价值投资理念展示（六段式落地页 + 暗/浅主题切换，**纯静态，不走任何后端接口**） |
| 市场温度 | `/market-temperature` | 顶部三视图切换（**美股大盘 / 黄金 / 比特币**）：3 维度综合评分、8 级状态映射、仓位建议、SPY/QQQ 指标、历史趋势图；黄金与比特币视图走资产温度（价格/日RSI6/周RSI6/MA200偏离/ATH回撤/52周位置 6 项指标）。**口径（2026-10-19 反转）：分数越高 = 越恐慌 = 越值得加仓**（与个股评分同向；高分蓝=机会，低分红=贪婪） |
| 交易信号 | `/momentum-leaders` | 空转多/多转空（EMA5/30交叉）+ 主升浪龙头 + 主跌浪超卖 + 低估做多 |
| 机会速览 | `/scores-overview` | 按评分**分档**看「跌得多深」：严重超卖(≥80) / 超卖(60~79) / 中性(<60) + 「超卖且站上MA5」可执行分组（从超卖里单列，不与超卖重复）+ 就地展开止盈损（止损/止盈/风险回报比）。**分档为互斥分区**，四段之和等于总数，见 `specs/001-scores-overview-route/` |
| 利弗莫尔 | `/livermore` | **独立信号体系**：关键点突破/逼近/已在关键点上方/风险四分组，口径说明卡 + 统计条 + 抽屉详情（关键点全景/金字塔加仓位/潮汐与相对强度） |
| 个股分析 | `/dashboard` | 道氏三层趋势 + 基本面估值（分析师+晨星）+ 关键位置盈亏比 + 形态置信度 + 综合评分 |
| 信号回测 | `/backtest` | **5 种策略模式**回测（趋势跟踪/买入并持有/波段操作/EMA飘带多头/EMA飘带空头），统计+交易明细 |
| 个股历史K线 | `/chart` | 蜡烛图 + MA/布林带/EMA多空带/成交量/MACD/RSI 多窗格联动 + **支撑压力位标注**（Swing Pivot 聚类）+ **利弗莫尔关键点叠加**（关键点/箱体下沿/止损，仅日线），支持 4H/日K/周K |
| 标的管理 | `/watchlist-manage` | 标的池增删改查 + 筛选 + 晨星折价排序 + 刷新快照 |
| 市场复盘 | `/review` | 日/周复盘报告 + 自媒体文案生成 |

## 导航结构

```
市场温度 | 交易信号 | 利弗莫尔 | 个股分析 ▾ | 信号回测 | 市场复盘 (beta) | 标的管理
                              ├─ 个股技术分析 (/dashboard)
                              └─ 个股历史K线 (/chart)
```

> 「交易信号」是**平级链接**（指向 `/momentum-leaders`），不是下拉菜单；真正带 ▾ 的只有「个股分析」一个下拉。
> 「市场复盘」菜单项右侧带 `beta` 徽标。
>
> ✅ **变更（2026-11-02）**：「持仓配置」下拉（我的持仓 `/position` / 目标仓位 `/allocation`）已下线，
> 两个旧地址保留重定向到首页（避免书签打开白屏）。见 `specs/002-retire-position-allocation/`。

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

下表逐条对应 `src/api/trader.js` 的 **30 个导出函数 / 30 个前端端点**（同一路径多方法分开计），
另列 3 个「后端保留、前端已不再封装」的端点。**已核对无遗漏、无虚构**——`tests/unit/docs-api-sync.spec.js`
每次 CI 都会重新核对一遍，不一致就红。

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
| `GET /api/position` | 实时持仓（**依赖本机 OpenD**） | ⚠️ 当前无页面引用（2026-11-02 下线） |
| `GET /api/allocation` | 永久组合目标与偏离 + 加仓建议（**依赖本机 OpenD**） | ⚠️ 当前无页面引用（日更仍直接调用） |
| `PUT /api/allocation` | 保存目标仓位配置 | ⚠️ 当前无页面引用（改为直接调接口或改 JSON） |
| `GET /api/backtest/run` | 信号回测（5 种模式） | Backtest |
| `GET /api/review` | 日/周复盘报告 | Review |
| `GET /api/content-generator` | 自媒体文案生成 | Review |
| `GET /api/content-templates` | 文案模板列表 | Review |
| `PUT /api/content-templates/{key}` | 保存文案模板 | Review |
| `DELETE /api/content-templates/{key}` | 删除文案模板 | Review |
| `GET /api/watchlist` | 标的池（含晨星折价、最新收盘价、分类标签） | Chart / Dashboard / Backtest / WatchlistManage |
| `GET /api/watchlist/{code}` | 单个标的全量详情 | ⚠️ 当前无页面引用 |
| `POST /api/watchlist` | 新增标的（内部调 Futu 补全快照，**需 OpenD**） | WatchlistManage |
| `POST /api/watchlist/batch` | 批量新增标的 | ⚠️ 当前无页面引用 |
| `PATCH /api/watchlist/{code}` | 编辑标的（仅白名单字段） | WatchlistManage |
| `DELETE /api/watchlist/{code}` | 删除标的 | WatchlistManage |
| `POST /api/watchlist/refresh-snapshot` | 批量刷新快照（**需 OpenD**） | WatchlistManage |
| `GET /api/indicators/latest` | 最新一根指标（不返回 K 线序列） | ⚠️ 当前无页面引用 |
| `GET /api/trade-signals` | 顶/底背离交易信号 | ⚠️ 当前无页面引用 |
| `GET /api/bottom-signals` | 超卖底部信号（近 N 天） | ⚠️ 当前无页面引用 |

**已在上表标注「⚠️ 当前无页面引用」的 5 个函数**（按函数名索引，便于搜代码）：
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
src/                          # 共 17 个文件
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
│   └── ScoresOverview.vue     # ★ 机会速览（按评分分档 + 止盈损）
├── router/index.js            # 路由配置（12 条：10 个页面 + 2 条下线重定向）
├── App.vue                    # 根组件（导航 + 健康检查）
└── main.js                    # 入口文件
```

> ⚠️ 2026-10-12 勘误：此前列出的 `components/KLineChart.vue` 与 `views/` 下的
> `Fundamental.vue` / `GridTrading.vue` / `Login.vue` / `StockFilter.vue` / `Settings.vue`
> **在仓库中均不存在**，已从文档删除。
>
> ⚠️ `ScoresOverview.vue` 未挂载路由，但 `Home.vue` 里有一个 `<router-link to="/scores-overview">机会速览</router-link>`
> 指向它 → **这是个死链**（点击落到空白）。属已知待处理问题。
>
> ✅ **勘误（2026-11-01）**：该路由已注册（`/scores-overview`），死链已修复。
> 落地过程与验收记录见 `specs/001-scores-overview-route/`。原文保留以记录当时的偏差。

## 文档索引

| 文件 | 性质 |
|---|---|
| `AGENTS.md` | **agent 操作层**：命令、路径、环境坑、目录地图；原则层在 `.specify/memory/constitution.md` |
| `specs/` | **事前意图**：每个 feature 的 spec / plan / tasks，约定见 `specs/README.md` |
| `README.md`（本文件） | 现状说明，**与代码一致** |
| `docs/architecture.md` | 现状技术方案，**与代码一致**，页面细节以它为准 |
| `docs/design-spec-v1-clean-financial.md` | **v1 视觉改造设计稿（2026-06-18）**。色板/字体/Ant token/全局 CSS 已落地且逐值一致；但 §2、§3 的逐页布局描述**已与现状脱节**（Home、Dashboard 改动最大，Grid Trading 页已删除）。开头 §0 有现状对照表，**不要拿它当现状依据** |

## 端到端验收（零依赖 CDP）

`scripts/` 下是**完全自包含**的浏览器验收脚本：CDP 驱动在 `scripts/lib/cdp.mjs`（本仓库自有，162 行），
用本机 Chrome + Node 内置 WebSocket，**不装任何 npm 依赖、不引用仓库外的任何文件**。
**前置：前端 5173 与后端 8000 都已在运行**。

> **2026-11-02 修正**：此脚本原先从 WorkBuddy 的 `cdp-ui-smoke` 技能按**绝对路径**导入 CDP 驱动，
> 该技能被系统清理后 4 个脚本全部 `ERR_MODULE_NOT_FOUND` —— 回归测试凭空依赖了仓库外的东西。
> 已把驱动内联为 `scripts/lib/cdp.mjs`，并把硬编码的 Chrome 路径/端口改为环境变量（见下）。
>
> 可用环境变量：`TA_UI_BASE`（默认 `http://127.0.0.1:5173`）、`CHROME_PATH`、`CDP_PORT`（默认 9333）。
> 端口被其他项目占用时：`BACKEND_PORT=8001 npm run dev` + `TA_UI_BASE=http://127.0.0.1:5174 node scripts/smoke-ktype.mjs`。

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
