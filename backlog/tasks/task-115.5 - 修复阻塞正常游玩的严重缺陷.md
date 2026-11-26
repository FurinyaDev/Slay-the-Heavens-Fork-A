---
id: TASK-115.5
title: 修复阻塞正常游玩的严重缺陷
status: To Do
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:00'
updated_date: '2026-11-26 03:45'
labels:
  - v2.2.0
  - release-scope
milestone: m-8
dependencies: []
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-115
priority: high
type: bug
ordinal: 212000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：需要用 v2.1.1 正式版、当前 develop 及原始回归定位玩法阻塞。

任务：复用已有缺陷任务，记录可复现的严重问题，修复并验证核心玩家路径。

边界：夹具、历史 ID 及非阻塞缺陷沿各自接续任务处理。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 正式配置中已确认的阻塞缺陷逐条有回归和独立复验，覆盖正常完成两幕的玩家路径
<!-- AC:END -->
