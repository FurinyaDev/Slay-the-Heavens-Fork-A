# 只读牌库分页和持久卡面

交付基线是 `develop@00229683d0d38660c98ced2f4a41e89d84fc5e4e`。`release/v2.0.0@013bdffb7d4767075d7ebcf0be9eacd275bfbe89` 是研究基线，开始时 Release 已到 `6c1e6644dc3345d4581e173a0f644da64abad5aa`。#811 在 develop；#813、#839 在 Release。保留 develop 的 #868 战斗入口和 #876 地图进房路径。整面外观复用与有界文字拟合从研究版本接续，下面单列相对 develop 的计数。历史 Release 的放大详情和地图返回四态共享在两个分支上有差异。本切片保留当前目标分支的完整详情和返回样式。

## 复现和候选身份

正式生成配置为 `--official-assets --native-page-lifecycle --refined-release-monsters`，对应 `official-assets-battle-v3`。生成标志为 `cards=false`、`menuBackground=false`、`selectionAvatar=true`、`battlePortrait=true`、`monsters=true`。实体卡面在首次浏览后随 Host/Run 保留，资源上限十根。每根最多五个附属层；切换或关闭不会创建新根。模板的启动注册和运行时懒创建是两项不同开销。

```sh
npm ci
git lfs pull origin
git lfs fsck --objects HEAD
npm run build:data
node scripts/build-ui.mjs build/formal --official-assets --native-page-lifecycle --refined-release-monsters
node --test tests/deck-pages.test.mjs tests/deck-ui-layout.test.mjs tests/deck-item-lifecycle.test.mjs
npm run check:native-ui-contract
npm run check:platform-load
```

[原始测量和脚本](raw-evidence.zip) 中的 `performance-review/v3/run-matrix.py` 从两个隔离工作树启动相同的 LuaTeX 夹具；始发实验的目录名为 `deck-baseline`、`deck-pages`，重跑时使用这两个目录名或重定向脚本的 `dirs`。日志携带时钟、实验臂、阶段、样本与操作计数。六个 session 交错运行，每臂/场景 36 个延迟样本。夹具基线默认保留最多十二项；长列表的基线键鼠测试使用十五项覆盖可见窗并明确记为修订夹具。销毁式夹具另测。真实设备验收线为首反馈 P95 ≤100 ms，须测输入事件到画面实际呈现。4 ms 为无中断的 CPU 调度目标。时钟分辨率与观测器开销单列于原始记录。无实机数据可据此确认目标。

当前证据绑定生成源码和布局。正式 GIL 还需 Production 底图与项目固定的 MCP 编码工具。未取得 GIL 摘要、原生脚本读回、官方导入、当前 ready、官方容量或终端测量。固定身份的 `replay:outcome` 还需同候选的 GIL 投影、精确 Lua 清单和锁定的 SDK 导出；已有历史 `verify:outcome` 仍报告产品未验及旧菜单长阻塞。公共 npm Worker 的独立探针未替换项目 SDK 锁。

## Host 交错结果

下表为 20 张混合抽牌、手柄同十槽，单位 CPU ms。三项数据依次为 P50 / P95 / max。首次页面就绪在候选中经过 4 / 7 / 8 个 fixture 调度回合。CPU 统计不包含真实回合等待或实际显示。

| 操作 | develop | V3 分段方案 |
| --- | ---: | ---: |
| 首开输入回调 | 11.45 / 31.49 / 47.80 | 1.74 / 2.97 / 3.13 |
| 首开至当前页就绪 | 11.45 / 31.49 / 47.81 | 11.43 / 25.76 / 30.94 |
| 暖开至就绪 | 4.93 / 10.08 / 11.27 | 2.75 / 9.04 / 16.37 |
| 翻页至就绪 | 4.22 / 7.78 / 14.50 | 4.92 / 12.77 / 14.87 |
| 排序至就绪 | 4.09 / 6.75 / 7.04 | 2.82 / 4.42 / 13.15 |

