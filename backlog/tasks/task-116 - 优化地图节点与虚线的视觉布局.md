---
id: TASK-116
title: 优化地图节点与虚线的视觉布局
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-28 02:36'
updated_date: '2026-11-28 02:50'
labels:
  - v2.3.0
milestone: m-8
dependencies: []
documentation:
  - docs/evidence/v2.3.0-map-layout/README.md
priority: medium
type: enhancement
ordinal: 226000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 情况
地图网格偏机械，部分种子的路线偏向一侧。

## 任务
以 STS1 实际源码和不同种子原版截图为设计参照，改善节点扰动、布局和虚线。目标 v2.3.0。

## 边界
保留七列、十五行、六次路径、房型、随机流及存档规则。仅修改地图节点与连线。Fork A 独立分支，Owner Draft PR。v2.2.0 发版与关键 CI 独立。

## 验收
见验收项。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 节点、边和点击热区共享每幕一次计算的确定性视觉坐标，保留拓扑及存档。
- [x] #2 至少 100 种子离线核对容量、性能、滚动、触控及布局，展示偏左、偏右、居中前后对照并附原版截图。
- [ ] #3 完成 Owner 评审及适用设备验收后进入 v2.3.0；v2.2.0 发版保持独立。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 核对固定 STS1 反编译源码与多种子实拍。
2. 仅在地图表现层缓存每幕坐标，共用节点、路线与触区锚点。
3. 以同基线和候选离线回放，提交 Fork A Draft 供 Owner 评审。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fork A 分支 feat/v230-map-visual-layout。以 develop 32a15219aecd145c59cb1b2fcf477e5556766e5d 为固定评审基线。128 种子、384 张地图离线通过，地图快照一致，控件树和模板一致。待 Owner 评审及实体设备验收。
<!-- SECTION:NOTES:END -->
