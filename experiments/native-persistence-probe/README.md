# 成就与局内存档平台探针

2026-11-26 的源码基线为 `aaf8008875896f24acc8fda0d4df47df2564ec1d`。EXP **BLOCKED**。当前会话为 Linux，未接入登录后的 Windows 官方客户端、千星沙箱、创作者账号和隔离奇域，真实实验尚未执行。TASK-45/53 保持 Blocked。拟验证的接入契约见 [ADR 0004](../../docs/adr/0004-native-persistence.md)。

| 实验 | 最小配置或源码 | 当前平台状态 |
| --- | --- | --- |
| 原生成就注册、触发、查询、重复和跨局持久化 | [成就实验](achievements/README.md) | 待验证 |
| 原生局内存档配置、读写、失败和兼容 | [存档实验](save/README.md) | 待验证 |
| Lua 与原生节点图双向信号、玩家归属和节点受理 | [Lua](bridge.lua)、[节点图生成器](bridge-graph.mjs) | 待验证 |
| 正常退出、断网、强杀后的持续性与重进恢复 | [存档实验](save/README.md)、[本轮记录表](evidence.md) | 待验证 |

## 创作者操作清单

1. 在可编辑成就及局内存档的 Windows 原神账号打开千星沙箱。截图记录客户端和编辑器版本、两项菜单是否可用、对应权限提示。用独立的超限测试关卡和测试账号。需要发布测试版本时由创作者选择隔离测试入口并操作，记录环境及关卡身份。
2. 确认原神内「我的奇域 → 新建存档（超限模式）」并保存独立副本。节点图使用关卡实体，记录本轮实体和图 ID。先按 [成就](achievements/README.md) 和 [存档](save/README.md) 创建各自最小配置及测试对照。发布版与试玩数据分别留证。
3. 在「千星沙箱 → 窗口 → 服务器信号管理器」登记下表两条信号。参数名、类型与顺序按表。图的客户端回复节点另有「目标玩家」入参。`client:` 是构建工具的目标前缀，编辑器信号名直接使用表中名称。
4. 打开「千星沙箱 → 客户端脚本资源管理器」。创建映射到 `bridge.lua`。在「界面控件组管理 → 界面布局」添加客户端控件容器，画布中创建脚本宿主容器节点并挂载脚本，保持其激活、可见，分配键鼠奇匠键 1–5。官方文档说明仅已映射脚本随关卡上传。记录映射名称/ID 和图的挂载截图。
5. 打开「千星沙箱 → 窗口 → 日志」。在每轮试玩前选中桥、成就、存档相关服务器节点图和客户端脚本，再确认选择。复用仓库 `playtest_start` 时启用 `clientScriptLog: true`。正式运行时以本轮平台构建、日志和安全的匿名账号标识匹配所有记录。
6. 跑下表桥用例和两个子探针后，依照存档分支清单验证正常退出、短断网同实例、新实例重进、断网后服务端结束和强制结束客户端进程。每种方式保留确认前与确认后的对照、断开时间及相同账号的新实例读回。只在独立测试关卡进行。填写 [记录表](evidence.md)。

## 桥配置与动作

| 项目 | 配置 |
| --- | --- |
| `STH_EXP_BRIDGE_REQUEST` | 整数，依序 `operation`、`sequence`、`value`。操作 1 回读，2 不支持，3 故意不回 |
| `STH_EXP_BRIDGE_REPLY` | 整数，依序 `sequence`、`status`、`value`。状态 1 已读回，2 重复，3 冲突，4 不支持，5 读回不符 |
| 玩家自定义变量 | `STH_EXP_BRIDGE_SEQUENCE` 和 `STH_EXP_BRIDGE_VALUE` 均为整数，初始值 `0`，仅内存，均不加入局内存档。两个变量配置到测试玩家模板 |
| 图挂载 | 创建单一服务器关卡实体图，挂到关卡实体。监听 `STH_EXP_BRIDGE_REQUEST`；见生成器中的排序、原生 `signalSourceEntity` 核验、读写和回复分支。仅信号源与实际场上玩家匹配时，图才应回给相同实体 |

在一个全新实例看到 `STH_EXP_BRIDGE ready` 后逐次输入。上一动作收到回执或观察到超时后再输入下一项。两人场景使用测试关卡，并分别保存两端日志。

| 用例 | 动作与预期观察 |
| --- | --- |
| B1 | A 按 1，客户端先记录 `sent_local echo 1 101`，图记录 `rx`，原生读回后 A 收到 `reply 1 applied 101`。B 无这条回复 |
| B2 | A 按 2，收到 `reply 1 duplicate 101`，图变量写次数应保持一次 |
| B3 | A 按 3，同序号异值，收到 `reply 1 conflict 101`，变量保持 101 |
| B4 | A 按 4，收到 `reply 2 unsupported 202`，图变量保持 101 |
| B5 | A 按 5，图记录 `intentionally_no_reply`，约 5 秒后 A 记录 `timeout_unknown 3`。保留两端日志 |
| B6 | 两人同一轮 B 按 1，B 独立收到 `applied` 而 A 无回复。重连时以 `ready`、原图来源出参、玩家变量和实例身份判断是否重建 |

`sent_local` 只是 Lua 调用已返回。`applied` 只用于本图内存变量的即时读回。在正式客户端用图调试器保存「信号来源实体」出参与场上玩家的对应证据。如果单人或双人取不到可信归属，图应记录 `source_not_player`，客户端应记录超时。保存实际出参及当前客户端版本，停止用同一通路执行原生写入。

## 可自动化与需编辑器完成的步骤

有授权的 Windows 环境下，依 [仓库工具链](../../docs/TOOLCHAIN.md) 先读 `miliastra://workflow` 与 `miliastra://platform-rules`，保持 `MILIASTRA_ALLOW_LIVE_WRITE=0`，所有写入在副本进行。传递每次调用返回的新 `mapPath`。按 `scene_list_entities`、`scene_add_signal`、`scene_add_graph` 的实际结果复用工具；`bridgeGraphSource({id: graphId, name})` 生成传给 `write_graphs` 的代码。`scene_set_client_script` 和 `scene_add_client_ui` 可装配映射与 UI。回读确认信号签名、真实图 ID、图挂载及 Lua 源码。登录、权限确认、无法自动化的原生配置、测试作品上传与批准、断网和进程强杀由创作者执行。需要占用创作者桌面时取得本轮输入授权。

官方确认有双向信号及玩家定向回复。联机服务器信号延迟下限 100 ms，Lua 控件在重连时重建。Lua API 的 `SendSignal()` 无返回值。当前工程过往结算只给出单向发送与部分历史官方日志。 [客户端脚本与通信](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhbgxf0nynww) · [Lua API](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhtakr07vej4) · [服务器事件节点](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhn7ko01v3yw) · [服务器执行节点](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhw66orrrfkm) · [历史日志](../../docs/evidence/recent-live-logs-20261024/AUDIT.md)

从仓库根复现桥的离线副本写入与读回。工具使用仓库 CI 固定的 MCP `70470757d6fcb319c5afec13b178c87f2d8d54b3` 及 Genshin-TS `0.2.2`，按原工具链安装。输出目录须为新目录。

```sh
MILIASTRA_ALLOW_LIVE_WRITE=0 node docs/evidence/native-persistence-probe/verify-bridge-copy.mjs <MCP工具仓库目录> <新输出目录>
```
