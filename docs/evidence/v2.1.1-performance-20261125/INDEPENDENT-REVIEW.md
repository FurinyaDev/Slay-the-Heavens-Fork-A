# v2.1.1 独立评审

## 结论

Agent E 独立执行只读审查及隔离复测，未编写受评生产代码。**源码定向审查通过，正式发布 HOLD。** 检查范围为从 v2.1.0 master 重建的九提交核心组合，另审阅其后的资源压测跟进提交。生产有声构建/读回、正式 CI 和同包官方/手机验收仍是独立条件。

| 证据 | 完整身份 |
|---|---|
| v2.1.0 `master` 与 Tag 解引用 | `eb64f4e6cd45198118e123b6640dc491f186e329` |
| v2.1.0 有声 GIL 源码提交 | `55d6396cf315cf1e30085d9521fdb3bfaadeb2ad` |
| 以上两提交的树 | `79f1e6fce95640256bf7d4fbaa710c4a469a3b3f` |
| v2.1.0 已发布有声 GIL SHA-256（发布记录） | `bbba3f515d3319058207b82b8c0a3ca2eb70ed55b5c338651bce94c3d78be09f` |
| 核心 hotfix HEAD | `f10eefa27c75788cf0b753d5e9121e3887114218` |
| 核心 hotfix 树 | `7dbf449c16be7c6d55e15c482c988d07e1446c8d` |
| 压测及版本文档跟进 | `b6ba4614362ba32cd38eb0b457fbf28187d0c536` |

`git range-diff` 核对旧 RC 八个补丁逐一等价，只有 cherry-pick 追溯记录不同。第八步的 `a6ab0897` 与旧 RC `b0963d7a` 的树均为 `59f83fd3de2151b1fef0f943c2a05bb87639f43a`。第九步仅移植 #954 的一个生产文件。核心提交 `git diff --check` 通过，既有 Quality、Licenses、规则脚本和配置未变动。正式有声 GIL 哈希与 375 份脚本读回来自记录；本审查未取得线上 GIL 原件。[发布绑定](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/950) · [核心 HEAD](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/f10eefa27c75788cf0b753d5e9121e3887114218)

## 源码与运行检查

| 切片 | 结论 | 证据及边界 |
|---|---|---|
| #953 怪物绘图 | 通过 | #955 移植的生成器和测试 blob 均等于原 #953 的合并 blob。生产注册表与 `competition-lua-v3` 压紧体在 Lua 5.3 运行时验证通过。首次加载已展开资源 42→0，首次查阅只展开目标 1 份，重复访问保持同一数组。42 份资源的全部 3,385 个图元及元数据均与线上源码构建版本和注册表一致。当前生产绘图按 `metadata.slots` 和 `asset.slots` 具名访问；首次读开销随选中资源移动到实际绘制阶段，首次高峰及官方端需要实测。 |
| #954 原生地图查找 | 通过 | 第九步的 `abyss_map_ui.lua` blob 与 #954 的 `1b4e5a62` 一致。缓存只存构造期间已找到的分组，逐级搜索和错误行为仍在，构造完成清除分组 cache。生成布局下地图构造 `mapGroupN` 调用 392→6，首个就绪帧查找 258→258，真实命中回调均进入第一层。测试计数含独立返回入口，自原 PR 计数 391→5 的两端各多 1 次，因此节省量一致。 |
| 战斗敌人名 | 通过源码审查 | 使用官方 Lua API 只读 `visible` 状态配合 `SetVisible`，保留共同写入者后续修复实际状态的能力。测试覆盖稳定隐藏、外部变更以及一次原生拒绝后的下一次更新重试。手牌实验在正式差异中已撤出，`abyss_battle_card_view.lua` 和原手牌缓存测试与线上相同。 |
| 牌组回归 | 范围明确，正式验收待办 | 核心树没有牌组或牌堆生产文件变更。#932 的目标是 develop，是渐进可见设计，P95 完整冷页在 10 和 75 张两组各多 2 个模拟更新轮。暖态归档仅有少量 develop / 投影样本。提前反馈、实际完整就绪、CPU 时间和手机响应必须分别记录。两组在缺 LFS 媒体时均于生成器前置检查失败，补齐并校验两张 PNG 后正式页浏览、十张独立牌面和旧输入退休测试均通过。 |
| 资源压测 | 跟进源码审查通过 | `b6ba4614` 为 hotfix push/PR 路径接入原离线矩阵。未指定容器限额时保留托管 Docker 实际配额；显式 CPU/内存配额和 禁 swap 原断言保持。配对分析须查验两侧实测配额一致，尤其是无显式配额的档位。报告只包含 Host 数据。 |

