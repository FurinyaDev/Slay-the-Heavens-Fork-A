# v2.0.0 出牌 P0：已实施的输入修复

基线为真实 Release `33d71575c5f186a1b54f7bf3e4f1826c145aa1d9`，产品冻结为 `82b1a114ca486140ae913cca6a0834cab52417cb`，来源合同接续为 `6b12af8fa40deba94dc212052cd95df8a4f1cd4a`。后续交付提交只增加任务记录与证据。

本轮修复了可重复证明的首击丢失和快速拖牌误取消；不把离线通过写成全部出牌 P0 或真机卡顿已解决。TASK-30 保持进行中，同候选官方导入、ready、PC/手机输入与帧时间均 **UNVERIFIED**。不合并、不发布、不操作游戏窗口。

## 症状、根因与实际修改

1. 卡牌、战场确认区及点敌链对 Down/Up 和 Click 使用严格 ID 相等判断。原生回调允许 Down/Up 有 ID、Click 缺 ID，合法确认因此被吞掉。旧 Release 同一连续序列的 3 张防御和 2 张打击为 **0/5 成功**，补齐 ID 的对照为 5/5。
2. Down 后 50ms 直接 Up，中间没有 Drag 或仅一次 Drag 时，手势没有保存真实按下位置/时间，速度可能算成 0，合法甩牌误判取消。本轮直接复用 #684 原作者 `5bd55d7691480b10d00e947076e15c8870640474` 的三行补丁，在 Down 时采样；没有改变手势阈值或新增操作。来源及最初内存实验身份见 [sparse-author](sparse-author/)，实际落盘后的 12 正例和 8 安全反例见 `sparse-current.json` 与日志。

实际只修改 8 个既有输入 Lua 模块：在现有 input_state 提供统一、有限的指针归属证据，由卡牌、动作、药水、敌人消费者接入。仅对唯一、当前、已释放的输入接受匿名 Click；旧输入先消费再做业务校验，防止恢复后重放。保留多指/外来触点拒绝、Controller/busy、目标与回合身份校验，取消/换局/resize 清理；每个输入控件最多保留 16 个活动来源，饱和时匿名路径保守拒绝，既有取消后恢复。

没有改核心玩法、RNG、美术、反馈时长或原有点选后备；没有增加键盘、快捷键、预输入、命令队列或每帧工作。继续沿用项目从《杀戮尖塔1》迁入的 CardInput/Intent 及既有点击携牌、拖放、触屏与取消合同；原版/项目差异依据见 [TASK-30](../../backlog-details/TASK-30.md)。本次没有借原版名义扩大功能范围。

## 同条件前后实验

原始结果与完整状态 hash 见 [continuity-comparison.json](continuity-comparison.json)。基线/修复使用相同数据、布局、输入序列和固定时间步；基线 8 个 owner 从真实 Git 读取，修复 8 个 owner 与冻结提交逐字节相等。

| 指标 | 旧 Release | 修复后 |
| --- | --- | --- |
| Down/Up 有 ID、Click 无 ID：3 防御 + 2 打击 | 0/5 | 5/5 |
| 正常有 ID 的同序列 | 5/5 | 5/5 |
| 修复混合输入 vs 正常输入的完整战斗/RNG/静态数据 | 原序列未出牌 | 完全一致 |
| 既有 ready 门之后增加的 update 等待帧 | 0 | 0 |
| 正常有 ID 成功序列的反馈固定步数 | 各 26 | 各 26 |
| 正常有 ID 成功序列的受监测控件写入：3 防御 / 2 打击 | 12,184 / 9,772 | 12,184 / 9,772 |

控件计数只覆盖 Host 初建树上的公开 mutator；不是全引擎计数、GPU、FPS 或实体设备延迟。26 是离线固定时间步，不是设备帧率。没有以新增等待改善误触。

## 本轮验证与独立评审

- 当前产品：原有 7 项、指针归属 22 项、稀疏拖牌 2 项，3 个 Node 入口全部通过，无跳过。保留原 30 秒子进程限制。
- **实际新 GIL 解出的 366 个 Lua 模块**与同源产物布局夹具运行上述 7 + 22 + 2 项，全通过；8 个改动 owner 与冻结 Git 完全一致。见 [payload-replay.json](payload-replay.json)。这是离线 Host 回放，不是原生引擎验收。
- 当前产品完整 `npm run check:engineering` 通过：351 模块架构、质量、固定 Luacheck 无新增诊断（6 条历史警告）、M1–M4 突变均被断言杀死、原生 UI 合同 6/6。未放宽 CC、测试时限、预算或发现入口。
- 来源合同作者验证 78/78，CI 校准 5/5；独立复审另核 46 组 Git 绑定、67 targets 每次完整认证 121 owners、484 组 owner 和 32 组 CI 负控；库存保持 879 JS / 1423 Lua，历史 gzip 保留。独审未重复作者全套或 Full。
- 产品独审两阶段均 PASS、无遗留；最终三行作者补丁逐字节吻合，其余 7 owner 不变。见 [product-review-final.json](product-review-final.json)、[product-review-82b.json](product-review-82b.json)、[source-independent-review.json](source-independent-review.json)。

`input-regression.log.gz` 的额外 22 项、原 #686 的目标协议、隔离/换局 RED→GREEN属于各自实施阶段，**不冒充最终 82b 全矩阵重跑**。最终 31 项、实际 GIL 回放、连续出牌实验和工程检查明确绑定当前产品。Full 和托管 CI 未验证。

## 新候选身份及阻塞

本轮从干净冻结产品重新构建，未复用旧候选：

- Build：`ca1130db-4ee0-468b-8c6c-026d333ec4f1`
- GIL SHA256：`159e4ef211acd3eaf1c06117270ad92b1c1b16b89cdb46cd118fded32e4d5b86`
- Payload：`114355f3ab5a2972c376b855516aa970dbf83ba37c169f5202a7c9100b5bc32c`
- GIL：15,961,609 **离线字节**，不是官方 MB，不认证 ≤20MB/≤16MB，也不包含尚未合入的 #703 减容成果。

完整收据与审计保存在 `candidate-receipt.json.gz`、`candidate-audit.json.gz`。本机保留原始 GIL 于收据指定路径。它使用公共 clean-base 夹具和现有音频构建入口，收据仍是 `release.version=v1.0.0`、`release.workKey=alpha-test`，**不是 v2.0.0 正式 RC**。严格审计诚实保留 FAIL：`UI_MISMATCH`、`GRAPH_COUNT`；366 Lua 来源全一致，native static 0 error / 424 warning。不得放宽审计或用离线成功覆盖官方要求。

官方同候选加载、ready、真实 PC/手机拖牌连续输入、复杂结算帧时间及实际容量仍须后续真实环境证据。此边界不撤销本轮已落地的输入缺陷修复，也不允许用历史候选补验。

## 复现与在途边界

自动入口：`node --test tests/mobile-card-release.test.mjs`；工程入口：`npm run check:engineering`。证据目录保留实验脚本，按原 `work/p0` 路径运行；GIL 回放还需要收据对应的未提交二进制及解码产物，不能只凭报告重建同一候选身份。`manifest.json` 校验所存文件。

本轮复用 #684 的稀疏 Down 采样切片，其余 PC 修复保留原 PR；统一归属实现承接 #686 的目标协议，避免再合入第二套 tracker；药水弹窗 #679、布局/渲染及容量 PR 仍有各自范围，不宣称一并完成。
