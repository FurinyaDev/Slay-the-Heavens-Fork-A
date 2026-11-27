---
id: TASK-116
title: 提前交付冻结候选的同包有声 GIL 并保留正式放行门禁
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-27 16:33'
updated_date: '2026-11-27 16:40'
labels:
  - engineering
dependencies: []
priority: medium
type: task
ordinal: 226000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：Owner 批准在 develop 改造后续版本的放行流程。
任务：冻结同一源码，可信有声 GIL 可提前提测，正式性能与最终白盒、许可独立验证。
边界：现有 v2.2.0 工作与 #1014、#1016 各自保留；现行保护、独审、人工准入和历史证据保留。
验收：实施包 AC01–09、AC12，最终组合独审、实际合入和合后核验。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 可信构建与正式性能同源同包且可在 Full 之前运行，失败与替换负控有效。
- [ ] #2 最终发布明确汇合所需证据；现有门禁、历史兼容和归档可验证。
- [ ] #3 独立复审、Required Checks、实际 develop 合入及合后验证有证据。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 从 fork-a/ci/release-parallel-delivery 及 develop 32a15219aecd145c59cb1b2fcf477e5556766e5d，同步现有发布、CI 和冒烟规约。2. 在隔离树按精确 HEAD 同时集成 A1/A2，核对 B 实际落点；不纳入并不变更 #1014、#1016 或当前 v2.2.0。3. 执行 GIL、发布核验、性能、归档和 CI 定向测试，运行 check:guidance、verify:backlog 与适用 hosted 预检；逐条记录 AC01–09、AC12 的实际证据与授权缺项，交独立评审和正常准入。

A1 只读切片检查 ALLOW，fork-a/ci/frozen-gil-build-custody，BASE 32a15219aecd145c59cb1b2fcf477e5556766e5d。定向验证 node --test tests/gil-candidate.test.mjs tests/gil-candidate-preflight.test.mjs tests/release-performance-artifacts.test.mjs。

A2 只读切片检查 ALLOW，fork-a/ci/parallel-release-gates，BASE 32a15219aecd145c59cb1b2fcf477e5556766e5d。定向验证 node --test tests/release-ci.test.mjs tests/release-performance-verification.test.mjs tests/release-archive.test.mjs。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
协调集成不纳入在途 #1014、#1016 与当前 v2.2.0。主仓 GIL build / Performance regression 已登记，正式构建控制入口位于受保护 develop。正式提测/性能实际 Hosted 证据需合入后的独立授权候选；Fork B 现有构建/质量只核对预检层。基线定向测试在指定 LFS 输入水合后 192 通过、1 失败（#1046 后旧 release-proposal 测试断言，A2 负责按现行守卫修正）。
<!-- SECTION:NOTES:END -->
