---
id: TASK-115.7.2
title: 交付第一幕与第二幕正式战斗背景
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:02'
updated_date: '2026-11-26 03:52'
labels:
  - v2.2.0
  - release-scope
milestone: m-8
dependencies:
  - TASK-115.7.1
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/1007'
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-115.7
priority: medium
type: feature
ordinal: 216000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：两幕正式场景的透视、层次和明暗需与战斗主体协调。

任务：复用 TASK-4.2、TASK-2.1 与 TASK-103 已有资产和研究；按确认参数制作两幕项目背景。

边界：守住现有图元、容量和性能预算，宽屏覆盖和主体区域可读。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 两幕产物、批准设计和 Simulator 实渲对照可追溯，裁切/转场覆盖稳定
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 用两幕原版测量参数对齐场景轮廓、战斗面与宽屏裁切。
2. 在正式 Simulator 核对背景切换、图元池复用和前后实渲。
3. 与 TASK-115.7.3 对同一候选验收。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
现行联合稿实图中，第二幕普通敌人 y470–478 踩在均匀石色，现有较大的东石面素材集中在 HUD 下方。隔离实验复用原第二幕石面和接缝，沿承重带改用错缝与低反差。正式生成对照仅生成模块 abyss_chapter_battle_scene_data.lua 有差，槽位 250、可见 229/249 及原控件 ID 一致。既有场景池与回滚负例、八项几何用例通过。待同相位实际 Simulator A/B 和独立读图。

第二幕单变量 e3b4e7b675754e16bec3408146217d339eee9403 的 21:9 三守卫、19.5:9 冠军、实际触控出牌和源码预算均通过相互独立复审。实测 250 槽、两幕可见 229/249 场景图元，250 个槽位的资源和控制身份逐项一致，四幅零资源告警。回执 SHA-256 69ba81008db52d9ea9d5d41573737cc94a3bbf595f9b313342f66792008462b1。合流与正式 GIL 实机另验。

第一幕 c383ab097a8f038bc4f062f2051453ae317c5199 的两处石缝调色通过独立视觉复审。16:9 和 21:9 双史莱姆及 21:9 大史莱姆首领腹沿与地面更连贯，229 场景图元保持原值，第二幕控制图重渲染逐字节一致。证据 SHA-256 4bad5abc1c8d4a39056605539ccdbd9e9eee5926621cbdb9e247b8176ca90138。局部试制已验，正式候选验收待执行。

两幕现行背景源码经 #1007 合入 e483c6a1，保留已独审的第一幕压低石缝和第二幕连续石面。真实 V3 的每幕 250 个槽复用，阶段 Simulator 证据与正式 GIL 继续同包核对。
<!-- SECTION:NOTES:END -->
