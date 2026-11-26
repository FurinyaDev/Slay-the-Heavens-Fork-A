# v2.2.0 序章原生按钮复现

原公开复现使用 BeyondSimulator MCP 0.5.2，PC 16:9，1600×900，在序章按钮中心 `(517,105)` 按下并释放后停留。原始诊断记录了同一原生控件经 `GetChild` 取得的新 Lua 包装满足 `==`，同时具备独立原始身份。此次修正只恢复按钮反馈状态读取与重绘。[原始复现](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/974#issuecomment-7177278513) · [回流诊断](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/1008#issuecomment-7191220682)

| 来源 | 源码提交 | 构建 ID | 诊断 GIL SHA-256 | 反解 save SHA-256 |
| --- | --- | --- | --- | --- |
| 修正前 | `aaf8008875896f24acc8fda0d4df47df2564ec1d` | `9f92f263-52ff-443a-8036-61bf1f86cf0e` | `3a1611d705cf7963e6d28d8665cb202e820b0d6ae3d799b6928a94870c995ff6` | `f6ca7bb7db51f664b36869c34bf0af291eb60a36f7cda356b9bf9c6c49a44db0` |
| 修正后 | `6784dab77eb0548db423d2599cb089a4f6649942` | `16f78d2b-befb-420d-b16f-703795ba14be` | `58feeeff097809db79471855ff68b4b8012b92654d03cbb2fdb0622d1c14c64c` | `ce4f4657baa70f098b0b837bed5a1dbbbbdce672760667dec849a3c3b39acad4` |

两份精确源码均以干净工作树构建，使用 `scripts/build-native-candidate.mjs` 的 `--official-assets --refined-release-monsters --native-page-lifecycle --work-key=alpha-test`，仅作离线本地诊断。两份基图均为 SDK 的 `editor-2026-11-18-terrain-base.gil`，SHA-256 `81172295c59b68da4c26bca1c87daf42c84b822f8810975313b0813195342077`。SDK 固定于 `8itlab/genshin-miliastra-mcp@70470757d6fcb319c5afec13b178c87f2d8d54b3`。

以仓库 `scripts/native-candidate-preview.mjs` 对两份 GIL 分别生成 Simulator save。外置 SDK 的反解比较器保留图库的 `Basic` / `Stretch` 类型再严格比较，补丁随附。每份存档转换 27,303 个控件，严格反向比较 27,302 项并核对 381 份原字节 Lua，差错 0。反解过程读取 GIL 和脚本，没有回写 GIL。正式导入和设备复测待正式 RC。

鼠标回放以 30 Hz 手动帧运行，驱动只向 Simulator 发送真实坐标的 `down`、`move`、`up`。1600×900 截图显示 safe area 缩放，驱动为选角和后续按钮把检查树矩形换算到实际像素。原公开复现位置 `(517,105)` 直接使用，拖到 `(74,105)` 后松开。运行 `[replay.mjs](replay.mjs)` 时，先复制它到仓库根下 `.artifacts/prologue-proof/play.mjs`，运行 `node .artifacts/prologue-proof/play.mjs before <反解存档> <回执目录>`，将 `before` 换成 `after` 复跑候选。使用环境变量 `ART_LAB_MCP_ENTRY` 指向 `beyond-simulator-mcp@0.5.2` 默认 MCP 入口。

Host 使用 `tests/lua/game_ui_prologue_readiness.lua`。正对照在真实 GameUI 配置的模拟 native view 中验证新包装、鼠标、数字触点、拖出取消、退出重入及陈旧输入。负对照用同一 fixture 加载修正前的四模块，确认全新指针仍触发 `stale_action`。相邻二幕、宝箱与营地、源码处理检查沿用原测试入口。四 Lua 的原始文件指纹含 #1008 合成前后来源。[Fork A Advisory Quick](https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/actions/runs/45847219095)

| 回放 | 拖出 | 原坐标点击结果 | 后续 |
| --- | --- | --- | --- |
| 修正前 | 停留序章 | 按压已命中，仍显示「继续」 | [截图](before/stalled.png) · [原始记录](before/mouse-replay.json) |
| 修正后 | 停留序章 | 按压已命中，进入「选择一份恩赐」 | [恩赐](after/blessing.png) · [启程](after/departure.png) · [地图](after/map.png) · [原始记录](after/mouse-replay.json) |

两段完整回放均为零 Lua error，实际鼠标点击命中相同原生控件 `7971`。
