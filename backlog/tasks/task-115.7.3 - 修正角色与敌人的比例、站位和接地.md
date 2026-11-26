---
id: TASK-115.7.3
title: 修正角色与敌人的比例、站位和接地
status: To Do
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:02'
updated_date: '2026-11-26 03:45'
labels:
  - v2.2.0
  - release-scope
milestone: m-8
dependencies:
  - TASK-115.7.2
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-115.7
priority: medium
type: enhancement
ordinal: 217000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：角色和敌人与背景地面透视脱节。

任务：把脚底锚点、深度层和主体比例用于实际场景，按参照实验决定阴影，并协调统一响应式布局。

边界：保留角色身份、可读性及图元预算。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 实渲覆盖两幕、不同体型、不同敌人数量及宽屏，接地、间距、遮挡和交互可读性经独审确认
<!-- AC:END -->
