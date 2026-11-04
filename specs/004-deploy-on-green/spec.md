# Feature Specification: 只在新版本检查通过后上线（push → CI → CD）

**Feature Branch**: `004-deploy-on-green`

**Created**: 2026-11-04

**Status**: Implemented — 远端全链路已跑通（run 41840934969，57s 全绿；deploy 22s）。验证记录见 `tasks.md`

**Input**: User description: "常理来说，应该是 push→CI→CD 的流程，也就是完成自动推代码、测试、部署，只要分支合到 main，应用就是新版本。使用方案A的话，我需要做什么额外的操作吗？如果不需要，你直接按照A方案，用spec范式把这个方案全部落地"

## 背景

003 只解决了「体检」，没解决「谁有权决定上线」。当前真实链路是**两条并行支路**，没有因果关系：

```
git push
  ├─→ GitHub        → ci.yml（lint/test/build）   ← 事后体检，绿不绿都不影响下面
  └─→ 服务器 bare repo → post-receive hook：
                          git checkout -f main
                          npm ci && npm run build
                          rm -rf /var/www/trader-frontend/*
                          cp -r dist/* /var/www/trader-frontend/
```

三个具体问题（均已在服务器核对，不是推测）：

1. **部署绕开了门禁**：CI 还在装依赖时，线上已经被覆盖。坏代码照上。
2. **hook 没有 `set -e`**，且顺序是「先删线上、再拷产物」。Vite 构建前会清空 `dist/`，
   所以构建中途失败时 `dist/` 为空 → `rm -rf` 已清空线上 → `cp` 失败 → **白屏**。
3. **构建发生在服务器**：每次 push 让服务器跑 `npm ci`（3 分钟），依赖服务器能连 npm，
   且线上产物与 CI 验证过的产物**不是同一份**（CI 的 dist 只上传 artifact，没被使用）。

本 feature 把这三条一起改掉：**让 CI 产出的那一份 dist 成为唯一上线来源，并且只有检查通过才允许上线。**

## 决策记录（已与用户确认）

| 问题 | 决定 | 理由 |
|---|---|---|
| 部署编排位置 | **GitHub Actions 里新增 `deploy` job**，`needs: [check]` + 仅 `push main` | 部署成为 CI 的下游，而不是并行的另一条路 |
| 线上产物来源 | **复用 `check` 上传的 `dist-<sha>` artifact**，不在部署阶段重新构建 | 「CI 验证过的」与「上线的」必须是同一份字节；也让部署耗时从 3 分钟降到 ~20 秒 |
| 传输方式 | **`tar` 经 SSH 管道**，不用 rsync | 服务器（Alibaba Cloud Linux 3）**没有 rsync**。为了不引入服务器软件依赖，用 `tar -czf - | ssh 'tar -xzf -'` |
| 切换方式 | 先铺到 `trader-frontend.new` → 校验 → `mv` 交换 → 保留 `trader-frontend.prev` | 不动 Nginx 配置（root 仍是固定路径），失败可原地回滚 |
| 服务器 hook | **停用其自动部署逻辑**（保留备份） | 两条部署路径并存 = 门禁形同虚设 |
| 服务器是否还要 npm | **不再需要** | 部署只解包静态文件；`/opt/trader-frontend` 的旧构建目录保留但不再被调用 |
| 是否做原子 symlink 切换 | **不做** | 需改 Nginx root 为 symlink，属额外风险；`mv` 目录的毫秒级窗口对个人站点可接受 |
| 是否做多机/蓝绿 | **不做** | 单机单实例，收益为零 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 合到 main 就是新版本，但必须先过检查 (Priority: P1)

开发者把代码推到 `main`（或 PR 合并进 `main`），**不需要再做第二次推送**。
几分钟后线上就是这次提交的版本——前提是 lint / 单测 / 构建全绿。
如果检查红了，线上**一个字节都不变**。

**Why this priority**: 这是需求原话「只要分支合到 main，应用就是新版本」，同时保持门禁有意义。

