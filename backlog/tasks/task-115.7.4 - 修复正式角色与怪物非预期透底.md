---
id: TASK-115.7.4
title: 修复正式角色与怪物非预期透底
status: Blocked
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:02'
updated_date: '2026-11-25 23:05'
labels:
  - v2.2.0
milestone: m-8
dependencies: []
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-115.7
priority: medium
type: bug
ordinal: 218000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：部分资产内部透底可能来自源图 Alpha、拟合、接缝或运行时渲染。

任务：逐个测最终渲染并归因，试验轮廓底色等低成本方法后修复。

边界：以批准原图覆盖为准，保留轮廓外和有意透明区域，守住图元和性能预算。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 正式资产清单与修复结果对应；黑、白、高对比及战斗背景最终渲染实测无意外漏色
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已派发正式运行时资产透底排查。按已批准原图做覆盖判定；私有批准源缺失时记录其摘要和待取证项。

已取得 43 个正式演员的黑、白、高对比 Simulator 实渲。批准原图和已对位掩模尚未登记，当前 43 项均待验。正式修复等待取得批准输入，之后逐项核对战斗背景与容量预算。
<!-- SECTION:NOTES:END -->
