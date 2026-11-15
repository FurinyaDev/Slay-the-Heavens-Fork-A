# Release PC 修复来源与 CI 合同接续

本片只追加测试来源与证据，不改产品源码。正式产品冻结点为 `5bd55d7691480b10d00e947076e15c8870640474`，Release 基线为 `36b9b157ee6f05b65eb9f1da7e2978647d36c210`。这不是官方候选、设备或发版验收。

## 保留与追加

- 原完整 source epoch、所有旧 target、原92份 helper archive 的物理 SHA256（既有 LFS 对象按原 pointer OID）均保持；没有迁入 #672 手机、图标、idle 或其他完整来源链。
- 新生产 packet 只追加本轮10个 Lua owner 的完整 before/current 及真实 producer/parents；完整前驱另存为 `releasePcPrior`。所有当前 Lua 与冻结产品逐项一致，原工作集的 `currentTreeCommitted=false` 断言仍在完整前驱上保留，本轮精确产品另验为 true。
- 新 CI packet 覆盖45个本轮来源输入，包含新增/修改回归、辅助模块与3个 Release 引导工作流。普通 before 绑定36b9；工作流 before 明确绑定已合 #663 的 `c2409ad750c15124b7b843c6bbfa5b222537cb75`，用于保留旧 CI 收据的完整输入。实际 Release 工作流未修改，raw 当前来源继续逐项认证。
- CI 历史映射默认不截取生产 owner；只有完整 CI 验证器在先校验 raw after 后比较其旧 CI 记录。运行时生产授权仍使用完整 source epoch 的 fresh linked-owner 验证。
- 已投影到旧层的库存保持 opaque/idempotent，由旧层完整验证；另有 raw Full 精确库存断言。删除全部本轮新增项、重复、未知或修改新增来源均有负例保护。

| packet | 字节 | SHA256 |
|---|---:|---|
| `tests/helpers/release-pc-source.json.gz` | 139789 | `007271848a37da024ef7e25d6e2c7719b2c1d3aeffd36fa157b18e26895253ee` |
| `tests/helpers/release-pc-ci-source.json.gz` | 346253 | `96558aa710814554a18db79368d27ccb23c4682e1bc46f91432db6c4c0201490` |

CI packet 的 currentCommit 仅指精确产品检查点；辅助适配绑定是在本工作树采集，`currentTreeCommitted=false`，没有冒称这些辅助文件已包含于5bd55d76。

EOF 格式接续：`46f7f20650ce6bea060739eeca89f9336665e96f` 只删除 `tests/target-corner-geometry.test.mjs` 最后一个多余换行，原代码和断言保持。本轮 CI packet 仅更新该 after 绑定并增加格式来源元数据；初次345960字节/`49eac62b…`的完整 packet 另存 `docs/evidence/release-pc-source-20261115/initial-ci-source.json.gz`。移除格式元数据并恢复该旧绑定可逐字节重构初次 gzip，其他44项来源、前驱、库存、预算及92旧档案均未改变；生产 packet 保持原值。

格式接续后仅重跑本轮新鲜绑定/完整生产身份/raw库存负例 **3/3 PASS**，并通过 `git diff --check 36b9b157`。收据和日志为 `eof-binding-receipt.json`、`eof-binding-tests.log.gz`。下述49/49、73/73保留初次来源切片身份，没有冒写为格式接续的新完整执行结果。

## 本轮定向验证

Node v24.18.0；没有运行本地全仓 Full，也没有调整分片、timings、未知测试成本、执行预算或工作流门槛。

- 来源/完整旧视图/复制闭包/隔离缺失与漂移/当前 raw 库存：最终 **49/49 PASS**，日志 `docs/evidence/release-pc-source-20261115/source-contracts-final.log.gz`。
- 整个 `tests/ci-complete-calibration.test.mjs`：最终 **73/73 PASS**，日志 `ci-calibration-complete-corrected.log.gz`。完整旧断言保留，新增 raw 工作量另验。
- 原库存876 JS /1423 Lua：Windows1755640ms、POSIX1189630ms，原目标断言通过；当前887 JS /1431 Lua：预测 Windows1766189ms、POSIX1196961ms。原1800000/1200000ms目标及2700000/1800000ms执行上限均未改。这是调度预测，不是托管执行耗时。
- `git diff 5bd55d76 -- src/lua scripts data config package.json package-lock.json` 为空；`git diff --check` 通过。

失败证据保留：首次来源合同45/49，4项因系统 Temp 的 mkdtemp EPERM；改用本工作树可写 TMP/TEMP 后原断言全部通过。首次完整 CI 合同62/73，暴露旧库存幂等入口和 Release bootstrap 工作流历史来源缺口；原输入/断言/预算未删，修正外层适配后73/73。最初2项定向预算中的报错文案契约失败也保留，不冒称初次即全绿。

冷 Git pack 必须在本片提交后用空数据库实际检出及现有 `checkHostedCheckout` 验证原128MiB上限。该结果另附精确提交收据；GIL、Lua与packet字节均不冒充冷pack读数。官方导入/ready、容量、PC及受影响手机仍未由本片验收。

## 当前库存目标门禁补强（11月16日接续）

导航来源独审发现同类缺口：新增 raw current 用例只硬验执行 guard，原 target 仅诊断输出，旧 current 的 target 断言仍只认证前驱库存。`0a4705ff9273c97f6042daf0cd2d11675da56804` 为 PR684 同步补回 `forecast < target`，原 target/guard、timings、未知成本和全部历史断言不改；产品仍冻结 `5bd55d76`。

CI packet 只更新 `ci-complete-calibration.test.mjs` 的 after 与准确修正 checkpoint 元数据；其他44项、before、库存和93项不可变记录（旧92归档+原生产packet）逐项相同。旧 `96558aa7…` packet 原字节另存 `ci-source-before-current-target.json.gz`，新摘要为 `f8a1103c7f1b194370e3084b5d8ec9f1f1a8b5a7f46b35319cb775a34a5ebed7`。

新鲜目标/guard、生产全集、当前CI绑定及库存负例定向 **4/4 PASS**，预测 Win1766189<1800000、POSIX1196961<1200000。`current-target-binding-receipt.json` / `current-target-tests.log.gz` 保留身份与输出；未重跑旧73或全仓Full，不将其旧结果转记到新输入。增量独审和最终精确HEAD准入仍需单独留据。
