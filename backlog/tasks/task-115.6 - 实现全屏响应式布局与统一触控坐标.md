---
id: TASK-115.6
title: 实现全屏响应式布局与统一触控坐标
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-25 21:01'
updated_date: '2026-11-26 01:30'
labels:
  - v2.2.0
milestone: m-8
dependencies: []
references:
  - >-
    https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/tree/8d99c0b557129077118480ec99c4ae20f6ea1bff
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/984'
  - 'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/988'
documentation:
  - docs/versions/V2.2.0-RELEASE.md
parent_task_id: TASK-115
priority: medium
type: feature
ordinal: 213000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
情况：固定 1280×720 等比缩放和背景外延无法充分使用宽屏。

任务：先核实千星奇域宿主、逻辑画布和安全区，形成统一布局与触控转换，再与两幕场景联合交付。

边界：背景与转场满屏，人物/卡牌/图标保持比例；布局优先复用共享边界。

验收：见下方验收项和统一发布清单。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 用宿主或实际 Simulator 记录视口/安全区/输入能力，并登记可实现的获审设计
- [ ] #2 16:9、19.5:9、20:9、21:9 实渲验收战斗、背景、HUD、两侧操作、手牌、触控及性能
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已派发宿主与坐标探针。复用 Fork A 固定来源 8d99c0b557129077118480ec99c4ae20f6ea1bff，分支旧 TASK-38.9 仅作来源；官方手机安全区能力待验。

#984 已合入统一视口和触控。第二幕联合试制 f245d4c9 由独立评审实际验证 16:9、21:9 点击命中及脚底阴影随动。联合源码、正式手机安全区和最终性能仍待验。

21:9 实际三守卫战中，抬起的普通攻击遮住中间守卫生命数字下半。用同种子、同相位和同一点击路径复拍 8ddc1de8 旧运行时，旧图和 47b5e73d 的遮挡区 1,500 个像素一致。#988 历史静置十牌图已有卡名重叠。保留接地结论，牌与血条交互另做定向修复和实渲。验收项保持未勾。

抬牌避开敌人血条试制 9567b585d3119ff21b14fda89cab83a407ebfe0e 获独立局部复审。21:9 三守卫实渲中，选牌前三条血条与抬牌后逐像素一致，实际出牌一次。四种画幅、31 个正式固定阵容及原生美术开关的源码复测中，稳定焦点 9,549 处满足血条上界和下安全边。抬升初段仍可观察到从画布下缘入场时的短时裁切。实体手机最小牌面可读性待验。

接地和抬牌联合源码由 c202627a 接续到本地 34e19d9060115a008bea7066fdde12dc89835327，经独立源码复审。七个运行模块与已验 9567 Save 的输入逐字节一致，八组定向 Lua 通过。实际静态加载中，旧回放辅助文件会被现行入口拒绝，传统历史范围已复核。此候选未进入正式 GIL，维持动画下缘与设备文字待验。

接地、宽屏手牌与待合入 #1000 的本地联合候选 fc0b515c6ffa50e44c914b11ae7727ad658143ed 获独立源码复审。七个运行模块同 9567 Save 输入，真实合成 Reward 从失配恢复通过，81 次现行关联源重读和 35 次复制入口变体拒绝。M7 与独立 relic 两项失败在 a87 同样存在。正式候选四画幅实渲、实体设备可读性与性能待验。
<!-- SECTION:NOTES:END -->
