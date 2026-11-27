---
id: TASK-117
title: 按影响补齐日常 Fast 分流和分层 GIL 冒烟
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-27 16:33'
updated_date: '2026-11-27 16:53'
labels:
  - engineering
dependencies: []
priority: medium
type: task
ordinal: 227000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：现有 Fast 机制仍有具体分流和日常冒烟缺口。
任务：仅收紧真实缺口，按影响走廉价冒烟。
边界：保留 TASK-81、TASK-75 历史验收与现有 develop 队列和合后 Full。
验收：实施包 AC10、AC11、AC13；真实样本缺项保留待验。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 低风险选测完整，高风险和未知回退 Full，日常流程只运行适用冒烟。
- [ ] #2 有可比样本时报告实际 CI 消耗及失败取消，保留真实样本缺口。
- [ ] #3 独立复审、Required Checks、实际 develop 合入及合后验证有证据。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 固定基线和隔离分支，回放自然 PR 的只改测试路径，定位 Full 误判。
2. 在精确受影响 Fast 和 Fork advisory 入口共用明确映射，先写回归和 Full 负控。
3. 复用低价本地启动与资源冒烟，复核现有正式任务与普通提交的触发隔离。
4. 记录真实运营证据和未验证项，交主控与独立复审。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
BASE 32a15219aecd145c59cb1b2fcf477e5556766e5d；fork-a/ci/fast-mapped-fixture-smoke；check-pr-slice ALLOW；核验 node --test tests/ci-impact.test.mjs tests/test-affected.test.mjs tests/quick-feedback.test.mjs 与实际选测执行回放。

本地验收：正式 ci-impact -> ci-fast 实际回放选择单个完整未知事件回归，合法向量通过，错误 room 期望由原断言拒绝；相关 225 测试全通过。Fork advisory 本地启动/资源冒烟约 16.6 秒，缺少旅行者呈现输入约 0.74 秒且 exit 1，Lua 源语法错误约 6.68 秒且 exit 1。既有 Full workflow/规则未更动。

成本观测：2026-11-27 04:14–15:18 UTC 的 30 个已完成 Quality attempt 中，普通 PR 13 个启动 Fast、7 个启动 Full、4 个执行模式未解析；18 个取消、10 个失败、2 个跳过（全部事件）。#1030 的自然测试 PR run 45770440456 attempt 1 走 Full 失败，运行 wall 32096 秒、runner 执行 522.2 分钟；排队累计 626125 秒有并行重叠。该范围仍 Full。缺相同工作流和覆盖的真实改后样本，保留待验。

独审负控：真实 Git T（普通文件与符号链接相互转换）必须 Full；两种方向均由正式 impact CLI 负控通过。首个 Fork Quick run 46036448176 在 cultist_ui.lua:77 失败；基线与本候选运行同一原夹具均复现该断言失败。预检耗时 wall 118 秒、排队 4 秒、执行 114 秒；保持原断言与 Hosted 门禁，正式 CI 待验。
<!-- SECTION:NOTES:END -->
