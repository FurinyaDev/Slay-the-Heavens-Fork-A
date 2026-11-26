---
id: TASK-115.3
title: 恢复完整 CI 回归并验证全部分片
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:00'
updated_date: '2026-11-26 00:05'
labels:
  - v2.2.0
milestone: m-8
dependencies: []
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/929'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/970'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/971'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/972'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/973'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45630976779'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/976'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/979'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/980'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/996'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/997'
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-115
priority: high
type: task
ordinal: 210000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：v2.1.1 Hotfix 的 Full 有失败、取消及跳过分片，已有多条接续 PR。

任务：取回原始失败记录，逐项区分真实缺陷、夹具失配、历史 ID 与其他工程故障。

边界：接续 #929、#970–973；保留测试数量、断言、覆盖和门槛。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 每项原始失败有复现、归因、接续记录和修后结果；取消和跳过分片经 Full 重跑
- [ ] #2 恢复后的 develop 完整 CI 全绿，独立评审核对分片与断言；冻结候选另按 TASK-115.13 执行
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已派发恢复 Full。原始运行含 19 个失败、16 个取消分片或汇总、1 个跳过及 2 个成功；失败日志已取回，逐项归因中。

四条现有测试 PR 由 #976 合并接续。#979 通过 126 项固定源向量，相关 GitHub Fork Quick JS 93/93；同一 Quick 后续 Lua 失败保留。#980 共享预览 PNG 真实制品生产、恢复与负对照通过定向验证。完整 Hosted Full 和 #929 继续。

#996 来源与夹具修复已合入 develop ecce2251ef9dcb9542488ac92ba31de5a62d438a。原 Release Bootstrap 定向通过，899 个 JS、1,426 个 Lua，独立评审 6066337165 和精确 Fork Quick 通过。Linux 原计划为 1,205,366 ms，高于 1,200,000 ms；现行架构旧回执仍待修复。主仓 Full 45720732047 排队。验收项保持未勾。

现行架构与样式回放 #997 已合入 develop 060b13c612bb3d4ad36044939f11ca3f5b2929c7。独立评审 6066545524 及原定向 6/7 通过，原 Linux 预算仍高 5,366 ms。Fork Quick 45722483438 两次在 Git LFS 素材恢复失败，测试步骤未运行。精确主仓 Quality 45723458426、Licenses 45723458427 排队，验收项继续待验。

060b13c6 的主仓 Quality 与 Licenses 在变更前均未分配 Runner，排队约 21 分钟后由 develop 并发机制取消。#998 后同一工作流入队，精确 8a5f86813e993a9b8cd85dd8016a2943d4a7c629，Quality 45726046674、Licenses 45726046811。
<!-- SECTION:NOTES:END -->