[原 #953](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/953) · [#955](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/955) · [原 #954](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/954) · [#932](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/932) · [官方客户端脚本 API](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhtakr07vej4)

## 发布阻塞

- **P1，最终有声候选独立读回。** 核心树的 `scripts/build-native-audio-game.mjs:97` 未把 `full.deckBrowser` 写入最终音频回执，`scripts/audit-native-candidate.mjs:238–248` 在真实牌堆绑定存在时要求该字段。#944 提供精确一行修复及负例，属于有声读回门禁。本报告不会将核心树的构建能力视为通过，需以是否已纳入、最终文件真实审计、SHA 和下载读回更新。#917 的 develop CI 有夹具探针，Production 全量和分发许可待证。复用同一工作流机制的发布实现也须检查实际授权、正式冻结模式、完整音频和可下载 Artifact。[#944](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/944) · [#917](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/917)
- **P1，正式 Quality 和同候选官方负载。** 现有自动 `verify-pr` 冻结检查只匹配 `release/*`，hotfix 应保留等效完整证据。用既有 hosted Full 对最终 HEAD 和准确 master BASE 取证，并核对 master 目标 PR 的实际组合通过。正式客户端导入/上传、T0→T3、运行峰值/持续热态、四类动态/静态负载、档位不变、较低端手机及 iPhone 14 Pro 对照均未由本审查验证。用最终含音频 GIL 和同候选 `official-load.json` 执行原有 gate。
- **P2，基线既有红测与超时。** 独立复跑的两个 refined tier 红项（模板控件计数和旧夹具绘图前提）在 v2.1.0 和候选均出现。现有 archive Host 窗口 13–15 的 seed 1/6 通过；16–18 的旧回放在共享环境达到 30 s fixture 时限，不能给这两项绿灯。原测试命令、失败和超时保存在日志。生成 Host 能力 guard 和故意越界写的负例、原生启动失败时 BGM 清理用例均通过。发布检查继续使用原断言和配置。
- **已修正 P2，版本文档。** 核心树文档延续旧 RC 的 `release/v2.1.1` 血统及漏记两项启动优化。`b6ba4614` 将分支和血统纠正为 Owner 指定的 `hotfix/v2.1.1` 自 master 创建，并补齐两条 CHANGELOG。后续 CI 或证据提交会形成新 HEAD，评审和候选身份必须重核。

## 复现与原始数据

- `verify-catalogue.mjs`、`verify-catalogue.lua`、`catalogue.log`。用两树生产注册表生成并压紧发布 Lua，再以 `luatex --luaonly` 对照全部字段和惰性状态。执行 `node verify-catalogue.mjs <线上源码树> <hotfix源码树> <输出目录>` 和 `luatex --luaonly verify-catalogue.lua <输出目录>`。
- `verify-map.lua`、`map.log`。两树分别运行 build:data、build:ui 和 map-ui-layout，再从各自工作树执行同一 probe，设置 `LUA_PATH='./build/lua/?.lua;./src/lua/?.lua;;'`。
- `f10eefa-targeted.log`、`v2.1.0-targeted.log`。Node `24.22.3`/Fengari 与 LuaTeX 5.3。测试工具栈与官方客户端相独立。

## CD 补充审查

审查对象为 `ac30393b1f4e965cdc94fc6547bca53647879269`（提议树 `da3f6a6f93655c325b12a1188cdad4a8c4274793`）与 #944 的 `3d196afb8fdbab89f4c8f6713f7fcd97a6f4d8f2`。合流 HEAD `e385edcb91b34961653a91e968ef357ed28b6cbc`（树 `c60c8ea32194058ee862da4d87000c96786ac7fc`）的 CD 补丁与提议逐文件相同，#944 的生产和测试 blob 与原提交完全一致，`git diff --check` 通过。未观察到 P0 暴露或平台写入。完成构建、发布和下载验收均保持 HOLD。

| 严重度 | 发现 |
|---|---|
| P1 保护输入 | 本次 GitHub 只读检查发现仓库公开、有效 hotfix 分支规则数量为 0、生产 `gil-candidate` 环境为 404。手动运行使用所选分支的 workflow 定义，分支自身的 SHA、CI 和审批代码无法约束可修改该定义的写入者。提供真实底图 URL 前，生产批准必须在独立可信边界执行，例如给精确分支部署配置可信审批并复核工作流 SHA，或从受保护的控制分支运行秘密步骤。进一步核对环境的 `GIL_BASE_URL` 与 `GIL_CANDIDATE_APPROVAL`，后二者分别承载受保护底图和源码 SHA、版本、底图 SHA-256、work-key、处理及公开分发的实际授权。 |
| P1 可审计交付 | `scripts/gil-candidate.mjs:283–287` 的归档 `source/build/gil-artifact/candidate.json` 省略艺术特性、正式 UI、牌组模板及绘图/素材来源等验证器所需数据。现有 `verify:platform-load` 会重验正式产物凭据和当前 payload 摘要。该摘要收据即使将相对 `candidate.path` 定位到下载文件，也无法满足现有门禁。复用正式收据所有门禁字段，处理私有路径并保留归档 GIL 的准确哈希。 |
| P1 最终 GIL 审计 | `deliver` 核对产物和中间包 SHA-256、生产配置、BGM 图与信号、构建器提供的模块读回回执。现有读取客户端 Lua、UI、模板、控件、绑定及来源的独立 `scripts/audit-native-candidate.mjs --source <sha> --candidate <音频GIL> --receipt <最终真实收据> --bgm --output <新目录>` 未被本提议调用。#944 的一行变更把全包的 `deckBrowser` 绑定原样交给最终音频收据，覆盖代码和磁盘回执；它修复此下游门禁的一部分。实际审计目标必须为最终音频文件。 |
| P1 可下载 Production 成品 | 默认分支为 `develop`，本次 GitHub 工作流清单没有 `GIL candidate`。手动入口尚未注册。没有同 HEAD 的正式 Quality、Licenses、环境输入、Production 运行、14 天 Artifact 下载或二次 SHA-256 证据。环境未获准前保持空置，工作流单测和旧 #917 夹具不能当成正式交付。 |
| P2 追溯 | 预检实时比对当前 hotfix ref、dispatch SHA、输入 SHA、精确 Full checkout、同 SHA inventory、保护输入审批与底图哈希，打包前再读 ref。建议把实际预检的 Quality/Licenses run/attempt 与审批 reference 一并保存在可分发清单，便于下载后追踪，且只给校验步骤注入 GitHub 读取 token。 |

本提议固定源码、底图、MCP 提交与编码器 SHA-256。默认使用 `MILIASTRA_ALLOW_LIVE_WRITE=0` 和空 `MILIASTRA_SAVE_ROOTS`，生产脚本写 runner 暂存副本。工作流只声明 contents/actions read，归档步骤保护敏感数据边界须由实际环境验证。独立执行 `node --test tests/gil-candidate.test.mjs` 共 8/8，通过假件针对精确身份、审批、复用重定向、源码/音频和 hash 的拒绝路径。没有运行秘密步骤。

核心 Node 定向复跑结果为 26/31。全部 15 个运行时 UI 用例通过，包括恢复的两个生产变异以及其他原有负控。v2.1.0 对照为 15/20，两个旧变异在选取过时锚点时失败。共同红项包括 refined tier 控件计数、refined tier 夹具缺少 `layout` 及当前未补齐媒体的两树 `deck-pages` 同一 `Invalid selection budget avatar96`。后者不证明牌组运行失败。核心额外两红为历史 Host 回放一侧达到 30 秒上限。

精确 `b6ba4614` 的资源回执单测 **5/5**。同 HEAD 使用 Lua 5.3 直接通过地图 UI、43 个手势、2 个菜单返回以及 24 个焦点检查。补齐 SHA-256 核验的两张绘图 PNG 后，`deck-pages` 在 v2.1.0 与 `b6ba4614` 均通过，应采用这次定向结果。日志见 `b6ba-resource-unit.log`、`b6ba-map-direct.log`、`hotfix-deck-with-media.log`、`v2.1.0-deck-with-media.log`。

### CD 跟进复核

`38f63679e773a2f9a2feaf556e674dee40a2e1f7` 将控制执行固定在受保护的主仓 `develop`。以 `source_ref` 和 `source_sha` 独立绑定受审源码。底图 Secret 仅送到默认分支的下载控制步骤。工作流只读 token 从实际构建步骤移除。这个源码设计解决了可写 hotfix 自行执行秘密工作流的路径。生产环境仍需实际注册，部署分支只能匹配 `develop`，且必须出现真实审批记录。

可移植回执现在保留牌堆模板、原生美术、绑定、工具链、源版本和 payload 证据。正式门禁只读取解压目录同级 `candidate.gil`，按当前源码树和指定 MCP 的本地字节重算摘要。下载包里的原宿主路径仅作为既有摘要标签使用。`deliver` 对待归档的最终有声 GIL 运行独立审计并核对审计前后哈希，审计失败会阻断归档。独审发现初版审计步骤漏传 `WORK_KEY`，`8e7d94fe` 已补齐并加入接线负控。

独立预构建数据/UI 后，CD 和正式平台门禁相关单测 **17/17**，含保护分支绑定、实际构建参数交接、正式证据缺失、候选及 payload 被篡改和可移植路径的拒绝。日志见 `cd-platform-unit-with-build.log`。Artifact 缓存键仍可强化，当前只包含 controller 和 workflow 的策略摘要，控制依赖单独变化时应避免接受过时归档。

### Hosted 资源压力归档

Hosted run `45526278709` 对 `b6ba4614` 与 `eb64f4e6` 成功完成 6 档各 3 对交错样本。独立下载 artifact `14983480628` 并重算 ZIP SHA-256 为 `a79fe9675fdf080f53dd4a8bd468fbce96c9912411cdf79beb12c692a2b077e6`。验证同档两侧的 CPU、内存、swap 实际限额逐一一致，工作负载与依赖图摘要相同，报告判定 PASS，6 档无阈值信号。原始 JSON 与 ZIP 在 `hosted-pressure/`。这项通过对应 b6ba 的离线 Host，对同候选官方容量、手机或真实音频文件的交付均无替代作用。[Hosted 运行](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45526278709) · [原始归档](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45526278709/artifacts/14983480628)

### 实际公开底图试验与 CD 门禁

合流 HEAD `6486569f7d548e5dec6a05459b4f5fc2c9108fbe`（树 `e1aa9775cb18ad2dc72a9df9366073884e87f9c5`）独立绿 **34/34**，覆盖 CD、正式平台门禁和音频回执。此次从公开测试底图实际生成的最终音频 GIL 源为 `8e7d94feb1158752a91b1728d002d360a4a00169`，构建 ID `c40b1a93-9666-4ed7-9676-a2c6e9c78b81`，23,777,692 字节，SHA-256 `2d23e72f6c1ed873c546e5dadd5b3992f1f270c7d1b77bfa32bcea91a0423ce2`。独立将报表与 GIL 移至隔离目录后，正式美术契约与本地 payload 摘要复验通过，375 个脚本和牌堆绑定存在，官方数据缺失时 gate 确认为 `UNVERIFIED`。

对真实测试 GIL 的强制原生审计以相同 SHA-256 读入/读出，成功读取 375 个脚本，仍返回两个拒绝码。

- `GRAPH_COUNT`。正额合同为 `_GSTS_ABYSS_SETTLEMENT` 与 `_GSTS_ABYSS_BGM`。测试底图另保留 `_GSTS_CgStage`，导致严格数量门禁拒绝。应使用无额外服务器图的批准底图。保留门禁。
- `UI_MISMATCH`。逐个遍历源与读回控件，差异仅在 `/stage/menuPanel/{start,continueRun,titleQuit}/label` 三个文本控件。生成端给描边色 `#282328`，原生写入器在缺失描边透明度时用 1，读回显式返回 `outlineOpacity: 1`。可在 `scripts/native-menu-approved-layout.mjs:16` 写明同一默认值，保持绘制、序列化结果与现有严格审计合同。必须复跑正式 UI 对照和整体有声审计才能清除此阻塞。

上述试验来自非 Production 底图，正式 CD 仍无已获批准的 Production 输入、Hosted 可下载结果或官方实际操作证据。

### 最终合流源码评审

审阅完成的候选源码 HEAD 为 `8cff1cb8172552aacbcc7ff1363f8cd83bfd00a7`，树为 `4c423233f2a839243695a657060e3f91b0e6c9e9`，基于 `eb64f4e6cd45198118e123b6640dc491f186e329`。合流从核心和既有补丁逐步 cherry-pick。最终结论为**源码定向审查通过，Production 发布与交付 HOLD**。

- **已解决 P2，CD 归档重用身份。** 原 `5abb0c81fac6d3963d4e3e08c436d30359cb7eb7` 的合流提交为 `2e38a406a31f81ac0f65ffb6ad093407498ebe1e`。它实际检查控制 checkout 的 `GITHUB_SHA` 和清洁状态，并纳入请求标识和 manifest。控制脚本或依赖变化不会复用先前控制版本的归档。同一请求仍可重用对应的未过期 Artifact。
- **已解决 P1 源码，标题描边默认值。** 原 `8ba1d8d643e6c2c9570d6dcc2858221966c47011` 的发版集成 HEAD 为 `8cff1cb8`。仅在 `scripts/native-menu-approved-layout.mjs:16` 为三个既有标签显式设置 `outlineOpacity:1`。固定 MCP 写入器使用 `outlineOpacity ?? 1`。Agent F 用实际生成 UI 与完整原生读回比较，改前 false、改后 true，只有三个预期字段变化。独立复核以原始读回数据验证这三个字段足以匹配全部控件，改任意一个为 0.5 仍拒绝。原控件审计未改变。
- **保留 P1 运行证据边界。** 测试底图遗留 `_GSTS_CgStage`，其 `GRAPH_COUNT` 拒绝符合现有合同。没有用测试特例放行，也没有把早先红项、可移植收据或局部原生 UI 对照改写为完整审计 PASS。最终 HEAD 的批准 Production 底图、独立整包审计、Hosted 完成并下载校验仍缺失。
- **保留 P1 发版门禁。** 需要受保护默认分支登记的单个 CD workflow、合一的实际审批和处理权限、准确新 HEAD/BASE 的正式 Quality 与 Licenses，以及同一最终 GIL 的官方容量/静动态负载/启动 ready/实机手机验收。只在人工发布成功后登记官方版号映射。

精确最终头 `8cff1cb8` 独立定向运行 CD、平台 gate 和原生音频回执 **34/34**，`git diff --check` 通过。日志见 `8cff1cb8-targeted.log`。

[最终定向回归日志](attestations/8cff1cb8-targeted.log.gz)。
