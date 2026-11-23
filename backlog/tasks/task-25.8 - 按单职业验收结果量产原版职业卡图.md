---
id: TASK-25.8
title: 按单职业验收结果量产原版职业卡图
status: To Do
assignee:
  - Furinya
created_date: '2026-11-23 04:21'
updated_date: '2026-11-23 07:18'
labels: []
milestone: m-9
dependencies:
  - TASK-25
  - TASK-10.1.2
references:
  - docs/art/CARD_PRODUCTION.md
parent_task_id: TASK-25
priority: medium
ordinal: 192000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在 M8 岩系旅行者单职业卡图质量、装配与容量验收之后，将批准的生产方式推广到 M9 原版职业。仅约束美术量产。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 从 M8 同候选读回批准的卡图质量、手机可读性、导入与容量证据，再逐职业定量验收装配与资源成本。
- [ ] #2 保留职业卡图可获得性对应与正式候选设备证据；原创 V4 的审批和量产继续走自身任务。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
专题=D | Task=TASK-25.8 | Outcome=实验完成
Base=73c21489efaab409d4c0c46bee517d410d3427fc | Head=453dd0c1933e4cb7e8522d08a9f082385f8ebeac | PR=none（压缩实验）；原容量交接见 #916。
Scope=岩旅三张已批准样卡无损压缩，现行 CardDisplay 沙箱逐格核对。
Tests=实验测试 10/10，6534 格一致，两次构建字节一致。源码 https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/commit/453dd0c1933e4cb7e8522d08a9f082385f8ebeac
Capacity=离线生成 Lua 文件 2,217,195 → 885,127 字节；官方 MB 未测。Shared-owner=D 独立实验目录。
Remaining=同候选官方 20MB、PC/手机与单职业样卡验收；其他三职业卡图等待 M8 前置。
<!-- SECTION:NOTES:END -->
