---
id: TASK-115.7.3
title: 修正角色与敌人的比例、站位和接地
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:02'
updated_date: '2026-11-25 22:50'
labels:
  - v2.2.0
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 用真实战斗渲染核对旅行者、地面敌人以及有意悬浮敌人的相对高度。
2. 对比仅调站位与轻接触阴影，检查血条间距、静置、攻击、受击和回位。
3. 在两幕的多种敌人和屏幕比例上核对接地与性能，请独立评审比对原版、修改前和修改后。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner 在阶段图中仍看到悬浮。独立评审发现站位调整后鞋底与石板仍缺少局部接触明暗，第二幕部分敌人血条距脚底约 5–8 像素。接触阴影保留为同场景实验，待实渲、交互与独立验收。

独立评审复看 b7e2d4c1 的实际 Simulator 画面。第一、第二幕 16:9 与第一幕 21:9 的接触暗部、地砖交线和血条间距已逐张核对。第二幕实际选牌后蓝色守卫生命 47→41，能量 3→2。攻击位移、退场、大型和有意浮空敌人的整体验收继续进行，AC 未勾。

独立复审通过 875ba38a 的指定实际场景。旅行者和蓝衣束缚者在攻击时，阴影沿实测地面位置移动并回位；冠军抬起的前脚移除脱离脚底的暗斑。蓝衣束缚者在设定 6 HP 后被实际出牌击败，生命 6→0、能量 3→2、敌人控件 3→2，原位置接触阴影消失。整合源码、全比例和正式设备继续验证。

875ba38a 已生成两幕四画幅。联合试制 f245d4c9 的第二幕 16:9 和 21:9 均由独立评审确认实际 Strike 命中 47→41、能量 3→2、脚底阴影平移 16px 并按原高度回位。联合源码的两个历史预检入口仍待修正，验收项保持未勾。
<!-- SECTION:NOTES:END -->
