# PR684 实际 Release PC 与地图合流

输入为原 PC `5fe72de406f42ebbf406ac386d4c03a3a903373b` 与实际 Release `33d71575c5f186a1b54f7bf3e4f1826c145aa1d9`。正常三方合并保留双方 UI 行为；重叠 `abyss_game_ui_view.lua` 完整双侧与实际合并 Git blob `8402aac72c995819ce8ad792b54491624a57ee41` 独立绑定。PC 原 119-owner 阶段、最终 120-owner split 阶段与 producer/父链保留；联合 352 项生产源码、120 owner、69 历史 target 不重标旧 producer。

原 PC 45 项、实际 split outer 58 项、Map 26 项来源域及所有旧档案保持完整。新联合叶绑定 73 项当前源码、103 个原档案和完整 891 JS / 1431 Lua 库存；PC 历史生产对比使用显式历史 reader，PC CI 当前 guard 仍读取真实联合生产。两个公开转换入口接受前都完整检查当前联合输入，不跨调用缓存 live 授权。生产 reader 拒绝未知 side。

八个产品回归文件 19/19，通过卡牌取消、原输入组、加载遮盖、地图、睡眠意图、分裂位置及地图返回/选角。源验证三个文件首轮 22 项为 20 pass / 2 fail，错误是旧 reader 默认物理输入未接历史视图；修正后两失败、PC 完整生产与联合守卫共 7/7 通过。六项校准验证覆盖原 PC/Release 路由、库存、未知成本、完整分片与原执行时限，6/6 通过；预测不等于 Hosted 完成。

四个历史来源/菜单文件首轮 65 项为 62 pass / 3 fail，三项 StS 负控错误地注入旧历史视图或要求旧错误边界。修正为只在指定路径修改真实物理字节，受信联合转换必须在该精确路径的新 guard 拒绝，其他字段保留原错误断言。三项复验为 2 pass / 1 fail；最后库存用例区分 null/foreign 输入原拒绝边界与受信转换的联合拒绝边界，保留精确 null TypeError 或精确路径断言，单项最终 1/1 通过。全部初次失败与中间复验日志保留，不把首轮写成全绿。

Task103.2/103.3 在变更前保存 stage2、stage3 和未提交冲突稿，通过 CLI 合并全部独有 notes/refs。逐字段读回证明只变日期、notes、refs，状态/负责人/计划/全部已勾未勾 AC（含103.3 AC5）保持。归档中各文件的 base64 与 sha256 均对应备份文件实际字节（可含 CRLF）；union-plan 内 oursSha256/theirsSha256 按 LF 标准化计算，conflictSha256 对应原始冲突字节，二者不混用。

本轮日志 gzip 原文与 manifest 同目录保留成败和准备记录。未执行完整 Full 套件，不添加 ci:full 或改预算、执行时限、保护规则。Hosted、官方候选导入/ready、同候选官方容量和 PC/实体手机验收仍待验，不代表 RC 发布许可。
