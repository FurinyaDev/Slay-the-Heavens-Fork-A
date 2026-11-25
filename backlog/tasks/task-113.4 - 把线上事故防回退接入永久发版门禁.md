---
id: TASK-113.4
title: 把线上事故防回退接入永久发版门禁
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-25 20:50'
updated_date: '2026-11-25 20:54'
labels:
  - v2.2.0
milestone: m-8
dependencies: []
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/959'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/966'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/968'
  - docs/backlog-details/TASK-100.md
  - docs/backlog-details/TASK-4.21.md
  - docs/PLATFORM_LOAD.md
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-113
priority: high
type: task
ordinal: 192000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：v2.1.1 修复版已上线，#959、#966、#968 及既有性能/平台机制已有实现与对照。

任务：接续 TASK-100、TASK-4.21，复用负对照和六档资源配置，接入日常 CI 和冻结发布流程。

边界：沿用门槛和正式有声美术配置。证据不可比就登记实际差异。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 覆盖已确认根因及有效负对照，轻量持续检查和冻结候选完整门禁可重复执行
- [ ] #2 在明确的正式配置接续样本验证同工作负载、六档实限和极端档退化恢复，独立评审核对可执行门禁、基线和证据字段；最终候选完整验收归 TASK-113.13
<!-- AC:END -->