**Independent Test**: 推一个正常提交，等流水线结束，访问线上首页并核对引用的 chunk 指纹与本次构建一致；再推一个故意让 lint 失败的提交，核对线上文件 mtime 未变。

**Acceptance Scenarios**:

1. **Given** `main` 收到一次通过全部检查的推送，**When** 流水线跑完，**Then** 线上首页返回 200，且页面引用的 JS 文件名与本次构建产物一致
2. **Given** `main` 收到一次 lint 失败的推送，**When** 流水线跑完，**Then** `deploy` job 状态为 skipped，线上文件修改时间不变
3. **Given** 一次 PR 触发的运行，**When** 检查通过，**Then** **不发生部署**（只有进 `main` 才部署）

---

### User Story 2 - 部署失败不留残局 (Priority: P1)

部署过程中任何一步出错（文件没传完、产物缺 `index.html`、切换失败、健康检查不过），
线上必须保持**上一版可访问**，而不是白屏或半新半旧。

**Why this priority**: 现有 hook 的「先删后拷」已经具备让站点全白的条件，这是本次要修掉的主要风险。

**Independent Test**: 临时把健康检查指向一个不存在的路径触发失败，观察自动回滚后首页仍是旧版且 200。

**Acceptance Scenarios**:

1. **Given** 新产物已铺到临时目录但校验失败，**When** 部署中止，**Then** 线上目录未被替换，首页仍返回旧版
2. **Given** 目录已切换但健康检查失败，**When** 回滚执行，**Then** 上一版目录被换回，首页 200 且内容为旧版
3. **Given** 传输中途 SSH 断开，**When** 部署失败，**Then** 线上目录未被触碰（写入只发生在临时目录）

---

### User Story 3 - 一条命令回到上一版 (Priority: P2)

线上出现问题时，能立刻退回上一版，不需要重新构建、不需要找旧 commit 重推。

**Why this priority**: 上线自动化之后，出问题的止血速度必须不低于手动部署时代。

**Independent Test**: 在服务器上执行回滚命令，确认首页回到上一版内容。

**Acceptance Scenarios**:

1. **Given** 刚完成一次部署，**When** 在服务器执行回滚命令，**Then** 线上恢复为上一版且返回 200
2. **Given** 尚未部署过第二版，**When** 查看回滚目录，**Then** 明确提示「无上一版可回滚」而不是把站点删掉

---

### User Story 4 - 线上版本可追溯到某次提交 (Priority: P2)

看到线上问题报告时，能回答「线上跑的是哪个 commit 的产物」。

**Why this priority**: 自动化部署最怕「不知道什么时候变成这样的」。artifact 名带 sha 就是为此。

**Independent Test**: 比较线上 `assets/` 下某个文件名与流水线 artifact 内的同名文件哈希。

**Acceptance Scenarios**:

1. **Given** 一次成功部署，**When** 查看运行页与部署日志，**Then** 能读到本次 commit sha
2. **Given** 线上 `index.html`，**When** 查看其引用的 chunk 名，**Then** 能在对应 sha 的 artifact 中找到同名文件

---

### User Story 5 - 只有一条部署路径 (Priority: P3)

把代码推到服务器 bare repo 不再触发构建与上线；部署只由流水线执行。

**Why this priority**: 两条路径并存时，任何人（包括未来的自己）都可能绕过门禁。

**Independent Test**: 向 bare repo 推一个提交，确认线上无变化、hook 输出说明「部署已移交流水线」。

**Acceptance Scenarios**:

1. **Given** 服务器 hook 已停用，**When** 向 bare repo 推送，**Then** 不构建、不覆盖线上，hook 打印移交说明
2. **Given** 需要手动应急上线，**When** 查看文档，**Then** 能找到「重跑最近一次成功运行」或「回滚」两种手段

---

### Edge Cases

- **artifact 缺失或为空**：`deploy` job 必须在解包前断言 `index.html` 存在，否则中止。
- **SSH 密钥未配置**：job 必须**明确报错**（提示缺 `DEPLOY_SSH_KEY`），不能静默成功。
- **服务器磁盘被 `.prev` 撑满**：只保留 1 个上一版，切换前先删旧 `.prev`。
- **首次部署时不存在上一版**：`mv` 缺失目录会失败，必须用条件判断跳过。
- **`Cache-Control` 头重复**：constitution §三 明令「不要用 `expires`」，健康检查要断言 `index.html`
  的 `Cache-Control` **恰好 1 个**，防止配置回归导致双头。
