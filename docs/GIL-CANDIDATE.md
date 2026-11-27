# 正式有声 GIL 的构建与交付

**GIL build** 是正式有声候选的构建入口。固定主仓获准的 `release/vX.Y.Z` 或 `hotfix/vX.Y.Z` 最新 HEAD，以同一完整 SHA 并行执行 [快速筛查](CI-FAST.md#候选提测与打回重测)和构建。主仓 Actions → **GIL build** → **Run workflow** 的运行分支选择受保护的 `develop`，`source_branch` 填冻结分支，`source_sha` 填其完整小写 SHA。发布候选固定源码、基础 GIL、工具链、构建策略和生产配置。

在构建摘要核对冻结分支、源码、工件数字 ID、GIL SHA-256、容量和读回结果。按[候选提测流程](CI-FAST.md#候选提测与打回重测)运行 `release-ci freeze`，复核同一 SHA 的冻结快筛和工件。将输出的 `handoff.url`、`artifactId`、`gilSha256` 和 `gilSizeBytes` 交 Owner。该入口也请求正式 Full。若已取得 `handoff` 而 Full 状态为 `full-dispatch-unconfirmed`，可继续原包提测，保留错误并核对该 SHA 的 Full 状态。可在冻结分支手动运行 **Licenses** 的默认审计，正式发布须核对同一 SHA 的成功清单。

构建使用[已发布的 v2.1.1 GIL](https://github.com/FurinyaWorks/Slay-the-Heavens/releases/tag/v2.1.1) 作为固定运行时起点，核对归档来源和实际字节。Windows Hosted Runner 使用锁定的 MCP 提交、v3 生产精绘和原生音频预设，重建 Lua、原生 UI 和结算/BGM 图，审计脚本、模板、节点图及其余继承容器段。构建回执默认使用 `offline-candidate` 标识。维护者可以设置仓库变量 `GIL_PRODUCTION_WORK_KEY` 指定回执标识。实际作品身份由 Owner 根据平台回执确认，底图和音频/资源授权范围见 [LICENSE-SCOPE.md](../LICENSE-SCOPE.md)。

正式工件包含 `candidate.gil`、`candidate.json`、来源及审计清单和校验和。工作流上传后重新下载校验。解压时保留 `candidate.gil` 和 `candidate.json` 在同一目录，用 `sha256sum -c SHA256SUMS` 或 PowerShell `Get-FileHash candidate.gil -Algorithm SHA256` 复核。记录完整源码 SHA、构建 run/attempt、Artifact 链接末尾的数字 ID、工件 digest、GIL SHA-256、`buildId`、`payloadDigest`、构建回执摘要和工件到期时间。正式工件保留 90 天。重复请求先查同一组构建输入的有效工件。同 SHA、配置与 GIL 均一致时，单独重试失败的质量作业，沿用已校验工件及同包证据。工件缺失、过期或需更换时，按下一 RC 重新提测。

## 在后续门禁沿用同一工件

1. 从 `handoff` 取数字 ID，运行冻结分支的 **Performance regression** `formal`，将数字填入 `gil_artifact_id`。正式性能验真实际工件、已发布基线和同包测量，可在正式 Full 完成前开跑。保存正式报告及 run/attempt，最终保存 `release-ci verify` 返回的 `performance.gil`、最新合法的 Full 和 Licenses 证据。
2. 用该工件的同一份 GIL 完成 Simulator、官方编辑器导入/负载、PC 和实体手机验收。按[平台负载门禁](PLATFORM_LOAD.md)制作并校验 `official-load.json`，按 [P0 冒烟](P0-SMOKE.md)记录启动、真实游玩及设备结果。
3. Owner 按[发布操作单](PUBLISHING.md)使用同一 GIL 执行官方发布并提供成功回执，随后用原工件完成 GitHub Release 归档。

原生独立复审可从冻结源码、已水合的审核素材和清单中的 MCP 检出运行下列命令。将 `MILIASTRA_MCP_ROOT` 指向该检出。

```sh
node scripts/audit-native-candidate.mjs --source <SHA> --candidate <解压目录>/candidate.gil --receipt <解压目录>/candidate.json --output <新证据目录> --bgm
```

当前 `release/v2.2.0` 保留该发布线既有的 Quality/Licenses 完成后自动触发、分支手动入口与旧工件验证。后续候选按本页显式请求构建，Quality/Licenses 完成或重跑均不会触发新构建。旧工作流制品、旧平台回执和本地诊断按原身份留存。开发和 Fork 的诊断只上传摘要，保留 14 天。它们可用于复核当时的结论。正式提测从本轮冻结源码和唯一正式工件开始。
