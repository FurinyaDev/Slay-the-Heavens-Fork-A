---
id: TASK-115.10
title: 集成已开发的产品体验候选
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:02'
updated_date: '2026-11-26 03:45'
labels:
  - v2.2.0
  - release-scope
milestone: m-8
dependencies: []
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/909'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/932'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/933'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/924'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/958'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/964'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/965'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/989'
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-115
priority: medium
type: task
ordinal: 222000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：已有音频、牌组、弹窗、选角、事件、商店、战斗详情等 PR。

任务：核对线上与 develop 实际差异，接续 #909、#932、#933、#924、#958、#964、#965。

边界：按文件重叠和产品依赖排序，复用已有实现。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 每个 PR 有合入或归档理由、固定来源和验证；已合更新通过相应定向验收，由 TASK-115.13 联合复验
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-26 必要切片为 #964 及 #924 的未继承差异。#989 只在低成本时合入。#932、#933、#909 的原引用继续保留，延期登记见 TASK-115.12。
<!-- SECTION:NOTES:END -->
