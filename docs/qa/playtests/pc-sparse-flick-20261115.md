# PC稀疏拖动采样修复（2026-11-15）

关联反馈：PC12；执行入口TASK-30、总体验收TASK-42。基线为`release/v2.0.0@36b9b157ee6f05b65eb9f1da7e2978647d36c210`。本记录证明一处可重复的源码边界缺陷，**没有取得用户现场的实际鼠标事件，因此不将它认定为全部PC快速出牌问题的根因或验收通过**。

## 复现与最小修复

既有`hand_flick_intent.lua`以三个Drag样本在50ms内从按下点向上移动75画布单位，可以打出防御。保持相同起终点和总时长，仅合并为一次Drag，原逻辑的意图历史没有Down起点，Drag和Up同位置导致计算速度为0，牌未打出。没有Drag、仅Up带终点的情况也有同样边界。

修复只在已接受的真实Down初始化后，将其已知坐标/时间送入既有`Intent.sample`。有效坐标、可用性、active/busy、触点与UID所有权仍由原路径检查；速度/距离阈值、动作忙碌门禁、规则/RNG不变，没有预输入、快捷键或新队列。

生产文件：`src/lua/abyss_battle_card_bindings.lua`；修后Git blob=`d15c600bb85094bc28f8453a9e5af036d7f5469a`。

## 本轮验证

新增`tests/sparse-card-flick.test.mjs`及两份真实Host Lua回归，使用当前生成树与生产模块，未调用历史source替身：

- RED：未改生产前，`sparse_card_flick.lua:18`因“a fast upward release with zero or one Drag must play exactly one defend”失败；安全组通过。
- GREEN：12个有效场景，覆盖2/5/10手牌、PC/触屏、零/单Drag；捕获UID只打出一次，重复Up/EndDrag及尾随Click不出下一张牌。8个安全场景覆盖慢抬、横扫、回手取消、错误触点及resize后的迟到Up/Click，均不扣费、不出牌。两组通过，0skip。
- 已有`hand-flick-intent.test.mjs`、`mobile-card-release.test.mjs`、`battle-gesture-slices.test.mjs`通过。
- 架构通过：351模块、1989边。工程质量报告6165/6165测量（原report-only模式）；Luacheck无新增诊断，6条显式历史警告，2214受管责任测量。`git diff --check`通过。
- 仅规划现有Fast影响集合，未运行本地Full；release PR仍必须经过既有Full准入。

首次新树缺少Fengari，复用既有锁定依赖后才取得上述真实RED。Luacheck同样复用既有固定哈希工具，没有联网安装、改配置或放宽门槛。

## 未通过/未取得的验证

`battle-drag-click-compatibility.test.mjs`的6个历史来源/注册合同通过，但历史运行时回放仍未整体通过：系统TEMP先发生EPERM；树内专属TEMP被原“历史source必须在工作树外”合同拒绝；改为本工作树外的专属TEMP后，原冻结03266f66夹具在30000ms总期限处超时，已完成cases1、2，均PASS，phase=`lua`。其余运行组因worker关闭连带失败。保留全部旧断言和期限，不将部分通过算整套通过；交既有CI/同条件性能复核。

尚未取得当前候选的官方导入、ready、PC快速操作及受影响实体手机证据，也没有容量读数。PC12仍In Progress；其他连续操作、busy时输入、系统多任务卡顿及末击奖励闪屏问题没有被本切片宣布解决。

原始诊断与执行输出存于本机`.artifacts/release-pc-qa-20261115/`，该目录不是Git已上传证据。真实用户截图仍按私有证据条件处理；本片没有生成或引用伪造的官方图像。
