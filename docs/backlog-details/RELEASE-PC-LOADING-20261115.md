# 2.0.0 PC 同页闪屏选择性移植（2026-11-15）

Release任务入口：TASK-103（#676拟议103.6仅为来源）；关联 PC02、PC05、PC13、PC15、PC26、PC28。状态仍为 In Progress。仅源码与离线 Host 验证，不能替代当前正式候选官方 ready、PC 像素时序、手机路径和容量验收。

## 范围与来源

基线 `release/v2.0.0@36b9b157ee6f05b65eb9f1da7e2978647d36c210`，它已包含 #663 的 `c2409ad7`。独立分支 `feat/release-pc-loading-1115`。没有合入 develop 或 #672 整分支。

移植提交 `e0a2e8466361bce307aeb79b008659a27ffdb99f`；独审 P1 纠正提交 `16785c397533ba3c2a91dbaa0a0522b6cc8ba055`。不能只移植前一提交：最终 `step` 必须先确认请求仍归当前 intent，再读取 ready。

复用 #672 的四个已存在生产修复：

- `70324fd2d4ae39a61a2549b3df9d55b275161b51`：模态挂起地图/房间输入时保留底页资源和准备工作。
- `7ecbf77d6da7e2dceca2d56ab32cbb286ef57939`：同底页同步 ready 模态在当前 paint 后发布；未 ready 时仅遮盖现有局部区域。
- `a739c0978f93873d820c9b193ca963d42bb0b3c8`：复用未变化的遮盖几何。
- `9b7794e944eb8dde1c5e9f9b2c1800dc5d653caf`：原生 setter 失败、同步重入和已失效 paint 不能污染新几何缓存或发布旧请求。

生产改动仅五个既有模块：`abyss_game_ui`、`abyss_game_ui_view`、`abyss_map_ui`、`abyss_node_ui_lifecycle`、`abyss_page_reveal`。使用已有 Theme 尺寸，保留全屏透明输入屏障、epoch、真正换战斗/房间的完整准备边界。未加入手机布局、图像模式、图标、预输入、快捷键或新等待时长。

## 可证伪回归

本轮先把新回归放在未修基线上执行，再选择性移植生产逻辑。原始压缩日志及 SHA256 在[证据收据](../evidence/release-pc-loading-20261115/receipt.json)；完整本机输出仍在本工作树 `.artifacts/release-pc-loading-1115/`。这些是离线测试日志，不是官方设备收据。

| 层 | 修前 | 修后 | 证据 |
| --- | --- | --- | --- |
| 新增 Host/遮盖 setter/底页资源合同 | 0/3，三项均失败 | 3/3 | `red.log` / `green.log` |
| 独审发现 `step` 请求重入 | e0 仍失败，旧 deck readiness 错误发布未 ready 的 potion | 修正后 3/3 加载合同通过 | `step-reentry-red.log` / `step-reentry-green.log`；新增 position/size/onIntent 三边界 |
| release 原有 deck/page-reveal 基线 | 7/7 | 最终修正后 7/7 | `step-reentry-related.log`；原始基线由本轮 Node 24.18.0 命令输出核实 |
| 地图与 native-page 相关检查 | 不作设备结论 | 地图 6/6；native-page 18/18 | `related-corrected.log` / `related-built.log` |
| 历史 Host 完整轨迹与当前 Host | 不作全通过结论 | 19–21 两种 seed 通过；22–24 两个冻结旧 snapshot 超过原 30 秒限制 | `related-built.log`；FAIL 保留，未改时限或宣称 Full 通过 |
| 工程质量/架构/Luacheck | 不作设备结论 | 最终修正后通过 | `step-reentry-engineering.log` |

RED 的实际症状分别是同步药水模态仍全屏准备、setter 失败未被拒绝、打开模态销毁正在准备的房间底页。GREEN 覆盖设置/药水、战后奖励与强制选牌、营地锻造/商店删牌/宝箱、100 次排序、快速往返、失败、迟到回调、退休 Host、新战斗和新房间。

复用隔离生成 helper 为每个回归创建独立 build 目录；不会污染其他测试的共享 profile。保留 release 原有卡面异步准备必须等待的断言。只调整既有强制 choice 回归中“同底页已有资源全部 ready 后应在本 scheduler turn 发布”的语义断言；未删断言、跳测试或改变超时预算。

独立复审通过真实反例发现初次移植的 `gate:step` 忽略 `request` 的重入拒绝，可能以新 epoch 查询旧 intent 并揭开未就绪模态。修正复用 `begin` 的请求结果/intent 归属边界，在任何 ready 查询之前退出旧 step；原 setter 部分失败、请求重入、同 epoch paint 保护均保留。修前 RED 明确记录 `intent=potion` 却发布 `deck`，修后断言还要求不查询过期 ready。

工程结果：351 模块、6171/6171 测量、1988 架构边；Luacheck 1.2.0 无新增诊断，六项历史 warning 保留。首次工程命令缺独立树 Luacheck，随后从既有工作树复制同 hash 固定工具后重跑通过；未重新安装。

## 命令与环境

使用本机已安装的 Node `24.18.0`。首次普通沙箱测试因 Node 子进程 `spawn EPERM` 未执行产品断言；后续在允许的正常本机进程环境执行。额外相关测试首次发现系统 Temp 写权限错误，后续把 `TMP/TEMP` 指向本工作树 `.artifacts/release-pc-loading-1115/tmp`，保留原失败日志。共享 Host 测试另需先 `build:data`、`build:ui`；补齐该前置后，原来缺 `abyss_narrative` 的环境错误消除。历史冻结 snapshot 的后续两次超时仍为失败，未归因本补丁、未重试整套，也未放宽预算。

```powershell
node --test tests/modal-page-preparation.test.mjs tests/modal-loading-frames.test.mjs
node scripts/build-lua-data.mjs
node scripts/build-ui.mjs
node --test tests/deck-browser-reveal-reuse.test.mjs tests/sts-page-reveal.test.mjs tests/game-ui-host-modal.test.mjs tests/native-page-lifecycle.test.mjs tests/map-ui-layout.test.mjs
node scripts/check-engineering.mjs
git diff --check
```

## 尚未验收

真实 PC 闪屏/延迟、最后一击动画→奖励的实际帧序、当前候选 official ready/容量、受影响实体手机路径尚未执行。本切片不把“同战斗不再全屏遮盖”升级为整个战斗结算体验已通过。

Release 来源证明 continuation、完整 CI、纠正后的独立复审及 PR 由主集成统一完成；两项本地历史 snapshot 超时须由原正常门禁继续核查。本切片不复制 #672 绑定全部手机/图标生产改动的历史来源链，不申请合并、不发版。
