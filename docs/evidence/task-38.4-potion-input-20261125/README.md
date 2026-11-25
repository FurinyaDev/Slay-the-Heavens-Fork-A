# TASK-38.4 | 药水弹窗与手牌触点离线复验

基线：develop b2f74d99a3d80e60b99165b6380987cda8b4488d。基线已包含既有保护；本切片不改运行时代码，不重新实现。

- Battle UI Host 模拟了 2、5、10 张手牌下，药水操作与手牌 Down 先后两种顺序。Use/Discard/Dismiss 保持药水触点归属，迟到回调不选中或打出下方牌。三个药水按其效果核对一次性执行。
- 真实游戏规则触发远虑强制选择后，点击三个药水槽不会调用 render/refresh，也不消耗药水、不改待选择状态。
- 相邻场景：第五槽、针对性施药、弹窗无操作区域触摸、旧触点与匿名事件均通过既有 Host 验证。结果为 4 个定向 JS 测试全过；未运行全量。
- 未测实体手机的官方客户端命中框、引擎事件投递或视觉黑闪。AC 保留原状。下一步用同一候选在手机复验 2/5/10 手的弹窗重叠操作与远虑选择；若再复现，记录相同坐标和 Down/Up/Click 的实际事件顺序，再定位最小修复。

复跑（干净 checkout，先按仓规还原相关 LFS 测试夹具）：

    npm ci --ignore-scripts
    node scripts/build-lua-data.mjs data build/lua/abyss_data.lua
    node scripts/build-ui.mjs build/lua
    MILIASTRA_ALLOW_LIVE_WRITE=0 node --test --test-concurrency=1 --test-name-pattern='Recovered potion ownership|completed neutral potion|Main potion runtime|Main host isolates' tests/approved-main-potions.test.mjs

原始通过输出见同目录 develop-b2f74d99-pointer.tap。

同一组测试在更新后的 develop 31107daac7f5a6a44189bf93bcd0caedc5c4ae6d 复跑仍为 4/4。该次结果见 develop-31107daa-pointer.tap；后续版本归档提交不改变测试输入。
