# PR684 split 位置最小等价接续

状态：本地可集成切片，交父独审；不是 Hosted Full、合并或设备放行。

## 身份与边界

- 接续 PR684 `6c45778c47788c2e69a68d3a48ec7a5a5ba3455b`；实际 Release `1cc5479b713edab6fd26db4e20f8eb22b7401cb2`，两者都是本分支祖先。
- 树：`F:\New folder\.worktrees\goal-v2-split-ratchet-1116`；分支：`fix/goal-v2-split-ratchet-1116`。认领说明：PR684 issuecomment-6904347475；接续验收来源：issuecomment-6902877676。
- 产品检查点：`53e410696bee6209d2ba0152b5548ec46245d1d7`（首片 `08590b143a451e235ff0ee9013469696a749a41a`，随后仅修正形参遮蔽）。源码差分仅 `abyss_combat.lua` 与已有 `abyss_combat_enemy_setup.lua`；必要位置合同追加到既有酸分裂夹具，未新增发现入口。
- 仅将 split 位置计算移到已有 EnemySetup 构造边界。显式位置继续逐次深拷贝；回退继续缺省 `(0,0)`、左右 `x ±134`、原 y。构造、HP、父体退场、子体初始化/插入、事件和随机流的顺序保持。
- 没有改阈值、忽略、架构配置或原预算；未操作 GUI、构建 GIL、push 原 PR、触发/轮询 Full 或清理他人工作树。TASK-42/100 仍由 Furinya 负责，原状态/AC 保持。

## 本轮验证

所有 Node/Fengari 验证使用本机既有 Node `24.18.0`；固定 Luacheck `1.2.0`、原 hash 校验与原棘轮。详细命令/输出在 `run.mjs.gz` 和对应日志，结构化结果见 `verification.json`、`static.json` 与两个 ratchet 收据。

| 验证 | 本轮结果 |
| --- | --- |
| 原精确 `1cc → 6c` ratchet RED | 10 changed Lua；仅两项真实拒绝：combat 2295→2302 行、splitEnemy CC14→17（限15） |
| 旧实现特征锁定 | 在改生产前，扩展后酸夹具及同一夹具 `SPLIT_FAMILY=spike` 各17/17；等价整理不制造玩法 RED |
| 新产品 `1cc → 53e` ratchet GREEN | 11 changed Lua；0新违规；combat2295行、splitEnemy CC13；setup203行、新 helper CC5 |
| 原酸/棘刺/布局回归 | 酸17组、共享棘刺17组、独立棘刺18组、Act1 Boss21组、酸/棘刺UI、原生敌人画像/召唤：7次入口调用全退出0；原各夹具预算保持 |
| 原独立分裂布局入口 | 补齐 `slime-split-positions.test.mjs`：1/1、0 skip（4,334ms），实际执行 `slime_split_positions.lua` 的酸/棘刺 source/native/nonoverlap 断言；不是仅画像回归。原始输出与执行脚本追加在 `layout-check.*.gz`，绑定已提交aa387检查点；源码/来源字节未再变化 |
| 完整状态配对 | 精确6c原件与53e：酸/棘刺/Boss × 缺省/零/非零父坐标 × legacy/源AI和HP流，共18场景；按家族各6场景逐字节相等，含完整catalog、状态、HP、事件帧和RNG；19,929,042字节相等 |
| 合同敏感性 | 去掉±134、抹掉y、取消显式位置深拷贝三个单变量负控均被既有扩展夹具拒绝；真实源码未被负控覆盖 |
| 定向静态 | 两个实际Lua文件0诊断；初次新增形参 `index` 的 W431 已通过 `childIndex` 最小修正消除，未改基线 |
| 来源/CI绑定 | `release-pc-source.test.mjs` 9项 + `integrated-ci-source.cases.mjs` 3项，12/12；旧/新生产、两套CI历史视图、原Git证明及截断/缺失/漂移拒绝通过 |
| 当前owner与历史合同 | 两个文件的原116-owner见证及当前120-owner合同4/4；当前循环保留LF/CRLF下全部120项逐项missing/drift拒绝 |
| 真实隔离副本 | `copyIntegrationSourceClosure` 实际复制后从新目录导入，完整proof逐项相等，120 owners；不是只比清单 |
| 副本字节合同 | `source-closure-bytes.test.mjs` 2/2；LF/CRLF文本归一及gzip/未知二进制逐字节保留、变异拒绝 |
| 菜单历史/当前消费者 | `session-menu-navigation.test.mjs` 7/7、0 skip（24,788ms），包含实际Host两条及历史源路径 |
| 任务完整性 | `verify-backlog-roadmap.mjs` 退出0；不认证平台或实机 |