75 张键鼠冷开回调为 15.41 / 42.10 / 43.95 → 1.67 / 2.61 / 3.16 ms，至当前页就绪为 15.41 / 42.10 / 43.96 → 9.58 / 22.86 / 22.95 ms。翻页尾部有回退，暖开及排序的 max 也上升。不能把提交首反馈和页就绪合并成一个指标。完整分布见 [Host 概览](host-summary.txt)。

- **生命周期和静置已改善。** 20 张同槽冷开 `GetChild` 3,410 → 2,074。仅撤销 batch 缓存的分阶段实验差约 1,390 次；分段挂接新增路径查询。120 次浏览器静置查询 600 → 0，`SetVisible` 360 → 0，控制器 eligibility 37,200 → 0。额外的 600 次旧同值属性写由源路径计数。
- **同外观移动已改善。** 相同抽牌夹具排序，固定槽的尺寸写 1,004 次，按相同外观重新分配后 568 次。相同类型再匹配虽然降低翻页几何写，单次小样本 CPU P50 4.65 → 5.02 ms，当前组合采用精确外观匹配。按需发现未用子树仅有查询消融，尚无共享视觉充分验证。
- **原子创建已缩减。** 正式树每面 356 → 316 节点，仅裁掉永远隐藏的可打出描边后代，新增五个同坐标包装。六个创建单元分别为 58/42/71/51/51/43 个节点。公共 npm `beyond-simulator-mcp@0.5.2` Worker 四个交错 session 中，整模板 n=80 的原子 CPU P50/P95/max 为 2.04/5.92/24.70 ms，正式分段 n=480 为 0.25/0.85/6.39 ms。每面仅创建总 CPU 2.04/5.92/24.70 → 1.74/5.04/8.17 ms。仍有超出 4 ms 的原子长尾。
- **维持惰性。** 单列预热探针里，首开 CPU P50 12.04 → 6.61 ms，包含预热后的合计 12.04 → 12.59 ms。预热让十面提早驻留。房间转场、六槽和轻卡面均未列入这组牌库收益。
- **资源盘点。** 混合类型达到能力牌高水位后，永久卡组和三个战斗入口各完成二十次往返，池 10 根及 50 个挂载段稳定。牌面含父节点 3,161，完整 DeckPanel 3,704；选择 Grid 的销毁型模型含 1 个空 Grid，默认保留选择项夹具在先开 12 张旧选牌后为 7,976 个 DeckPanel 节点。控制器、点击监听、详情、当前任务和可选 art 另见原始复核。正式默认无动态卡图租约，试验开启时旧 battle 的十租约已用 scope 测试隔离。旧选择 Grid 实际销毁行为仍待官方测量。

公开 SDK 最小 Grid 实测 250 回调对应 250 根，250→10 复用十根并销毁 240 根，10→0 销毁最后十根。Lua userdata 包装变化时以 SDK 稳定 ID 识别。离线 Host 有界夹具、公开 SDK 和官方客户端分别记账；离屏官方控件生命周期待验。

## 审查和画面

独立性能复核给出固定槽负控、阶段消融和交错延迟。资源及输入复核主动注入迟到旧手势、旧 Confirm、销毁拒绝、带副作用的创建异常、重开和换 Run；分段修复后 15 项通过。产品复核覆盖 0/1/7/10/11/20/75/250、排序、筛选、Frozen Eye、临时费用、详情焦点和现有选择。正式 V3 分段与展平 Host 的五种画布场景均为零差异像素；未识别的实际 SDK 纹理以原生资源 ID 占位。

- [首反馈](visual/formal-feedback.png) · [首页](visual/formal-page1.png) · [末页](visual/formal-page2.png)
- [详情](visual/formal-detail.png) · [筛选空态](visual/formal-empty-filter.png) · [develop 首屏](visual/develop-first-open.png)
- [像素差异记录](visual/flat-comparison.json) · [分段失败重试日志](segmented-lifecycle.log)
