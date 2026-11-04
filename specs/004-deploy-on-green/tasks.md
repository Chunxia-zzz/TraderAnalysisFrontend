# Tasks: 只在新版本检查通过后上线

**Input**: `spec.md` / `plan.md`（本目录）

**Organization**: 按 User Story 分组；D 开头为基础设施阶段。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件/不同系统，无依赖）

---

## Phase 1: 前置核对（已完成）

- [x] **T001** 读服务器 hook 原文：确认它 `checkout -f main → npm ci → npm run build → rm -rf 线上 → cp dist/*`，
      **无 `set -e`**（先删后拷，构建失败会白屏）
- [x] **T002** 确认服务器**没有 rsync**（Alibaba Cloud Linux 3，有 `tar` / `curl`）→ 传输方案定为 `tar | ssh`
- [x] **T003** 确认 Nginx 静态根 `/var/www/trader-frontend`（3.3 MB），磁盘余量 28 G
- [x] **T004** 确认 `authorized_keys` 现有 1 把用户密钥 → 追加部署专用密钥而非替换

## Phase 2: 密钥与服务器准备（US1 前置）

- [x] **T005** 生成部署专用 ed25519 密钥（无 passphrase，注释 `gh-actions@trader-frontend`），
      私钥放**仓库外**（`~/.ssh/trader-frontend-deploy`），指纹 `SHA256:siHY8PXP…`
- [x] **T006** 公钥追加到服务器 `/root/.ssh/authorized_keys`（原用户密钥保留，共 2 行）；
      用该私钥登录验证：`LOGIN_OK / root`
- [x] **T007** 用该密钥做**只写暂存目录**的上传：`tar | ssh` → `.new`，远端 44 个文件 / 3.3 MB，
      与本地 `dist/`（44 文件）一致

## Phase 3: 部署 job（US1 / US4）

- [x] **T008** [US1] `deploy` job：`needs: [check]`、`if: push && refs/heads/main`、
      job 级 `concurrency: deploy-main`（`cancel-in-progress: false`）
- [x] **T009** [US4] `download-artifact@v8` 取 `dist-${{ github.sha }}`；`Verify artifact` 断言 `index.html` 存在
- [x] **T010** [US1] 注入 `DEPLOY_SSH_KEY`（chmod 600）+ `ssh-keygen -y` 合法性预检 +
      `ssh-keyscan` 写 `known_hosts`；密钥为空时 `::error::` 明确失败
- [x] **T011** [US1] `tar | ssh` 上传到 `.new`（`set -o pipefail`，传输失败不被 ssh 的 0 码吞掉）

## Phase 4: 切换、健康检查与回滚（US2）

- [x] **T012** [US2] 远端：校验 `.new/index.html` → 写 `SWAP_MARK`(run_id) → 删旧 `.prev` →
      `mv` 交换 → 删标记；首次无线上目录用 `test -d` 守卫
- [x] **T013** [US2] 健康检查四断言全部通过（实测：200 / `#app` / `Cache-Control=1` / 首个 `assets` JS 200）
- [x] **T014** [US2] `if: failure()` 回滚，仅当 `SWAP_MARK` 内容 == 本次 `run_id` 才执行
      —— **实测**：标记写别的 run_id 时输出「本次运行未执行目录切换」，线上保持新版未动
- [x] **T015** [US3] 人工回滚 **实测**：`rm -rf live && mv prev live` → 线上退回旧版
      `index-CQHugC-R.js` 且 200；再切回新版

## Phase 5: 单一部署路径（US5）

- [x] **T016** [US5] 原 hook 备份为 `post-receive.bak-20261104`（533 bytes），新 hook 打印说明 + `exit 0`
- [x] **T017** [US5] `git push deploy main`：hook 输出移交说明，bare repo 前进到 `5b89c5b`，
      **线上 `index.html` mtime 未变**（1793799937 → 1793799937）

## Phase 6: 文档（constitution §五）

- [x] **T018** `README.md`：新增「部署与回滚」（触发条件、链路、三目录职责、2 条回滚命令、
      推服务器不再上线、Secret 首次配置）；「生产构建」标注本地只用于自查
- [x] **T019** `AGENTS.md`：§3 补 deploy job；§5 新增 11/12/13（禁止手工覆盖线上、回滚优先 `.prev`、推前想清楚推哪）
- [x] **T020** `docs/architecture.md` §9.3：重写部署链路 + 五条设计取舍；Nginx 段落未动
- [x] **T021** `specs/003-frontend-ci-pipeline/spec.md` 顶部加「部署部分由 004 取代」，原文保留
- [x] **T022** 后端 `docs/guides/ops/README.md` 加勘误（commit `e5e68a7`，**未推送**，避免重启线上 API）

