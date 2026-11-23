# 千星原生 UI 与动画 A/B · 2026-11-23

| 组别 | 当前结论 | 依据 |
| --- | --- | --- |
| A 按钮 | 预设按钮继续承载四态。精简现用预设子树可复验。拉伸底板保留候选，服务端自定义按钮排除出本轮 Lua 路径。 | 现有样本本身就是原生预设按钮。精简后 77 → 69 控件，拉伸样本为 17 控件。切片素材元数据和官方画质待验。 |
| B 入场 | 当前商店滑入可进入独立官方客户端复验。选角直接替换为当前两种 Tween 候选为 NO-GO。 | 商店的公式、时长和两条轨迹在 30/60/120 Hz 的 SDK 样本中一致。选角错时和收敛轨迹发生偏移。 |
| C 宝箱 | 局部装饰效果保留候选。发光缩放组合为 NO-GO。 | 资源 ID 与生命周期可离线观察，组合改变发光轨迹。奖励流程继续由现有业务逻辑持有。 |
| D 返回地图 | 当前 Tween 遮罩候选为 NO-GO。 | 准备门禁、取消和输入解锁步保持一致，揭幕首个亮度变化延后一采样步，最大相差 19/255。 |

## 范围与来源

- 实验基线从上游 `develop@73c21489efaab409d4c0c46bee517d410d3427fc` 取样。冻结 Release `03b48260e238e63ba14ac82eb6e14914de885338` 仅作只读对照。其商店动画模块与基线逐字节相同。Release 的 PageReveal 另外持有场景时长、灰底和开场字幕，当前 develop 的日常页面采用黑色遮罩与 0.35 s smoothstep，并保留准备、确认、发布和解锁阶段。设备结果只能归入被测试的提交与路径。 [开发基线](https://github.com/FurinyaWorks/Slay-the-Heavens/tree/73c21489efaab409d4c0c46bee517d410d3427fc) · [Release PageReveal](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/03b48260e238e63ba14ac82eb6e14914de885338/src/lua/abyss_page_reveal.lua)
- #553 的真实 PC 日志曾见原生 Tween 完成和局部调用数变化，曲线和时长不同。#565 证明旧版现成组件可经 GIL 读回并在 BeyondSimulator 走通菜单到战斗。两者的可用边界已保留。#613 的 NO-GO 限于打牌后缩放消散的 SDK 相位与隐藏端点。#811 已合入圆角四态，给本轮提供真实 A 树。 [#553](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/553) · [#565](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/565) · [#613](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/613) · [#811](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/811)
- 当前选角按现有 PageReveal 发布，固定基线没有独立滑入控制器。选角数值对照引用同行的候选提交 `ee9aa850`，取其衰减率、阈值和距离，并用一参考步错开确认和资料组以量化调度。它是轨迹约束探针，当前正式选角的状态与输入回归另外运行。商店在途重做也采用 STS1 递推，本轮商店通过只适用于当前 0.30 s 三次缓出。 [选角与商店现有设计](https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/blob/426a4dcd59d23aa64df59249557806ddcad82fa1/docs/plans/2026-11-23-ui-entrance.md)
- 官方客户端 Lua 可以对位置、缩放和图片 `imageColor` 使用 Tween。Sequence 可 Insert、Append 并在结束或取消时管理句柄。官方预设按钮指向四个子节点，通过 `interactable` 和光标事件进 Lua。三宫格和九宫格同属 `Stretch`，角保护方向取决于图片资源。服务端自定义按钮的通用交互由玩家节点图收取，只有技能模式可配自定义禁用态。现有 Lua 职责仍由客户端预设按钮承接。 [客户端 API](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhtakr07vej4) · [预设按钮](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhdbkf04v6y8) · [图片](https://act.mihoyo.com/ys/ugc/tutorial/detail/mh2oih9jou22) · [自定义按钮](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhtpwgitsigc)
- 使用 `FurinyaWorks/genshin-miliastra-mcp@59c576e4` 的源码、官方指南快照、`miliastra://workflow`、`miliastra://platform-rules` 和原生写入测试。该工具可在 Linux 写入副本和读回 11 类客户端控件。其 `scene_add_button` 写入服务端交互按钮。项目现有适配器负责 Gallery Stretch 的存档字段。官方自动试玩路径依赖可操作的 Windows 国服千星客户端，截图采样间隔也粗于逐帧轨迹。实际运行其已有原生控件写入测试通过。 [MCP 源码](https://github.com/FurinyaWorks/genshin-miliastra-mcp/tree/59c576e41632a6bf6781bbca83a676d0da0374ec) · [控件写入测试](https://github.com/FurinyaWorks/genshin-miliastra-mcp/blob/59c576e41632a6bf6781bbca83a676d0da0374ec/tests/scene-client-ui.mjs)

## 实验身份

每个变体使用同一个 MCP 编辑器训练夹具的本地副本。原夹具界面和脚本在副本内移除，再写入同一份正式生成树的代表性子树。保留商店货架和一个卡槽、部分选角资料、宝箱和奖励行、地图底板和真实 PageReveal 遮罩。三个 GIL 经过存档重读，五个脚本源文件逐字节一致，原生静态检查均为 0 错误、9 条跨模块自定义方法告警。完整哈希、预设按钮和控件记录计数见构建收据。游戏正式构建和 RC 与这些样品各自独立。

SDK 使用已发布的 `beyond-simulator-mcp@0.5.2` Worker，固定 SHA-256 `de72d4f8…fe09d`。这份字节与 #613 的私有 SDK 导出各自固定。以实际 GIL 读回树和脚本投影为输入，复用仓库基准的手动步长和 SDK 观测思路。记录 Linux 与 Node 实际版本。截图由既有 MCP 软件渲染路径取得。素材服务返回 403，截图中的占位边框保留，视觉结论以轨迹和可观察的最终布局为限。 [构建收据](build.json) · [原始回放](replay.json.gz) · [截图回执](shots/manifest.json)

## A 按钮与外观

同一退出确认按钮尺寸 320 × 64、同字样、同四态和同一组输入。在 SDK PC 与触屏画布上，三种树均接收中心点击，拒绝拖出后抬起和禁用点击。既有按钮和精简版使用同一套圆角、两层描边和按压缩放。SDK 0.5.2 的映射保留默认层，悬停、按下和禁用层覆盖其上。SDK 动态禁用后借一次指针移动触发禁用态重绘。记录保留这一离线刷新边界。

| 候选 | 实际 GIL 子树记录（含按钮本身） | 离线结论 |
| --- | ---: | --- |
| 当前多图拼装 + 预设按钮 | 77 | 四态均由已有预设登记。 |
| 同预设删掉隐藏旧外观 | 69 | 减少 8 条记录，保留当前四态外观值。 |
| 同预设搭配两层 `106030` Stretch | 17 | 减少 60 条记录。素材切片边距和原生描边效果待验证。 |
| 官方三宫格与九宫格 | — | API 和官方说明已核对。可用 Atlas 的切片元数据未取得，当前仅有通用 Stretch 写入读回，无法分别给出真机结果。 |
| 服务端自定义按钮 | — | 官方交互边界和 MCP 交互按钮入口已核对，未加同步桥。 |

按钮单树挂载用 12 轮交替顺序计时，统计只包含 SDK 启动该树的开销。按钮实际点击至画面的延迟、轴向切片、圆角抗锯齿和手柄聚焦仍待设备测量。 [正常](shots/lua-buttons-normal.png) · [悬停](shots/lua-buttons-hover.png) · [按下](shots/lua-buttons-pressed.png) · [禁用](shots/lua-buttons-disabled.png)

## B 商店与选角

商店复用本基线的 `(1-p)^3`、0.30 s、画布下限和返回按钮终点。起点在触发时写入。A 用 Lua 更新，B 用两个 OutCubic Tween，另一版把两条 Tween 插入一份 Sequence。PC 30/60/120 Hz 和 SDK 手机画布 60 Hz 都跑了首帧、到位、连续中断重进与动画中销毁会话。商店最终位置为货架 Y=0、返回 X=−510，三版在各自步长下的轨迹实际误差低于 1e−9。序列的总完成回调与两个单 Tween 聚合回调均只完成一次。

选角保持同一结束坐标。OutExpo 只是现有有限缓动中用于对照的候选，项目的衰减递推在换人、迟到启动和按阈值吸附时存在不同语义。30 Hz 下，单 Tween 资料晚一帧启动后的最大位置差达到 100 个画布单位。Sequence 能表达插入时间，30 Hz 的资料最大偏差降至 1.99 个单位，仍有约 13.81 个单位的按钮偏差。商店挂载成本和 Lua 写入变化不能外推到选角的整页资源准备。 [商店 100 ms A](shots/lua-shop-100ms.png) · [Tween](shots/tween-shop-100ms.png) · [Sequence](shots/sequence-shop-100ms.png) · [商店最终](shots/tween-shop-final.png) · [选角 A](shots/lua-character-100ms.png) · [选角 Tween](shots/tween-character-100ms.png) · [选角最终](shots/tween-character-final.png)

## C 宝箱与局部动效

A 使用当前 `abyss_node_ui_motion.lua`。B 把同一个 `burst` 图像替换为局部 UIAnimationControl，使用目录中的 `10001077`「装饰效果1」，126 × 118，非循环，目录时长 1.1 s。候选在原有 0.16 s burst 窗口内播放，关闭音效并置于控件下层。组合版另用 Sequence 驱动原有 glow 的两段正弦缩放。开盖、奖励行、提示及音效触发仍由原 Lua 负责。SDK 宝箱动作围绕同一奖励快照，既有真实 Run 事务则由宝箱回归覆盖。60 Hz 下两份 B 的局部实例从第 22 步记录到第 31 步，结束时效果实例为 0。

组合版 glow 的最大缩放偏差为 0.1305，首个 burst 采样存在相位差。三版都在 1.133 s 完成，采样结束时只保留开盖和初始选中的奖励行，glow 缩放回到 1。FullscreenUIAnimationControl 仅验证隐藏记录、类型读回和无效果实例。未配置全屏素材，未播放全屏效果。软件 PNG 不含动效视频帧。局部媒体解码、亮度、混合、是否在原窗口内出现和设备端释放待验。 [界面动效](https://act.mihoyo.com/ys/ugc/tutorial/detail/mh2iyk9fa4gy) · [全屏界面动效](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhbn4i09l5ns) · [动效目录](https://github.com/1475505/miliastra-beyond-simulator/blob/d8b4af360a7404167e968b464d04272ca0a82717/studio/assets/ui-vfx-data.json) · [450 ms A](shots/lua-treasure-450ms.png) · [局部动效 B](shots/tween-treasure-450ms.png) · [宝箱最终](shots/sequence-treasure-final.png)

## D 返回地图

对商店和宝箱奖励执行同一套返回、取消、重复提交和目标准备延迟脚本。A 使用原 PageReveal 模块。两版 B 只替换 veil 的绘制出口，Sequence 完成回调观测动画结束，保留 Gate 对页面发布和输入的控制。SDK 每个变体每种路线执行 20 次，均在遮罩 alpha 255 后换目标，保持黑色直到目标获准，随后在放行 ready 后第 23 个 60 Hz 采样步解除输入遮挡。遮挡期指针由原 blocker 接收，取消回到源页，快速切往商店取消旧句柄。

InOutSine 与原 smoothstep 的淡出最大差为 3 个 alpha 色阶。揭幕多保持了一个采样步的纯黑，且最大差为 19 个色阶。尾部原 Gate 到期时写入透明端点，B 从 alpha 5 直接到 0，A 从 2 到 0。以现有的视觉要求，保留 Lua 路径。样品用受控 readiness 和页面树，覆盖实际 Gate 的生命周期。整局商店交易与领奖地图返回仍需在同一候选上跑真实客户端。 [揭幕 A](shots/lua-map-reveal.png) · [Tween](shots/tween-map-reveal.png) · [Sequence](shots/sequence-map-reveal.png) · [关键轨迹图](trajectories.png)

## 计量

同一按钮树单独挂载，移除实验脚本。每组 12 次按轮轮换启动顺序。统计包含模拟器挂载和起始快照开销。

| 按钮树 | SDK 挂载墙钟 P50 / P95（ms） | 进程 CPU P50 / P95（ms） |
| --- | ---: | ---: |
| 当前多图子树 | 4.859 / 12.044 | 4.892 / 19.653 |
| 去掉隐藏旧外观 | 3.189 / 8.548 | 3.403 / 8.586 |
| Stretch 子树 | 2.994 / 9.538 | 3.400 / 9.609 |

各版均写入 1,037 条完整实验控件记录，SDK 运行树各 1,036 个节点。相应 GIL 外层容器由投影使用的 SDK 宿主消费。动画期间观测树数量稳定，未观察到动态控件增减。三版在动画进行中关闭会话后，SDK 运行树均为 0。生命周期与关闭后的树记录只适用于 SDK。

下表每格为 A / 单 Tween / Sequence。比较 PC 60 Hz 的首次完整轨迹。两条返回路线使用同一计数口径，含一次取消及一次成功返回。

| 控件与指标 | Lua A / Tween B / Sequence B |
| --- | ---: |
| 商店货架与返回按钮 · 非 Tween 写后通知 | 38 / 2 / 2 |
| 商店货架与返回按钮 · Tween apply | 0 / 36 / 36 |
| 选角资料和双按钮 · 非 Tween 写后通知 | 122 / 3 / 3 |
| 选角资料和双按钮 · Tween apply | 0 / 117 / 119 |
| 宝箱 burst 与 glow · 非 Tween 写后通知 | 410 / 144 / 76 |
| 宝箱 burst 与 glow · Tween apply | 0 / 0 / 11 |
| 返回地图 veil · 非 Tween 写后通知 | 74 / 12 / 12 |
| 返回地图 veil · Tween apply | 0 / 65 / 65 |

写后通知来自 SDK 控件 `markPlayDirty`，按是否处在 Tween apply 内区分。单次 apply 可能写多个字段。可见性更新和按钮状态也会通知。原始回放包含 `PlayAnimation`、`StopAnimation` 和 Tween 生命周期调用，由计数测次单独记录。商店连续成功入场的两处 Lua 位置写入从 38 次减至 2 次初值提交，36 次更新由 SDK Tween 执行。物理引擎调用、真实创建成本及分配时间需要官方 profiler。

无观测器计时采用 6 轮轮换顺序。计时只包围 SDK `step`，不采集截图或布局快照。CPU 为进程 user + system，包含 GC 干扰。每个场景的长步阈值为墙钟 16.7 ms。

| 场景 | 步数/版 | 墙钟 P50 / P95（ms） A · Tween · Sequence | CPU P50 / P95（ms） A · Tween · Sequence | 超过 16.7 ms A / Tween / Sequence |
| --- | ---: | --- | --- | ---: |
| 商店货架 | 108 | 0.028 / 0.089 · 0.022 / 0.099 · 0.017 / 0.075 | 0.029 / 0.109 · 0.023 / 0.110 · 0.018 / 0.081 | 0 / 0 / 0 |
| 选角轨迹 | 264 | 0.030 / 0.062 · 0.023 / 0.109 · 0.016 / 0.058 | 0.031 / 0.072 · 0.024 / 0.116 · 0.017 / 0.062 | 0 / 0 / 0 |
| 宝箱 | 420 | 0.171 / 0.372 · 0.162 / 0.361 · 0.156 / 0.358 | 0.172 / 0.488 · 0.163 / 0.418 · 0.157 / 0.401 | 0 / 0 / 0 |
| 商店返回 | 336 | 0.051 / 0.143 · 0.052 / 0.154 · 0.052 / 0.141 | 0.052 / 0.180 · 0.053 / 0.159 · 0.053 / 0.156 | 0 / 0 / 0 |
| 宝箱返回 | 336 | 0.050 / 0.119 · 0.051 / 0.175 · 0.052 / 0.142 | 0.051 / 0.130 · 0.052 / 0.177 · 0.053 / 0.146 | 0 / 0 / 0 |

开场挂载、最大值、长步及完整端点见原始回放。计时量级小，候选间尾部有波动。没有官方 FPS、帧时、GPU、资源内存或点击至呈现延迟的结论。两个 Tween 共用的实验生命周期代码处理句柄、取消和迟到回调，Sequence 减少商店同时启动的句柄数量。C 对照只改 burst 和 glow 表现，D 对照保留原准备逻辑并新增遮罩句柄管理。以保存后的 Lua 逐行比较，C 的局部资产版新增 5 行、删除 4 行，组合版新增 11 行、删除 5 行。D 在两份 B 中各替换 1 行绘制出口，额外的句柄管理写在共享实验探针内。生成器、探针和观测器的增量只用于本次实验。五个 Lua 模块的行数和散列见构建收据。

## 设备与交付边界

| 证据层 | 本轮取得结果 |
| --- | --- |
| 源码及官方 API | 四组已核对，包含冻结 Release 实现、历史 PR、平台能力、MCP 写入和原生四态存档记录。 |
| 离线 SDK／模拟器 | 同源 GIL 的三个变体，PC 画布 30/60/120 Hz 控制轨迹，手机画布 60 Hz 和合成指针，20 次 × 2 路线 × 3 变体。软件截图含图库占位。 |
| 官方客户端 PC | 未实测。云环境无官方 Windows 沙箱、客户端或本轮可用的真机输入会话。历史 #553 的 PC 结果只保留作来源。 |
| 官方客户端手机及手柄 | 未实测。无实体设备帧时、输入延迟、触控手势或手柄聚焦结果。 |

`MILIASTRA_ALLOW_LIVE_WRITE=0`。从已知训练夹具构建的 GIL 留在隔离工作区。Git 中保留实验源码、构建收据、回放和截图。正式发布、CD、当前线上奇域、正式候选以及上游 ref 无写入。Fork A 的 Draft PR 以该 Fork 的现有 develop 为比较目标，通过固定上游 SHA 可单独核对实验改动。

## 复现

在仓库根目录运行。准备上述固定 MCP 版本及其依赖，以及 `beyond-simulator-mcp@0.5.2`。已有 LFS 资源须按仓库工具链恢复，正式布局会校验其哈希。GIL 写入目标为新建的实验输出目录，构建入口校验 MCP 训练夹具路径和 SHA-256。

```bash
export MILIASTRA_ALLOW_LIVE_WRITE=0
node scripts/build-ui.mjs build/official-ab --official-assets --native-page-lifecycle
node experiments/native-ui-animation-ab-20261123/build.mjs "$MCP_ROOT" \
  "$MCP_ROOT/tests/fixtures/editor-2026-10-13-clientkinds.gil" .artifacts/native-ui-ab-20261123
node experiments/native-ui-animation-ab-20261123/replay.mjs .artifacts/native-ui-ab-20261123 "$BEYOND_MCP/dist/worker.js"
ART_LAB_MCP_ENTRY="$BEYOND_MCP/dist/index.js" QXQY_IMAGE_CACHE_DIR="$AB_CACHE" \
  node experiments/native-ui-animation-ab-20261123/capture.mjs .artifacts/native-ui-ab-20261123
```

训练界面用键盘 1 回按钮、2 开商店货架、3 选角参考轨迹、4 宝箱、5 商店返回路线、6 发起返回、7 宝箱返回路线、8 释放地图 ready、9 取消或回按钮、0 切换按钮禁用。实验版本的逻辑和生产运行入口处于独立目录。
