# v2.1.1 有声 GIL 交付收据

| 阶段 | 实际状态 |
| --- | --- |
| 代码接线 | 在 Hotfix 上复用 #917。默认分支工作流控制、同一冻结 Hotfix SHA 的 Full / Licenses、正式有声构建、最终独立审计和下载校验都走同一入口。 |
| 公开基础 GIL | 同一诊断底图实际生成了带声 GIL。b6ba4614 的文件为 23,777,846 B，SHA-256 `015e8d77bec8bf9cae6c6997cb6e92be8820404d7587c9b262ca2d394d937a0a`，读回 375 个 Lua 模块、83 个 BGM 图节点和七组信号。 |
| 可移植回执验证 | 另一组本地真实带声构建 SHA `8e7d94feb1158752a91b1728d002d360a4a00169`，GIL SHA-256 `2d23e72f6c1ed873c546e5dadd5b3992f1f270c7d1b77bfa32bcea91a0423ce2`、23,777,692 B。可移植回执通过本地源、素材和 payload 校验，官方证据缺失返回 UNVERIFIED。 |
| 严格审计 | 同一 b6ba 公开夹具比较证明继承 #944 可恢复最终牌组模板回执。严格审计还捕获公开底图附带的 `_GSTS_CgStage` 图，以及标题三个文本控件的 `outlineOpacity=1` 编码缺省差异。精确比较及失败输出已归档。标题生成器显式写入同一缺省值后，24,127 个控件的严格比较通过，额外图仍触发原始门禁。 |
| GitHub 正式产品运行 | GitHub `gil-candidate` 环境清单为空，默认分支工作流未登记，授权 Production 底图、实际作品键与分发授权尚未取得。正式有声 GitHub Artifact 为 BLOCKED。 |
| 官方同包和发布 | 实机容量、上下行负载、安卓和 iPhone 14 Pro、官方进出及人工发布尚待验收。 |

[牌组回执与两处严格审计差异](attestations/strict-audit-analysis.json) · [严格审计原始报告](attestations/audit.json.gz) · [本地可移植回执门禁](attestations/platform-load-release.json.gz)

维护者沿用 [#917](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/917) 的当前集成门禁注册同一工作流，在 GitHub 的 `gil-candidate` 环境中仅允许受保护 `develop` 部署。写入已批准的 Production 下载 Secret 及绑定完整 Hotfix SHA、底图 SHA-256、作品键和公开分发决定的变量。随后使用同一 SHA 的 Full、Licenses 与受保护工作流构建。Owner 下载成品并运行同包实机验收。 [最小配置与下载命令](../../GIL-CANDIDATE.md)

首次最终候选托管 Full 在 Windows 的既有 Git pack 门槛处失败。分片下载 `155940909` 字节，高于现有 128 MiB。归档证据前的旧 RC 对应分片同一检查已下载 `151027631` 字节并失败。两次均在这些 Windows 分片运行产品回归前被原门槛拦下。此处保留 Windows Full 阻塞与两次下载记录。 [当前 Full 失败分片](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45528401329/job/138917588960) · [旧 RC 对照分片](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45517350996/job/138880998517)

首次 Licenses 发现新增图件缺资产库存记录。为八份原始生成 SVG 登记来源及 SHA-256 后按同一门禁复跑。 [首次库存结果](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45528401591/job/138917346774)
