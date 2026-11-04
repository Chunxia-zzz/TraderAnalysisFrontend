# Implementation Plan: 只在新版本检查通过后上线

**Branch**: `004-deploy-on-green` | **Date**: 2026-11-04 | **Spec**: [`spec.md`](./spec.md)

**Input**: Feature specification from `specs/004-deploy-on-green/spec.md`

## Summary

在现有 `ci.yml` 里加一个 `deploy` job：`needs: [check]`、仅 `push main`、只有一条 `concurrency` 分组。
它不做构建——下载 `check` 上传的 `dist-<sha>` artifact，用 `tar | ssh` 铺到服务器暂存目录，
校验通过后 `mv` 交换线上目录，再做 HTTP 健康检查；失败自动换回上一版。
同时停用服务器 hook 的自动部署，让「上线」只有一条路径。

## Technical Context

**Language/Version**: YAML（GitHub Actions）+ 服务器侧 shell（Alibaba Cloud Linux 3，bash）

**Primary Dependencies**: 无新增仓库依赖。服务器侧只用 `tar` / `mv` / 已有 Nginx；
runner 侧用 `actions/download-artifact@v7` + 系统 `ssh` / `tar` / `curl`

**Storage**: 服务器目录 `/var/www/trader-frontend`（线上）、`.new`（暂存）、`.prev`（回滚锚点）

**Testing**: 部署后 HTTP 健康检查（200 / 挂载点 / `Cache-Control` 唯一 / 资源可访问）；
故障注入（检查红、产物缺失、健康检查失败）由 scripts/deploy-probe 手工执行并留档

**Target Platform**: GitHub 托管 runner（ubuntu-latest）+ 单台 ECS

**Project Type**: 静态站点发布流水线

**Performance Goals**: 部署环节 ≤ 40s；从 push 到线上生效 ≤ 3min

**Constraints**:
- 服务器**没有 rsync**，且不为此安装软件包 → 用 `tar` 管道
- 服务器**不再参与构建**（不再 `npm ci`）
- 不改 Nginx 配置（root 仍是固定路径，不做 symlink 切换）
- 私钥只经 Secrets，不入库、不进日志

**Scale/Scope**: 单机、单实例、个人站点；产物约 3.3 MB

## Constitution Check

| 原则 | 判定 | 说明 |
|---|---|---|
| I. 空数据不是错误 | ✅ 不冲突 | 不涉及数据流；健康检查只看 HTTP 状态与静态资源，不解释接口响应体 |
| II. 两套信号体系在前端分开 | ✅ 不冲突 | 不改任何页面与数据请求；部署的是 003 已通过测试的同一份产物 |
| III. 口径与配色固化 | ✅ 不冲突 | 不改代码；健康检查的 `Cache-Control` 断言正是 constitution §三「不要用 expires」的机器化 |
| IV. 一个图表组件 | ✅ 不冲突 | 不触碰组件 |
| V. 文档与代码必须同时为真 | ✅ 适用 | README/AGENTS 增加「上线只由流水线触发」与回滚命令；003 spec 顶加一行「部署部分由 004 取代」（不改原文）。后端仓库 `docs/guides/ops/README.md` 的部署链路描述将加勘误（跨仓库，单独提交、不代推） |
| VI. 规范先行 | ✅ 满足 | 本 spec 先于 workflow 改动；因涉及「改部署路径 + 引入密钥」，属 constitution VI 明列的须写规范范围 |
| §二 安全与数据边界 | ✅ 满足（本 feature 的关键一条） | 部署私钥仅存于 GitHub Secrets；仓库内只出现 `${{ secrets.DEPLOY_SSH_KEY }}` 变量名；文档不记录私钥内容；服务器追加的是**公钥** |
| §三 质量门 | ✅ 强化 | 部署前必须 `check` 绿；部署后额外做健康检查，等于给上线加了一道 003 之外的门 |

无违规项 → Complexity Tracking 留空。

## 技术方案

### 1. 流水线编排

```yaml
jobs:
  check:      # 003 已有，产出 dist-<sha>
  security:   # 003 已有，gitleaks
  deploy:
    needs: [check]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    concurrency: { group: deploy-main, cancel-in-progress: false }   # FR-011 串行化
    environment: production                                          # 可选：便于在 UI 上看发布记录
    steps:
      1. download-artifact  name: dist-${{ github.sha }} → ./dist
      2. 断言 dist/index.html 存在（缺失即失败，FR-004）
      3. 注入 SSH key（~/.ssh/deploy, chmod 600）+ ssh-keyscan 写入 known_hosts
      4. tar 管道上传到 /var/www/trader-frontend.new
      5. 远端校验 + 目录交换（保留 .prev）
      6. HTTP 健康检查（首页 200 / <div id="app"> / Cache-Control 恰好 1 / asset 200）
      7. if: failure() → 调用回滚
```

