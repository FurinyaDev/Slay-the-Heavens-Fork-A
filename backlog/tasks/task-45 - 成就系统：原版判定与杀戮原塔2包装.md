---
id: TASK-45
title: 成就系统：等账号权限具备后再做
status: Blocked
assignee:
  - '@Furinya'
created_date: '2026-10-24T01:10:00Z'
updated_date: '2026-11-26T15:32:41Z'
labels:
  - P1
  - post-release
  - achievements
  - competition-deferred
  - persistence-dependent
dependencies: []
references:
  - docs/SCOPE.md
  - docs/TOOLCHAIN.md
  - https://github.com/CHNISam/Slay-the-Abyss/pull/147
  - docs/backlog-details/TASK-45.md
  - docs/evidence/backlog-reconcile-20261114.md
  - docs/adr/0004-native-persistence.md
  - experiments/native-persistence-probe/README.md
priority: low
type: feature
ordinal: 73000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
现在账号还没有原生成就权限，先不做，也不要为此升级账号。以后权限具备、你审过成就清单后再开始，不影响首发投稿。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 先确认官方要求和账号实际权限，条件满足后才解除阻塞；不为此升级账号。
- [ ] #2 核对原版46项候选成就，列清达成条件、新名称和图标，逐项交你确认。
- [ ] #3 你确认后再实现；达成条件不缩水，解锁后下次玩还保留，并在游戏里验证。
- [ ] #4 保持权限阻塞，解除后按P1安排，不挡10月30日首发或11月2日投稿。
- [ ] #5 千星奇域关卡原生成就须保证正常、可重复游玩下全部可达，并能实际领取平台认可的「极致成就」；不能因永久错过、不可达条件或判定错误使玩家无法全成就，须以官方客户端实测验收。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-27队列复核：补齐有效负责人Furinya；Low候选仍不占当前冲刺，不因指定负责人自动启动新功能。

2026-10-28用户确认范围变更：当前比赛只覆盖第一幕、第二幕，优先前10分钟体验；第三幕/隐藏第四幕/真结局及依赖退出续玩、跨局进度、历史解锁或跨局留卡的内容退出比赛必做，保留为无新截止日的未来候选。四职业及已批准原创角色要求不变。同局跨房间、第一幕到第二幕的资源与随机流、内存快照/回滚和本局结算保留；源码/候选/平台/实机仍分层，未完成状态不因范围调整改变。

2026-11-14按用户队列清理授权归档：成就与跨局持久化已由SCOPE现行决定移出当前范围，账号能力未获批；未来权限与批准具备后恢复。

2026-11-26 按 Owner 指令恢复原任务编号与 Backlog 活动记录。接入已批准的成就设计，后续业务版本候选，具体版本待规划确认。当前 Blocked，先由 EXP 在实际创作者权限下取证原生注册、触发、查询、重连和永久解锁，并验证共用通信与确认边界。官方文档和离线探针不作为实机验收。通过后再按原验收项实施；本轮无正式实现或验收勾选。
<!-- SECTION:NOTES:END -->
