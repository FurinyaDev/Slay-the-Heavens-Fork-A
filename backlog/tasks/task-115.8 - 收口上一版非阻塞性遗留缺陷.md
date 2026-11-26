---
id: TASK-115.8
title: 收口上一版非阻塞性遗留缺陷
status: To Do
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:02'
updated_date: '2026-11-26 00:19'
labels:
  - v2.2.0
milestone: m-8
dependencies: []
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-115
priority: medium
type: task
ordinal: 220000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：Hotfix 期间暂缓的小缺陷和现有任务需要回到当前 develop 核对。

任务：按线上对照与实际复现复用既有任务，记录修复和验收归属。

边界：严重玩法阻塞交对应 High 任务；历史测试工程故障交 Full 回归任务。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 遗留项明确现状和处置，纳入本版的修复通过定向测试与独审
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
两幕接地试制复验看到飞行状态图标为问号。独立诊断在原生桌面和触屏控件复现，飞行层数 3→2→1 与落地移除正常。唯一已有可辨认的羽翼图标已用于无实体状态，独立飞行图形待批准；当前阶段不与接地状态机混合。
<!-- SECTION:NOTES:END -->
