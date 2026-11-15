# PR #684：当前 CI 失败修复

基于 9361d5cf9559ea30f8bdbd5da13eaadd9bcd36b0，目标 release/v2.0.0。产品、工作流、时限及 887 JS / 1431 Lua raw 清单未改。

- 完整七 run×36 jobs 单次快照确认了失败；workflow 的 queued 不能用于推断没有失败。原始失败链接见 SUMMARY.md。
- 旧 116-owner 两个历史合同保原函数体；新增真实磁盘 119 项校验，精确多出 battle_card_bindings / battle_unit_view / combat。菜单原 producer 合同改为显式旧视图，每次先认证当前源。原 5 项 1 pass/4 fail；修后所有改动/新增 7/7 pass。
- 三份原始出牌归档保 12 分组与各 30 秒预算。为旧无 Intent 手势装载同代 binding host，固定完整源 hash；只用于原三路径和原 cwd。新增漂移/缺失拒绝。首次本地未生成 build/lua 导致缺 theme，失败日志保留；按 build:data、build:ui 生成后 2/2 JS（含 12 Lua 分组）pass。
- depth-two checkout 缺 1cc 对象，保留原在线 Git 校验接口与全部父/树/352 blobs/10 bootstrap 断言；新增 3 commit+9 tree 原对象离线证明，逐个类型和 Git SHA1 认证。独审将全部 25 次查询与真实 Git 对照一致；变更/缺失/错类型/逐树缺失均拒绝。
- 最外 533b470c… 包 55 输入/96 档案，原 30ec 全包字节及所有旧 before/49 非 Source 旧 after 保留；新增五个测试/helper 的真实前像。完整 Source 8/8 pass、0 skip。

独立复审 /root/ci_release_failed_jobs_inventory：9 项检查 PASS，无 blocking；见 review684-independent.json。各轮原字节日志以 base64 JSON 保存，内部 hash 对照解码后的原字节；JSON/Markdown 附件按 LF 提交。

这不是正式候选、官方导入/ready、PC 或手机实机以及容量验收。TASK-103 保持 In Progress，未更改任何验收勾选。新提交仅走正常 CI，不手动重跑 Full 或放宽准入。
