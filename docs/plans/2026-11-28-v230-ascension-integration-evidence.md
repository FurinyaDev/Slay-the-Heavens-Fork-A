# v2.3.0 进阶与种子阶段验收

对应 TASK-117.7。验收工作树独立于开发者和发布分支。以下为 2026-11-28 的 Linux 离线源码验证。执行环境为 Node v24.19.0、Fengari 0.1.5、fengari-node-cli 0.1.0，Fengari CLI 文件 SHA-256 为 `dd3642afeffa41e547bb4ea970feacff98e53ef4a81f8c7659eeaa6f1579e972`。每个检出使用相同的 369 个已按 LFS 指针对照 SHA-256 的 `art/` 和 `data/` 对象。正式候选的 Full CI、官方导入及设备证据另行验收。

## 原样两幕驱动

在下列检出分别运行 `node scripts/verify-official-campaign.mjs --seed 2 --output .artifacts/t06/a0-<case>`。运行启用态前只把该隔离检出的 `data/rules.json` 中 `ascensionEnabled` 改为 `true`，启用态规则文件 SHA-256 为 `3c18a449e3f38a01566bd1952652afa155af6028d24eee32de445c29cc594af7`。三个运行的源码输入在执行期间保持稳定。

| case | 源码提交 | 结果 | 原始 report.json SHA-256 |
| --- | --- | --- | --- |
| `base-off` | `32a15219aecd145c59cb1b2fcf477e5556766e5d` | 失败，进入第二幕首节点时触发楼层计数断言 | `36f1a297c50a46ca40d06818778eb65cf0940b96a5a08e17eb552263f7513b5f` |
| `candidate-off` | `c146228299be6953efa0a933a3bff0294eb19bca` | 同点失败 | `e79739ad70a2ad9f2f4dee6a019ee4a8db10378fb2fecbfe9641bdaf6a1aa836` |
| `candidate-on` | `c146228299be6953efa0a933a3bff0294eb19bca` 加一行启用配置 | 同点失败 | `2d30ff4bcd17dc9cabc855b49e44507d7d17d328db883ba77f7de823ad9d15a0` |

三次运行的 `CAMPAIGN_` 和 `ABYSS_FEEDBACK` 行逐字相同。对这 1,488 行以换行拼接、去掉末尾换行，SHA-256 均为 `0e1b551c2315020abe5c095e470d265c122bfaaa67ab80818604027b0a67eee3`。第 508 个动作离开第一幕 Boss 奖励页，自动进入第 17 层宝箱；第 511 个动作已到第二幕地图。第 512 个动作进入 `f18_l2`，`scripts/official-assets-campaign.lua:179` 报 `continuous route skipped a floor`。原驱动只在地图选点时计数，未计入自动进入的第 17 层。相同的旧驱动故障在未含进阶改动的基线已复现。

