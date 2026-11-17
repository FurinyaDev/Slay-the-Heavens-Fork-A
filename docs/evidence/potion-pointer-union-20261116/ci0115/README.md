# CI 入口双前驱接续（PARTIAL）

基于准备头 `29ae8d2cb2a5b729c348191ee56910b1aa77386c`，保留产品 producer 和两条原 PR 的 HEAD，不修改任何产品代码。

## 本阶段

- 真实 RED：`assertIntegratedCurrent()` 仍用 #679 的 gestures SHA `937772c0…` 校验联合产品 `5b7d1f3b…`，把合法联合树当作来源漂移。
- 新增不可变 `potion-pointer-ci-union` packet，保留两个明确前驱 `eabff9b0bf2cce17ae05913c0e5d47366d0ff173` / `ad6fe84dbcc11e28e8a82258f889a6841b46c8c6` 的真实 Git 字节。只在完整当前来源认证后选择具名历史域。无 regex 伪造历史，无旧 pin 改写。
- 当前认证覆盖 352 项产品来源、187 个现有 CI/来源输入，以及 packet 本体。产品公开投影保持不拦截；只有具名内部历史读取可使用完整生产前驱。
- `assertIntegratedCurrent` 保留原所有链式断言。一次同步完整验证使用不可变字节 capture，避免为每层历史读取重新扫描全库；公开 source/reader 不复用授权，每次投影重新认证原始当前输入。
- `capture.py` 可在仓库根重建 packet。它读取精确父 Git/LFS 对象，不从测试结果反推或放宽期待值。

## 证据解释

`verify.mjs` 覆盖精确双父 Git 内容、公开生产不拦截、Buffer 类型、CRLF/异常换行、foreign 值、暖读后全部当前 owner/输入漂移、缺失/空内容、整组旧 current 回滚与恢复。`verify-initial.log` 保留首轮证据：403 项后测试自身误将 caller 已变为 foreign 时“原样返回”期待为异常；最终测试改用未变 caller source 对真实读盘漂移取证，并另验复用 reader 的非 caller 依赖。未改实现来让错误期待通过。

## 仍未完成

本提交仅解决 CI 入口身份接续，**不代表 #679/#711 完整测试集成**。`integrated-ci-source.cases.mjs`、`ci-complete-calibration.test.mjs`、`release-selection-map-source.test.mjs` 仍须纳入 #711 的新增原断言并配置各自具名历史消费；#711 的 CI helpers 和 mobile-card-release/support 新测试亦待接续。不直接把本准备分支合入 Release，不把历史断言成功当作新增指针行为验收。

未运行 Full、未改变原断言或门禁、未提交官方 GIL/设备/容量验收。新报告中提到的 #711 产品缺陷属于独立产品修复，本来源阶段不宣称解决。

新增 CI union helper **尚未纳入完整 CI 隔离复制/manifest 的精确 pins**。既有 copy0015 只认证 `closeout-source-epoch` 的生产来源闭包，不能移用为本 CI 入口的新隔离导入通过。后续集成三个测试消费时必须按实际 CI 复制入口补齐；本阶段不更改旧 copy pins。

独审指出同步 callback reader 可被保存并逃逸，已加 active 作用域、`try/finally` 退出失效及清空捕获字节，并拒绝 thenable callback。最终验证追加正常退出、异常退出、Promise 与 microtask 逃逸负控；公开 reader 仍每次重新认证。
