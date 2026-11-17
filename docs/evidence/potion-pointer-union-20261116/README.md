# #679 × #711 联合准备（PARTIAL）

产品 producer `9b9e0a2eab4c3fa0783eb7e0f6b69389146bd8b3`，tree `adefdb6b2b8e6b4c54b0570f3d6cd888a7d1c476`，双父分别为 #679 `eabff9b0bf2cce17ae05913c0e5d47366d0ff173` 和 #711 `ad6fe84dbcc11e28e8a82258f889a6841b46c8c6`。

## 已完成
- 只组合双方产品增量；battle_ui 唯一产品文本冲突保留 aimReady、pointerEnd、pointerClear 三个端口。非 src 文件保持第一父，不伪装完整 Git merge 已完成。
- 630 个 src/data/config/scripts 文件路径及字节逐项等于此前产品诊断 tree `a1f298468c69b51f8e488b82ab75943b00c10742`。#679 后续 eab 只改测试来源；不重复此前 41 场景矩阵。
- 独立审查 `/root/release_2215/review_product` PASS：双方非重叠增量逐 blob 保留，gestures 的药水增量和 pointer 身份逻辑兼容，UI 三端口保留；非 src 无新增修改。审查绑定本地同 tree `d120ac63d86cae2e7ee51a9d8b23cf80e54050bb`，远端 producer tree 完全相同。

## 未完成
六个测试/来源冲突需要保留两个独立历史域、完整 current 生产和 discovery 库存及 copy 闭包后接续。此产品-only producer 的来源/CI 仍来自第一父，**不具备合并准入，不代表 Source/CI 通过**。不要将本准备分支直接合入 Release。

旧41场景记录见 https://github.com/FurinyaWorks/Slay-the-Heavens/pull/711#issuecomment-6920986376 ，本轮只复核字节身份，不把旧运行写成 fresh 测试。正式 GIL、官方导入/ready、PC/实体手机和完整 Hosted CI 均未验证。未改两条 PR HEAD，未启动 Full，未改断言或门禁。

## 2026-11-17 preparation on reviewed pointer711 and actual B9

This local preparation normally merges the existing `0780e604323bc78139e0fcf3fc68f1b9d78e6ca8` union with reviewed pointer711 `2c546641c79775ddfa6e9532ce5c65e1ea5793de`, which already includes actual Release B9 `b9bca884ed9b9831965b409885d78f719b9a567a`. The potion producer `eabff9b0bf2cce17ae05913c0e5d47366d0ff173` remains an ancestor. It adds no second pointer tracker: the four dismissal/browse fixes stay byte-identical to pointer711, the B9 card-flow blob stays `486b63e804f138ee7a1ba1dc8241bdf9d3b99731`, and the original combined battle UI keeps its `aimReady`, `pointerEnd`, and `pointerClear` ports.

Fresh local raw Fengari runs preserve the original 30-second process guard: partial-pointer 8, pointer-identity 26, and original potion 4 plus safety 3 all pass (41 product cases). The combined candidate also passes the 11 dismissal/status UI cases and the 2 sparse-pointer cases under the same 30-second guard. The existing source mechanism retains both complete production parents and every old target: current 352 paths / 123 owners / 83 targets, original union 352 / 122 / 75, pointer711 352 / 122 / 74. The original 195-entry CI packet, 251-entry copy manifest, and 151 immutable predecessor archives are unchanged. New current authentication precedes either precise parent view; raw discovery remains 882 JS and 1425 Lua entries. The original synchronous validation capture now also includes every new bound input and archive, expires both readers on return, and continues to reject public-reader drift.

The original potion, pointer, and B9 assertions stay in their existing test entry points, including the independently named 117-owner potion and PC22 fixtures. The actual current production corpus is authenticated separately; historical fixtures do not establish current authorization. The current CI copy remains isolated and validates its own complete dependencies, with no repository fallback.

This is preparation for the original #679 PR, not release acceptance. `DependsOn711` is **unmet** until #711 is actually merged. There has been no remote push, dispatch, new PR, or Full run for this preparation. After #711 lands, confirm its exact landed identity and the current Release base, update this preparation by normal merge if needed, rerun affected product/source checks, and perform the required Fork preflight against the exact final candidate before advancing the original #679 PR. Local receipts are kept with the preparation workspace; they do not replace that preflight.
