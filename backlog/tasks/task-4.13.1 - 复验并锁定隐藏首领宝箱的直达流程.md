---
id: TASK-4.13.1
title: 复验并锁定隐藏首领宝箱的直达流程
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-27 12:46'
updated_date: '2026-11-27 12:57'
labels:
  - map
  - sts1-parity
milestone: m-8
dependencies: []
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/817'
  - docs/evidence/sts1-boss-treasure-20261127/README.md
parent_task_id: TASK-4.13
priority: medium
type: bug
ordinal: 226000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 情况
Fork A 的 develop 仍显示首领宝箱。主仓 develop 已接入隐藏及直达流程，需在当前基线补足回归和验收证据。
## 任务
锁定两幕地图的视觉终点、首领奖励确认与首领宝箱衔接。
## 边界
优先复用 #817，只修复复验所见的最小缺口。保留首领遗物、奖励、存档恢复与普通宝箱。仅在 Fork A 保存独立候选。
## 验收
记录同源地图画面和定向流程回归。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 第一、二幕只在地图上显示首领终点，宝箱节点及连线均隐藏，普通宝箱仍可见。
- [x] #2 确认离开首领奖励后直达宝箱，验证 16→17→18、33→34→35 以及比赛配置第 34 层结算。
- [x] #3 离线复验奖励、首领遗物、续局和普通宝箱，并保留可重现证据。
- [ ] #4 同一候选完成官方导入、当前 ready 与 PC、实体手机地图验收。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
基于主仓 develop 32a15219 在 Fork A 的 feat/sts1-map-boss-treasure 独立提交。复用 #817，通过 Map 快照恢复、双幕地图图元与现有奖励和跨幕夹具验证，发现缺口时才修生产代码。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
本轮先完成本项。共享看板当前五项 High，沿用 Medium 并按 Owner 指定顺序先实施。m-8 为产品体验里程碑，无发版版本绑定。

当前基线通过地图六个恢复点、奖励与两幕/全流程跨幕。复用已存在的生产逻辑，收敛测试夹具的首幕入场期限和恢复回归。Fork 候选供 Owner 集成，设备项待验。
<!-- SECTION:NOTES:END -->
