# Release v2.0.0 资源容量与回归收据

基线 `380ffdd8de10ffb8472a48725c438c3f77c0d3d4`，实测包生产者 `82267834fa9202893cabe39c1ff21e141cf9f567`。两端以同一公开底图的副本、`official-assets-battle-v3`、原生页面生命周期、42 个精绘怪物、v2.0.0 发行说明和完整音频入口构建。底图 SHA-256 `b3b46b0412caf865ebc259c15ad8215b33a1797ab7940861eb562320541e13a2`。读取最终包核对两个构建全部 367 个客户端模块的字节和摘要。 [架构决策](../../adr/resource-compilation-release-v2.md) · [构建 ID、SHA-256 和容量收据](production-ab.json)

| 同配置离线指标 | 基线 | 候选 | 差值 |
| --- | ---: | ---: | ---: |
| 最终含音频 GIL 字节 | 25,399,331 | 25,123,794 | −275,537（1.08%） |
| 原生 UI 段字节 | 20,874,543 | 20,838,049 | −36,494 |
| 原生 Lua 段字节 | 4,475,010 | 4,235,967 | −239,043 |
| 打包 Lua 文本字节 | 4,452,596 | 4,213,553 | −239,043 |
| 布局紧凑 JSON 字节 | 4,149,905 | 4,145,160 | −4,745 |
| 布局控件 | 25,643 | 25,595 | −48 |
| 模板控件 | 1,518 | 1,518 | 0 |
| 服务器图区段字节 | 30,876 | 30,876 | 0 |

## 归因和回归

| 项目与模块 | Before → After | 等价验证与风险 | 状态 |
| --- | --- | --- | --- |
| A1 卡面编译，41 个宿主 | 28 个精确匹配可引用 4 份定义。实验 GIL 25,399,331 → 18,817,244 B | 主 UI 及 11 个原模板展开深度相等，非 UI 段逐字节相等。实际模拟宿主能读模板 ID，`GetChild` 无法进入引用。内联和 `InstantiateClientUIControl` 正控可访问同名子控件。 | 保留内联。实验 −6,582,087 B 未计入交付。 |
| A2 地图返回，GameUI、圆角材质与主题 | 65 → 17 个控件，GIL UI −36,494 B。Lua 四态投影增 772 B（按 v1 衡量） | 原生命中区、文字、布局和其余子树逐字段相等。4 个状态 × PC/移动视口的 8 组 PNG 逐字节相等。保留触摸取消、旧回调拒绝、奖赏覆盖和牌堆回收。状态切换更新最多 12 个图元颜色，同态刷新缓存保留。 | 生产启用。牌堆返回已使用一份材质，原生自动四态及隐藏底板保留。 |
| A3 正式画像 `abyss_traveler_portrait_assets` | 503,928 → 375,549 B，以同一 v1 编码隔离字段投影，−128,379 B | 仅排除正式配置未读取的 `selection133`，共 1,940 行。验证缩略图、已批准选角背景和战斗画、历史配置与库存正反例。 | 生产启用。 |
| A4 `native-script-storage` 六个数据模块 | 对已投影数据从 v1 换成 v2，−111,436 Lua B。旧 v1 收益一次计入基线。 | PUC-Rio Lua 5.3.6 验证保留的 28,831 个表及 123,105 个数值，含整数/浮点、IEEE 位和独立分配。没有引入运行时数字解包。原生读回逐模块核验。 | 生产启用。 |

A1 失败保留可运行的隔离模拟输入、日志及真实 GIL 实验收据。使用 BeyondSimulator 0.5.2 以 `pc-16-9` 启动 `reference-host-fixture.json`。四态截图收据绑定 GIL 读回切片，画布比较只用于离线视觉验证。 [引用输入](reference-host-fixture.json) · [引用失败与字节对照](reference-experiment.json) · [地图四态](map-four-state-ab.json)

Lua 5.3.6 的 121 组交错采样中，六模块编译加执行 p50 43.634 → 36.784 ms、p95 69.935 → 50.456 ms。保留堆 7,234.09 → 6,551.29 KiB。主题模块单独编译 p50 增约 0.49 ms，合计编译加执行中位数基本相同。这里的堆、执行时间和移动画布均为离线测量。 [测试程序](check-lua-encoding.lua) · [加载与内存收据](lua-load-ab.json)

`check:platform-load`、`check:engineering`、7 项原生 UI 合同与 4 个变异负控通过。容量历史回放在两端均出现 `fresh complete integration source: refined Release scripts/audit-native-candidate.mjs`。严格候选审计在公开快照中的画像 PNG LFS 指针处报 `Invalid selection budget avatar96`，另外用有声 GIL 的逐模块实际读回和 UI 对照验证。官方导入、上传、关卡及服务器容量、PC/手机、动态负载和音频试听为 `UNVERIFIED`，`verify:platform-load` 按约拒绝缺失证据。

## 重放

用工具提交 `FurinyaWorks/genshin-miliastra-mcp@59c576e41632a6bf6781bbca83a676d0da0374ec`。公开底图可从该提交的 `tests/fixtures/editor-2026-10-13-clientkinds.gil` 复制取得，顺序移除 `CG_ui`、`basket`、`容器节点`、`CG_game` 后核对上述底图 SHA。构建前还原正式画像预算验证所用的两张 `preview-native-1x.png` 的原 LFS 字节，保持此前端素材的校验。

```sh
# 在两个干净源码工作树内各执行一次，输出路径互异。
MILIASTRA_ALLOW_LIVE_WRITE=0 MILIASTRA_MCP_ROOT=/path/to/toolchain \
  npm run build:native -- /path/to/same-base.gil build/resource-ab --release-candidate

MILIASTRA_MCP_ROOT=/path/to/toolchain node scripts/compare-native-resource-builds.mjs \
  /path/to/baseline/build/resource-ab/audio/candidate.json \
  /path/to/candidate/build/resource-ab/audio/candidate.json
```

A1 复用 #703 的 `packNativeCardFaces` 和 `expandSharedCardFaces`，以 `artPlate` 识别当前宿主。向底图副本先注册共享定义，再替换受影响模板和主 UI。重放要求拓扑、模板 ID 和展开读回全部可核对。历史 #703 实验保留自身的旧配置和收益。 [#703](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/703)
