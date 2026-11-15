# PR684 当前预测目标修正：增量独审

**CODE_PASS_SCOPED**，无未解决项。

- Base：`d396abb252b4dcfe4d825dccc6c850daf81086c9`
- Head：`d6555c40687adb649a56c40c1da93918df4d0cdb`
- Tree：`81edeced4e67a1c4a1c33c6a498b08edfddfda9c`

完整读本次8路径delta。可执行变化仅增加 `forecast<target` 一行、更新该完整测试after和CI trustleaf摘要。原target1800000/1200000ms及guard2700000/1800000ms均硬断言，历史原断言不变。

Packet除该after与明确checkpoint/role外逐字段deepEqual；其余44输入、全部before、两套库存、93个immutable记录均保持，物理档案hash与Git字节不变。旧packet另存的gzip与base Git对象逐byte一致。新after文本/SHA256/Git blob核对精确head。

当前完整来源绑定通过；去掉target断言的旧源码被当前绑定拒绝。直接执行真实当前raw callback并复用真实shard/Lua计算：

- win32: raw 887 JS / 1431 Lua; forecast 1766189ms; target 1800000ms; overrun 0ms; unchanged execution guard 2700000ms; not hosted completion
- linux: raw 887 JS / 1431 Lua; forecast 1196961ms; target 1200000ms; overrun 0ms; unchanged execution guard 1800000ms; not hosted completion

独立敏感性负例：分别给Windows/Linux实际shard loads加60000ms，保持低于原guard；旧callback接受，修正callback均在performance target断言处拒绝。作者4/4证据gzip/raw hash亦核验。未重跑73/44/产品。

Hosted Full、官方候选/ready/容量与PC/手机均未评估；本结论不授Release准入。原导航初REQUEST_CHANGES原文保留。

## 覆盖路径

- `backlog/tasks/task-42 - 电脑鼠标键盘游玩适配与完整流程验收（优先排期）.md`
- `docs/backlog-details/RELEASE-PC-SOURCE-20261115.md`
- `docs/evidence/release-pc-source-20261115/ci-source-before-current-target.json.gz`
- `docs/evidence/release-pc-source-20261115/current-target-binding-receipt.json`
- `docs/evidence/release-pc-source-20261115/current-target-tests.log.gz`
- `tests/ci-complete-calibration.test.mjs`
- `tests/helpers/release-pc-ci-source.json.gz`
- `tests/helpers/release-pc-ci-source.mjs`
