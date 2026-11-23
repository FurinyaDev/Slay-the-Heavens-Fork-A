# Backlog × Git 交付同步架构规约（REASONS Canvas）

日期：2026-11-23。目标：`develop`。来源任务：TASK-87.1、TASK-87.2；M8/m-8 与 M9/m-9。**本文件是治理规约，不是任务已验收或代码已发布的证明。**

## 1. R — Requirements（边界与 DoD）

问题：GitHub PR、运行时代码、Backlog 的 status/AC/备注与里程碑进度长期不一致；“In Progress”混入已合待验工作，旧 `Blocked` 审批未跟随 Owner 决定更新，Agent 误以为无任务可做或重新开发已交付内容。

Scope In：
- 在每个 PR 的实施、集成、合入后及定期巡检四个节点做增量对账，复用 `Backlog:`、`scripts/backlog-closeout.mjs`、`scripts/check-task-intake.mjs`、`verify:delivery --merged`，不建第二套状态数据库。
- 任务正文明确记录“源码存在 / 已在 develop 合并 / 正式候选已装配 / 官方客户端与设备已验 / 已发布”五种不同证据，以及后续应做的最小动作。单个任务不必对应单个 PR；每个行为切片必须有唯一的任务或明确 `Backlog: none` 原因。
- 同步 Owner 明确批准及范围变化。2026-11-23 已批准：第三/第四幕及 STS1 Silent、Defect、Watcher 在 develop 开展开发、整合和验证；不意味着允许直接在当前 Release/Production 中开启。
- M8 未验体验继续修复，不以 Milestone 顺序禁止 M9 开工。持续巡检只发现偏差与给出修复入口，不自行改验收勾选。

Scope Out：
- 不重建 Backlog 工具、不用 GitHub Issues 代替内部任务、不自动把“merged/CI 成功”写成 Done、不按日期或任务数量清状态、不将第四幕或新职业混入 v2.0.0。
- 本次治理不修改玩法、卡表、地图数值、Release、master、正式白名单、平台发布流程或质量保护。

DoD（Given / When / Then）：
1. Given PR 已合入 `develop` 且声明 `Backlog: TASK-X=verify`，When 运行合后交付对账，Then 经 Backlog CLI 记录精确 merge SHA 与待验 AC，任务保持 In Progress；设备未测不勾选。
2. Given PR 已合入但 Backlog 未记录当前交付，When 周期巡检，Then 报出 PR、任务 ID、缺少的收据与当前任务状态；不得自动修改。
3. Given 任务已有实现或待验，When 新 Agent 认领，Then `task:pick` 返回 HOLD，并提示接续既有来源。
4. Given Owner 2026-11-23 批准 M9 开发，When 更新审批清单，Then TASK-62/64 不再仅因“缺 Owner 批准”阻止开发；但 `Blocked` 任务状态、未完成依赖、Release 权限继续独立有效。
5. Given 第三/第四幕或职业源码已合，When 进行 Backlog 对账，Then 既有实现记录复用、尚无同候选自然通关和真机证据的 AC 保持未完成。

## 2. E — Entities（实体与 SSOT）

| 实体 | 唯一拥有者 / SSOT | 边界 |
| --- | --- | --- |
| Task（id/status/AC/dependencies/labels） | `backlog/tasks` 与 CLI | 只能用原生 Backlog CLI 写入 |
| Milestone（m-8/m-9） | `backlog/milestones` 与 CLI | M8 与 M9 并行，历史 M7 归档 |
| Slice（责任人、路径、候选头） | 现有任务 + PR/分支交接 | 同一行为不重复领取 |
| Delivery（合入、PR 与 commit SHA） | GitHub 实际 PR/commit API | PR 关闭不等于合并，合并不等于产品验收 |
| RC/QA（source/buildId/GIL/payload/设备） | `candidate.json`、官方日志及 QA 证据 | 旧候选或模拟器结果不能冒充实机 |
| Decision / REASONS | 版本化 `docs/plans/` 与适用 ADR | 与代码和 Backlog 双向追踪 |

## 3. A — Approach（策略与取舍）

复用“事件驱动对账 + 周期差异巡检”：开工按 `task:pick`，PR 在正文声明精确 `Backlog:` 处置，合并后先跑既有 `verify:delivery --merged` 和 `syncBacklogCloseout`，再 CLI 读回。外部只读巡检按最近合并 PR/任务映射找漏账，输出差异而不是直接提交任务变化。若合后收口器未执行，Agent 必须接续原 PR 的真实身份补跑，不以手写 Markdown 绕过 CLI。

