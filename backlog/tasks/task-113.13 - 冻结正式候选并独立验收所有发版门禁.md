---
id: TASK-113.13
title: 冻结正式候选并独立验收所有发版门禁
status: To Do
assignee:
  - '@Furinya'
created_date: '2026-11-25 20:51'
updated_date: '2026-11-25 20:53'
labels:
  - v2.2.0
milestone: m-8
dependencies:
  - TASK-113.1
  - TASK-113.2
  - TASK-113.3
  - TASK-113.4
  - TASK-113.5
  - TASK-113.6
  - TASK-113.7
  - TASK-113.7.3
  - TASK-113.7.5
  - TASK-113.8
  - TASK-113.9
  - TASK-113.10
  - TASK-113.11
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-113
priority: medium
type: task
ordinal: 206000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：最终版本需要同一正式生产候选的端到端证据。

任务：按版本唯一清单冻结、复验并交接 Owner 进行官方发布。

边界：Owner 负责官方发布。不同 SHA、产物或环境的结果按可比性分别标记。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 全部必要项通过，审查记录来自独立实现者之外的评审，证据绑定精确同源候选
- [ ] #2 PC、实体手机、官方容量/负载、实际导入启动通过；交接含准确候选和最小操作单
<!-- AC:END -->
