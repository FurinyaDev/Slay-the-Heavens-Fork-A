# v2.2.0 视口、视觉覆盖与输入坐标实证

适用版本为 v2.2.0，任务为 TASK-115.6。源码基线为 [develop 27e2f830](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/27e2f8304bcbaedffa0efbc02d739bd4aeab38b6)。本切片接续 [Fork A 方案 8d99c0b5](https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/commit/8d99c0b557129077118480ec99c4ae20f6ea1bff) 的统一画布和转场范围。此前 v2.1.1 的 1280×720 固定舞台与历史露底案例留作对照。当前切片不包含战斗美术、站位、HUD 或手牌版式定稿。

## 宿主证据与实施边界

- 官方客户端控件 API 提供 `game.GetClientUIRoots()`、`game.GetUICanvasSize()`、`game.GetCursorUIPos()`；`CursorEventData:GetUIPos()` 从画布左下返回布局单位。已核对的文档未列出物理屏幕尺寸或系统安全区的读取方法。输入设备枚举仅用于复用现有移动端视觉外延分支。[千星官方指南](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhtakr07vej4) · [可检索镜像](https://github.com/8itlab/genshin-miliastra-mcp/blob/70470757d6fcb319c5afec13b178c87f2d8d54b3/knowledge/official/guide/mhtakr07vej4.md)
- iPhone 14 Pro 的历史 DIAG-12 报告约 1384.916×720 逻辑单位，原生背景加 400 横向单位后覆盖早期露底。该记录为历史设备保留实证范围；新增可点击区域限于逻辑画布。手机刘海、系统手势区及本候选的可触达范围仍需官方设备实测。[历史诊断及范围](https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/blob/8d99c0b557129077118480ec99c4ae20f6ea1bff/docs/backlog-details/TASK-38.9-RESPONSIVE-VIEWPORT.md)
- Lua 舞台居中，等比系数 `min(canvasW/1280, canvasH/720)`。舞台盒的宽、高分别为 `canvasW/scale` 和 `canvasH/scale`，控件尺寸保留原有比例。布局锚点与触点统一为中心坐标。全局转场 veil 及开场遮罩拿视觉宽度，点击拦截拿逻辑宽度，局部页面过渡沿用局部矩形。仅启动和画布变化时写入舞台几何。

## Simulator 实际画面

探针载入实际项目 Lua 视口实现和生成器的初始舞台，画面中的色块分别表示等比中心控件、左右锚点和不透明底色。脚本通过原生模拟器指针下压和抬起，在画面两边各触发一次回调。每次回调读回事件、光标和逆变换坐标。矩形为能力探针，后续另取正式两幕战斗界面逐屏验收。

| 比例 | Simulator 画布 | 左右命中中心（舞台单位） | 原始证据 |
| --- | --- | --- | --- |
| 16:9 | 1280×720 手机预设 | −580、+580 | [PNG](mobile-16-9.png) · [回执及日志](mobile-16-9.result.json) |
| 19.5:9 | 1560×720 手机预设 | −720、+720 | [PNG](mobile-19.5-9.png) · [回执及日志](mobile-19.5-9.result.json) |
| 20:9 | 1600×720，测试副本尺寸预设 | −740、+740 | [PNG](mobile-20-9.png) · [回执及日志](mobile-20-9.result.json) |
| 21:9 | 2100×900 PC 预设 | −780、+780，等比缩放 1.25 | [PNG](pc-21-9.png) · [回执及日志](pc-21-9.result.json) |

三组内建预设使用未修改的 BeyondSimulator MCP 0.5.2。0.5.2 缺少 20:9 手机预设；第四组使用同一版本的独立副本，仅将探针中未用的 `mobile-4-3` 尺寸预设替换为 1600×720，渲染器和 Lua 核心未更改。全部回执没有素材警告，中心 100×100 探针保持方形，两个真实命中与 Lua 偏移一致。

## 复现

从仓库根目录，复用已安装的 BeyondSimulator MCP 0.5.2。安装位置采用仓库 [美术实验](../../../experiments/art-tech-lab/README.md)；结果写到本工作树 `.artifacts/viewport-proof`。

```bash
node docs/evidence/v2.2.0-viewport/probe.mjs mobile-16-9 mobile-19.5-9 pc-21-9
```

20:9 需要分别在隔离安装副本的 `dist/index.js` 和 `dist/worker.js` 替换触屏预设 `mobile-4-3` 的键和 ID 为 `mobile-20-9`，宽高改为 1600×720，比例改为 20:9。只修改该预设的两处声明。随后用 `ART_LAB_MCP_ENTRY` 指向隔离副本入口，以 `mobile-20-9` 重跑探针。

正式验收使用同一 GIL SHA-256、客户端版本和实际 `GetUICanvasSize()` 读数，分别记录横屏原生截图中的可绘制边界与物理尺寸，并用实际触点验证左右控件、拖牌、地图、商店和转场。官方导入、设备安全区、平台帧率、两幕视觉及实机操作均待最终候选验证。
