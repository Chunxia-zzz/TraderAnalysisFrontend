# Specification Quality Checklist: 只在新版本检查通过后上线

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-04
**Feature**: [`spec.md`](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — spec 只写「什么时候允许上线、失败要怎样」，
      `needs` / `tar` / artifact / 目录名等全部下沉到 `plan.md`
- [x] Focused on user value and business needs — 每条 Story 都对应一个可感知的结果（不白屏、能回滚、知道线上是哪版）
- [x] Written for non-technical stakeholders — 用「线上变不变」「多久能退回上一版」表述
- [x] All mandatory sections completed — 背景 / 决策记录 / 5 条 Story / 边界 / FR / SC / Assumptions

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — 传输方式（服务器无 rsync）与是否做 symlink 切换两个歧义，
      用「读服务器实况 + 权衡记录」直接定案，未留待办
- [x] Requirements are testable and unambiguous — FR-001~012 每条都能对应一次可观察的验证
- [x] Success criteria are measurable — SC-001 ≤3min / SC-002 零字节改动 / SC-004 ≤2 条命令 / SC-007 ≤40s
- [x] Success criteria are technology-agnostic — 未出现 GitHub Actions / tar / artifact 字样（集中在 plan）
- [x] All acceptance scenarios are defined — 5 条 Story 共 11 个 Given/When/Then
- [x] Edge cases are identified — 产物缺失、密钥缺失、`.prev` 撑盘、首次无上一版、Cache-Control 双头、
      管道退出码、并发推送，共 7 条
- [x] Scope is clearly bounded — 决策记录明确排除 symlink 原子切换、多机/蓝绿、专用部署用户（后者列为后续可选）
- [x] Dependencies and assumptions identified — 6 条，含 runner 出网、root 密钥登录、Nginx 配置不动、单实例

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria — FR-001/002 → US1；FR-004/005/006/007 → US2；
      FR-005 → US3；FR-003 → US4；FR-009 → US5；FR-010/011/012 → 全局约束
- [x] User scenarios cover primary flows — 上线、失败兜底、回滚、追溯、单一入口
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- 本 feature 的前提是 **003 已生效**（`check` job + `dist-<sha>` artifact）。若 artifact 名或 `check` job 更名，
  004 的部署步骤会立即失败——这是刻意的耦合，部署本来就该依赖检查产物。
- SC-002 与 SC-006 都需要「改线上之前先记录 mtime」的对照实验，验证步骤写在 `tasks.md` Phase 7。
