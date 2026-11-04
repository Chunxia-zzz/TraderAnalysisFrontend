# AGENTS.md — TraderAnalysis Frontend

> **本文件是操作层**：命令、路径、环境坑、目录地图。任何模型接手这个仓库，先读这一份再动手。
>
> **原则层在 `.specify/memory/constitution.md`**（6 条原则 + 安全边界 + 优先级）。
> 两者冲突时**以 constitution 为准**，并同步修正本文件。
>
> 现状说明（功能页、API 表、页面细节）在 `README.md` 与 `docs/architecture.md`，本文件不重复。
>
> 最后更新：2026-11-04

---

## 0. 开工前 30 秒（命中即执行，不要跳过）

动手改代码前先回答一个问题：**这是缺陷，还是新能力？**

| 情况 | 走哪条 | 产物 |
|---|---|---|
| 行为不对但本该对（报错、数字错、文案错、页面空白） | **bug 三件套** `assess → fix → test` | `.specify/bugs/<slug>/` |
| 要新增页面 / 改 API 调用方式 / 改图表能力 / 改口径配色 / 引入依赖 | **SDD 六步** `specify → plan → tasks → implement → converge` | `specs/NNN-<slug>/` |
| 命中豁免清单（文案更正 / 样式微调 / 单行 bug / 版本号 / 注释） | 直接改 | 随改动提交说明 |

- **判断不了就问用户，不要自己选。** 选错流程比不做更糟：5 行改动用完整 SDD 跑过一遍，规格与规模严重不匹配（2026-11-01 教训）。
- **推荐做法**：直接调用 **`spec-kit-entry` 技能**（正文在 `F:/TraderAnalysis/skills/spec-kit-entry/SKILL.md`，
  用户级有占位入口，所有项目可唤起）—— 它会自动做三层体检 + 分流。本节的表是它的判定依据摘要，不重复其步骤。
- **跳过这一步的代价**：需求只留在对话里，事后无法核对「当初打算做什么」，也就无法判断实现有没有跑偏。
- 命令层不入库，换机器要重跑 `specify init` + `specify extension add bug`，否则 `/speckit-*` 静默消失。

---

## 1. 这是什么

后端 `TraderAnalysis` 的 Vue 3 前端。纯 SPA，静态托管，**不做服务端渲染、无认证体系**（v2.8+ 已彻底移除，非"暂时禁用"）。

- 框架：Vue 3（Composition API + `<script setup>`）+ Vite 5
- UI：Ant Design Vue 4；图表：lightweight-charts 4（K 线）+ ECharts 6（温度趋势）
- 仓库：独立仓库 `F:\TraderAnalysisFrontend`，**不在后端仓库内**
- 后端：`F:\TraderAnalysis`（FastAPI，8000）
- 线上：<http://47.106.175.84/>

## 2. 三条最容易踩错的约束

1. **空数据是 200 + `{data: null, message}`，不是 404。** 不要当异常处理，不要弹错误提示。
2. **两套信号体系刻意分开**：`/momentum-leaders`（6 因子/EMA 交叉）与 `/livermore`（关键点突破）
   方向相反，不合并、不共用统计卡。「支撑压力位」（Swing Pivot 聚类）≠「利弗莫尔关键点」（平台突破）。
3. **温度口径：高分 = 恐慌 = 越该加仓。配色高分蓝、低分红**，与 A 股红涨习惯相反，**不要"顺手改"**。
   改配色必须同步改 `scripts/smoke-livermore.mjs` 的对比度断言。

## 3. 目录地图

| 路径 | 是什么 |
|---|---|
| `src/api/trader.js` | 所有后端调用（33 个导出函数），**API 层唯一入口** |
| `src/components/IndicatorChart.vue` | **唯一**的 K 线图表组件（多窗格用 `priceScaleId`，非多实例） |
| `src/views/` | 10 个页面，**全部已注册路由**（含 `/scores-overview`） |
| `src/router/index.js` | 路由配置（12 条：10 个页面 + 2 条下线重定向，**无 meta、无守卫**） |
| `src/styles/theme.js` / `tokens.css` | ant token / CSS 变量 |
| `scripts/check.sh` | **本地预检**：`npm ci` → lint → 单测 → 构建。**CI 执行的就是这个文件**，不是另抄一份 |
| `scripts/smoke-*.mjs` | 零依赖 CDP 验收脚本（需本机 Chrome + 前后端在跑，**不在 CI 里**） |
| `eslint.config.js` / `vitest.config.js` | 规范与单测配置。ESLint 强度刻意取 `essential`，见 §5.9 |
| `tests/unit/` | 纯离线单测：API 层请求构造 / 路由表与页面文件 / README 与 API 表一致 |
| `.github/workflows/ci.yml` | GitHub Actions：`check`（跑 `check.sh`）+ `security`（gitleaks 全历史）+ `deploy`（`needs: check`，仅 push main）。**上线只有这一条路** |
| `docs/architecture.md` | **现状技术方案**，页面细节以它为准 |
| `docs/design-spec-v1-clean-financial.md` | v1 视觉设计稿。**§2/§3 逐页布局已脱节，不要当现状依据** |
| `.specify/` | SDD 配置：`memory/constitution.md`（原则层）/ `templates/` / `scripts/` |
| `specs/` | 事前意图：每个 feature 一个 `NNN-<ascii-slug>/`，见 `specs/README.md` |

