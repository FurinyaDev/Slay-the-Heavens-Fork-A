# 启动与首次战斗测量

以原有 `scripts/runtime-baseline` 的守卫控件模型和 Observer 运行真实 `abyss_ui.lua` 入口。各个样本的 Linux 文件缓存可被早先运行预热。场景固定为 1280×720、默认桌面输入、种子 1，从实际 Start 回调进入选角、涅奥、首个地图节点 `f1_l2` 与 Raven Adept 战斗。战斗就绪要求页面门控打开、动画调度器空闲、原生怪物模板确实输出精绘。每个样本启动独立 Lua VM，暖启动在本轮战斗后销毁模拟原生树、重建树并保留已加载模块，未强制 GC。固定随机运行次序的块内轮换，原始数据保留长尾样本。

## 已复现的启动成本

| 生产 Lua 对照，20 对 | 线上源 55d6396c | v2.1.1 b6ba4614 |
| --- | ---: | ---: |
| 冷 T1→T3 墙钟 P50 / 最大，ms | 152.718 / 190.923 | 134.767 / 241.732 |
| 冷 T1→T3 CPU P50 / 最大，ms | 152.716 / 190.922 | 134.753 / 241.412 |
| 同 VM 暖重入 T1→T3 CPU P50 / 最大，ms | 8.172 / 30.205 | 7.525 / 22.254 |
| 地图点击→首战可操作 CPU P50 / 最大，ms | 32.883 / 45.572 | 33.401 / 96.997 |
| 冷 T1→首战可操作 CPU P50 / 最大，ms | 243.570 / 303.080 | 224.237 / 468.090 |
| 菜单就绪 Lua 分配器存活内存 P50，MiB | 58.033 | 49.484 |
| 菜单就绪时进程峰值 RSS P50，MiB | 65.443 | 55.691 |

- 冷 T1→T3 的配对 CPU 中位差为 −21.625 ms，20 对中 18 对更快。重采样区间为 [−23.808, −10.275] ms。两侧菜单门控均经历 2 次模拟 OnUpdate，模拟调度未等待真实帧。冷路径的最慢样本变慢，暖启动胜负区间跨零。
- 首战交互配对 CPU 中位差为 +1.417 ms，重采样区间为 [−1.988, +2.315] ms。延迟解码发生在首战，在线上比较路径尚无法建立完整首战的方向性差异。只衡量 Raven Adept 路径，多怪首次同场和物理低档设备冷入待验。
- 详细探针独占模块 CPU P50 以 `abyss_theme` 最重（67.84→70.13 ms），其次包括怪物图元模块（26.17→2.59 ms）及旅行者肖像模块（8.57→8.63 ms）。计时包含模块装载、编译和执行，不能细分 Lua 标准库解析和真实 SDK。
- 三组 30 次独立 VM 的同一目录测试中，42 个绘图、3385 个有序图元在全部展开后逐字段相等。未压缩、压缩全量、压缩按需的生成模块分别为 1,054,889、479,926、480,249 字节；编译及执行 CPU P50 分别为 24.582、32.239、2.787 ms，配对全量减未压缩为 +5.486 ms，按需减全量为 −29.169 ms。执行后 Lua 分配器内存 P50 约为 5263、5468、574 KiB。Raven Adept 首次展开 CPU P50 0.728 ms（最大 1.488 ms），三只不同绘图首次请求合计 1.872 ms，重复请求命中原表。正式装配脚本存储紧凑化后的怪物模块为 479,858→480,174 字节。
- #954 的 mapGroup 原生查找在构造期从 391 降到 5，组内成员查找保持 391，已模拟验证首个地图节点点击及战斗进入。构造期 `MapUI.new` 详细探针 CPU P50 1.630→1.414 ms，同源轻探针的全启动差异区间跨零。测得确定收益是少 386 次 SDK 形态调用。官方桥接耗时待验。
- 详细探针额外观测 Lua 模块、构造函数、原生模拟写入、`GetChild` 和资源计数。与同源轻探针进行 12 对交错，冷启动配对 CPU 中位开销 +33.797 ms，首战 +17.799 ms，暖重入 +10.439 ms。详细瀑布用于阶段分解，版本比较以上表轻探针为准。

## 来源与边界

