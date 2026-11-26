# v2.1.1 性能与交付修复复验

## 牌库

官方浏览器跳过无需展示的旧分组文案，并保留原生触点状态的实际读回与拒绝重试。暖开和翻页关闭各少 55 次替身 SDK 调用和 28 次字段写入，控件分配不变。默认旧 Grid 在修复前后均为 2,223 次 SDK 调用和 4,668 次字段写入。受控 Host 中的暖开 CPU 中位数由 2.594 降到 2.336 ms，实体设备延迟仍待验证。相同运行时的 Hosted 对照出现 13.52% 的组合压力差异，所以初轮 17.7% 样本不能单独定位源码根因。 [浏览器复验](DECK-REMEDIATION.md) · [原始数据与复现](deck-remediation-evidence.tar.gz) · [相同运行时对照](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45528828838)

## 构建和历史回归

修复精绘分档夹具及牌库构建产物清单。分档负控仍在小档绘制时拒绝共享容量，真绘制、无图回退和跨档回收通过。Lua 解析器在实际解析时载入，恢复无依赖零美术构建。三个储存配置分别比较 375 个正式生成／运行时输入，共 1,125 次字节对照全部一致。历史地图牌组回放加入精确现行五个 owner，仍核对完整 SHA-256、Git blob 和真实 reader。历史复制继续得到原 helper 的字节，任一 owner 或 helper 漂移均拒绝相应投影。

目前 P0 范围之外也有发布线历史回放失败。精确 v2.1.0 与上一 Hotfix 的可比较 POSIX 日志中，七个分片的 280 个失败标题有 250 个重复。另直接复现两个既有断点。精绘 Release 容量历史回放在 v2.1.0 同样拒绝 `scripts/audit-native-candidate.mjs` 的来源。Windows Lua 已测清单在 v2.1.0 已缺同八个旧夹具。继续以正式 Full 判定准入。 [v2.1.0 CI](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45420513338) · [上一 Hotfix Full](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45528401329)

## Windows Full 冷检出

初试迁移 12 份既有二进制的存储方式，继续使用现有有界 CI 媒体清单。原 Git blob、实际字节、SHA-256 及来源均有收据。认证空 LFS 缓存从 GitHub 读回 28,855,381 字节，逐项一致。真实冷 Git fetch/checkout 与原比较代码在集成提交 `3a183740` 上总 pack 为 128,558,065 字节，较基线 156,036,676 字节减少 27,478,611 字节，低于 128 MiB门槛 5,659,663 字节。保留原工作流分片、上限和字节验证。 [冷检出收据](cold-checkout.txt) · [对象身份](lfs-selected.tsv)

首次 Hosted 预检发现初试清单引用了已退役的菜单图。该图已恢复到原 Git blob 与原来源记录，最终只迁移其余 11 份。`ea8eab9a` 通过现有 UI 引用比较及冷 Git 复测，pack 为 131,992,819 字节，低于 128 MiB 2,224,909 字节。 [首次预检日志](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45532312603/job/138930380080) · [冷检出收据](cold-checkout.txt)

## 有声包和注册

在精确旧 Hotfix `6492e8dc` 上换用锁定 MCP 的公开无图底图，完成实际完整有声构建、严格原生审计、归档与校验。GIL 23,773,913 字节，SHA-256 `c1057672a67775e9e4e13df84eca06705ac180f5c01d1e57b1ad41931271739b`，375 个脚本、结算及 BGM 两个预期图全部读回，审计零问题。现有 `verify:platform-load` 仅因欠同包实机资料返回 UNVERIFIED。已将受保护的登记改动快进到 #917 的既有分支。原审批门禁指明该提案为 586 行生产增删，超过常规 400 行切片上限，登记和正式 Production 制品仍处于待交付状态。 [CD 详细收据](../CD-RECEIPT.md) · [登记 PR](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/917) · [登记检查](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45531082121)

合流后的牌库、历史来源、精绘、构建、可移植回执、平台验证与 CI 存储共 146 项定向测试全部通过。 [回归日志](targeted-regression.tap.gz)
