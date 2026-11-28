---
id: TASK-116
title: 统一敌人选中框和攻击热区
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-28T11:08:13Z'
updated_date: '2026-11-28T11:19:16Z'
labels:
  - p1
  - v2.3.0
dependencies: []
documentation:
  - docs/evidence/enemy-target-geometry/README.md
priority: medium
type: bug
ordinal: 226000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 情况
P1，v2.2.0 后续版本。选中框与实际攻击矩形不一致。

## 任务
核对 STS1 行为，统一点击、拖牌和药水的几何判定。

## 边界
沿用 Combat 合法性及现有指针生命周期，独立 Fork，不动 Release。

## 验收
保留全敌人几何、平台差异、性能 A/B 和回归证据。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 框与命中矩形一致，重叠稳定，空地和非法单位不提交。
- [ ] #2 全敌人前后对照及自动化回归、性能 A/B。
- [ ] #3 官方 PC 与手机代表场景验收并合入 develop。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Fork A fix/enemy-target-geometry，develop 32a15219aecd145c59cb1b2fcf477e5556766e5d。先测现行矩形及框，再统一几何和有效区判定，覆盖重叠、边缘、空地及姿态。定向验证 node --test tests/enemy-target-geometry.test.mjs。官方设备待验。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
产品优先级仍为 P1。仓库 High 队列已有五项，按现有 P1 分轨惯例登记 Medium，并保留下一版本标签。独立待验 PC、手机与官方候选容量。

源码修复与独立评审通过。69 条几何前后对照，Lua 定向用例与性能 A/B 见关联附件。正式 STS1 移动端容差、官方 PC/手机和容量仍待实测，验收前保持 In Progress。
<!-- SECTION:NOTES:END -->