刻意放弃：为每个 PR 创建 Issue/新看板、把审查结论转自动 Done、引入守护数据库、给所有旧任务重新编号、为此次治理拉新重型 CI。现有工具足以表达状态，缺的是在交付链中持续执行和复核。

## 4. S — Structure（依赖方向）

- 任务和审批：`backlog/tasks/`、`backlog/milestones/`、`config/task-intake.json`。
- 领取与验收：`scripts/check-task-intake.mjs` → `scripts/task-dependencies.mjs`；`scripts/verify-backlog-roadmap.mjs` 做只读一致性校验。
- 交付：`scripts/verify-delivery.mjs` → `scripts/backlog-closeout.mjs` → 外部 Backlog CLI；`scripts/branch-hygiene.mjs` 与外部巡检只读。
- Agent 协作：`AGENTS.md` → `docs/TASK_EXECUTION.md` → 本 REASONS 与各产品任务规约；PR 模板必须链接证据。
- 禁止由 UI、玩法代码调用任务管理脚本；不得把 Backlog 状态做成 runtime 条件。所有自动化只能以 GitHub 真实结果为输入，不得由任务声明倒推出“已合并”。

## 5. O — Operations（依赖顺序）

1. **事实对账**：固定 `origin/develop`、在途/已合 PR、任务及其 AC、当前版本、旧分支来源；分为“已实现/已合/待验/发布”五类，记录不能复核的项。
2. **同步批准与待办**：对 62/64 撤销过时的 Owner 审批 HOLD；由执行 Agent 通过 CLI 核实并更新任务 status、依赖和备注；对原版三个实验职业另建或接续明确的 M9 子任务，不偷用 V4 的 TASK-97。
3. **执行切片**：`node scripts/check-pr-slice.mjs --start TASK-ID --branch <short-branch> --remote fork-a --slice "<单一行为>" --verify "<可重复命令>"`；ALLOW 且无重叠来源后在 Fork 独立工作树开发。
4. **PR 交付**：正文单独声明 `Backlog: TASK-ID=continue|verify|done|recorded|superseded:TASK-Y`；绑定 REASONS、精确 HEAD/BASE、实际检查和未验收 AC。代码增量按 400 行 / 10 生产文件切片。
5. **合后同步**：精确合并与 Full 取证后执行 `npm run verify:delivery -- <PR> <review.json> --merged`，核对 `syncBacklogCloseout({pr,files,targetSha,root})` 读回，必要时用 CLI 补登记；不同步即视为交付账本未收口。
6. **持续巡检**：增量比较最新 merged PR、任务 status/AC、审批和继任。只报新偏差；已关闭 PR 的残留需求和 Release→develop 未回流不能被已合表象掩盖。

## 6. N — Norms（通用规范）

- 任务命名“动词＋领域对象＋玩家可验证结果”；统一 `TASK-编号`。事件/任务备注尽量简体中文，接口/代码遵循项目已有命名。
- 每个状态转换明确 `source SHA / PR / candidate / evidence / remaining AC / next action`；命令失败或读回不一致直接保留待办，不能静默重试后记成功。
- 新需求与现有方案冲突时先查旧任务、所有 PR 和生产实现；不能因描述陈旧便删除历史或断言没有功能。
- 漂移报警只在状态新增、恶化、恢复或要求 Owner 决策时通知，避免同一问题每次重复刷屏。

## 7. S — Safeguards（红线）

- 不直接编辑 `backlog/tasks/` 或 `backlog/milestones/` 元数据；必须经 CLI，保留 created/status/AC 历史与校验结果。
- 不关闭/放宽 Required Checks、Full、独立 Review、Merge Queue、许可与 20MB/3MB 平台硬门禁。
- 不能把 `In Progress` 等同“尚未开发”，不能把 `Done` 等同官方客户端已可玩；每条 AC 只按它自己要求的证据勾选。
- 同一产品候选使用完整 `source SHA + buildId + GIL SHA256 + payloadDigest` 身份；无设备输入权限时官方 QA 保持待验。
- 自动化仅可生成可核对差异，修改归属、审批、状态和生产发布需对应执行 Agent 使用受保护流程。
