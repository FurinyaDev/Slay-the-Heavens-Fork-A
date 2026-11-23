---
id: TASK-62.1
title: 复验第三幕自然接入并修正已证实的源码缺口
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-23 04:21'
updated_date: '2026-11-23 07:20'
labels: []
milestone: m-9
dependencies: []
references:
  - docs/rules/CROSS_ACT.md
parent_task_id: TASK-62
priority: medium
ordinal: 188000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 允许 develop 第三幕源码切片。以 #213、#252 及当前第三幕敌人、三个 Boss、事件桥和源队列为起点，先复用现有测试，核实当前正式 Run 命令、开发 profile 和自然进入。父项保留 TASK-61 等最终验收依赖。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 在显式开发配置沿真实第二幕到第三幕迁移验证 35–51 层、事件资格、场景源队列和无首领宝箱。
- [ ] #2 用现有 Run/Host 路径验证三个 Boss、普通结局和可重复的拒绝边界；仅修正能复现的第三幕源码缺口并保留回归。
- [ ] #3 提供精确提交和定向行为证据；正式发布与跨幕实机交回 TASK-62。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
专题=C | Task=TASK-62.1 | Outcome=待审
Base=73c21489efaab409d4c0c46bee517d410d3427fc | Head=d683c6224dfbe4c347d27df44a4a5cae5044dfef | PR=none（回放）；结算界面另见 #914。
Scope=铁甲战士从新局走完 1–51 层，修正诊断驱动的强制遗物和挂起选牌，回放 987 条正式命令。
Tests=`node scripts/m3-normal-campaign.mjs --replay docs/evidence/act3-normal-campaign-20261123/ironclad-seed-2.json.gz --output build/c-driver-replay-final` 在本条完整 HEAD 运行 190.232s，得到 `normal_victory` 与 16 HP。同种子并发拒绝非法跳层 2/2。#914 的真实 Boss 房间命令回归通过觉醒者、甜甜圈与八角形、时间吞噬者三场，并保留重复结算拒绝用例。源码 https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/commit/d683c6224dfbe4c347d27df44a4a5cae5044dfef
Capacity=未测。Shared-owner=C 独有回放驱动，Run、Act 生产文件未改。
Remaining=第三幕其余首领与分岔的自然整局、同候选 PC/手机验收及正式合入。
<!-- SECTION:NOTES:END -->