## Phase 7: 验证（SC 逐条）

- [x] **T023** SC-002：未在主分支做「故意红」实验（会污染 main 历史）。
      依据：`needs: [check]` 是平台语义；且 003 的 `ci-probe` 运行已实测「check 失败 → 后续步骤 skipped」
- [x] **T024** SC-003：见 T014（守卫 + 真实回滚两组实验）
- [x] **T025** SC-001/007：见下方远端记录（总 57s，deploy job 22s）
- [x] **T026** SC-005：部署日志输出 `sha=5b89c5b`；线上 asset 名 `index-BGAl7ZYY.js`
      与本机构建 `index-B3fBnsiR.js` **不同**，原因见下方「构建指纹差异」

## Phase 8: 收敛（2026-11-04 晚，用户确认后执行）

- [x] **T027** 三次 SSH 合并为**一次**：删掉「Prepare SSH key」里的探活连接，上传 + 切换放进同一个
      远端会话（`tar -xzf -` 读完后 shell 继续执行后续命令）。正常路径 3 → 1 条连接，失败回滚时 +1
- [x] **T028** 主机公钥固化：`ssh-keyscan` 改为 `cp .github/deploy_known_hosts ~/.ssh/known_hosts`，
      ssh 显式 `StrictHostKeyChecking=yes`。运行时扫描 = 信任第一次见到的密钥，钉住才有防中间人意义
- [x] **T029** 本地用合并后的同一段脚本做真实部署验证：1 条连接完成「解包 44 文件 → 切换 → 清标记」，
      无标记残留，线上 200

**为什么这不是新 spec**：只是 004 内部的步骤合并与密钥来源调整，不改变「何时部署、部署什么、失败怎么办」
三条契约（FR-001/003/006 均未变），属收敛项而非新需求。

## 验证记录（2026-11-04 实测）

### 远端全链路（run [41840934969](https://github.com/Chunxia-zzz/TraderAnalysisFrontend/actions/runs/41840934969)，提交 `5b89c5b`）

| job | 结论 | 耗时 | 关键步骤 |
|---|---|---|---|
| `check (Node 22)` | ✅ | 29s | check.sh 17s，上传 `dist-<sha>` 1s |
| `secret scan (gitleaks)` | ✅ | 15s | gitleaks 3s |
| `deploy (static → 47.106.175.84)` | ✅ | **22s** | 下载 artifact 1s / 密钥 6s / 上传 5s / 切换 3s / **健康检查 3s** / 回滚 **skipped** |

整体 **57s**（SC-001 ≤3min ✅，部署环节 ≤40s ✅）。

### 线上结果

- 切换前 `index-B3fBnsiR.js`（我本地模拟部署的版本）→ 切换后 **`index-BGAl7ZYY.js`**
- `index.html` mtime `21:45:37` = CI 构建时间；`.prev` 保留 `index-B3fBnsiR.js`
- 线上文件数 **44**，与 artifact 一致；健康检查四项全过

### 构建指纹差异（重要，别误判）

**本机构建 `index-B3fBnsiR.js` ≠ CI 构建 `index-BGAl7ZYY.js`**，哈希不同不是部署出错：

- 本机工作区是 **CRLF**（Windows `core.autocrlf=true`），CI checkout 是 **LF**
- 源码换行不同 → 打包进 bundle 的字符不同 → 内容哈希不同
- **判断线上是否为最新版，看 commit sha / 部署记录 / `index.html` mtime，不要比对本机构建哈希**

### 未做/做不到

- **匿名下载 artifact 返回 401**：整包下载需要认证，故「线上字节 == artifact 字节」依据的是流程结构
  （deploy job 全程无构建步骤，只有 download → tar → extract）+ 文件数一致，而非逐字节比对
- **SC-002 未在主分支做破坏性验证**（理由见 T023）

## 依赖关系

```
T005-T007 (密钥/服务器)
      ↓
T008-T011 (deploy job)
      ↓
T012-T015 (切换 + 健康检查 + 回滚)
      ↓
T016-T017 (停 hook，单一路径)      ← 必须在部署成功之后
      ↓
T018-T022 (文档)  →  T023-T026 (验证留档)
```
