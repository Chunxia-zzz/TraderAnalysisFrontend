# specs/ —— 事前意图（Spec-Driven Development 产物）

> **这里放"我打算做什么"**。代码实际是什么样在 `docs/architecture.md`，改过什么在 git log + `README.md`。
>
> | 目录 | 时态 | 回答 |
> |---|---|---|
> | `.specify/memory/constitution.md` | 恒常 | 什么不能做 |
> | `specs/<feature>/`（本目录） | 未来 | 打算做什么、怎么验收 |
> | `docs/architecture.md` | 现在 | 代码实际是什么样 |
>
> 后端仓库 `F:\TraderAnalysis` 有同一套结构。**接口契约以后端为准。**

## 目录命名

```
specs/001-<ascii-slug>/
├── spec.md      做什么（用户场景 + 验收标准），不写技术方案
├── plan.md      怎么做（组件/数据流/交互），含 Constitution Check
└── tasks.md     拆成可执行任务
```

- 编号从 001 递增，**不复用、不回收**。
- slug **必须 ASCII**。用 `--short-name` 指定，中文留在正文：

  ```bash
  bash .specify/scripts/bash/create-new-feature.sh --short-name "position-industry-group" "给持仓页增加按行业分组"
  ```

  不传 `--short-name` 时中文描述会生成中文目录名，Windows + git 下容易踩编码问题。

## 三件套的边界

**`spec.md` 只写"做什么"和"怎么算做完了"**，不写技术选型：

- ✅ 用户场景与优先级、页面行为、空数据/边界如何处理、验收标准（可度量）
- ❌ 用哪个库、组件怎么拆、接口怎么封装

**`plan.md` 写"怎么做"**，必须包含 **Constitution Check**：逐条对照前端 constitution 的 6 条原则，
勾选或写明不适用的理由。**不适用也要写一行**，整段省略等于没检查。

**`tasks.md`** 每个任务要能独立验证（例如"温度页在 data:null 时展示 message 文案"，
而不是"实现温度页"）。

## 跨仓库变更（最常见的情况）

前端改动若需要后端配合，**顺序不能反**：

1. 先去 `F:\TraderAnalysis` 建 spec、实现接口
2. 前端 spec 只写：**消费哪个端点、哪个字段、字段缺失时怎么显示**
3. 前端 `plan.md` 记录依赖的后端 commit 或接口版本

反过来的做法（前端先按想象写、后端再补）会产生大量返工，且文档对不上。

## 硬约束

- 不得写入真实账户标识、资产数值、持仓数量与成本、`.env` 真实值、token。
- 不得写入仓位意图（目标权重、标定区间、分批比例、加仓闸门）。`/position`、`/allocation`
  渲染的是运行时数据，spec 只描述字段来源。
- 示例数据必须虚构，并标注"示例数据为虚构值"。

详见 `.specify/memory/constitution.md` §二。

## 生命周期

1. 新建 → `spec.md` 状态 `Draft`
2. `clarify` 消歧后 → `Clarified`
3. `plan` + `tasks` 完成 → 可实施
4. 实现并验收脚本通过、`converge` 到 Converged → 状态改 `Implemented`
5. **不删除**。功能下线时在 `spec.md` 顶部加 `> ⚠️ 已下线（日期）：原因`，保留目录。

历史目录不重写。当初写错了，加勘误行，不改原文 —— 与 `README.md` 里既有的勘误做法一致。

## 什么时候可以不走这里

豁免：文案更正、样式微调（不改语义）、单行 bug、版本号、注释。

判断标准与完整清单见 constitution §一.VI。
