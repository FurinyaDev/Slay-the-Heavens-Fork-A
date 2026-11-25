# v2.2.0 战斗两侧操作区域

适用任务 TASK-115.6，接续 [视口与输入](README.md)。16:9 保存既有战斗设计位置。宽屏按逻辑画布左右边锚定能量、抽牌堆、弃牌堆、消耗堆和结束回合。生成器移动同组装饰、数量与命中控件，沿用其尺寸和组内距离。原生锚点响应舞台宽度，位置更新不占用 Lua 帧循环。状态说明的大区域点击拦截宽度随舞台变化。

| Simulator 画布 | 抽牌堆 x | 弃牌堆 x | 结束回合 x | 结果 |
| --- | ---: | ---: | ---: | --- |
| 1280×720 | 54.5 | 1225.5 | 1094.5 | [实际画面](mobile-16-9-periphery.png) · [三个回调](mobile-16-9-periphery.json) |
| 1560×720 | 54.5 | 1505.5 | 1374.5 | [实际画面](mobile-19.5-9-periphery.png) · [三个回调](mobile-19.5-9-periphery.json) |
| 1600×720 | 54.5 | 1545.5 | 1414.5 | [实际画面](mobile-20-9-periphery.png) · [三个回调](mobile-20-9-periphery.json) |
| 2100×900 | 68.125 | 2031.875 | 1868.125 | [实际画面](pc-21-9-periphery.png) · [三个回调](pc-21-9-periphery.json) |

表中坐标使用 Simulator API 的逻辑画布单位。正式美术 v3 配置生成的 `game-ui.json` 提取了上述真实控件树，Lua 使用项目的视口模块，附加回调只记录命中。回执均无素材告警，四档各收到三次实际下压和抬起触发的点击，控件组位置跟随边缘。20:9 沿用[独立测试预设](README.md#复现)。这些截图的计数使用生成器初始值。用户路径、耗时、真实 GIL、官方客户端以及正式两幕场景联合体验由后续同一候选验收。

## A/B 对照

在同一 Simulator、相同正式 UI 构建配置与同一视口实现下，以 [6bdf0653](https://github.com/FurinyaDev/Slay-the-Heavens-Fork-A/commit/6bdf065367799e9993faa121425678a0070892c1) 为 A，加入战斗边锚后的 UI 为 B。16:9 的 PNG 摘要和三个点击坐标完全一致。[16:9 A 回执](mobile-16-9-periphery-before.json) · [16:9 B 回执](mobile-16-9-periphery.json)

21:9 时，抽牌堆 x 从 318.125 移至 68.125，弃牌堆 x 从 1781.875 移至 2031.875，结束回合 x 从 1618.125 移至 1868.125。两侧增加的 250 像素分别用于安放原尺寸控件。绘制比例保持 1.25，三个 y 坐标与点击结果一致。[21:9 A 图](pc-21-9-periphery-before.png) · [A 回执](pc-21-9-periphery-before.json) · [B 图](pc-21-9-periphery.png) · [B 回执](pc-21-9-periphery.json)

## 复现

从仓库根目录执行以下命令。正式 UI 源需要仓库现有的对应 Git LFS 美术输入。使用已安装的 BeyondSimulator 0.5.2；如缓存目录不可写，可在命令环境中用 `XDG_CACHE_HOME` 指定当前工作树的可写目录。

```bash
node --input-type=module - <<'NODE'
import {buildUI} from './scripts/build-ui.mjs';
buildUI('.artifacts/viewport-edge/official-generated', undefined, {
  officialAssets: true,
  nativePageLifecycle: true,
  refinedReleaseMonsterArt: true,
  experimentalCharacters: false,
});
NODE
node docs/evidence/v2.2.0-viewport/periphery.mjs \
  .artifacts/viewport-edge/official-generated/game-ui.json mobile-16-9 mobile-19.5-9 pc-21-9
```