## 4. clone 后第一件事

```bash
npm install                       # Node >= 18（推荐 20+）
npm run dev                       # http://localhost:5173，需后端同时在 8000

python -m pip install specify-cli  # 可选：要用 /speckit-* 才装
specify init --here --force --non-interactive --integration claude --script sh   # 重建 speckit 命令层
specify extension add bug          # 重建缺陷三件套命令（assess / fix / test）
```

`.claude/skills/speckit-*` **不入库**（第三方生成物）。新机器跑上面两条 `specify ...` 即可重建；
**入库的是 `.specify/`（含 `extensions/bug/` 配置）与 `specs/`**。
漏跑 `specify extension add bug` 的后果：`/speckit-bug-*` 命令消失，**且不会报错**。

## 5. 硬性约定

1. **dev 走 vite proxy**：`VITE_API_BASE_URL` 必须留空。写死后端地址会绕过代理，改端口时两处不同步。
2. **端口冲突**：`BACKEND_PORT=8001 npm run dev` + 后端也设 `BACKEND_PORT=8001`（`vite.config.js` 读取该变量）。
3. **Vite 改动后 Ctrl+Shift+R 强刷**，否则看到旧 chunk。
4. **禁用 `git add -A`**：`dist/`、`node_modules/`、`*.log`、`.claude/` 常年存在，逐个 `git add <path>`。
5. **构建时 `chunks are larger than 500 kB` 警告可忽略** —— 根因是 `main.js` 全量 `app.use(Antd)`，
   改按需导入收益与回归风险不成比例，**暂不处理**（结论已固化，不要"顺手优化"）。
6. **部署两条红线**：`index.html` 必须 `no-cache`；**不要用 `expires` 指令**（会输出两个同名 Cache-Control 头）。
7. **非平凡变更先写 spec**：新增页面 / 改 API 函数签名 / 改图表能力 / 改口径配色 / 引入依赖
   → 先落 `specs/NNN-<ascii-slug>/spec.md`。豁免清单见 `specs/README.md`。
8. **提交前缀**：`feat:` / `fix:` / `docs:` / `chore:` / `refactor:`。
9. **push 前跑 `bash scripts/check.sh`**（= `npm run check`）：`npm ci` → lint → 单测 → 构建。
   **CI 执行的就是同一份脚本**，所以"本地通过 CI 失败"只会是环境差异，别去怀疑配置不一致。
   `npm run check` 需要 bash（Windows 用 Git Bash）。
10. **不要为了过 lint 去改强度**：ESLint 只开 `eslint-plugin-vue` 的 `essential`（挡真 bug 的规则）。
    想加风格规则（`recommended`）等于要求重排 6500+ 行存量代码 —— 那是**独立需求，要单独提 spec**，
    不是顺手改一行配置。
11. **上线只能由流水线执行**（specs/004-deploy-on-green）：`push main` + `check` 绿 → `deploy` job →
    `tar` 到 `/var/www/trader-frontend.new` → 校验 → `mv` 交换。**禁止**手工 `scp`/`cp` 覆盖
    `/var/www/trader-frontend`，也**不要**恢复服务器 `post-receive` 的构建逻辑（原版备份在
    `post-receive.bak-20261104`，仅作查阅）。
12. **回滚优先用 `.prev`，不重新构建**：`rm -rf /var/www/trader-frontend && mv /var/www/trader-frontend.prev /var/www/trader-frontend`。
    先 `test -d` 确认锚点存在；没有 `.prev` 时删线上等于把站点打空。
13. **`git push` 前想清楚推哪**：`origin` 现在只指向 GitHub（双 URL 已拆，见 `git remote -v`），
    推 GitHub 才会触发流水线。推服务器 bare repo 只更新裸库、**不再上线**。

## 6. 已知技术债（不要当 bug 修）

| 问题 | 状态 |
|---|---|
| `dayjs` 被 `Dashboard.vue` 直接 import，但不在 `package.json`（靠 ant-design-vue 传递安装） | 建议补进 `dependencies`，但**改动会动 `package-lock.json`**，改前先确认 |
| 主包 1531 KB，全量注册 antd | 接受现状，已用 Nginx gzip 压到 480 KB |
| `src/api/trader.js` 有 5 个函数无页面引用，5 个后端端点无函数封装 | 见 `README.md`「后端 API」节，改动时须知 |