[主仓基线](https://github.com/FurinyaWorks/Slay-the-Heavens/tree/32a15219aecd145c59cb1b2fcf477e5556766e5d) · [T01 测试提交](https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/tree/c146228299be6953efa0a933a3bff0294eb19bca)

## 隔离诊断驱动

把原 `scripts/official-assets-campaign.lua` 复制到工作树外，在 `action(label, fn)` 中记录真实调用前的楼层。仅在 Boss 奖励继续动作实际进入宝箱时验证只进一层，再给诊断用计数加一。保留原地图导航断言、自然战斗、两幕正式胜利及重开断言。

```diff
+ local previousFloor=run.floor
  local ok,why=fn();assert(ok~=false,label..': '..tostring(why));drain()
+ if label=='battle:continue' and run.nodeFlow and run.nodeFlow.roomKind=='boss_treasure' and run.floor~=previousFloor then
+  assert(run.floor==previousFloor+1 and rooms==previousFloor,'automatic Boss treasure must advance exactly one floor')
+  rooms=rooms+1
+  checkpoint('automatic-boss-treasure')
+  print('CAMPAIGN_ROOM '..rooms..' floor='..run.floor..' type=boss_treasure hp='..run.hp)
+ end
```

诊断 Lua SHA-256 为 `68dcfbc993526b6b41ad7dd4c5a09a24dba19ebe3c751311dafc67df504b2df0`。以原次运行生成的 `entry.lua` 为输入，只将最后的 `dofile` 改为此诊断脚本的绝对路径。生成数据、布局、启动种子不变，从对应检出执行 `LUA_INIT= LUA_INIT_5_3= timeout 600 node node_modules/fengari-node-cli/src/lua-cli.js <diagnostic-entry.lua>`。诊断保留未经编辑的 stdout 和 stderr。

三个诊断运行均核验了第 17 层自动宝箱并进入第二幕。它们在第 784 个动作于第 28 层商店点击 `shopView/removal` 时，同样收到 `unavailable_action`，尚未达到两幕正式胜利。相同筛选口径下，三者 2,321 行逐字一致，SHA-256 为 `7267a089978b0d36f9a0d2686559e8e7fc90bf1de6f9af0ba460957ced77c5f0`。

| 诊断样本 | 原始 stdout SHA-256 |
| --- | --- |
| 基线关闭 | `0be1c0177a21767d5fbe9724eff4805b95d050ce917f21adc60cad3206d9cbb6` |
| T01 关闭 | `0be1c0177a21767d5fbe9724eff4805b95d050ce917f21adc60cad3206d9cbb6` |
| T01 启用 | `5f0364e6a54a8da2cb7b0efbfc00e6044b07420682c771446a84c3789471fd8d` |

## 已交付切片的临时源码组合

临时提交 `9c6d6bb771ace69e18a86d87e54895acc35b696c`，树 `d0a920d8897822e57e4180f5003993103468ed02`。基于 T01 `c146228299be6953efa0a933a3bff0294eb19bca`，依序 cherry-pick 下列 Fork A 来源。此组合为定向验证，T04 种子输入和展示、T05 应用入口均待接入。

```text
22061c493016f6f6636374418b39361beba6af6a
e4db6f20d9b6018604f108075554fb020dfe1a72
80f1e0479e1543833544f4c2f817986b1da7154d
05b2b05af6f53dd7a64d0c3090f9c33c1c03d40d
26c2001cb2a2e94aea183c556ae58dd107b5cbed
40d8520f40fdfd9a6798430c1aac5555caec8c1a
2ae63513518841384a3ae40bdcc9ebcb11b18c84
24513b6c0cd0fdc31179f28aaac68b0b5a96352b
37c3c9497fe9aedf6f3b1c6dcc369a309c2a88a0
e0f761fb6d492ed64cc1c026f61cbc6de16eb695
51ff00622ec22648f6629a15d37a7eb800bb1d6f
```

`npm run build:data`、`npm run build:ui` 与 `node scripts/map-ui-layout.mjs` 通过。依次执行 `node scripts/test-lua.mjs tests/lua/<fixture>.lua`，八组均通过。

- `ascension_start_config`、`ascension_enemies_act1`、`ascension_enemies_act2`
- `ascension_rewards`、`ascension_act_healing`、`ascension_opening_player`、`ascenders_bane`、`ascension_progress`

`node --test --test-concurrency=1 tests/ascension-map-density.test.mjs tests/ascension-selection.test.mjs` 6/6 通过，覆盖两幕精英分布与 A0、全层级地图准入、关闭构建、四种视口的选择按钮和锁定状态。T01 新增历史来源对照在后续注册模块后会报 `config/architecture.json` 绑定变化；此组合未运行 Full，也未替换原有门禁。

## 官方素材的离线输入计数

用原样离线战役生成目录执行 `node scripts/platform-load.mjs daily .artifacts/t06/a0-<case>/generated`。生成使用 `officialAssets:true` 和 `nativePageLifecycle:true`。

| 样本 | 映射 Lua 模块 | Lua 字节 | 布局 JSON 字节 | 模板 JSON 字节 | 控件 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 基线 | 386 | 5,511,922 | 4,105,138 | 181,816 | 26,714 |
| T01 关闭 | 387 | 5,515,356 | 4,105,138 | 181,816 | 26,714 |

阶段组合的相同离线检查报 `Unreferenced production modules: abyss_ascension_progress`，当时尚无 T05 应用入口引用该独立模块。实际 GIL 和官方存档面板须在同一正式候选上测量。

## 待正式候选验收

A14 的自然两幕通关、代表性难度的完整随机和玩家指定种子回放、连续同局的正式进度写入、Windows 千星编辑器与 PC、手机操作仍待相应证据。正式跨实例读回依赖 TASK-53 的平台层及同关卡独立实例。确认官方面板不超过本版 19 MB 内控线与 20 MB 平台上限，并满足仓库现行更早的容量预警和 3 MB 服务器上限。保持默认开关关闭。仅在 v2.3.0 候选通过 Full 和同候选验收后启用。

[平台契约](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/1083) · [TASK-53 恢复记录](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/1081)
