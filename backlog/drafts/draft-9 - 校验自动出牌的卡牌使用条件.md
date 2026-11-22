---
id: DRAFT-9
title: 校验自动出牌的卡牌使用条件
status: Draft
assignee:
  - Furinya
created_date: '2026-11-22T10:39:16Z'
labels: []
dependencies: []
references:
  - https://github.com/FurinyaWorks/Slay-the-Heavens/pull/895
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
P2。实际 Run 在岩系旅人持棱镜碎片时，Havoc 可在抽牌堆仍有牌时结算 Grand Finale，或在手牌仍有另一张攻击时结算 Signature Move。手动出牌按规则拒绝。复现中两张目标牌分别造成 50 和 30 点伤害。源版自动出牌仍检查卡牌条件，通常免除能量支付。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 通过实际 Run 打出 Havoc，目标卡在条件不满足时不执行效果，条件满足时按现有自动出牌规则结算。
- [ ] #2 覆盖 Grand Finale、Signature Move、合法自动出牌的费用与牌堆归属。
<!-- AC:END -->
