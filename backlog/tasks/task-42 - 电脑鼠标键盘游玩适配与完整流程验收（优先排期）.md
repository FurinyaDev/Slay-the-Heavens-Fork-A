---
id: TASK-42
title: 在电脑上用鼠标和键盘完整玩一遍
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-10-23 12:23'
updated_date: '2026-11-15 18:36'
labels:
  - awaiting-live
milestone: m-8
dependencies: []
references:
  - TASK-4
  - TASK-10
  - TASK-30
  - docs/design/UI_DESIGN.md
  - docs/backlog-details/TASK-42.md
  - docs/DELIVERY-CLOSEOUT.md
  - docs/BACKLOG-AUDIT-20261026.md
  - docs/backlog-details/PC-QA-20261115.md
priority: medium
type: feature
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在PC鼠标键盘上用同一候选验收当前公开的岩系旅行者第一、第二幕，记录设备与真实操作结果；雷电留未来版本。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 鼠标选牌、看详情、选敌人、出牌、取消和结束回合正常，不重复执行。
- [ ] #2 可用键位有说明，键盘能切换焦点、确认和取消，不与原神按键冲突。
- [ ] #3 鼠标键盘能完成地图、各类房间、领奖、胜败结算和重开。
- [ ] #4 保存电脑实测结果，有限制或没做好的地方写清楚。
- [ ] #5 同一候选实测跨战斗首次点牌、旧触点、药水、奖励、弹窗和取消退出的真实事件派发；已完成本地手势切片不能代替电脑验收。
- [ ] #6 同一候选两职业覆盖两幕、换幕、胜败与重开，保存真实设备证据及通关耗时；预览不能替代。
- [ ] #7 PC01–PC38逐项对应实现、PR、提交、回归与当前正式候选设备验收，未验、待判、延期分别记录。
- [ ] #8 #676 拟议 TASK-16.1.6 AC1：按真实分裂触发生成两个可分别辨识的敌人实体；视觉位置/生命值/意图/点击命中区对应各自实体，无重叠和不可选目标。
- [ ] #9 #676 拟议 TASK-16.1.6 AC2：同场已有敌人时、第一/最后一列、不同可用宽度及反复遭遇下布局稳定，无遮挡重要战斗HUD。
- [ ] #10 #676 拟议 TASK-16.1.6 AC3：核心分裂数量、HP、RNG/行动顺序和死亡奖励规则不改；用真实Lua/Host复现并保留旧错误RED和新行为GREEN。
- [ ] #11 #676 拟议 TASK-16.1.6 AC4：复核 #672 的 slime-split-positions 回归与实际正式GIL布局；同候选PC和相关手机实测未完成前不得标记Done。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-11-15 Release接续：PC01–PC38逐项核原文与证据，选择性移植#672本版修复，定向回归、独审及Release Full。同候选PC/手机/ready/容量未过不勾AC。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-27同类范围审计：承接已批准四职业与第一至隐藏第四幕完整范围及原创角色责任，纠正仅第一幕总验收口径；原验收证据保留，本轮新增要求均未勾，不声称新增实机通过。

负责人字段规范化：原记录 @Codex 作为历史执行者信息保留；任务负责人为 Furinya。

2026-10-28用户确认范围变更：当前比赛只覆盖第一幕、第二幕，优先前10分钟体验；第三幕/隐藏第四幕/真结局及依赖退出续玩、跨局进度、历史解锁或跨局留卡的内容退出比赛必做，保留为无新截止日的未来候选。四职业及已批准原创角色要求不变。同局跨房间、第一幕到第二幕的资源与随机流、内存快照/回滚和本局结算保留；源码/候选/平台/实机仍分层，未完成状态不因范围调整改变。
原AC6（仅保留历史要求，不再作为当前比赛必做）：同一候选四职业及已批准原创角色的完整操作矩阵覆盖第一至隐藏第四幕、换幕与两种结局，逐项保存真实事件及设备证据，第一幕单次通关不代替。

