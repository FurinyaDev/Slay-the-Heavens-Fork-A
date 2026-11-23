---
id: TASK-59.6
title: 复验 Watcher 职业的自然开局与构筑
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-23 04:21'
updated_date: '2026-11-23 07:18'
labels: []
milestone: m-9
dependencies: []
references:
  - docs/CLASS_CARD_HANDOFF.md
parent_task_id: TASK-59
priority: medium
ordinal: 191000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
复用 #206/#238 已合并的实验职业与现有牌池、选角、遗物和运行时 Host。审计并补实证缺口，先从独立职业文件切片；改共享选角或奖励路径前与其他职业协调。卡图和跨版本正式开放另验。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 显式 full-source 从真实选角进入首战，起始牌组、初始遗物、姿态、预见与奇迹和败退边界通过可重复测试。
- [ ] #2 校验 75 张基础/升级定义及真实奖励、商店、升级获得路径，只修已复现缺口，并记录同局第二幕剩余未验路径。
- [ ] #3 由正式候选白名单负控确认 Release/master 入口维持原范围；提供精确 PR/SHA 和后续正常游玩、设备验收交接。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
专题=B | Task=TASK-59.6 | Outcome=待审
Base=73c21489efaab409d4c0c46bee517d410d3427fc | Head=6ba08f9a640b09809eb367bc74524de74e38a0df | PR=none
Scope=Watcher 从第一幕正常选角、商店、营地、战斗和奖励进入第二幕首战。守护者胜后 6 HP，验证姿态切换与起始奇迹及跨幕资源。
Tests=`node tests/helpers/class-act-one-replay.mjs` 同种子 19 三职业通过。回放源码 https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/commit/6ba08f9a640b09809eb367bc74524de74e38a0df
Capacity=未测。Shared-owner=回放由 B 负责；协调者单独写原生准入 https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/commit/1ab557958c4a8b1df87e273c1f050890e769e4d1，显式编辑器候选四职业入口定向通过。
Remaining=完整职业来源、第二幕余程、官方导入、PC/手机验收、正式合入仍待确认。
<!-- SECTION:NOTES:END -->
