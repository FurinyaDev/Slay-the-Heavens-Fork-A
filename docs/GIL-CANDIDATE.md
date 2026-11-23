# Develop GIL 按需构建

主仓 Actions → **GIL candidate** → **Run workflow** → 选择 `develop`，填入已合入且对应 Quality 和 Licenses push 均成功的完整小写提交 SHA。成功后在 Run 的 **Artifacts** 下载。重复请求可从 Run Summary 直接打开有效的原 Artifact。解压后运行 `sha256sum -c SHA256SUMS`，或用 PowerShell `Get-FileHash candidate.gil -Algorithm SHA256` 对照清单。Artifact 保留 14 天。

## 首次配置

维护者在主仓 Settings → Environments 配置 `gil-candidate`，部署分支限制为 `develop`。

- 环境 Secret `GIL_BASE_URL` 指向经批准、去除个人及测试数据的 Production 底图。使用 Runner 可访问的直连 HTTPS 下载，可用短期签名 URL。底图及下载凭据留在授权存储。
- 环境变量 `GIL_CANDIDATE_APPROVAL` 记录本次批准的源码、底图原始字节 SHA-256、实际生产作品键、底图云端处理及最终包公开分发许可。由维护者审查底图来源、关卡内容、平台资源和音频授权后填写真值。每次换源码或底图都更新批准记录。`reference` 填可追溯的审批记录编号。项目代码许可证的范围见 [LICENSE-SCOPE.md](../LICENSE-SCOPE.md)。

```json
{
  "sourceSha": "<40 位 develop 提交>",
  "baseSha256": "<64 位基础 GIL SHA-256>",
  "workKey": "<经核实的实际生产作品键>",
  "baseProcessingApproved": true,
  "publicArtifactApproved": true,
  "reference": "approval/123"
}
```

单个 `windows-2025` Job 使用 Node 24.18.0 和锁定的 MCP 提交。构建命令为 `npm run build:native -- <base.gil> build/hosted-gil --work-key=<作品键>`。沿用正式美术预设，使用开发候选模式。工作流校验音频装配后的 `audio/candidate.gil`，交付最终文件、脱敏收据、构建清单和校验和。Runner 下载量取网卡接收字节差值，含 Runner 本身流量。包大小为实际文件字节数。千星官方导入、平台容量和设备验收沿用独立流程。发布证据合同见 [v2 交接](versions/V2-RELEASE-HANDOFF.md)。
