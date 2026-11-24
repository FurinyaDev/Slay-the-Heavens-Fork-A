---
id: TASK-103.6.1
title: 让只读牌组首次打开时逐张显示完整卡牌
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-24 05:30'
updated_date: '2026-11-24 05:42'
labels: []
milestone: m-8
dependencies: []
references:
  - docs/evidence/deck-pages-20261122/README.md
parent_task_id: TASK-103.6
priority: medium
type: enhancement
ordinal: 188000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：首次打开只读牌组的黑色准备画面阻塞体验，暖开已可复用。

任务：P1 UX / Performance Enhancement。比较渐进呈现与有界空闲预热，使用最小改动。

边界：仅接续 TASK-103.6 的首次只读浏览范围。保留布局、排序、翻页、详情和严格选牌门控，限 develop 集成。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 冷开立即提交无遮挡框架，完整卡牌分批展示，官方客户端首反馈 P95 ≤100 ms 并记录首卡和全页。
- [ ] #2 切换 Run、快速返回重开、排序翻页和暖态复用通过，资源有界且严格选牌门控通过。
- [ ] #3 提供独立审查和同基线离线与官方客户端分层证据。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 在现有分页池的 4 ms 软预算内，完整首张后发布牌区，逐张沿固定槽位呈现。
2. 同一底层页面的静态只读浏览隐藏视觉遮罩和等待提示，保留输入 blocker、就绪与失败恢复。异步卡面配置继续整页就绪。
3. 在 fork-a/perf/deck-cold-start 对 develop c420b028 做 Host A/B、相关回归和四维独立审查，正式 PR 只指向 develop。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
以 c420b028 对照选定方案 A，正式静态分段牌面沿用 4 ms 软预算。四维独立审查及离线原始记录见 docs/evidence/deck-cold-start-20261124/README.md。10/75 张首卡 P95 为 7/6→2/2 调度轮；暖态整页两组均维持 2 轮，资源循环无增长。官方导入、首反馈 P95≤100 ms、设备暖开及冷开尾部仍待实测。当前任务保持 In Progress。

集成基线推进至 364f43e8（#915，仅 CI 与预检流程变化），对照涉及的运行时代码、生成器及测量夹具字节相同。开发短分支 perf/deck-cold-start；覆盖计划要求一个 Fork Full，按新流程由 Fork B 自动触发。
<!-- SECTION:NOTES:END -->
