# 宽屏手牌阅读 Simulator 对照

评审 PR [#1033](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/1033)。修改前 `945305bbf34e89aa4d41e6c5dcbbe5afba4853a4`，修改后 `0b00fcf0b3822d75a3f317a4a09c81f2bc321943`，修改后源码树 `ba097d15ed10df98441538419de24d160662c548`。同一正式生成 `game-ui.json` SHA-256 `17c1f08782e3a3cf2450cab5ea4741d91022127d5cf2eeea8642963e8db284f4`。

四画幅各运行修改前后、血条在读取区内外共 16 组。每组由 BeyondSimulator 0.5.2 软件光栅截图，并通过实际指针坐标点击选牌和再次点击取消。每组记录 3 个实测姿态和截图 SHA-256，素材警告与 Lua 错误均为零。场景使用正式生成的第一幕背景、卡牌和敌方血条控件，运行精确候选的视口和卡牌布局模块。实验仅隔离构造已绘制血条的坐标，真实游戏流程及补间由单独的 Host 定向验证。

| 画幅 | 原近位阅读 Y / 倍率 | 现行近／远位阅读 Y / 倍率 |
| --- | --- | --- |
| 16:9 | -210 / 1.22 | -210 / 1.22 |
| 19.5:9 | -270.662162 / 0.660360 | -210 / 1.22 |
| 20:9 | -270.662162 / 0.660360 | -210 / 1.22 |
| 21:9 | -270.662162 / 0.660360 | -210 / 1.22 |

[修改前 21:9 截图](before-pc-21-9-near.png) · [修改后 21:9 截图](after-pc-21-9-near.png) · [全部截图、回执和日志归档](STH-v220-reading-Simulator.zip)。

现行产物通过实际 Host 输入、165 原安全区检查、8 个触控/鼠标边界组合、20 个原快速拖牌轮次、5 个取消检查和飞牌路径。正式生成配置把前驱四个 Lua 作为负对照，定向用例实际失败在敌人血条改变阅读姿态或命中区断言。当前历史来源检查拒绝逐文件旧输入、混合行尾和跨读混入旧文件，同时允许固定的完整历史输入。在同样读回必要 LFS 的源码上，历史定向修改前后均 10/13，集成历史定向均 38/49，失败标题和首个实质断言逐一一致。设备验收沿用本版正式候选。

## 复现

在仓库根目录生成正式布局，保持相同构建参数。复制 `simulator.mjs` 和 `source-gate-probe.mjs` 到 `.artifacts/card-reading-proof/`。安装并复用 `beyond-simulator-mcp@0.5.2`，将 `ART_LAB_MCP_ENTRY` 指向 `dist/index.js`。20:9 采用 [既有隔离预设做法](../v2.2.0-viewport/README.md#复现)，仅把未用于本测试的 `mobile-4-3` 尺寸换成 1600×720。仅在云代理需要时设置 `NODE_USE_ENV_PROXY=1`。

```bash
node --input-type=module - <<'NODE'
import {buildUI} from './scripts/build-ui.mjs';
buildUI('.artifacts/card-reading-proof/generated', undefined, {
  officialAssets:true, nativePageLifecycle:true, refinedReleaseMonsterArt:true, experimentalCharacters:false,
});
NODE
node .artifacts/card-reading-proof/simulator.mjs \
  .artifacts/card-reading-proof/generated .artifacts/card-reading-proof/capture \
  945305bbf34e89aa4d41e6c5dcbbe5afba4853a4 0b00fcf0b3822d75a3f317a4a09c81f2bc321943 \
  mobile-16-9 mobile-19.5-9 mobile-20-9 pc-21-9
node .artifacts/card-reading-proof/source-gate-probe.mjs 945305bbf34e89aa4d41e6c5dcbbe5afba4853a4
```

此独立取证分支保留固定素材与回执，产品改动通过原 PR 集成。图片使用仓库既有视觉资产和对应权利声明。
