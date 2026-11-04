# Tasks: 前端仓库接入 CI 流水线

**Input**: Design documents from `specs/003-frontend-ci-pipeline/`
**Prerequisites**: `spec.md`、`plan.md`（本目录）

**Tests**: 本次**必须**写测试——单测既是交付物（US1 的一道门），也是 spec 的验收手段。

**Organization**: 按 User Story 分组，每个 Story 可独立验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[Story]**: 对应 spec 的 User Story

## Path Conventions

单仓单项目：`src/`、`tests/`、`scripts/`、`.github/workflows/` 均在仓库根。

---

## Phase 1: 前置盘点与基线（Setup）

- [x] **T001** 记录项目事实：Node v22.22.2 / npm 10.9.7 / `package-lock.json`（lockfileVersion 3）；
      已有门槛仅 `npm run build`（本地实测 exit 0，25.03s，含已知 >500 kB 告警）；无 lint、无单测
- [x] **T002** 校验锁文件同步：`package.json` 与 `package-lock.json` 根依赖集合**无差异**，
      `dayjs` 以传递依赖存在于 lock（1.11.20）→ `npm ci` 可通过
- [x] **T003** 确认托管平台：`origin` = `git@github.com:Chunxia-zzz/TraderAnalysisFrontend.git` → GitHub Actions
- [x] **T004** 核对后端既有 CI 作为先例：`.github/workflows/ci.yml`（check + security 双 job，调 `scripts/check.sh`），
      前端按同构方式落地，避免两仓纪律分裂

---

## Phase 2: 本地预检同源（US2）——必须先于 workflow

> US2 先做，因为 CI 只是"调用这个脚本的一方"。

- [x] **T005** [US2] 新增 `scripts/check.sh`：`set -euo pipefail`；顺序为
      依赖安装（`node_modules/` 缺失或 `--fresh` 时 `npm ci`）→ `npm run lint` → `npm run test:unit` → `npm run build`；
      支持 `--fresh` 参数；退出码即结论
- [x] **T006** [US2] `package.json` 增加脚本：`lint`、`test:unit`、`check`（= `bash scripts/check.sh`）
- [x] **T007** [US2] 验证 `bash scripts/check.sh` 在 Windows Git Bash 下可跑通（含中文输出不乱码、无 `| tail` 吞退出码）

**Checkpoint**: `bash scripts/check.sh` 一条命令给出四步结论 → US2 独立可用

---

## Phase 3: 规范检查基础设施（US1 的第 2 步）

- [x] **T008** 安装 devDependencies：`eslint@^10` `@eslint/js@^10` `eslint-plugin-vue@^10`
      `vue-eslint-parser@^10` `globals@^16`（实测插件 peer 要求 `vue-eslint-parser ^10.3.0`，必须显式装）
- [x] **T009** 新增 `eslint.config.js`：flat config；`@eslint/js` recommended + `eslint-plugin-vue` **flat/essential**；
      浏览器 globals 覆盖 `src/`，node globals 覆盖 `tests/` `scripts/` 与两份 config
- [x] **T010** 统计存量违规（`npx eslint src`），把**纯风格类**规则按计划关闭并记录理由；
      只修语法级/真问题类违规，**不改任何业务语义、色值、口径**
- [x] **T011** 验证 `npm run lint` 全库 **0 违例**（FR-004 的"存量零违规"）

**Checkpoint**: `npm run lint` 绿，且"故意写一个违规"能红（见 T023）

---

## Phase 4: 单元测试基础设施（US1 的第 3 步）

- [x] **T012** 安装 `vitest@^5`；新增 `vitest.config.js`：`environment: 'node'`，
      `include: ['tests/unit/**/*.spec.js']`，不开全局 API（显式 import）
- [x] **T013** [P] `tests/unit/api.spec.js`：mock `axios`，逐条断言 `src/api/trader.js` 的
      method / URL / params 构造（≥15 条用例来自 30 个导出）
- [x] **T014** [P] `tests/unit/livermore-api.spec.js`：断言利弗莫尔相关请求只命中 `/api/livermore/*`，
      不产生评分类端点请求（把 constitution §二 变成机器检查）
- [x] **T015** [P] `tests/unit/router.spec.js`：路由引用的 `../views/*.vue` 全部真实存在；
      `src/views/` 下每个 `.vue` 都被路由引用（复现过的事故类型）
- [x] **T016** [P] `tests/unit/docs-api-sync.spec.js`：`README.md`「后端 API」表端点集合与
      `trader.js` 端点集合一致（路径模板归一化后比对）
- [x] **T017** 跑 `npm run test:unit`：全绿，且**不访问网络/后端/浏览器**（离线可跑）

**Checkpoint**: `npm run test:unit` 绿，用例数 ≥ 15（SC-004）

---

## Phase 5: 流水线本体（US1 / US3 / US4 / US5）

- [x] **T018** [US1] 新增 `.github/workflows/ci.yml`：`check` job（ubuntu-latest + node 22 + `cache: npm`
      + `bash scripts/check.sh`），`paths-ignore: ['docs/**','**/*.md']`，`concurrency` 与后端一致
- [x] **T019** [US5] `check` job 成功后 `upload-artifact@v4` 上传 `dist/`（`retention-days: 7`）
- [x] **T020** [US3] `security` job：`checkout` 带 `fetch-depth: 0` + `gitleaks-action@v2`，
      用内置 `GITHUB_TOKEN`；独立 job，失败即整体失败
- [x] **T021** 自查仓库不含真密钥：`git grep -iE "secret|password|token"` 与 `.env*` 跟踪情况
      （结论：仅 `.env.example` 被跟踪，无真值）
- [x] **T022** [US1] `package.json` 固定 `engines.node`（与 CI 一致的 22 主版本），避免版本漂移

