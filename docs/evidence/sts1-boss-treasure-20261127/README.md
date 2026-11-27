# 首领宝箱直达回归

TASK-4.13.1 基于主仓 develop `32a15219aecd145c59cb1b2fcf477e5556766e5d`，在 Fork A 保存。生产流程沿用 [#817](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/817)。原版地图以首领图案结束，第一、二幕另有真实宝箱楼层。[《杀戮尖塔1》地图规则](https://slaythespire.wiki.gg/wiki/Map_Generation) · [原版终点截图，第 35 页](https://www.cs.cornell.edu/courses/cs5152/2026sp/lectures/lecture14/slides-14.pdf#page=35)

| 幕 | 地图快照恢复楼层 | 地图终点 | 奖励确认后 |
| --- | --- | --- | --- |
| 第一幕 | 15、16、17 | 16 层首领可见。17 层宝箱、命中区和连线隐藏。 | 直达 17 层，下一幕首房为 18 层。 |
| 第二幕 | 32、33、34 | 33 层首领可见。34 层宝箱、命中区和连线隐藏。 | 直达 34 层。全流程首房为 35 层，比赛配置在 34 层结算。 |

生产地图控件离线回归使用种子 `42`。恢复后核对原路径、当前房间、真实可达后继，以及打开地图时的导航权限。两幕第九行的普通宝箱保持可见。正式 Host 回归覆盖已领金币、选牌或跳过、宝箱入场失败后重试、重复确认无效、首领遗物三选一和跳过。全流程夹具仅为首幕 Guardian 使用现有正式夹具的 7 秒画面期限，以覆盖约 6 秒的入场转场。原始历史夹具继续用固定字节重放。

```sh
npm run build:data && npm run build:ui
node scripts/test-lua.mjs tests/lua/map_ui_chapters.lua
node scripts/test-lua.mjs tests/lua/formal_campaign_entry.lua
node scripts/test-lua.mjs tests/lua/full_source_campaign_entry.lua
node scripts/test-lua.mjs tests/lua/game_ui_boss_treasure.lua
node scripts/test-lua.mjs tests/lua/cross_act_checkpoint.lua
node scripts/test-lua.mjs tests/lua/treasure_rewards.lua
node scripts/test-lua.mjs tests/lua/session_menu_navigation.lua
```

上述运行覆盖地图组 4/4、正式两幕 4/4、全流程 3/3、首领宝箱界面 7/7、遭遇检查点 3/3、宝箱奖励 9/9、同局菜单续玩 4/4。由既有接口推进高层路径并控制最后一击。恢复覆盖地图和遭遇快照及内存中同局续玩。官方导入、当前 ready 和实体设备实测待验。
