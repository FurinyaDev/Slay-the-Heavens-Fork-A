# PR679：恢复真正无 Down/Up 的 C 档药水点击

本轮用户明确恢复并授权接续，范围为原 PR679 的 C 档能力回退。起点为实际 Release `1cc5479b713edab6fd26db4e20f8eb22b7401cb2`，独立树快进到 PR 原头 `89dfc774b1c6bb146b91e6064039f4d648db0d33`；二者均保留祖先。原树及分支保留，接续评论为 [6904344896](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/679#issuecomment-6904344896)。TASK-38.4 定义仍在未合 #673，本地 CLI unknown；仅通过 CLI 在父 TASK-38 追加计划，不复制任务、不改变状态/Owner/设备 AC。

## 根因与最小切片

`abyss_battle_ui.lua` 的 popup `pointerConsumed` 无条件设置 release/suppress 屏障。没有 CursorDown/Up 的宿主也因此把下一次独立 Click 当作 Use 的尾事件。仅在根本不存在完整 Down/Up 能力时跳过该屏障；具备能力但尚未发 Down 的宿主仍保留原屏障，不能通过“尚未观察到指针”降低保护。

既有 `battle_ui_potion_targeting.lua` 五场景现在分别运行真实 `H.setup(false)` 与 `H.setup(true)`。false 明确断言瓶/弹窗没有 Down/Up 监听器；true 保留新 ID 的物理序列。原选中牌、库存、目标、能量、手牌和纯重画断言保留，第二瓶取消增加先选牌及能量/手牌不变断言。共享 fixture、popup、gestures、目标绑定、规则与 RNG 实现均未改。

## 本轮执行证据

使用现有便携 Node `v24.18.0`；新树 node_modules junction 只复用 mobile-capacity-repair 的依赖，没有替换原安装。先运行 `npm run build:data`、`build:ui`、`build:theme`。

`node scripts/test-lua.mjs tests/lua/battle_ui_potion_targeting.lua`：

- 生产代码未改时 RED：click-only 五项中四项失败，paired 五项全过；总计 **6 PASS / 4 FAIL**，退出 1，41090ms。明确点 enemy2 的 HP 实读 `31 ~= 11`；第二瓶取消实读 `table ~= nil`。
- 最小能力分支后 GREEN：click-only **5/5**、paired **5/5**，共 **10 PASS / 0 FAIL**，退出 0，25117ms；一次明确点 enemy2 造成20伤害、库存清空、aim清除；第二瓶取消后不消耗、不出之前选中牌。

以下通过原 `runLua` 定向串行运行一次，全部 status=0；没有重跑 wrapper 内相同 Lua：

| Lua 入口（tests/lua/） | 结果 | ms |
| --- | --- | ---: |
| potion_popup_click_payload.lua | 63 owned 序列及 Controller/mixed-capability 边界通过；匿名/竞争/多指/旧尾/新ID | 26328 |
| battle_ui_potion_target_stale.lua | 5/5 | 20778 |
| battle_ui_potion_target_inventory.lua | 4/4 | 10332 |
| battle_ui_potion_target_inventory_slice_2.lua | 3/3 | 9533 |
| battle_ui_potion_target_context.lua | 4/4 | 13799 |
| battle_ui_potion_target_context_slice_2.lua | 4/4 | 15647 |
| battle_ui_potion_target_pointers.lua | 2/2 | 8584 |
| battle_ui_potion_target_pointers_slice_2.lua | 2/2 | 8526 |
| battle_ui_potion_target_pointers_slice_3.lua | 2/2；原真实 C-mode 选牌/即时药水恢复 | 9263 |
| battle_ui_potion_target_pointers_slice_4.lua | 1/1；播放期间旧回调不消费 refill | 3627 |
| potion_popup_slot_view.lua | readonly/reentry/changed-state-use/valid-use；renderCount=4 | 6592 |

源码门禁：`npm run check:syntax` PASS；`node scripts/check-engineering.mjs` PASS，351 modules、6181/6181测量、1988 edges、Luacheck1.2.0无新增诊断、6项显式历史告警、2214 governed measurements。固定 hash 的 Luacheck 从既有 PC 树复制到本树 build/tools 后重新校验执行；首次探查 root 路径不存在、Copy-Item 失败，未执行门禁，未计 PASS。

## 交付边界

source/CI 接续在产品提交后按既有 collector 追加独立 packet，历史 packet 不改写；最终身份与合同结果在本附件后续节记录。没有 Full、Hosted 轮询、GUI、GIL、官方导入/ready、容量或 iPhone14Pro 实测。离线 C 档行为通过不代表官方手机验收；本地提交交父 agent 独审，未推原 PR、未恢复 Ready 或授权合并。