---

## Phase 6: 门禁反向验证（SC-005，必须真实执行）

- [x] **T023** 故意制造 **lint 违规** → 本地 `bash scripts/check.sh` 红在 lint 步 → 还原
- [x] **T024** 故意制造 **单测失败** → 红在 test 步（且 build 未执行）→ 还原
- [x] **T025** 故意制造 **构建错误**（语法错） → 红在 build 步 → 还原
- [x] **T026** 推送后确认远端：正常提交全绿；`check.sh` 四步在日志中逐一出现（非整体绿但内部 skipped）

---

## Phase 7: 文档与收敛（US2 的可见性 + constitution §五）

- [x] **T027** [US2] `README.md`：顶部加 CI 徽章；新增「质量门与 CI」小节（本地命令、四步对应、明确不做什么）
- [x] **T028** [US2] `AGENTS.md`：§9 常用命令加 `bash scripts/check.sh`；§5 加"push 前跑预检"；
      同步 lint 强度约定（`essential`，升级需单独 spec）
- [x] **T029** 修正 `AGENTS.md` §3/§6 两处已失效描述（`ScoresOverview.vue` 已挂载、`/scores-overview` 已非死链），
      保留原文 + `> ⚠️ 勘误（2026-11-04）`
- [x] **T030** `docs/architecture.md` 增加 **§9.5 质量门与 CI**（环节表 + 设计要点 + 首跑耗时）。
      正文其余部分不改：页面、数据流、组件拆分本次均未变动，§5/§6 的现状描述仍然准确
- [x] **T031** 逐条回填 spec 的 SC-001~007 实测值（见下方「验证记录」）

---

## 依赖关系

```
T001-T004 (盘点)
   ↓
T005-T007 (check.sh)  ← US2 先落地
   ↓
T008-T011 (lint)   T012-T017 (test)      ← 可并行
   ↓                  ↓
        T018-T022 (workflow)
              ↓
        T023-T026 (反向验证)
              ↓
        T027-T031 (文档 + 收敛)
```

## 验证记录（实施后回填，2026-11-04 本机实测）

| 项 | 实测 | 结论 |
|---|---|---|
| SC-001 流水线耗时 | 本机 `--fresh` 全流程 **218s**（`npm ci` ≈180s 走网络），非 fresh 全绿 **20s**；CI 有 npm 缓存，预期 60~90s | ✅ 未来冷启动也在 6 分钟内 |
| SC-002 同源 | CI 的 `check` job 唯一命令是 `bash scripts/check.sh --fresh`，本地是 `bash scripts/check.sh` | ✅ 字面同源（同一个文件） |
| SC-003 存量违规 | 首次全库 **21 条** → 现在 **0 条**（`npm run lint` exit 0） | ✅ 清零并保持 |
| SC-004 用例数 | **62 条**（api 27 / router 25 / livermore 6 / docs-sync 4），离线 <1s | ✅ 远超 ≥15 |
| SC-005 三类红灯 | 见下方「反向验证实测」 | ✅ 三类各自独立变红 |
| SC-006 纯文档跳过 | `paths-ignore: ['docs/**','**/*.md']` 已配置 | ⏳ 待首次远端验证 |
| SC-007 文档可执行 | 本文档与 `README.md` / `AGENTS.md` 里的命令均已逐条真跑 | ✅ |

### 反向验证实测（证明红绿灯真的会亮，而不是只写了一条 yaml）

| 探针 | 制造方式 | 结果 |
|---|---|---|
| lint 违规 | 新增 `src/__probe_lint.js` 里一个未使用变量 | exit **1**，停在 **2/4 lint**，第 3、4 步未执行；报 `no-unused-vars` 并指出 1:7 |
| 单测失败 | 新增 `tests/unit/__probe.spec.js`，`expect(1).toBe(2)` | exit **1**，停在 **3/4 单测**，构建未执行；`1 failed | 62 passed` |
| 构建失败 | `src/main.js` 里 `import './__probe_missing.css'`（lint 与单测都不查模块解析） | exit **1**，**2/4、3/4 通过**（62 passed），停在 **4/4 构建**，`Could not resolve "./__probe_missing.css"` |
| 文档失同步 | 把 README 的「30 个导出函数」改成 31 | `docs-api-sync` 测试红：`expected 31 to be 30` |

四个探针的临时文件均已删除、`src/main.js` 与 `README.md` 已还原（`git status` 复核）。

### 实施中发现并修掉的真实问题

ESLint 首次全库运行（`essential` 强度）抓出 21 条，其中 3 条是**真缺陷**，不是风格问题：

1. **`WatchlistManage.vue` 的 `refreshing` 从未声明** —— 模板 `:loading="refreshing"` 与
   `handleRefreshAll()` 都在用，点「刷新快照」会抛 `ReferenceError`。已补 `const refreshing = ref(false)`。
2. **`ScoresOverview.vue` 模板解析错误** —— `<span class="section-badge">< 60</span>` 里的裸 `<`
   被 Vue 解析器判为非法标签名。已改为 `&lt; 60`。
3. **`scripts/smoke-keylevels.mjs` 的正则转义失效** —— `` `...replace(/\s+/g,' ')` `` 在模板字符串里
   `\s` 会被解成 `s`，实际发给浏览器的代码是 `/s+/g`（替换字母 s 而非空白）。已改为 `\\s+`。

其余 18 条：11 条 `no-unused-vars`（4 个从未被引用的视图辅助函数 + 5 个 Dashboard 格式化函数 +
1 个 MarketTemperature 局部变量 + 2 个未用的 `catch (e)`）与 10 条 `vue/multi-word-component-names`
（视图文件用单名，见 `eslint.config.js` 注释）。前者删除属行为等价，后者按规则关闭并记录理由。