> ⚠️ 勘误（2026-11-04）：上表原有两行「`ScoresOverview.vue` 未挂载路由 / `Home.vue` 里 `/scores-overview` 是死链」
> 已与代码不符 —— 该路由在 2026-11-01 就已注册（`specs/001-scores-overview-route/`），页面可正常访问。
> 行已删除，原文保留在本行以记录当时的偏差。`tests/unit/router.spec.js` 现在会持续校验
> 「每个页面都有路由、每条路由的文件都存在」，这类偏差不会再靠人看。

## 7. 技能索引

**命中触发词时先读对应文件，再按它的步骤执行。**

| 触发词 | 去哪 |
|---|---|
| 写 spec / 规划某个功能 / 要不要先写规范 | `specs/README.md` + `.specify/memory/constitution.md` |
| 什么能做什么不能做 | `.specify/memory/constitution.md`（冲突时以它为准） |
| 页面细节、组件实现、API 分层 | `docs/architecture.md` |
| 功能页在哪、调用哪个接口 | `README.md` |

### Spec-Driven Development 命令（`/speckit-*`）

`/speckit-specify` → `/speckit-clarify`（可选）→ `/speckit-plan` → `/speckit-tasks` →
`/speckit-implement` → `/speckit-converge`（反复到 Converged）。

改 constitution 必须说明**理由** —— 它参与后续每次 `plan` 的判定。

### 缺陷修复走另一条路（bug 扩展，已安装）

**修 bug 不要套上面那 6 步**（2026-11-01 教训：5 行改动用完整 SDD 跑了一遍，规格与规模严重不匹配）。

| 命令 | 作用 | 产出 |
|---|---|---|
| `/speckit-bug-assess` | 评估缺陷（粘贴文本或 issue URL），定位可疑代码、判严重性 | `.specify/bugs/<slug>/assessment.md` |
| `/speckit-bug-fix` | 按评估结论修复并记录改了什么 | 代码改动 |
| `/speckit-bug-test` | 验证缺陷是否真的解决 | 验证报告 → `verified` / `partial` / `failed` |

**判定**：行为不对但本该对 → 缺陷；要新增能力 → SDD。**缺少验证不算修好。**

## 8. 环境坑

1. **验收脚本前置**：前端 5173 **与**后端 8000 都在运行。只起前端会全部超时。
2. **验收用本机 Chrome**驱动（CDP + Node 内置 WebSocket），**不装任何 npm 依赖**。
3. 截图输出到 `F:/TraderAnalysis/logs/`（后端仓库目录），不是本仓库。
4. **canvas 上看不到的东西要用指纹证明**：`smoke-livermore.mjs` 用 `toDataURL()` 抽稀采样比哈希，
   证明线确实画上去了；只看 DOM 会误判成功。
5. **改主题变量必跑对比度断言**：前景色 == 背景色导致文字隐形，这个坑真踩过。

## 9. 常用命令

```bash
npm run dev        # 5173，需后端 8000
npm run build      # 输出 dist/
npm run preview    # 本地预览生产构建

# ── 质量门（push 前必跑）──
npm run check              # = bash scripts/check.sh：npm ci → lint → 单测 → 构建
npm run lint               # 只查规范（ESLint，全库 0 违例）
npm run test:unit          # 只跑单测（纯离线，不需要后端/浏览器）
bash scripts/check.sh --fresh   # 强制 npm ci 从零装，验证锁文件（CI 每次都这么跑）

# ── 上线与回滚（部署由流水线执行，这里只用于核对/应急）──
git push origin main                    # 只推 GitHub → 触发 check → 自动 deploy
ssh root@47.106.175.84 'ls -l /var/www/trader-frontend/assets/index-*.js'   # 线上是哪一版
curl -s http://47.106.175.84/ | grep -o '/assets/index-[^"]*\.js' | head -1

# 回滚（先确认锚点，再换目录）
ssh root@47.106.175.84 'test -d /var/www/trader-frontend.prev && echo 可回滚 || echo 无上一版'
ssh root@47.106.175.84 'rm -rf /var/www/trader-frontend && mv /var/www/trader-frontend.prev /var/www/trader-frontend'

# ── 需真实浏览器的验收（不在 CI 里）──
node scripts/smoke-livermore.mjs   # 利弗莫尔模块（98 项）
node scripts/smoke-keylevels.mjs   # K 线支撑压力位（14 项）
node scripts/smoke-ktype.mjs       # 1d/4h/1w 周期切换（12 项）
node scripts/diag-canvas.mjs       # canvas 诊断
```