`module` 和 `host` 使用 2.1.0 tag `eb64f4e6`（与实际线上 `55d6396c` tree 相同）及旧 RC `b0963d7a`。对照在同一 RC 生成控制布局上只换三组怪物模块。#954 对照只换 `f10eefa2` 的 map 模块，且 RC tree 等同该提交父提交。生成 UI 使用 `--official-assets --native-page-lifecycle --refined-release-monsters`，严格等同生成怪物脚本字节。这个源代码层的 Lua 5.4 适配仅补齐 `abyss_event_combat_routes.lua` 一处数字/关键字空格且合成模板 ID。仓库 Fengari 两个版本流程验收通过，无须改此空格。

`packaged` 与 `packaged-detail` 加载两份完整有声 GIL 的 `competition-lua-v3` 生产模块，通过构建收据核对文件字节和 SHA-256，使用同源布局、模板及真实候选模板 ID。正式脚本打包器已经补齐上述语法空格。轻探针仅在入口捕获 GameUI 实例，并在阶段末调用墙钟、进程 CPU、Lua allocator、峰值 RSS 计数。详细探针另给实际函数和模块调用打点。该运行依赖公开基础 GIL 的重建产物。具体 GIL 文件和真实线上存档的前置内容需单独核实。

T0→T1 中的平台下载、冷热缓存、文件解包及原生资源准备均为 **UNVERIFIED**。首屏 Lua 控件投影和门控已测量。实际合成/GPU 首帧、触摸输入、千星客户端的冷暖加载、真实内存、设备帧耗时和后台调度为 **UNVERIFIED**。云主机有并发负载且各 lane 的 cgroup 时段不同。数据含各段的环境与节流统计，源码微基准侧重进程 CPU，源探针时长与装配探针分别比较。Lua 分配器释放计数包含回收和显式释放，无实际 GC 暂停测量。

## 复现

解包后进入 `startup`，在此目录创建同仓库的 `live` 和 `rc` 两个独立 worktree。身份和生成 SHA 见 `variants/variant-metadata.json`。两次生成均需要仓库中对应的旅人头像和战斗画像 LFS 原始 PNG。此前保留 LFS 指针时构建报告 `Invalid selection budget avatar96`。限定获取并读取两文件的批准对象即可复现。

```sh
git -C /path/to/repository worktree add --detach "$PWD/live" eb64f4e6
git -C /path/to/repository worktree add --detach "$PWD/rc" b0963d7a
for tree in live rc; do
  (cd "$tree" && node scripts/build-lua-data.mjs &&
    node scripts/build-ui.mjs --official-assets --native-page-lifecycle --refined-release-monsters)
done
gcc -O2 -Wall -Wextra lua54-trace.c -o lua54-trace -Wl,-l:liblua5.4.so.0
node make-variants.mjs /path/to/repository live rc variants
node make-tiers.mjs variants/variant-metadata.json variants/tier-by-id.lua
STARTUP_VARIANTS="$PWD/variants" ./lua54-trace verify-variants.lua
python run-startup.py module raw/module.jsonl --rounds 30 --cpu 3
python run-startup.py host raw/host.jsonl --rounds 25 --cpu 4
python run-startup.py detail raw/detail.jsonl --rounds 12 --cpu 4
```

生产模块模式使用现有有声 GIL 构建，保留构建收据引用的 `payload` 和 `generated` 路径以供 SHA 检查。生产证据由 `prepare-packaged.mjs` 从实际完整构建收据生成。以本证据总报告的同一公开基础 GIL 与正式资产配置打包 (脚本入口 `npm run build:game`)，分别定位完整音频收据，构建收据源引用也须在同机可读。若重建产生新的 UUID，则收据中的候选文件 hash 相应改变，源码 SHA 与产品配置仍需一致。

```sh
node prepare-packaged.mjs variants /path/to/live/audio/candidate.json /path/to/hotfix/audio/candidate.json
python run-startup.py packaged raw/packaged.jsonl --rounds 20 --cpu 3
python run-startup.py packaged-detail raw/packaged-detail.jsonl --rounds 10 --cpu 3
python summarize-startup.py
MPLCONFIGDIR="$PWD/mpl" python plot-startup-waterfall.py results/startup-summary.json results/startup-waterfall.svg
```

未压缩原始样本用于聚合。归档中的 `.jsonl.gz` 可用 `gzip -dk raw/*.jsonl.gz` 恢复。跑测需要 Linux、Node、Python 3、C 编译器及 Lua 5.4 共享库。绘图需要 Matplotlib、fontTools 和 Noto Sans CJK。用当前机可用核替换 `--cpu`，记录锁定核和相同的工作环境。实际客户端验收需使用同一候选并按官方负载证据合同取真实时间戳。
