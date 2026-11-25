---
id: TASK-113.6
title: 实现全屏响应式布局与统一触控坐标
status: To Do
assignee:
  - '@Furinya'
created_date: '2026-11-25 20:50'
labels:
  - v2.2.0
milestone: m-8
dependencies: []
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-113
priority: medium
type: feature
ordinal: 194000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：固定 1280×720 等比缩放和背景外延无法充分使用宽屏。

任务：先核实千星奇域宿主、逻辑画布和安全区，形成统一布局与触控转换，再与两幕场景联合交付。

边界：背景与转场满屏，人物/卡牌/图标保持比例；布局优先复用共享边界。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 用宿主或实际 Simulator 记录视口/安全区/输入能力，并登记可实现的获审设计
- [ ] #2 16:9、19.5:9、20:9、21:9 实渲验收战斗、背景、HUD、两侧操作、手牌、触控及性能
<!-- AC:END -->
