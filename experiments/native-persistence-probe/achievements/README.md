# 千星原生成就实验

固定基线 `aaf8008875896f24acc8fda0d4df47df2564ec1d`（`develop`），工具链 `8itlab/genshin-miliastra-mcp@70470757d6fcb319c5afec13b178c87f2d8d54b3` 和 `genshin-ts@0.2.2`。实验供 TASK-45 后续使用。真实平台验收 **受阻、未放行**。MCP 本次报告 `runtimeVerification=not_available`，编辑器连接状态 `not_configured`。两份 MCP 资源已读，`MILIASTRA_ALLOW_LIVE_WRITE=0`。

## 已证实的节点和配置

| 范围 | 官方文档或本轮工具发现 |
| --- | --- |
| 注册 | 官方编辑器「外围系统管理 → 成就」创建普通成就。节点图读取配置中的整数「序号」。官方文档在普通成就示例中列出名称、稀有度、计数、描述。房间组队也要结算时，打开「允许房间内游玩结算成就」。[官方《成就》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mh65jrr2yj3i) |
| 触发 | 服务器节点 `设置成就进度计数`、`增加成就进度计数`，均输入实体、整数成就序号和整数计数。前者赋值，后者在原值上累加。工具映射为 `setAchievementProgressTally`、`changeAchievementProgressTally`，本实验目标为触发玩家实体。[官方《执行节点》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhw66orrrfkm) |
| 查询 | `查询成就是否完成`（`queryIfAchievementIsCompleted`）输入实体、整数成就序号，输出布尔。查询节点清单未找到按成就序号读取原始进度的接口。写节点没有成功回执字段。[官方《查询节点》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhwbqlrw655q) |
| 持久化 | 官方说明同一关卡累积进度跨对局继承。正常结算、异常退出、同会话恢复和编辑器临时试玩之间的实际行为需要逐项取证。[官方《成就》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mh65jrr2yj3i) |
| 极致成就 | 一个关卡可配置一个，至少五个普通成就且极致成就有名称和图片才生效。全部普通成就完成后由平台自动达成。配置总容量需编辑器核实；官方列出的 `50` 对应成就试玩数据上限。[官方《成就》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mh65jrr2yj3i) · [官方《编辑项范围限制》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mh74ae9fsg8i) |
| 权限 | 官方成就页及当前教程未提供奇匠等级门槛。TASK-45 历史附件记载 Lv.2 和待核实的 Lv.4 要求，当前账号的成就权限和编辑器版本留待实机核对。[仓库 TASK-45 附件](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/aaf8008875896f24acc8fda0d4df47df2564ec1d/docs/backlog-details/TASK-45.md) |

