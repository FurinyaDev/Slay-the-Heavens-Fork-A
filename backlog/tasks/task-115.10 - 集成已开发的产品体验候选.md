---
id: TASK-115.10
title: 集成已开发的产品体验候选
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:02'
updated_date: '2026-11-26 01:17'
labels:
  - v2.2.0
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
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/992'
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
#992 接续 #958，合入 develop 114a5c0b739ad8cccbc99e59fe7ba4112014d3cf。独立评审 6066095429，原生事件定向 1/1，Fork Quick 45716478689 通过。正文和长选项的实机字形、整合交互随正式候选验收。

#924 的现行源码候选 846c9eff35175585af3b1a8a24f7f303f8b4ef64 基于实际主仓 454b5897，获独立局部复审。三个产品文件与旧候选 6b52326d 完全一致。选角构建、主菜单启动、暂停重开和失败路径使用原 30/60 秒限制复跑。三处现行回放入口拒绝旧源码及重读时回退，真实历史入口和隔离复制仍按原规则执行。候选留在本地，完整 CI、主仓接续与设备验证待验。
<!-- SECTION:NOTES:END -->