- **NDJSON/tar 管道退出码**：`tar | ssh` 的管道要 `set -o pipefail`，否则传输失败会被吞掉。
- **并发推送**：连续两次推送可能同时进入 deploy，后完成的覆盖先完成的。deploy job 需串行化（不取消正在跑的）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 部署 MUST 作为 CI 的下游执行，前置条件为「`check` job 成功」，MUST NOT 与检查并行
- **FR-002**: 部署 MUST 只在 `main` 分支的 `push` 事件发生；PR 与其它分支 MUST NOT 部署
- **FR-003**: 部署 MUST 使用 `check` 产出的同一份 `dist` artifact，MUST NOT 在部署阶段重新安装依赖或重新构建
- **FR-004**: 部署 MUST 先写入临时目录并在其中校验 `index.html` 存在，校验通过后才切换线上目录
- **FR-005**: 部署 MUST 保留上一版目录（1 个），供回滚使用
- **FR-006**: 部署失败时 MUST 自动恢复到上一版，并让 job 失败（不允许「部署失败但显示成功」）
- **FR-007**: 部署后 MUST 做健康检查：首页 200、页面挂载点存在、`index.html` 的 `Cache-Control` 头恰好 1 个、至少一个带哈希的静态资源 200
- **FR-008**: 服务器 MUST NOT 需要新增软件包（无 rsync、无 Node 运行时参与部署）
- **FR-009**: 服务器端 post-receive hook MUST 停止自动构建与部署，并向推送者说明部署已移交流水线
- **FR-010**: SSH 私钥 MUST 只通过 GitHub Secrets 注入，MUST NOT 出现在仓库、日志或文档中
- **FR-011**: 同一时刻 MUST 只有一个部署在执行（串行化，不互相取消）
- **FR-012**: `README.md` / `AGENTS.md` MUST 记载：上线只由流水线触发、回滚命令、以及「推服务器不再上线」

### Key Entities

- **发布产物（Release artifact）**：一次 `check` 成功产出的 `dist`，以 commit sha 命名，是上线的唯一来源。
- **线上目录（Live dir）**：`/var/www/trader-frontend`，Nginx 静态根，内容唯一来源是发布产物。
- **暂存目录（Staging dir）**：`/var/www/trader-frontend.new`，接收上传并先做校验。
- **上一版（Previous dir）**：`/var/www/trader-frontend.prev`，回滚锚点，仅保留 1 份。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 从推送到线上生效（含检查）总时长 ≤ **3 分钟**
- **SC-002**: 推送一个检查失败的提交后，线上文件的修改时间**未变化**（0 字节改动）
- **SC-003**: 注入一次健康检查失败后，线上仍是**上一版**且首页 200（自动回滚生效）
- **SC-004**: 回滚操作 ≤ **2 条命令**，且不需要重新构建
- **SC-005**: 部署日志与运行页都能读到本次 commit sha
- **SC-006**: 推送到服务器 bare repo 后，线上文件修改时间**未变化**
- **SC-007**: 部署环节耗时 ≤ **40 秒**（证明没有在服务器重新安装依赖）

## Assumptions

- GitHub Actions 的托管 runner 能直连服务器 22 端口（当前本地可直连，且 003 的 CI 已正常出网）
- 服务器 root 账户可用密钥登录（现有 `authorized_keys` 已有 1 把用户密钥，本次追加 1 把部署专用密钥）
- Nginx 静态根保持 `/var/www/trader-frontend` 不变；本 feature 不改任何 Nginx 配置
- 单机单实例、个人站点：允许目录切换存在毫秒级不连续窗口
- 现有 `dist-<sha>` artifact 保留 7 天，回滚优先用 `.prev`，超过 7 天需重跑旧 sha 的流水线