2026-10-28范围决定：比赛范围见 docs/SCOPE.md；旧验收文字保留于历史记录，本次未新增通过证据。原受影响验收：同一候选四职业及已批准原创角色的操作矩阵覆盖第一幕、第二幕、同局换幕、本局胜败与重开，优先前10分钟上手与反复操作；逐项保存真实事件和设备证据，未测内容明确留待验，不用预览替代。

2026-10-31规划校正：AC6中的旧「两职业」按docs/SCOPE.md现行决定仅验旅行者两幕；原AC不重写、不勾选，候选/设备证据要求保留。
2026-11-03 赛后调整：m-5 → M7（产品体验与核心特色）；保留状态和未验 AC；旧截止日期 '2026-10-28' 已移除，不设新期限。

2026-11-14第二轮逐项核对，保留To Do：本项要求同一当前候选的完整PC鼠标键盘操作矩阵，未找到本项已执行的设备记录；源码输入支持不等于该整轮实测已经开始。

本轮release基线36b9b157已含#663。#672仍未合。#676新任务存在编号/标题冲突，不复制；38项沿用TASK-42及既有子范围。旧9b容量收据记录20.1781>20，关联来自用户说明，未独立看原图。

2026-11-15 Release PC台账：PC27由本任务主责；逐字依据、修复提交/PR和未验缺口见 docs/backlog-details/PC-QA-20261115.md。仅文本核对和源码/离线回归不能勾官方或设备AC；本轮不新增重复任务、不改变原已验AC。

本轮干净源58185619尝试构建回归候选，write_graphs依赖junction被OS以EPERM拒绝，written为空；无完整GIL，未严格读回或官方/设备验收。失败收据docs/evidence/release-pc-qa-20261115/candidate-build-failure.json；旧7cb/latest未覆盖，未占用GUI。

第二次候选安全替代：F内物理复制既有工具且逐hash同一；build400fb7ea真实源182179cf/dirty=false被未签名private-runtime.ps1执行策略拒绝，尚未图编译，无完整GIL/严格audit/官方或设备证据。未改系统策略或工具代码，base/latest保持。详见候选环境失败收据。最终整合EOF门禁已修并同步CI绑定，失败审计保留；不标Done。

Release来源独审发现新增raw current仅guard断言而未继续硬验原forecast target。已在0a4705ff补forecast<target，原guard/预算/timings不动；CI只重绑该test行，其他44输入、before/库存及旧92档案+原production packet不变，96558初CI packet另存。修正后当前绑定/库存/raw target4/4通过：Win1766189<1800000、POSIX1196961<1200000；旧73结果仍绑定旧输入，不转记为新Full。增量独审/最终精确HEAD与当前PR CI待继续。

d396→d6555c40当前目标补强独审release_navigation_source_review CODE_PASS_SCOPED/unresolved=[]：8路径完整覆盖，实际raw回调与当前绑定通过；独立双平台+60000ms令预测超target但不超guard，旧回调接受、新回调按target拒绝，证明新增断言有效。报告docs/evidence/release-pc-source-20261115/independent-current-target.json。产品未改，原完整代码审查与本增量审查分段保留，HostedFull/实机仍未授准入。

2026-11-16 已纠正本片此前新增的forecast<target/guard硬门槛：docs/CI.md168原Owner政策要求预测仅诊断，实际workflow45/30/local75才是执行硬超时。代码8a44cd2f/绑定f244edd3保留产品5bd、所有旧冻结断言与45行原before；只1个CI当前after及leaf接续，其余44行/93归档/库存保持。当前5/5通过，独审CODE_PASS_SCOPED报告independent-owner-policy.json，12个直接job负控拒绝；forecast超目标和旧预测guard仍诊断。此前独审错误建议与报告原文保留更正，未重复73/Full。新发现共同前置PR692已负责Release bootstrap实际10失败，尚未合；不得把旧预测绿灯当本次RequiredCI或官方许可。
<!-- SECTION:NOTES:END -->
