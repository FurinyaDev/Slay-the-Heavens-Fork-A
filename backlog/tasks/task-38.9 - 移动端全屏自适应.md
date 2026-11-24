---
id: TASK-38.9
title: 移动端全屏自适应
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-24 10:46'
updated_date: '2026-11-24 10:58'
labels: []
milestone: m-8
dependencies: []
references:
  - docs/backlog-details/TASK-38.md
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/407'
documentation:
  - docs/backlog-details/TASK-38.9-RESPONSIVE-VIEWPORT.md
parent_task_id: TASK-38
priority: medium
type: enhancement
ordinal: 188000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
P1 体验优化。复用真机已验证的原生背景外延，为所有玩法页及弹窗适配移动端可用视口。只进入 develop，独立于 v2.0.0 发布。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 复用历史证据与共享布局。背景、顶栏与全屏遮罩覆盖可用视口，卡牌、人物和交互热区保持比例。
- [ ] #2 验证 16:9、19.5:9、21:9、4:3 的离线投影和交互回归，留存同源前后对照并区分官方编辑器、PC 和实体手机证据。
- [ ] #3 交付可导入的候选 GIL，并以同候选完成官方客户端和 iPhone 14 Pro 验收。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 对照原生根与 R36、DIAG-12。
2. 扩展共享视口绘制范围和公用遮罩，保留现有比例、输入映射和安全区。
3. 跑四比率回归、对照投影、独立审查和候选构建。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
a111076f 基线的 Fork A 切片 feature/responsive-viewport。历史来源和当前设计见 docs/backlog-details/TASK-38.9-RESPONSIVE-VIEWPORT.md。真机图仅作为旧现象证据。
<!-- SECTION:NOTES:END -->
