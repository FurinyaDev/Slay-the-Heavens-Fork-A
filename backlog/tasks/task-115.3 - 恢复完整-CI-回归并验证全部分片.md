---
id: TASK-115.3
title: 恢复完整 CI 回归并验证全部分片
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:00'
updated_date: '2026-11-26 01:19'
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
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/1000'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/1002'
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

8a5f8681 的主仓 Quality 与 Licenses 排队近 23 分钟，未分配 Runner，随后由 develop 并发机制取消。实际最新源码 454b589793c8d3a171ccbcaee0db1c809136c683 重新入队，Quality 45728830817、Licenses 45728830880。完整 CI 仍待验。

#1000 接续 #929 的 LF/CRLF 与奖励回放，精确 454b5897 基线、合并树 de55f80e。独立源码评审 6066965023 及 Fork A 45729134666 Advisory Quick 通过。原始 51 个历史来源和现行校验匹配。主仓完整 Full、现行 Linux 预算和 #929 的独立调度范围仍待验。

三项官方可读性断言按现行 #942 固定字号与 #940 新增隐藏面恢复，候选 #1002 精确基于 454b5897。独立复跑 11/12，Fork Advisory Quick 45732038443 通过。原架构历史回放仍有多个关联来源失配，保持原 60 秒和档案。完整 Full 待验。

逐一比对 5e318736 与实际主仓 454b5897，899 个 JS、1,426 个 Lua 的发现路径完全相同，排程代码、计时表和 Quality 工作流的 Git blob 相同。Linux 原预测 1,205,366 ms，理想均分下限 1,205,362.67 ms，继续保留 1,200,000 ms 阈值与 60,000 ms 预留。需要完整 Hosted 文件计时才能处理估算来源。

01:14 UTC 核对主仓队列，454b5897 的实际 Quality 45728830817 和 Licenses 45728830880 均未分配 Runner。较早的真 Hosted 运行 45705324299 和 45704932845 分别仍有两项和一项分片执行，分片开始时间为 01:05 至 01:09 UTC。保留当前主仓排队，等待同一源码的原始证据。

从较早的 Hosted 45705324299、45704932845 取回 8 条完整文件摘要。两份不依赖媒体的目标测试 check-release-text 与 release-metadata 的历史工作负载和当前一致，最大观测分别为 21.297812 ms、13.830118 ms。即使用这两项替换各 10,000 ms 的回退估计，原排程总缺口仍约 60.48 秒。记录为历史可比计时，不调整权重。其余目标缺少可用现行证据，日志摘要仅覆盖 GitHub 解码文本。
<!-- SECTION:NOTES:END -->
