# 局内存档实验记录

**真实平台状态：待验证。** 2026-11-26 UTC，基线 `develop@aaf8008875896f24acc8fda0d4df47df2564ec1d`。当前 Linux 工作区未连接仓库配置的 Windows 千星 MCP，未发现原神客户端/千星沙箱，也没有可操作的真实测试账号和当轮桌面输入窗口。因此未创建平台候选，未开启真机试验，未取得配置 ID、账号权限、容量、平台日志和恢复结果。正式发布和生产存档未操作。

| 层级 | 本轮结果 |
| --- | --- |
| 官方文档 | 核对综合指南《局内存档》《编辑项范围限制》《试玩》《自定义变量》《客户端控件 API 文档》及服务端事件、执行和查询节点。`10000` 是文档上限，官方示例面板确认为「数据量」，未标单位。参见 [实验说明](README.md)。 |
| 仓库基线 | 读取 `AGENTS.md`、`docs/TOOLCHAIN.md`、归档 TASK-53、ADR 0001、`docs/backlog-details/MOBILE-QA-20261028.md`、Lua/原生信号和快照实现。源码已有发往服务器的信号，`Run.restoreEncounters` 明确限制为当前 Run、同种子和既有边界的子状态恢复。 |
| 夹具静态校验 | Node `v24.22.3` 可解析 JSON，`luaparse@0.3.1` 可解析两份 Lua。比对了两条信号名、八个按钮及其操作号与令牌。 |
| 夹具离线执行 | Fengari `0.1.0` mock UI/native transport 通过。启动不发写请求，八个点击按顺序传正确参数，模拟回复可展示首行和列表，销毁注销监听。模拟回复由测试注入。 |
| 仓库工具源码回归 | `node --test --test-concurrency=1 tests/settlement-graph.test.mjs tests/verify-official-client.test.mjs`，`13 pass, 0 fail`。合并运行时 `tests/platform-load.test.mjs` 在共享只读稀疏检出因缺 `luaparse` 未载入；本记录未将它计为验证。 |
| 官方编辑器、实际导入与实机 | 未执行。结论与当前版本、配置和账号权限均待补。公开资料不承诺专用持久化确认，已确认局内读回的字段在断网、强杀后是否可恢复仍待测。 |

## SHA-256

```text
ab24739aafa41f7ea5eb8bf6a4606fdcdd0e22bee0ebd58280fb164dc1147e33  save-probe.json
939c33651fd07af1c70814ae0103d1005fbaf0b07c6eeca3292635cf7a0aaa1a  save-probe.lua
e0e24dadda13931aa5c7d65c2e5d0188d91bbb6b436e76481df5261f3014afcc  verify-client-fixture.lua
```

## 离线执行复现

在已安装仓库锁定依赖的检出中运行。

```sh
node_modules/.bin/fengari experiments/native-persistence-probe/save/verify-client-fixture.lua experiments/native-persistence-probe/save/save-probe.lua
node --test --test-concurrency=1 tests/settlement-graph.test.mjs tests/verify-official-client.test.mjs
```

本轮在独立工作目录安装同版本 Fengari 和 `luaparse`，运行夹具所得相关终端输出。

```text
STH_EXP_SAVE ready; click Read before any write
STH_EXP_SAVE sent op=1 req=101; waiting for in-session readback
STH_EXP_SAVE readback op=2 req=401 rows=1 session=401 schema=1 saved=401 flag=true label=EXP-é-千 samples=[11,22,33]
STH_EXP_SAVE_CLIENT_FIXTURE_PASS
```

## 实机证据表

复制以下记录给每一用例。联网、退出、进程终止和新进场的时间填有时区的记录。使用实际图/结构体 ID，脱敏账号。原始截图和日志用文件相对路径与 SHA-256 固定。局内读回为变量级观察，单独保存新进场首个 `create` 及 `read` 作为持久化读回。

| 字段 | 待填写 |
| --- | --- |
| 用例与 UTC、执行人 |  |
| 候选源提交、GIL 哈希、关卡身份与版本、结构和节点图 ID |  |
| 区服、账号别名和权限、客户端/编辑器版本、设备及平台 |  |
| 模板行数据量、总用量、最大列表和超限提示 |  |
| 前置已读回令牌、请求/服务器接收/节点写入/局内读回的值及时间 |  |
| 退出、断网或强杀的动作与时间，是否经过正常退出 |  |
| 重连或新进场的证据，房间标识、`create`、`sessionToken`、读回的完整值 |  |
| 原始截图和客户端/服务端日志，相对路径和哈希 |  |
| 判读与限制 | 待测 |