## 来源追加

复用既有 `.artifacts/release-pc-qa-20261115/collect-release-pc-source.mjs` 的生产采集逻辑及 `bootstrap-merged/build-packet.mjs` / `ci-owner-repair-1116/rebind-closeout.mjs` 的外层绑定机制。适配器保存在本目录 gzip 源件中：只读真实 Git/工作树，写新的 packet 路径。生产采集可显式传上述53e检查点，CI采集保留原历史字段与视图。

- 原 `release-pc-source.json.gz`、`release-pc-ci-source.json.gz`、`release-bootstrap-merge-ci-source.json.gz` 及全部既有归档逐字节保留。
- 新 `tests/helpers/release-pc-split-source.json.gz`：SHA256 `26580fd476d567246a300c235c41c70dcaeeb826792ce9f79cf0f623072a8399`；11个实际Release差分源，仅combat/setup相对原PC检查点再变化，保留另9项原producer。combat producer为08590，setup producer为53e，不把旧producer改名。
- `preSplitSourceEpoch` 与完整 `releasePcSplitPrior` 保留旧119-owner身份/全部目标；当前仅新增setup owner为120。当前证明与隔离复制闭包一起接续，旧116合同独立保留。
- 新 `tests/helpers/release-pc-split-ci-source.json.gz`：SHA256 `c37a207459406684be7963155baeca4e97e3e4c80eb52c2ce9ba6acfbac788ce`；58个真实current绑定、98个不可变归档身份（原96 + 原merge包 + 新生产包）。旧Git对象证明、352项基线blob和10项bootstrap证明不重标。
- 通用CI路由仍返回原始生产字节。只有显式CI比较入口调用生产projector认证全部当前owners后恢复旧见证；raw-current校验先逐项验120项，旧119源不能冒充当前通过。所有成功授权仍每次新读，不缓存live授权。
- 原JS887/Lua1431发现集合不变；没有追加测试发现入口、丢弃原断言或改旧packet来求绿。

## 保留的失败与待验

- 首次ratchet遇系统TEMP目录EPERM；转到本树已有artifact临时目录后才取得真正RED。最初根node_modules仅有luaparse，改用已安装完整依赖的只读junction后才计Fengari通过；未改旧依赖目录。
- 新CI比较最初在更早的linked-owner拒绝处返回不同诊断；保留失败，补齐原错误上下文并新增stale旧源拒绝，未放宽原断言。
- 配对探针先后有Lua长字符串下标词法错误、非规范随机种子错误，均修正在证据脚本。首次18场景整批在08590曾通过；形参修正后的整批探针两次在30秒内未完成（一次与来源测试并行、一次串行），保留真实超时，不算通过。最终把同18场景按家族分为3个独立6场景配对，每个进程仍30秒，全部逐字节相等；未修改生产/正式夹具时限或删场景。
- 父独审及最终原PR的正常准入尚待；没有新Hosted结果，不能把本地ratchet当Required已绿。正式候选导入/ready、官方容量和PC/手机同候选实测未执行，既有候选/工具阻塞不在本窄片重复探测或宣称解除。
- 原神晚上才开且本轮禁GUI；本切片只交离线可集成证据，不勾设备AC、不发布。

## 复现与交接

将本目录的证据脚本gzip解压回工作树 `.artifacts/split-ratchet/` 后，可按 `run.mjs` 执行命名阶段；`verify.mjs` 读取精确6c Git原件，执行18配对/三个负控/真实隔离复制及固定复杂度测量。`collect-production.mjs 53e410696bee6209d2ba0152b5548ec46245d1d7` 的新输出摘要必须保持上述值；`collect-ci.mjs` 输出上述CI摘要。它们不改旧包。

最终交接HEAD与其真实Git blob读回收据保存在本树 `.artifacts/split-ratchet/final-head.json`，避免提交包含自身SHA的循环；父独审应使用最终HEAD和上述实际Release祖先核对，再决定向原PR集成。