官方网站页面为动态渲染，本次从[官方综合指南目录](https://act-webstatic.mihoyo.com/ugc-tutorial/knowledge/cn/zh-cn/catalog.json)和[正文文本映射](https://act-webstatic.mihoyo.com/ugc-tutorial/knowledge/cn/zh-cn/textMap.json)读取原文。正文 SHA-256 为 `00616dc492ea96e52fc5208343179c0133ae3d41832667b835532bb38120f281`。目录包含 2026-11-04 的 7.2 更新日志，实机应登记实际版本。[官方《更新日志》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhs2w008wf14)

## 已完成的离线步骤

1. 确认 `develop` SHA，读取 AGENTS、Backlog 规则、归档 TASK-45、工具链、官方客户端交接及有关 ADR。以仓库 CI 固定 SHA 安装 MCP 和编译依赖，执行 `npm run build:core`。[仓库工具固定入口](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/aaf8008875896f24acc8fda0d4df47df2564ec1d/scripts/gil-candidate-preflight.mjs)
2. 在 Linux 上连接隔离本地 MCP，读取 `miliastra://workflow` 和 `miliastra://platform-rules`，查询三个原生节点签名。该版本 MCP 的工具清单未发现成就配置入口。
3. 用 `run-probe.mjs offline` 构造合成容器、编译 [实验节点图](graph-source.mjs)、注入 GIL 副本，再用 `inspect_map` 读回。空图 0 节点，编译后 39 节点、52 条连线，编辑器估算计数 58。编译器夹具 ID 带明确标记。真实成就序号留空。 [离线收据](../../../docs/evidence/native-persistence-probe/achievement-readback.json)

```sh
node run-probe.mjs offline /path/to/pinned/miliastra-mcp /path/to/new-offline-output
```

## 创作者及自动化交接

1. **创作者**使用 Windows 官方客户端，打开「我的奇域」和编辑器系统菜单中的奇匠权限，截取当前版本、权限条目、成就页签的可用状态或错误。账号需要获得现有成就配置权限；不为本实验推进账号等级。如果权限入口不可用，保留截图并停止实际注册步骤。
2. **创作者**在「派蒙菜单 → 我的奇域 → 新建存档（超限模式）」建立独立测试关卡。打开「系统菜单 → 外围系统管理 → 成就」，打开「是否开启成就」和「允许房间内游玩结算成就」。点右下角「新建成就」后点「编辑」，输入名称「EXP 成就验证」、稀有度「辉铜」、计数 `2`、说明「在隔离测试关卡验证原生成就计数。」。保存并重开记录，截图确认实际「序号」、字段和两个开关。只有一项普通成就，极致成就留空。通过「我的奇域」的存档操作菜单导出测试 `.gil`。[官方《成就》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mh65jrr2yj3i) · [官方《存档导入与导出》](https://act.mihoyo.com/ys/ugc/tutorial/course/detail/mhjuwpiubrh0)
3. **自动化**以实际记录填入 JSON，包含 `basePath`（导出的独立关卡 `.gil`）、`serial`（编辑器整数序号）、`threshold`（`2`）、`testCopyConfirmed`（是否确认为实验副本，应为 `true`）、`registrationEvidence`（已保存的配置截图路径）。本次这些实机输入仍为空。命令会复制输入文件，设置 1 人、添加 6 个原生交互按钮、将服务器探针图挂到玩家模板，取回实际按钮索引和图 ID 后编译写入。保留配置证据、GIL SHA、绑定、图和控件读回。
4. **创作者或获当轮桌面操作授权的自动化**把收据的 `outputMap` 通过官方「我的奇域 → 导入存档」导入为新实验存档。核对导入后的同一成就序号、开关、图和挂载。千星沙箱「窗口 → 日志 → 节点图日志」筛选 `_GSTS_EXP_Achievement`，观察新一轮 `EXP_ACH READY`。正式交付需确保实验按钮和探针图仅留在实验关卡。若测试确实需要已投放的隔离关卡，由 Owner 决定并在游戏内操作。[官方《节点图日志》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhu951iz7wz8)
5. **创作者或获授权的自动化**在「系统菜单 → 试玩」开启试玩结算，按下表采样。临时试玩数据和真实游玩分别采证。临时数据可通过「系统菜单 → 试玩临时数据管理」设置，再在「试玩设置 → 试玩数据」引用。清空或重新指定临时数据会干扰持久性实验，应在记录中注明实际选择。MCP `playtest_start` 使用本轮真实图名、`clientScriptLog: true`、时间安排和 `playtest_status`。未经授权不得占用桌面。人工等待原生结算、刷新与断线恢复，记录实际环境和本轮日志。[官方《试玩》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhie54ik9ovg)

```sh
node run-probe.mjs assemble /path/to/pinned/miliastra-mcp /path/to/new-candidate-output configured-achievement.json
```

### 真实测试用例

使用同一候选、同一平台关卡和同一测试玩家。先从未达成的测试号开始。每个箭头代表一次独立操作，写入后通过后续按键单独查询，并记录实测延迟。原生结算若被试玩模式关闭，则另记录失败原因。每个用例保存时间、版本、服务器、关卡、脱敏账号标识、候选 SHA、成就序号、进入方式、阶段日志与官方画面。

| 用例 | 动作和预期观察 | 本轮 |
| --- | --- | --- |
| 注册和初始查询 | 保存重开配置后进第 1 局；`1` 查询为 `INCOMPLETE`。日志开始前记录真实序号和权限。 | 待验 |
| 同局重复设置 | `2 → 1 → 2 → 1`。两次绝对设置为 1，两次查询均未完成。测试内可观察完成状态，原始进度留待下一步判别。最后按 `6` 正常结算离开。 | 待验 |
| 跨局部分进度 | 第 2 局同玩家先按 `1` 仍未完成；仅一次 `3`（加 1），再以 `1` 查到 `COMPLETE` 并截图官方成就。这个门槛测试区分第 1 局计数保留与重置。记录从写到查询可见的实测时延。 | 待验 |
| 完成态重复 | 依次按两次 `5`（有守卫）记录两个 `ALREADY COMPLETE`，无守卫写入标记；按两次 `4` 原样重投绝对值 2，再 `1` 查询仍完成，核对官方记录及重复奖励/通知。仅布尔结果不足以证明不存在重复副作用。 | 待验 |
| 断线重连 | 使用测试客户端可恢复的网络断开，让同玩家重连同一进行中会话。跳过任何设置先按 `1`，再按 `5 → 4 → 1`。核对连接提示、同一会话、完成状态和官方记录未新增重复奖励。若客户端进入了新会话，记为跨局用例，继续另测真实重连。 | 待验 |
| 持久完成 | 按 `6` 正常结算，离开后在新会话首次查询为 `COMPLETE`，同一账户的官方成就仍已达成；单独记录中断离开后应采用的重试行为。若只有编辑器试玩数据，则生产持久性待验。 | 待验 |
| 单步守卫 | 另用未达成测试账号或独立相同配置的隔离关卡，`1 → 5 → 1 → 5`。应观察未完成、首次写入、完成、重复跳过，核对官方只出现一次达成。 | 待验 |

## 成就接入契约草案

- **数据所有权。** 复用 `abyss_run_scoring.lua` 已有战斗统计、`Run.transaction` 的成功提交边界和现行结算数据。Lua 提供业务事实，平台服务器节点图使用真实玩家实体及编辑器登记的序号存取平台完成状态。客户端信号可传递意图或需核验的事实，UI、动画、客户端按钮和客户端胜负信号本身不能授权正式解锁。当前 `ABYSS_WIN/ABYSS_LOSE` 只驱动原生结算。没有可信事实验证路径时，保留成就写入停用状态。[仓库 ADR 0001](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/aaf8008875896f24acc8fda0d4df47df2564ec1d/docs/adr/0001-coop-and-high-fidelity-primitives.md)
- **登记与输入。** 平台配置记录稳定业务键、实际成就序号、编辑器门槛、候选身份和是否允许房间结算。每条解锁使用已提交事实，至少可关联玩家、业务成就键、业务提交身份。平台桥从可信上下文解析玩家，服务端查配置和可写门槛。缺失映射时保留待处理状态并记录失败。
- **写入与重试。** 首选查布尔完成态，再向平台设置固定达标计数；完成则返回已完成。提交失败或回滚时无平台写入。桥超时、运行时未确认或断线时，重连读平台完成态，允许重投同一绝对值。只有本轮新平台查询返回完成才可确认；“已调用”日志只是追踪标记。跨局累积型条件等已有权威持久化统计具备后，再验证使用其单调的绝对值；跨局或并发重试不能重放无去重的 `增加`，也不能用晚到旧值覆盖新值。当前没有原始进度读取或原子比较交换的官方文档证据，写入顺序和平台防重奖励仍属放行验证项。
- **恢复和展示。** 对局数据恢复沿用既有恢复契约。成就只从平台新查询结果恢复完成态，UI 重建时回读，可根据有权威结果更新。未完成、待确认和已完成的状态在日志中保留区别。正式 TASK-45 的成就树、奖励与极致成就须另走已定设计及官方客户端验收。[官方《客户端控件和客户端脚本》](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhbgxf0nynww)
