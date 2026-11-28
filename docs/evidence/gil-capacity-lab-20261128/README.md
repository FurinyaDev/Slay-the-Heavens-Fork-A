# GIL 容量专项实验

主仓最新开发基线为 `32a15219aecd145c59cb1b2fcf477e5556766e5d`。线上千星 2.02 对应工程 v2.1.1，由 Owner 确认在 2026-11-25 上线。正式有声原件来自发布归档，实际构建源码 `06c2577ecc6c07593c6bf8b6e79e158dac5b6195`，与发行 Tag 对应 Git 树一致。归档回执有 buildId `29f48ea1-fa9d-4f76-b124-2bffc83f7594` 和 SHA-256 `afe80c0783d0d4b6046c1f44cba3ef2b71cb8bb34fbc7404d939d12e0f5ff831`，缺 `payloadDigest`、官方上传回执和同包面板。 [正式发布](https://github.com/FurinyaWorks/Slay-the-Heavens/releases/tag/v2.1.1) · [归档回执](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/3f79269e90a8f2507f6782135563ecf573b357d7/docs/evidence/v2.1.1-2026-11-25/build-receipt.json)

在审计点，`release/v2.2.0` 指向 `1cc7be3792a58e247fd446744772646dd6ae4619`。GIL 工作流在缺少同 SHA 的 Hosted Quality Full 及精确 checkout 回执时止于源码准入，构建、读回、上传均跳过，工件数为 0。该 SHA 的性能运行只执行 Offline Host 诊断。正式 v2.2.0 GIL、同包官方容量、上传与设备证据均为 **UNVERIFIED**。 [GIL 工作流运行](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45995230812) · [性能运行](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/46002718092)

## 正式原件的物理账本

| 互斥分项 | 文件字节 | 文件占比 | 来源 |
| --- | ---: | ---: | --- |
| 原生静态布局 | 18,488,972 | 77.74735% | 客户端界面、根记录、已挂载控件 |
| 客户端模板 | 1,085,810 | 4.56590% | 16 个定义、1,392 个定义控件 |
| 一般 Lua 及脚本记录封装 | 3,350,331 | 14.08836% | Lua 代码、其余数据、模块记录元信息 |
| 专用美术模块 Lua 源文本 | 805,553 | 3.38740% | 480,174 怪物图元 + 325,379 旅者图元 |
| BGM 图与桥接 Lua | 14,078 | 0.05920% | 83 节点服务器图 13,193 + 脚本文本 885 |
| 其余字段与容器 | 36,094 | 0.15178% | 文件头尾、其他节点图、底图及 UI 辅助记录 |
| **完整有声 GIL** | **23,780,838** | **100%** | 27,892 个连续无重叠区间 |

布局和模板合计 19,574,782 B，占 82.31326%。物理 UI 段 `#9` 为 19,577,951 B，其中额外 3,169 B 已归入「其余」行。布局的 `nodePanel` 为 7,386,253 B / 9,600 控件，`battlePanel` 为 4,699,476 B / 6,145 控件，两者合计占全包 50.82%。24,127 布局控件中 22,250 个初始逻辑隐藏，对应 16,927,476 B。隐藏包括随流程打开的玩法页。专用美术行只计怪物与旅者两份模块。主题中的事件图形、表现及章节场景等混合模块归一般 Lua，原生图像控件随其布局或模板归类。BGM 行计项目控制图与 Lua，实际音频由宿主资源 ID 引用。 [原件区段及子树读回](production-capacity.json)

旧公开底图对照的 23,777,846 B 与正式原件相差 2,992 B。二者 UI 段等长，同一分组控件数和字节数一致，区段 SHA-256 各异。旧对照的细分测试继续沿用原候选身份。 [公开底图对照](../v2.1.1-performance-20261125/capacity/PLATFORM-GIL.md)

## 最新源码的构建输入与审计

| 阶段 | `32a15219` 的离线值 |
| --- | --- |
| 仓库跟踪输入 | `src/lua` 369 文件 / 3,215,139 B，`data` 39 文件 / 6,730,397 B。包括开发和历史输入，资产另按生产配置选入。 |
| 生成数据 | `abyss_data.lua` 213,377 B，`abyss_original_v4_data.lua` 577,904 B。原创 V4 在比赛配置中落为 64 B 失败即停桩。 |
| 脚本映射与编码 | 386 模块，编码前 6,026,827 B，`competition-lua-v3` 后 4,232,788 B。入口构建标记、原生记录封装和 BGM 装配另计。 |
| 原生布局输入 | 3,987,360 B 紧凑 JSON，24,904 控件。`nodePanel` 9,677 控件 / 1,708,824 B，`battlePanel` 6,276 控件 / 1,001,604 B。 |
| 模板定义输入 | 231,957 B 紧凑 JSON、16 个定义、1,392 控件。含模板共 26,296 控件，其中 23,907 初始逻辑隐藏。 |

- 普通 `check:platform-load` 走日常 UI 配置。生产 v3 精绘和原生页面生命周期必须通过正式构建配方启用。编码 AST 检查覆盖函数中的 `require`。当前映射无不可达模块、相同 Lua 内容、相同模板名称/内容或同层重名控件，直接子控件数均在 60 以内。旧 `abyss_random` 显式排除。当前完整模板集合的独立验收还需关注 Forge 模板和旧定义遗留，命名白名单未覆盖的项应按实际装配读回核对。 [构建脚本清单](../../../scripts/native-candidate-scripts.mjs) · [模板审计](../../../scripts/audit-native-candidate.mjs)
- 叶控件忽略名称后有 17,704 个重复配置实例。36 棵 `stsReferenceChrome` 含 7,884 控件 / 1,583,424 B 紧凑 JSON，36 棵 `stsReferenceBack` 含 1,512 控件 / 222,984 B。相同配置仍可能有不同父节点、生命周期和交互。现行模板共享覆盖牌库部件和怪物宿主。曾把静态卡面改为原生模板引用，离线 GIL 减少 6,582,087 B，Simulator `GetChild` 无法进入引用，故该路径保持 **NO-GO**。 [历史模板负例](../release-resource-20261122/README.md)
- `officialBattleBackdrop` 在 v3 仍生成 10 控件 / 900 B 紧凑 JSON。当前章节战斗场景先于旧背景回退返回。`experimentalCharacters` 与 `nativeMonsterArtEnabled` 原生参数未见当前脚本读取，前者的同名构建开关和后者的美术配置仍有用途。两处留作小额诊断，兼容及回退场景继续保留。 [战斗背景构建](../../../scripts/official-assets-layout.mjs) · [战斗场景读取](../../../src/lua/abyss_game_ui_view.lua) · [原生参数](../../../scripts/native-candidate-scripts.mjs)
- 历史 #890 以同底图实际 GIL 测得 −1,207,998 B，包括 1,305 个不可达边框子控件及未开放数据桩。#808 实测 −928,997 B，初始实现带来 eager 解码开销，后续把怪物解码推迟到首次使用。保留现行无用项剔除和紧凑表示，继续单列首战及尾部表现。 [#890](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/890) · [#808](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/808) · [历史性能复测](../v2.1.1-performance-20261125/README.md)

## 当前开发源码完整有声复建

Linux 离线使用上文正式原件作固定底图，按现行工作流锁定 `8itlab/genshin-miliastra-mcp@70470757d6fcb319c5afec13b178c87f2d8d54b3`，采用 v3 精绘、原生页面生命周期及 `offline-candidate`。最终 SHA-256 `e650b32e6c8aca555ebfcbfa9e64ab55712b440b2b4f2da929a93baf9a2e36ba`。逐一验证 386 个模块的打包字节及摘要，28,735 个连续无重叠物理区间覆盖文件。现有 `verifyPublishedRebase` 确认底图只有原生 UI/信号、节点图、Lua 的 #9、#10、#50 字段变化。独立 `audit-native-candidate --bgm` 返回 0 issues。原生静态检查有 0 errors 和 465 个警告，读回前后文件 SHA-256 一致。 [本轮离线候选与读回](candidate-capacity.json) · [正式构建方式](../../GIL-CANDIDATE.md)

| 互斥分项 | v2.1.1 正式归档 B | `develop` 离线复建 B | 差值 B |
| --- | ---: | ---: | ---: |
| 原生静态布局 | 18,488,972 | 19,060,842 | +571,870 |
| 客户端模板 | 1,085,810 | 1,085,937 | +127 |
| 一般 Lua 及记录封装 | 3,350,331 | 3,451,339 | +101,008 |
| 专用美术模块 Lua 源文本 | 805,553 | 805,553 | 0 |
| BGM 图与桥接 Lua | 14,078 | 14,078 | 0 |
| 其余字段与容器 | 36,094 | 36,094 | 0 |
| **完整 GIL** | **23,780,838** | **24,453,843** | **+673,005** |

本轮布局和模板合计占 82.39%。节点页 7,445,329 B，战斗页 4,801,482 B。布局主要增长来自牌组 +139,713 B、菜单 +110,233 B、战斗 +102,006 B。24,904 个布局控件中 23,027 个初始逻辑隐藏，计 17,499,341 B。差值用于定位版本增长，两个包之间还有其他源码变化。 [阶段输入明细](develop-inputs.json) · [文件及控件明细](candidate-capacity.json)

## 隔离优化 A/B 与决策

| 变量和量纲 | A | B | 差值与决策 |
| --- | ---: | ---: | --- |
| 正式归档副本，同步设备矩形压紧，物理 GIL | 23,780,838 B | 16,211,294 B | −7,569,544 B（−31.83%），**NO-GO** 正式采用 |
| 当前开发复建，同步设备矩形压紧，物理 GIL | 24,453,843 B | 16,662,115 B | −7,791,728 B（−31.86%），**NO-GO** 正式采用 |
| 编辑器来源的小型夹具，同一矩形实验，物理 GIL | 52,586 B | 47,483 B | −5,103 B，18 个有独立设备状态的矩形未改动 |
| 只去掉第三幕事件图形，打包后的 `abyss_theme` 文本 | 502,950 B | 457,371 B | −45,579 B，**GO** 进入原生 A/B，正式采用待验 |
| 只去掉未开放职业遗物池，打包后的 `abyss_data` 文本 | 98,453 B | 78,943 B | −19,510 B，源码诊断，正式采用待验 |

矩形实验只在 `syncAllDevices=1` 且四个状态的矩形内容逐字节相同时移除后三份。两组大包与夹具都能逐字节恢复各自 A 文件，非 UI 顶层区段完全相同。当前复建有 26,298 条矩形记录符合条件，归一化后的 24,904 个主布局控件和 16 个模板定义一致。社区 MCP 只在有独立或不同设备状态时返回覆盖字段，这个读回无法检验官方对缺省设备项的处理。官方编辑器导入、重存、各设备画面、点击区域、加载及内存均为 **UNVERIFIED**。 [可执行矩形实验及三份回执](../../../experiments/gil-rectangle-wire/README.md)

第三幕实验从生成主题的 49 个事件图定义中去掉 7 个，共 419 个图元。当前正常比赛入口只允许两幕，事件渲染按当下事件 ID 查图，七个事件均有第三幕限制。未开放职业遗物池只在当前入场白名单之外的职业初始化读取。保留完整源码和数据，后续构建投影需以实际开放范围及存档恢复测试为准。本轮未将两个投影装入 GIL。 [第三幕 A/B 输入与摘要](act3-event-art.json) · [赛事入场白名单](../../../src/lua/abyss_run_admission.lua)

## 四角色增量与预算

《杀戮深渊》是同一游戏的旧名。旧 GitHub URL 与 Slay-the-Heavens 均解析到仓库 ID `1429751262`。本轮可核实一款游戏的一个生产版本，Alpha 是同项目的部署通道。当前生产比赛入口为岩系旅行者，探针加入雷电将军、胡桃、阿蕾奇诺，保留两幕规则及正常卡组成局。 [项目更名与发布通道](../../PUBLISHING.md)

| 增量维度 | 离线测量 | 四角色预算使用方法 |
| --- | --- | --- |
| 玩法运行时与入场 | 共享机制模块已打包；探针放宽白名单 +93 B packed Lua | 已有机制的增量可测，新机制或正式接线另计 |
| 冻结卡池 | 第 1、2、3 个新角色依次 +48,502、+43,179、+42,945 B packed Lua，共 +134,626 B（225 张） | 使用累加臂；首臂包含恢复模块的共享固定成本 |
| 四个原创角色对照 | 第 4 套另 +45,700 B；300 张整库 180,390 B，比四个独立库少 20,776 B | 验证共享字段的非线性；主四角色方案使用三套新增卡池 |
| 选角详情层 | 单层到四层 +49,707 B 紧凑 JSON / +336 初始隐藏控件；模板和现有画像 Lua 不变 | 仅 UI 构建输入；独立测最终布局记录 |
| 选角立绘 | 岩旅参照只开选角为 258,122 B packed Lua，含 457 与 1,600 图元两项 | 新角色批准版选角立绘均缺，正式边际 **UNVERIFIED** |
| 战斗立绘 | 岩旅只开战斗为 71,077 B，含 464 图元；两项共装 325,352 B，扣除 44 B 空模块后共享 3,803 B | 新角色批准版战斗立绘和绑定未就绪，正式边际 **UNVERIFIED** |

Fengari 探针对四个角色通过选角确认、10 张起手牌、原创专属遗物、出牌、受控第一幕跨幕、第二幕首战和受控第二幕完成。正常生产白名单与 64 B 的 Original V4 入口桩保持原样。探针仅在生成物中放行和替换卡池，完整自然回合、正式选角与战斗画面、设备加载仍需最终包验证。 [角色矩阵和原始读数](four-roles.json)

19 MB 预算以 `19 − B0官方关卡MB` 为可用余额。每名角色按卡池和玩法、选角层、选角与战斗立绘分步测同包差额，记录共享宿主的一次性成本，给章节和回归波动保留余量，再用真实四角色最终候选直接验证 ≤ 19 MB。服务器存档另核 3 MB。当前 `B0官方关卡MB`、新增美术、完整 GIL 和同候选性能皆缺，余额与稳定性均 **UNVERIFIED**。**GO** 继续隔离角色原型，**NO-GO** 批量生产和发布。 [TASK-105](../../backlog-details/TASK-105-CAPACITY.md)

## 官方存档与放行

关卡 20 MB、服务器 3 MB 是面板上限，现行内部 16 MB 预警继续适用，本次四角色目标为关卡 19 MB 以内。旧 8.96 / 20 MB 和 0.01 / 3 MB 读数没有同候选身份。旧候选 20.81653 / 20 MB 及 20.97381 / 20 MB 曾被官方校验拒绝。字节账本、截图口径和设备表现各自取证，所有当前实验臂的官方容量均为 **UNVERIFIED**。 [平台负载合同](../../PLATFORM_LOAD.md) · [历史官方拒绝](../native-storage-20261122/README.md)

使用 `npm run verify:platform-load -- <candidate.json> <official-load.json>` 绑定同一最终有声包。验证包含官方导入、关卡与服务器读数、全区域静态负载、四类动态负载、真实启动、PC 和实体手机。加载记录 T0 点击进入、T1 Lua init、T2 ready、T3 首页成功交互，另检查首战、复杂手牌、卡池与牌库翻页、角色切换、重入、图层与输入。PC 和目标手机各记录冷暖与峰值内存，保留超时和不利尾部。 [既有同包验收](../../PLATFORM_LOAD.md) · [设备计时与场景](../v2.1.1-performance-20261125/README.md)

本轮离线验证中，原生启动与 Mock UI 合同通过 5/5，玩法/交互/负载验收合同的定向测试通过 14/14，TASK-105 重放合同通过 7/7。扩大测试集合时，`develop` 为 103/104，`release/v2.2.0` 为 17/18，唯一失败均是历史全源第三及第四幕夹具未等到 native page ready。两幕受控结算和重开合同通过。该失败保留在记录中。独立两幕 Host 重放保持生产源码和生成模块不变，修正诊断驱动的自动宝箱计数和商店就绪等待后，seed 2 验证了 34 个连续楼层、1,090 次动作、两幕胜利及重开。日常原驱动仍在首个自动宝箱之后因计数偏差退出。通过的一轮日志 SHA-256 为 `e8989e593aa96ae088cfb5fd62ce26ed361c192013a7c11949b07e3248250041`。 [原生启动和 UI 合同](../../../package.json) · [失败夹具](../../../tests/lua/full_source_campaign_entry.lua)

性能、加载、内存、玩法和输入的同包设备 A/B 仍为 **UNVERIFIED**。当前 `develop` 默认 Host 的六档真实 cgroup 限额各跑一份样本，6/6 无 OOM。该样本覆盖该主机的对应设置。历史 Lua→标题互动有中位数改善也有首战及冷启动的更差尾部，容量数据不能为新候选的同设备表现背书。 [既有性能分布](../v2.1.1-performance-20261125/README.md)

## 复现命令

在独立干净的 `32a15219` 源码检出运行。先执行 `npm ci --ignore-scripts`，水合 `art/characters/traveler-geo/portraits/avatar96/preview-native-1x.png` 和 `art/characters/traveler-geo/portraits/battle133/preview-native-1x.png`，用 Git LFS 指针校验。按正式工作流的固定版本准备 MCP 及 `build:core`。`lab` 指此报告和脚本的实际目录，`published_gil` 指已核验的发布原件，`mcp_root` 指固定工具检出。所有输出使用独立检出的新目录。

```sh
mkdir -p build
export MILIASTRA_ALLOW_LIVE_WRITE=0 MILIASTRA_MCP_ROOT="$mcp_root"
node --max-old-space-size=2600 "$lab/measure-published-gil.mjs" "$mcp_root" \
  "$published_gil" "$lab/production-build-receipt.json" build/readback-published \
  docs/evidence/v2.1.1-performance-20261125/capacity/capacity.json

npm run build:native -- "$published_gil" build/capacity-develop --work-key=offline-candidate
node --max-old-space-size=2600 "$lab/measure-published-gil.mjs" "$mcp_root" \
  build/capacity-develop/audio/candidate.gil build/capacity-develop/audio/candidate.json build/readback-develop \
  docs/evidence/v2.1.1-performance-20261125/capacity/capacity.json
node scripts/audit-native-candidate.mjs --source "$(git rev-parse HEAD)" \
  --candidate build/capacity-develop/audio/candidate.gil --receipt build/capacity-develop/audio/candidate.json \
  --output build/independent-capacity-audit --bgm

node scripts/build-lua-data.mjs data build/capacity-inputs/abyss_data.lua
node scripts/build-ui.mjs build/capacity-inputs --official-assets --refined-release-monsters \
  --native-page-lifecycle --work-key=offline-candidate
node "$lab/measure-build-inputs.mjs" build/capacity-inputs build/capacity-inputs.json
node "$lab/measure-act3-event-art.mjs" build/capacity-inputs build/capacity-act3-ab
node "$lab/measure-four-roles.mjs" "$PWD" --ui --runtime
```

两幕 Host 重放先执行 `node scripts/verify-official-campaign.mjs --seed 2 --output .artifacts/gil-lab-seed2` 生成输入和 Lua wrapper。保留其原始驱动失败。复制 `scripts/official-assets-campaign.lua` 至独立文件，使用 [驱动补丁](campaign-driver.patch) 修改此副本。把生成 wrapper 的最终 `dofile` 指向诊断驱动，用 `node node_modules/fengari-node-cli/src/lua-cli.js <诊断 wrapper>` 复跑。该步骤使用离线 Host。

本轮使用 Node 24.19.0、Python 3.12.14。Linux MCP 宿主需要可写的 `LOCALAPPDATA` 与 `MILIASTRA_WORKSPACE` 实验目录，并将 `MILIASTRA_SAVE_ROOTS` 设为 `[]`。完整构建生成新 UUID，复建 SHA-256 随构建标记变化。保留本次有声候选与原始收据的路径配对以便审计。矩形对照使用这些候选的副本，见 [矩形实验复现](../../../experiments/gil-rectangle-wire/README.md)。
