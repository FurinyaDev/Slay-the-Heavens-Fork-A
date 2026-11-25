# GIL 云端构建与交付

主仓 Actions 的 **GIL candidate** 自动处理 `release/vX.Y.Z` 更新及正式工程 SemVer Tag（`engine-vX.Y.Z` 或 `vX.Y.Z`）。日常开发分支、PR 和普通 develop push 不触发打包。安装工作流后，从默认分支 `develop` 的 **Run workflow** 可指定 `develop`、已验收的 develop 40 位 SHA、发布分支或正式 Tag。分支每次触发绑定事件提交，Tag 解引用到 master 已接收的提交，且版本须与源码工程版本一致。只记录平台版号的历史 `v2.1.0` 由既有历史归档追溯。构建前后校验干净源码，产物包含同一源码版本的完整正式内容及有声音频，发布分支和 Tag 均使用 `--release-candidate`。

成功 Run 的 Summary 提供验证过的下载入口。工作流重新下载上传的 ZIP 并核对完整大小和 SHA-256。**Artifacts** 保留 30 天，重跑使用新的 attempt 名称。ZIP 中包含一份 `slay-the-heavens-vX.Y.Z-<12 位 SHA>.gil`、`candidate.json`、`manifest.json` 和 `SHA256SUMS`。解压后运行 `sha256sum -c SHA256SUMS`。PowerShell 可用 `Get-FileHash *.gil -Algorithm SHA256` 对照清单。清单记录源码 Ref 和完整 SHA、工程 SemVer、平台版本映射状态、底图及产物摘要、构建配置与时间、工具版本、Run/attempt、文件字节数及读回结果。平台真实版本在官方发布确认前为空。

## 首次配置

在主仓 Settings → Environments 配置 `gil-candidate`。将部署分支与 Tag 限制到受信任的来源。由于 Tag 事件可使用被 Tag 指向提交中的工作流，允许 Tag 自动访问底图前要有可信的 Tag 创建控制或环境审批。可始终从受信任的 `develop` 手动选择合法 Tag 源码。现有远端分支保护和审核流程保持适用。

- 环境 Secret `GIL_BASE_URL` 指向经批准、去除个人及测试数据的 Production 底图。填 Runner 可直接访问的 HTTPS 地址，底图和凭据保存在授权存储。
- 环境变量 `GIL_CANDIDATE_APPROVAL` 保存经核实的底图 SHA-256、正式作品键、处理与公开分发许可，以及审批来源。使用 `sourceSha` 指定单个提交，或使用 `sourceRef` 指定明确获批的完整 Ref，以便同一 Release 分支更新后自动构建。可以同时指定，两项都须匹配。内容、素材和音频许可遵循 [项目许可证范围](../LICENSE-SCOPE.md)。

```json
{
  "sourceRef": "refs/heads/release/v2.1.1",
  "baseSha256": "<64 位 Production 底图 SHA-256>",
  "workKey": "<正式作品键>",
  "baseProcessingApproved": true,
  "publicArtifactApproved": true,
  "reference": "<实际审批记录>"
}
```

工作流沿用 `npm run build:native`、锁文件、`windows-2025`、Node 24.18.0、Python 3.12.10 和固定 MCP 提交。输入缺失、摘要不一致及写入或读回失败会令 Run 失败。原始工具输出和底图仅留在临时构建环境。

## 验收与发布

`develop` 构建沿用同一提交的 Quality 和 Licenses push 成功条件。Release 和 Tag 构建自动交付待验收候选。已有 [Release Full](CI-FAST.md) 与正式发布门禁适用于同一源码和同一产物。清单中的文件字节数供下载核对。官方关卡及服务器容量只能由千星编辑器针对同一候选测量。

下载 GIL 后，在原神导入新存档并完成官方导入、容量、报告和真机验收，随后由维护者人工发布。验证官方负载证据时先检出清单中的精确干净源码，准备该提交的生产素材及清单中的 MCP 工具，再执行 `npm run verify:platform-load -- <解压目录>/candidate.json <official-load.json>`，`MILIASTRA_MCP_ROOT` 指向固定工具版本。正式证据字段见 [平台负载合同](PLATFORM_LOAD.md)。
