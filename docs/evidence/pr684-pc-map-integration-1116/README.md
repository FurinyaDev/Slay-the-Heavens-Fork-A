# PR684 实际 Release PC 与地图合流

输入为原 PC `5fe72de406f42ebbf406ac386d4c03a3a903373b` 与实际 Release `33d71575c5f186a1b54f7bf3e4f1826c145aa1d9`。正常三方合并保留双方 UI 行为；重叠 `abyss_game_ui_view.lua` 完整双侧与实际合并 Git blob `8402aac72c995819ce8ad792b54491624a57ee41` 独立绑定。PC 原 119-owner 阶段、最终 120-owner split 阶段与 producer/父链保留；联合 352 项生产源码、120 owner、69 历史 target 不重标旧 producer。

原 PC 45 项、实际 split outer 58 项、Map 26 项来源域及所有旧档案保持完整。新联合叶绑定 73 项当前源码、103 个原档案和完整 891 JS / 1431 Lua 库存；PC 历史生产对比使用显式历史 reader，PC CI 当前 guard 仍读取真实联合生产。两个公开转换入口接受前都完整检查当前联合输入，不跨调用缓存 live 授权。生产 reader 拒绝未知 side。

八个产品回归文件 19/19，通过卡牌取消、原输入组、加载遮盖、地图、睡眠意图、分裂位置及地图返回/选角。源验证三个文件首轮 22 项为 20 pass / 2 fail，错误是旧 reader 默认物理输入未接历史视图；修正后两失败、PC 完整生产与联合守卫共 7/7 通过。六项校准验证覆盖原 PC/Release 路由、库存、未知成本、完整分片与原执行时限，6/6 通过；预测不等于 Hosted 完成。

四个历史来源/菜单文件首轮 65 项为 62 pass / 3 fail，三项 StS 负控错误地注入旧历史视图或要求旧错误边界。修正为只在指定路径修改真实物理字节，受信联合转换必须在该精确路径的新 guard 拒绝，其他字段保留原错误断言。三项复验为 2 pass / 1 fail；最后库存用例区分 null/foreign 输入原拒绝边界与受信转换的联合拒绝边界，保留精确 null TypeError 或精确路径断言，单项最终 1/1 通过。全部初次失败与中间复验日志保留，不把首轮写成全绿。

Task103.2/103.3 在变更前保存 stage2、stage3 和未提交冲突稿，通过 CLI 合并全部独有 notes/refs。逐字段读回证明只变日期、notes、refs，状态/负责人/计划/全部已勾未勾 AC（含103.3 AC5）保持。归档中各文件的 base64 与 sha256 均对应备份文件实际字节（可含 CRLF）；union-plan 内 oursSha256/theirsSha256 按 LF 标准化计算，conflictSha256 对应原始冲突字节，二者不混用。

本轮日志 gzip 原文与 manifest 同目录保留成败和准备记录。未执行完整 Full 套件，不添加 ci:full 或改预算、执行时限、保护规则。Hosted、官方候选导入/ready、同候选官方容量和 PC/实体手机验收仍待验，不代表 RC 发布许可。


## 正式 PC HEAD 与 Release B9 接续（2026-11-17）

本次从正式 PC `10d7ef9658872ec7d118b585fbc81e3da585c552` 正常三方合并实际 B9 `b9bca884ed9b9831965b409885d78f719b9a567a`，不使用旧 WIP `cc3fb9c8`。仅十一项来源冲突和 Task29.1 元数据冲突；产品没有冲突，PC 的十四项产品路径保持正式输入字节，额外合入 B9 原 CardFlow 字节。唯一共享输入实现仍由 #711 承接 #686，本次没有复制指针或输入 tracker。

保留完整 PC/map 与 B9 CardFlow 双父生产域：联合 352 项当前生产源码、121 owner、73 target，原 PC 120/69 与 B9 117/68 各自所有完整 target 与来源记录不变。原 PC/map 和 B9 CI 包与全部历史 pin 不改；现有 PC/map reader 增加有界 B9 接续叶，绑定 81 项真实当前文件、129 条非空完整 Git 前身、109 个原始档案及实际 893 JS / 1432 Lua 库存。每次接受当前到历史转换前，以同一个调用者 raw reader 重新读取当前包、全部文件、原始档案和生产 owner；无跨调用缓存。历史生产 reader 显式选父域，CI reader 不投影生产授权，未知 side 在构造时零读取拒绝。原先已存在的同步 validator 范围不扩大。

Win6 `modal_loading_frames` 修复复用 PR 原评论 `6931672536` 的准确 fixture blob `45231e39cf78662a707ebc1f6e7388f448d2fb35`（原 blob `6cb45ddc2a674f4180374d7dc0a78592b58a3eac`）。default 路由使用现有 runMenu/map，Official 路由不变；两侧排序走现有 deck/pile API，所有原几何、状态、RNG 与 100 次排序断言保留。实际 raw fixture 原先 line36 nil（RED 3866ms），修后两路由通过（GREEN 19577ms）。JS 两个 named 入口修前已 2/2、修后 2/2；不将其重述为两个 RED，不做动画或预算提速。

