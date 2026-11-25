# GIL 容量图复现

测量范围为同一个公开原生底图上的有声重建。线上 v2.1.0 原始 GIL 和正式 Production 候选仍需单独取得。本次重建采用历史对照指定的 `alpha-test` 作品键，保留原生音频线路，构建标记每轮生成新的 UUID。因此同源重建的 GIL SHA-256 每轮不同，固定配方下可核对文件长度、物理分区、布局和 Lua 内容。

## 构建

在证据脚本目录按已授权仓库访问准备三个独立源码工作树，每个使用 `npm ci`。MCP 置于同级 `mcp` 目录，固定 `FurinyaWorks/genshin-miliastra-mcp@59c576e41632a6bf6781bbca83a676d0da0374ec`，运行 `npm ci` 与 `npm run build:core`。使用 Node 24.22.3，lockfile 中固定的依赖，Linux。针对每份源码工作树检出两份真实 LFS 文件，确认 `git status --porcelain` 为空。

```bash
git lfs pull --include='art/characters/traveler-geo/portraits/avatar96/preview-native-1x.png,art/characters/traveler-geo/portraits/battle133/preview-native-1x.png' --exclude=''
node prepare-native-fixture.mjs mcp base
./run-fixture.sh /path/to/live-source capacity-native
./run-fixture.sh /path/to/previous-rc capacity-native
./run-fixture.sh /path/to/canonical-rc capacity-native-rc
```

底图准备脚本复用固定 MCP 中的公开测试夹具，依序去除 `CG_ui`、`basket`、`容器节点`、`CG_game`，退出前核验底图 SHA。仅在复制出的离线测试目录构建。仓库对应复现记录见 [Release 资源对照](https://github.com/FurinyaWorks/Slay-the-Heavens/blob/55d6396c/docs/evidence/release-resource-20261122/README.md)。

若 Git LFS 已取回对象却没有安装工作区 filter，可在命令环境中配置 `filter.lfs.clean`、`filter.lfs.smudge`、`filter.lfs.process` 和 `filter.lfs.required`，复用 `run-fixture.sh` 前几行的形式，针对两个文件执行 `git lfs checkout`。本轮最初未还原 LFS 文件的 UI 生成返回 `Invalid selection budget avatar96`，MCP 尚未编译 `dist` 时两份构建返回 `ENOENT .../mcp/dist`。修复依赖与素材后在新目录复跑，保留原失败日志。

## 测量

```bash
node --max-old-space-size=2600 measure-native-capacity.mjs mcp output \
  'v2.1.0 source=/path/to/live-source/build/capacity-native/audio/candidate.json' \
  'v2.1.1 prior RC=/path/to/previous-rc/build/capacity-native/audio/candidate.json' \
  'v2.1.1 canonical=/path/to/canonical-rc/build/capacity-native-rc/audio/candidate.json'
```

输出 `capacity-treemap.svg`、`capacity.csv`、`capacity.json`、`capacity-spans.csv.gz`。分片使用从零开始的左闭右开区间 `[startInclusive, endExclusive)`，要求从文件头到文件尾连续、无重叠且总长度等于完整 GIL。输入为最终 `.gil` 与构建回执，复核 SHA 和所有嵌入 Lua 文本。原生 UI 和模板分属编译器读回的唯一记录 ID。原生 UI 图像控件留在布局或模板；美术图元这一类别仅包含 `abyss_monster_art_data`、`abyss_traveler_portrait_assets` 中独立的实际源文本字节。BGM 类别仅取已解码的 BGM 服务器图及 `abyss_bgm` Lua 文本，通用容器、信号定义等归其他部分。原声素材由原神宿主 ID 引用，正式音频播放/片段下载需实机验证。

静态控件组表按布局或模板清单递归，隐藏仅指控件或祖先在输入上逻辑不可见。模板的隐藏标记统计定义，未计算任意瞬间实例数。原生 GIL 布局还含编辑器接口容器和根记录。文件大小无法折算为官方存档面板、传输数据量、客户端原生内存或 Lua 堆。

## 静态规模对照

```bash
node --expose-gc measure-static-ui.mjs mcp /path/to/canonical-rc/build/capacity-native-rc/audio/candidate.json output
```

在临时文件中逐级移除完整且初始隐藏的 `stage` 直接子树，复用 MCP 的 protobuf 读写。验证其余整段数据完全一致、主菜单可见标记仍一致，并核算移除控件的记录 ID。保留每一臂对应 SHA 及每次交错运行的 CPU、墙钟、Node 堆/RSS。诊断副本缺少子树，不能进入玩法。`getClientUi` 读入文件并解析控件及模板元数据，耗时适用于 Node/MCP 离线读回。Node 瞬时堆和进程 RSS 包含解析临时对象、文件缓冲及 GC 波动，不能推导原神内存或 T0→T1 延迟。
