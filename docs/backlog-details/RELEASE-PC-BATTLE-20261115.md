# 2.0.0 PC 战斗 P0：分裂位置与取消提示

状态：**代码移植及本地回归通过；独审、Release CI、同候选设备验收未完成**。不标 Done，不代表发布许可。对应 38 条反馈 PC27（分裂重叠）、PC35（取消后提示残留）；任务身份由 PC 总账统一核对，不在本切片复制 #676 中冲突的任务编号。

## 范围与来源

- 基线 `release/v2.0.0@36b9b157ee6f05b65eb9f1da7e2978647d36c210`，已包含 #663。
- `dde71325414f39aae7381752da740445645b1c52` → `42378151`，`cherry-pick -x`：酸/尖大型史莱姆分裂的孩子保留父坐标，水平分别偏移 -134/+134 源像素，纵坐标不变。Boss 的显式 `splitPositions` 分支保留；不增加 RNG 请求、不改分裂血量或奖励逻辑。
- `97ed740e83e2f6bb0f8377eea2209070a300b36c` → `bf027753`，`cherry-pick -x`：实际 Back 取消选牌时清理旧拒绝提示，继续清理原输入、选择和行动状态。
- 两个 JS 回归使用 #672 最终 `1f7ce04c` 的 `isolated-battle-regression.mjs`：在本树私有临时目录重新生成真实数据/UI，执行当前 Lua 与原生 UI mock。没有带入 #672 的整条手机、图标、来源 epoch 或构建改动。

## 本轮证据

原始输出压缩保存于 [证据目录](../evidence/release-pc-battle-20261115/receipt.json)，收据绑定基线、来源、当前输入 LF 摘要及原始/压缩日志 SHA256。执行环境 Node v22.22.1；测试子进程在受限沙箱首次遇到 `spawn EPERM`，经自动审批在同树运行，下列 RED 为实际产品断言失败。

| 层次 | 命令 / 场景 | 结果与边界 |
| --- | --- | --- |
| 修前 RED | `node --test --test-concurrency=1 tests/card-cancel-notice.test.mjs tests/slime-split-positions.test.mjs` | 0/2；取消提示在 Lua 第10行失败，分裂缺孩子坐标在第15行失败 |
| 修后 GREEN | 同一命令、同一测试输入 | 2/2；两个史莱姆家族真实 Combat → 原生 actor mock surface，独立身份、坐标、非重叠命中框、原血量；拒绝后取消与重复取消清提示 |
| 原有受影响回归 | `runIsolatedBattleRegression` 依次执行 `acid_slime_split.lua`、`spike_slime_split.lua`、`acid_slime_split_ui.lua`、`spike_slime_split_ui.lua`、`hand_flick_intent.lua` | 5/5 文件；酸15组、尖18组保留原 RNG 次数/顺序、回滚、奖励一次性，双 UI 路径含子代命中、陈旧父触点、状态拦截；甩牌4组通过 |
| 原 Fast 路由 | `npm run test:fast -- --base 36b9b157ee6f05b65eb9f1da7e2978647d36c210` | 10 JS + 41 Lua 文件通过；路由约83秒，不等同 Full |
| 工程 | `node scripts/check-engineering.mjs` | 351模块、6165/6165测量、1988边；Luacheck无新增诊断，6项既有历史告警保留 |

## 待验收

独立复审、精确 Release HEAD/BASE 的正常 Full CI 尚待集成负责人执行；本轮未生成 GIL、未官方导入/ready、未测官方容量、未占用键鼠、未取得 PC/手机截图。PC27 仍须同候选实机确认分裂后显示与选择；PC35 仍须实机拒绝→取消→再次操作检查。PC12 快速出牌与 PC13 结算时序不由这两个补丁宣称解决。截图仍按原私人证据索引和安全转交条件处理。