原四个来源文件首轮 28 条是 25 pass / 3 fail（522347ms），保留全部日志。三处失败为 B9 原生产当前校验缺显式父域，以及两个 warm 负控把历史视图当实际 raw 输入；最小修复后仅原三条复验 3/3（12748ms），没有重跑已绿的完整 owner/CI 矩阵。当前联合新增两条 raw 完整来源和库存拒绝用例 2/2（2350ms）；121-owner 与菜单五条 5/5（35299ms）；原六条实际校准 6/6（176544ms）；B9 PC22 原生产、owner repair、工作流和隔离复制四条 4/4（2782ms）。StS 三条首轮均在正确拒绝注入路径后被旧错误 matcher 拒绝；只增补 `ERR_ASSERTION` 和精确当前 `PC B9` 前缀及同一注入路径，保留旧 matcher/null 边界与原故障输入，仅原三条最终复验 3/3（550252ms；75126/192481/280956ms），0 fail/skip/cancel。环境恢复后原终端会话已失效，但完整三条终态日志已落盘，未再运行这三条。

Task29.1 保存双父与冲突前原始字节，用 Backlog CLI 合并双方独有 plan/notes/refs，原状态、负责人、优先级与全部原 AC 保持。环境所需 LFS 仅从已有对象缓存物化以运行原构建/fixture，未把物化媒体或旧 LFS 指针替换提交。构建、指引和 Backlog 检查通过。

原 `33d` 的 19/19 产品执行记录仍保留；它不是独立 review JSON。最终独审明确区分可复用的原各路径审查范围、正式 PC view 的干净三方组合及本次亲审来源差量，不把缺失的整体旧收据虚构为存在。独审另绑定最终准确双父 commit/tree、目标 B9 和增量正式10d；其 raw 控制与准确候选本地冷 guard 收据交付协调者，不自嵌生成循环。冷验证只认证本地空 Git 对象库与保留的完整 pack；不等于 GitHub Hosted 或网络传输验收。

本次原始成败日志、复用 fixture patch/comment、Task CLI 前后与来源准备信息无损合一于 `b9-continuation-raw.json.gz`，每项含实际原始字节 SHA-256/长度/base64。所有旧证据文件保持。未运行 Full、未推送、未 dispatch，不增加执行预算或更改保护规则；Hosted、同候选官方容量、实体 PC/手机及官方导入/ready 验收仍待验。后续 infra #707 若实际落地改变目标 base，需在该准确新 base 做最小接续，不能凭本 B9 证据宣称准入。


最后独审发现“完整前身归档保留”不能替代原物理断言的接续，因此在未发布候选上补回了 B9 三个 retained-Full 原校准条目、两条原 117-owner 当前合同、原五条 intended-path 负控及原两项未提交 producer 字段。旧候选 `4ac4ad361bb480e92a2f882539c1a9304e5f8aac` 和它的冷收据只保留为历史事实，不挪用到最终候选。

三个 B9 校准条目明确选原 PC22 877 JS / 1424 Lua、selection 879/1423、joint 881/1424；同一循环第四条直接校验实际 893/1432 联合 raw 库存。全部原 unknown-cost floor、完整分片无丢失/重复、Lua 分摊和物理 workflow deadline 断言保留，只接续正确父域 reader。新增四条 4/4（25386ms）。实际联合 Linux forecast 为1200964ms，比20分钟规划目标高964ms；依原合同预测只是诊断，原30分钟执行硬 deadline 不变，不将此结果写成 Hosted 完成或当前准入，不加预算。

两条原117-owner合同局部绑定完整 B9 `releaseCardContactSourceEpoch`（117/68），入口用真实 raw 完整认证实际121，再以不可变完整B9父域生产字节回放原 linked-owner 鲜读、LF/CRLF、漂移/null、恢复及精确读取前缀矩阵。此处是原B9 current117的冻结父域回放；实际121磁盘原矩阵保持独立，未缓存真实读取或新增runtime授权入口。两个116 frozen条目与原B9仅改别名/描述；两个pre-PC22/pre-PC是同一common116对象，原函数体断言/循环全部保持，没有重复执行116矩阵。两条117及原shop/deck字段单case共3/3（48443ms）。

integrated首case恢复原五条负控的物理 raw 回调（含 Buffer 不变路径）与必须包含同一被注入 path 的错误断言；只执行这五条原代码段及真实当前入口，5/5通过；不重跑未改变的224×6映射循环，也不声称整个首case在此最终候选上重新执行。其余B9 literal注册和动态tuple已由独审逐diff核对；原source pin、129完整前身和109档案仍逐字节保持。
