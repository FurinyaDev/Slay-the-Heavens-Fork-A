---
id: TASK-4.13.2
title: 按原版地图量测强化首领徽记与留白
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-27 12:46'
updated_date: '2026-11-27 13:04'
labels:
  - map
  - sts1-parity
milestone: m-8
dependencies: []
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/817'
  - docs/evidence/sts1-boss-emblem-20261127/README.md
parent_task_id: TASK-4.13
priority: medium
type: enhancement
ordinal: 227000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 情况
现有首领徽记已换成对应图库图标，但布局需要实测原版截图的尺度、位置、入场连线和留白。
## 任务
以原版画面量测标定本作首领徽记，保留对应首领的项目美术。
## 边界
仅在 Fork A 保存独立候选，保持原命中逻辑与平台负载预算。
## 验收
保留可重现的原版量测、前后对照及定向回归。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 以原版截图量化普通节点比例、徽记构图和连线留白，并记录本作前后结果。
- [x] #2 正式两幕六个首领沿用本作对应美术，徽记极限状态无裁剪，图元池和点选热区保持原合同。
- [ ] #3 同一候选完成官方导入、当前 ready 与 PC、实体手机触控及负载验收。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
基于同一 develop 在 Fork A 的 feat/sts1-map-boss-emblem 独立提交。量测原版地图终点，复用项目六款首领图，验证视觉尺度、上缘、末排与虚线留白、控制树和鼠标触屏。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Cornell 原图取样约占画纸宽度 29.6%；本作控件 9.92%→30.07%，保持 126 方形命中区。两幕六款图库 ID 与键鼠/触摸共 12 个组合已离线验证。设备和官方负载待验，证据附对照图与复现入口。
<!-- SECTION:NOTES:END -->
