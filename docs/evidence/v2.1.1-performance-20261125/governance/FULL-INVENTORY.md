# v2.1.1 分支收口读回

起点 GitHub 分页清单 26 分支、15 开放 PR。创建 `hotfix/v2.1.1` 后共 27 分支。核对创建后的全部开放 PR、旧线的在途 Actions、固定分支 SHA 和补丁等价性后，经 Git 预期 SHA 比对原子删除以下 4 条，再按每页 10 条读回，剩余 23 条。 [规范 Hotfix](https://github.com/FurinyaWorks/Slay-the-Heavens/tree/hotfix/v2.1.1)

| 远端分支 | 已核对的末端 | 继承与处置 |
| --- | --- | --- |
| `rc/v2.1.1` | `b0963d7ac8fa1749d7287772903de968c3ca1bdc` | 8 个补丁逐一移植。`a6ab0897` 与旧 tip 整树相等。已删除 |
| `rc/v2.1.1-performance` | `85f5c50b9b610f639e4d582507033206013bfc18` | 早期手牌方案的补丁及撤销轨迹可复原。敌名优化进入 Hotfix。已删除 |
| `rc/v2.1.2` | `6b5e2e6889bda1814a61cc2b646df39786464dac` | 错误版本号退出。#953 与 #955 的补丁 ID 相等，两个继承文件的 blob 相等。已删除 |
| `fix/v2.1.2-map-startup-group-lookups` | `1b4e5a6279dda9997b7aa7823daf131d20709af1` | #954 的唯一代码文件精确移植至 `f10eefa2`，稳定补丁 ID 相同，独立功能与查询负载通过。已删除 |

`release/v2.0.0` 起点已不在远端。该旧冻结线由 v2.1.0 Tag、#950 和实际构建提交追溯。仓库当前的冻结开放 PR、#932 和它的暖态证据、#917、#952 仍有负责人和具体出口。三条仅存原始证据的分支尚未收到既有任务的持久归档接收确认，责任人 Furinya。详情和退出条件见 [历史与治理分析](../HISTORY-AND-GOVERNANCE.md)。

核对过的旧 RC 补丁保存在 [旧 RC 补丁](previous-rc-patches.mbox.gz) 和 [地图原始补丁](map-lookup-source.mbox.gz)。起点与回读为 [初始清单](branches-before.tsv)、[删除前提交](precleanup-refs.tsv)、[删除前开放 PR](open-prs-precleanup.tsv) 和 [删除后分支](branches-after.tsv)。
