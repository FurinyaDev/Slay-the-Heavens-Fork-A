# #679 × #711 联合准备（PARTIAL）

产品 producer `9b9e0a2eab4c3fa0783eb7e0f6b69389146bd8b3`，tree `adefdb6b2b8e6b4c54b0570f3d6cd888a7d1c476`，双父分别为 #679 `eabff9b0bf2cce17ae05913c0e5d47366d0ff173` 和 #711 `ad6fe84dbcc11e28e8a82258f889a6841b46c8c6`。

## 已完成
- 只组合双方产品增量；battle_ui 唯一产品文本冲突保留 aimReady、pointerEnd、pointerClear 三个端口。非 src 文件保持第一父，不伪装完整 Git merge 已完成。
- 630 个 src/data/config/scripts 文件路径及字节逐项等于此前产品诊断 tree `a1f298468c69b51f8e488b82ab75943b00c10742`。#679 后续 eab 只改测试来源；不重复此前 41 场景矩阵。
- 独立审查 `/root/release_2215/review_product` PASS：双方非重叠增量逐 blob 保留，gestures 的药水增量和 pointer 身份逻辑兼容，UI 三端口保留；非 src 无新增修改。审查绑定本地同 tree `d120ac63d86cae2e7ee51a9d8b23cf80e54050bb`，远端 producer tree 完全相同。

## 未完成
六个测试/来源冲突需要保留两个独立历史域、完整 current 生产和 discovery 库存及 copy 闭包后接续。此产品-only producer 的来源/CI 仍来自第一父，**不具备合并准入，不代表 Source/CI 通过**。不要将本准备分支直接合入 Release。

旧41场景记录见 https://github.com/FurinyaWorks/Slay-the-Heavens/pull/711#issuecomment-6920986376 ，本轮只复核字节身份，不把旧运行写成 fresh 测试。正式 GIL、官方导入/ready、PC/实体手机和完整 Hosted CI 均未验证。未改两条 PR HEAD，未启动 Full，未改断言或门禁。
