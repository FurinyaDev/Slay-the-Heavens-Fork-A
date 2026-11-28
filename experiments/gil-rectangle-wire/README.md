# GIL 设备矩形离线 A/B

**离线复现通过，正式采用 NO-GO。** B 是独立诊断副本，官方导入、编辑器重存、当前 ready、设备画面与输入、存档容量、平台负载和正式发布均为 `UNVERIFIED`。

v2.1.1 正式发布文件的原生 UI 和模板占文件约 82.31%。历史卡面模板共享在模拟器内无法用 `GetChild` 进入引用。本实验保持控件树、控件 ID、位置数值和 Lua/BGM 字节，单独测量原生 UI 记录里重复的设备矩形。 [既有容量对照](../../docs/evidence/v2.1.1-performance-20261125/capacity/PLATFORM-GIL.md) · [卡面引用负例](../../docs/evidence/release-resource-20261122/README.md)

对同一物理 GIL，只有 `syncAllDevices = 1` 且四个设备矩形数据体逐字节相同、设备序号为 0 到 3 的记录才进入 B。B 保留第一个矩形，去掉后三个，改写外层长度。原件只读。程序从 B 反向重建，再完整核对原文件字节。以实验 B 重新运行时，因无法确定既有稀疏布局的原始编码，程序在生成任何新输出前终止。读回校验在临时目录执行，错误界面名的负控未留下输出。GIL 顶层 UI 段以外的字段单独按原始字节比较。显式不同或未同步的记录保留原编码。

| 实体文件 | A | B | 减少 | 改写矩形 |
| --- | ---: | ---: | ---: | ---: |
| v2.1.1 正式发布原件副本 | 23,780,838 B | 16,211,294 B | 7,569,544 B（31.83%） | 25,521 / 25,521 |
| `develop` 32a15219 有声离线构建 | 24,453,843 B | 16,662,115 B | 7,791,728 B（31.86%） | 26,298 / 26,298 |
| 公开编辑器 `clientsettings` 样例 | 52,586 B | 47,483 B | 5,103 B（9.70%） | 18 / 36 |

生产原件的第 9 段从 19,577,951 B 降至 12,008,407 B，所有其余顶层字段逐字节一致。Node 24.19.0 的 gzip 对照为 2,598,064 → 2,310,197 B，减少 11.08%。gzip 只描述此压缩器的文件大小。`develop` 的同臂对照使用干净源码、`offline-candidate` 作品键和 `official-assets-battle-v3`，由发布原件作为底图构建。主布局的 24,904 个控件和全部 16 个模板的归一化投影完全相同，第 9 段从 20,149,948 B 降至 12,358,220 B。公开样例另有 18 个矩形保持原编码，包含独立设备设置。 [发布原件收据](published-baseline-ab.json) · [Develop 收据](develop-ab.json) · [公开编辑器样例收据](editor-fixture-ab.json)

## 离线证据边界

- MCP `getClientUi` 对 24,127 个主布局控件的逻辑树、文本、形状和控件 ID 给出完全相同的投影。该解析器用第一个布局填主视图，只有未同步或**已出现且不同**的设备矩形才产生设备差异字段。它在同步记录只剩一个矩形时自然给出相同主视图。同一工具也逐一读回模板定义并比较。模板和主布局的实机加载、绘制及命中仍须在官方宿主验证。 [固定版解析器](https://github.com/8itlab/genshin-miliastra-mcp/blob/70470757d6fcb319c5afec13b178c87f2d8d54b3/src/scene-save.mjs#L2996-L3021)
- 四份手工编辑的公开 GIL 样例在分析中都使用四个显式状态，同步与非同步均如此。固定版 MCP 的编码器也一律写入四份。BeyondSimulator 0.5.2 的 MCP 工具可加载模拟器工程，没有直接读取该 GIL 编码的工具。经过 `getClientUi` 投影再生成模拟器工程会先消除 A/B 差异，无法检验稀疏布局的官方语义。 [MCP 原生 UI 往返测试](https://github.com/8itlab/genshin-miliastra-mcp/blob/70470757d6fcb319c5afec13b178c87f2d8d54b3/tests/scene-client-ui.mjs#L249-L261)
- 官方试验从包含明确旋转、尺寸、偏移及独立设备状态的小样本开始。导入 A/B 为不同副本，保存再导出，读取四种设备布局，核对点击位置及各设备预览。小样本通过后才对照完整 A/B 的官方容量、静态与动态报告、当前 ready、PC/手机菜单及进战。控件数保持相同，不能用原始文件字节推断内存、计算负载或启动耗时。 [平台负载合同](../../docs/PLATFORM_LOAD.md)

## 复现

安装或另行检出工作流固定工具 `8itlab/genshin-miliastra-mcp@70470757d6fcb319c5afec13b178c87f2d8d54b3`。`src/scene-save.mjs` 的 SHA-256 为 `eed054eea9285d1945ec826299e1e9546e36475d708007b2df1952ebca52f805`。在本仓库根目录执行，输入使用只读副本，每次选择新的输出目录。可将完整构建的 `audio/candidate.json` 作为输入，程序先核对该收据和 GIL 文件的长度及 SHA-256，再记录输入构建身份。输出 `sparse-rectangle-probe.gil` 与 `receipt.json`。

```sh
MILIASTRA_ALLOW_LIVE_WRITE=0 node --max-old-space-size=2600 \
  experiments/gil-rectangle-wire/compare.mjs /path/to/pinned-mcp \
  /path/to/released-copy.gil SlayTheAbyss build/gil-rectangle-production-ab

MILIASTRA_ALLOW_LIVE_WRITE=0 node --max-old-space-size=2600 \
  experiments/gil-rectangle-wire/compare.mjs /path/to/pinned-mcp \
  /path/to/audio/candidate.json SlayTheAbyss build/gil-rectangle-develop-ab

MILIASTRA_ALLOW_LIVE_WRITE=0 node \
  experiments/gil-rectangle-wire/compare.mjs /path/to/pinned-mcp \
  /path/to/pinned-mcp/tests/fixtures/editor-2026-10-13-clientsettings.gil \
  KS_ui build/gil-rectangle-fixture-ab
```
