#!/usr/bin/env bash
# 本地预检 —— 与 CI 完全同源。
#
# CI（.github/workflows/ci.yml 的 check job）不做任何额外动作，就是跑这个文件。
# 所以「本地通过 / CI 失败」只可能来自环境差异（Node 版本、lock 文件、依赖下载），
# 不会来自「两份配置写得不一样」。
#
# 用法：
#   bash scripts/check.sh            # 日常：node_modules 在就跳过安装
#   bash scripts/check.sh --fresh    # 模拟 CI：强制 npm ci 从零安装，验证锁文件
#
# 顺序按「便宜的前置、昂贵的靠后」，任一步失败立即退出（set -e）。
# 退出码即结论：0 = 可以 push。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FRESH=false
if [ "${1:-}" = "--fresh" ]; then
  FRESH=true
fi

step() {
  printf '\n\033[1m── %s ──\033[0m\n' "$1"
}

TOTAL_START=$(date +%s)

# ── 1/4 依赖安装（锁文件校验）──────────────────────────────────────────────
# npm ci 而不是 npm install：按 package-lock.json 精确装。这是唯一能抓出
# 「新增依赖却忘了提交锁文件」的环节——本地 node_modules 会把这个问题掩盖掉。
if [ "$FRESH" = true ] || [ ! -d node_modules ]; then
  step "1/4 依赖安装（npm ci）"
  npm ci
else
  step "1/4 依赖安装（跳过：node_modules 已存在；加 --fresh 强制重装）"
fi

# ── 2/4 代码规范 ──────────────────────────────────────────────────────────
step "2/4 代码规范（eslint）"
npm run lint

# ── 3/4 单元测试 ──────────────────────────────────────────────────────────
# 纯离线：不连后端、不启浏览器。任何测试去请求 5173/8000 都会在 CI 里红。
step "3/4 单元测试（vitest）"
npm run test:unit

# ── 4/4 生产构建 ──────────────────────────────────────────────────────────
# 注意：`chunks > 500 kB` 是已知技术债（AGENTS.md §5），构建仍算通过，不要因为告警判红。
step "4/4 生产构建（vite build）"
npm run build

TOTAL_END=$(date +%s)
printf '\n\033[32m✓ check 通过（lint / test / build），耗时 %ss\033[0m\n' "$((TOTAL_END - TOTAL_START))"