**为什么第 7 步用 `if: failure()` 而不是 `try/catch`**：GitHub Actions 没有 try/catch，失败后
后续正常步骤会被跳过，但 `if: failure()` 的步骤仍会执行——这是唯一的补偿点。

### 2. 服务器侧动作（全部幂等）

```bash
# 上传（runner → 服务器），写入只发生在暂存目录
tar -czf - -C dist . | ssh root@... 'set -e
  rm -rf /var/www/trader-frontend.new
  mkdir -p /var/www/trader-frontend.new
  tar -xzf - -C /var/www/trader-frontend.new'

# 校验 + 切换
ssh root@... 'set -e
  test -f /var/www/trader-frontend.new/index.html
  rm -rf /var/www/trader-frontend.prev
  if [ -d /var/www/trader-frontend ]; then mv /var/www/trader-frontend /var/www/trader-frontend.prev; fi
  mv /var/www/trader-frontend.new /var/www/trader-frontend'

# 回滚（失败时自动、也可人工）
ssh root@... 'set -e
  test -d /var/www/trader-frontend.prev || { echo "无上一版可回滚"; exit 1; }
  rm -rf /var/www/trader-frontend
  mv /var/www/trader-frontend.prev /var/www/trader-frontend'
```

三个「已踩过」的细节：

- **`test -d` 守卫**：首次部署没有 `.prev`，`mv` 会失败；回滚同理，宁可报「无上一版」也不要删站点。
- **`set -o pipefail`**：`tar | ssh` 若不加，tar 的失败会被 ssh 的 0 退出码吞掉（假绿）。
- **写入只在 `.new`**：任何失败都不影响线上目录，这是「不留残局」的结构性保证，而不是靠 catch。

### 3. 密钥与权限

| 项 | 位置 | 说明 |
|---|---|---|
| 私钥 | GitHub → Settings → Secrets → `DEPLOY_SSH_KEY` | ed25519、无 passphrase、仅供部署 |
| 公钥 | 服务器 `/root/.ssh/authorized_keys` 追加一行 | 带注释 `gh-actions@trader-frontend` 便于日后吊销 |
| 已知主机 | runner 运行时 `ssh-keyscan` → `known_hosts` | 不落库；若担心 MITM 可改为把主机公钥存成 secret |
| 最小权限 | 仍是 root | 现有部署路径即 root；改专用用户的收益低于本次范围，记录为后续可选优化 |

### 4. 停用服务器 hook

保留原 hook 备份（`post-receive.bak-20261104`），新 hook 只打印说明并退出 0：

```bash
#!/bin/bash
echo "==> [前端] 部署已移交给 GitHub Actions（specs/004-deploy-on-green）"
echo "    本推送只更新 bare repo，不再构建、不再覆盖线上。"
exit 0
```

**为什么不是直接删 hook**：删掉后想回退就得重写；备份 + 说明块同时满足「可回退」与「不静默」。

## Project Structure

```text
.github/workflows/ci.yml        # 改：新增 deploy job + job 级 concurrency
specs/004-deploy-on-green/
├── spec.md
├── plan.md
├── checklists/requirements.md
└── tasks.md
README.md                       # 改：上线方式、回滚命令、推服务器不再上线
AGENTS.md                       # 改：§5 部署约定、§9 命令
docs/architecture.md            # 改：§9.3 生产部署（部署链路图）
```

服务器侧（不在仓库内，但必须与文档一致）：`/opt/git/trader-frontend.git/hooks/post-receive`。

## 分阶段交付

| 阶段 | 内容 | 是否本次 |
|---|---|---|
| D1 | deploy job + 目录交换 + 健康检查 + 自动回滚 | ✅ |
| D2 | 停用服务器 hook，单一部署路径 | ✅ |
| D3 | 人工回滚命令 + 文档 | ✅ |
| D4 | 专用部署用户（非 root）、known_hosts 固化到 secret | ❌ 记录为后续可选 |
| D5 | 多机/蓝绿/symlink 原子切换 | ❌ 单机无收益 |
