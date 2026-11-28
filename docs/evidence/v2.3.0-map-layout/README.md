# v2.3.0 地图布局离线证据

TASK-116 · 固定基线 `32a15219aecd145c59cb1b2fcf477e5556766e5d`。采用 STS1 实际反编译源码及不同种子的原版画面作为参照。 [源码、实拍和适配参数](REFERENCE.md)

![上一版 Draft 与修订版在相同纸面上的对照](draft-comparison.png)

[打开原始基线与修订版对照](before-after.png) · [打开悬停控件几何示意](hover.png) · [打开 STS1 悬停实拍](https://interfaceingame.com/screenshots/slay-the-spire-map/)

投影使用正式配置生成的控件，通过真实 Lua MapUI 绘制并导出坐标、尺寸与颜色。图中房型字母代替 SDK 纹理，六幅图共用横纵比例和原点。前三组对应基线第一幕最偏左、最偏右和居中的种子；原版实拍来自另几个种子，用来比较布局和画法。

| 离线检查 | 基线 | 候选 |
| --- | ---: | ---: |
| 种子 × 幕 | 128 × 3 | 128 × 3 |
| 常规节点横向质心的绝对偏移均值 | 40.28 | 5.69 |
| 常规节点横向跨度均值 | 664.71 | 530.99 |
| 渲染遍历 | 2,816 | 2,816 |
| 绑定及首绘平均 Lua CPU 时间 | 1.018 ms | 0.804 ms |
| 滚动重绘平均 Lua CPU 时间 | 0.862 ms | 0.638 ms |
| 最大节点数 / 已画路线数 | 74 / 85 | 74 / 85 |
| 正式配置生成控件数 / 单容器最多子控件 | 26,714 / 60 | 26,714 / 60 |
| 本地打包 Lua 输入大小 | 5,511,922 B | 5,517,618 B |

384 份地图快照逐字节一致，包含节点、房型、拓扑和地图 RNG 状态。遍历验证同一节点滚动时绝对坐标稳定，热区无重叠，所有可绘房间和路线均能滚动进入视野；常规连线中心线交叉数为零。触控探针按 2556×1179 和正式移动 HUD 的地图上缘，在三个种子上验证选点、跨触点拒绝、背景拖动、回焦、上限首领及存档恢复后触区位置。同一正式配置的生成布局和模板逐字节一致，包含 HUD 与图例。修订版探针还检查全部常规节点在纸内的水平上限，以及可达节点悬停、移出和滚动清除描边。 [批量结果](batch-summary.json)

## 开局稀疏入口

![两个入口的偏左、分布较开、偏右开局视窗](entrance-rows.png)

384 张项目地图中，220 张底层只有两或三个入口。4 张的入口逻辑列全在同一侧，修订后有 9 张的入口实际坐标全在同一侧。例子中，第一幕种子 4 的两个起点仍在第 1、3 列，第一幕种子 19 仍在第 3、5 列，第二幕种子 49 仍在第 5、6 列。上述比例来自项目离线样本。 [原版底层实拍与源码核对](REFERENCE.md#最底一层的稀疏入口)

CPU 时间来自同机 Lua 5.3.6 的纯离线控件仿真，包含原有写入流程。官方编辑器容量、实际渲染帧率和实体触屏待同一候选验收。Draft 保持独立评审状态。

## 复现

在基线和候选各自的工作树执行。首次使用先安装仓库锁定依赖并拉取构建所需 LFS 对象。各轮分别设置 `ARTIFACT`，让 `PROBE` 指向候选工作树的 `probe.lua`。修订版运行时设 `MAP_REFINED=1`，另外检查纸边和悬停。基线和上一版 Draft 不设该变量。

```sh
node scripts/build-lua-data.mjs data "$ARTIFACT/lua/abyss_data.lua"
node --input-type=module -e "import {buildUI} from './scripts/build-ui.mjs'; buildUI(process.argv[1], undefined, {officialAssets:true, nativePageLifecycle:true})" "$ARTIFACT/lua"
LUA_PATH="$ARTIFACT/lua/?.lua;src/lua/?.lua;;" lua5.3 "$PROBE" > "$ARTIFACT/batch.tsv"
MAP_CAPTURE='23 63 17' LUA_PATH="$ARTIFACT/lua/?.lua;src/lua/?.lua;;" lua5.3 "$PROBE" > "$ARTIFACT/draw.tsv"
```

用 Pillow 渲染并比对批量日志。另用 `MAP_CAPTURE="4:1 19:1 49:2"` 导出开局画面，交给 `--entrances`。使用 `--previous-draft` 指到上一版 Draft 提交 `bf0d37be` 的结果目录，可重建第二组对照。

```sh
python docs/evidence/v2.3.0-map-layout/compare.py "$BEFORE" "$AFTER" "$REPORT"
```
