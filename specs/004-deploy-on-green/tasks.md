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

- [ ] **T005** 生成部署专用 ed25519 密钥（无 passphrase，注释 `gh-actions@trader-frontend`），
      私钥放**仓库外**（`~/.ssh/trader-frontend-deploy`）
- [ ] **T006** 把公钥追加到服务器 `/root/.ssh/authorized_keys`，并用该私钥验证可登录
- [ ] **T007** 用该密钥做一次**只写暂存目录**的上传（`tar | ssh` → `.new`），比对文件数与本地 `dist/` 一致

## Phase 3: 部署 job（US1 / US4）

- [ ] **T008** [US1] `ci.yml` 新增 `deploy` job：`needs: [check]`、`if: push && main`、
      job 级 `concurrency: deploy-main`（不取消）
- [ ] **T009** [US4] `download-artifact` 取 `dist-${{ github.sha }}`；断言 `dist/index.html` 存在
- [ ] **T010** [US1] 注入 `DEPLOY_SSH_KEY`（chmod 600）+ `ssh-keyscan` 写 `known_hosts`；
      密钥为空时**明确失败并提示缺 secret**
- [ ] **T011** [US1] `tar | ssh` 上传到 `.new`（`set -o pipefail`）

## Phase 4: 切换、健康检查与回滚（US2）

- [ ] **T012** [US2] 远端脚本：校验 `.new/index.html` → 删旧 `.prev` → `mv` 交换（首次无旧目录用 `test -d` 守卫）
- [ ] **T013** [US2] 健康检查四断言：首页 200 / `id="app"` 存在 / `Cache-Control` 恰好 1 个 / 首个 `/assets/` 资源 200
- [ ] **T014** [US2] `if: failure()` 回滚步骤：有 `.prev` 才换回，无则明确报「无上一版」
- [ ] **T015** [US3] 在服务器写好人工回滚命令并在文档公开（≤2 条命令）

## Phase 5: 单一部署路径（US5）

- [ ] **T016** [US5] 备份原 hook 为 `post-receive.bak-20261104`，替换为「打印说明 + exit 0」
- [ ] **T017** [US5] 向 bare repo 推一次，确认线上 mtime 不变、hook 打印移交说明

## Phase 6: 文档（constitution §五）

- [ ] **T018** `README.md`：部署方式改为「合到 main 且检查通过即上线」，给回滚命令，说明推服务器不再上线
- [ ] **T019** `AGENTS.md`：§5 增加部署约定（禁止手动覆盖线上、回滚优先）；§9 命令
- [ ] **T020** `docs/architecture.md` §9.3：部署链路图改为 `push → CI → deploy job → .new → swap → 健康检查`
- [ ] **T021** `specs/003-frontend-ci-pipeline/spec.md` 顶部加一行「部署部分由 004 取代」（不改原文）
- [ ] **T022** 后端仓库 `docs/guides/ops/README.md` 部署链路加勘误（**单独提交，不代推**）

## Phase 7: 验证（SC 逐条）

- [ ] **T023** SC-002：推一个 lint 失败的分支到 main → `deploy` skipped、线上 mtime 不变 → 还原
- [ ] **T024** SC-003：注入健康检查失败 → 自动回滚，首页 200 且为上一版内容
- [ ] **T025** SC-001/007：记录从 push 到线上生效的总时长与 deploy job 时长
- [ ] **T026** SC-005：部署日志能读到 commit sha；线上 chunk 名与 artifact 内一致

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
