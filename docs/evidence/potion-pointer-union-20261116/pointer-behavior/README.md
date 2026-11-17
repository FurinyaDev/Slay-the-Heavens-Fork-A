# Pointer 原行为回归接续

本阶段是 #679 `eabff9b0bf2cce17ae05913c0e5d47366d0ff173` × #711 `ad6fe84dbcc11e28e8a82258f889a6841b46c8c6` 原双父准备树的定向验证，不是当前 Release 集成或设备验收。

## 实际交付

逐字恢复 #711 原 `tests/mobile-card-release.test.mjs` 以及两个 Lua support：`battle_pointer_identity_cases.lua`、`battle_sparse_pointer_cases.lua`。保留旧移动释放 7 项，新增原 pointer identity 26 项、sparse pointer 2 项。无产品代码修改，不接管原 owner 的第三触控详情 dismiss 缺陷。

当前认证集合 193 → 195（新增两个 Lua support）；mobile 原历史父视图保留。精确前驱远端 `1b3b5834ddf8deaf73c3cd392e496b3aca7e085f`，本地等树 `0d379cd3d14b7fdce9ffd790d205b1033589e8d5`，tree `1f757a051f1eca6d96a70d11385532d9e30a9fc8`。新 `potion-pointer-ci-before-behavior.json.gz` 原样归档前驱，旧各层校验继续针对该完整前驱执行；新层仅许可明确 5 个输入更新，保留原域和历史源全文。

原 helper-copy 固定集合仅增加这一前驱档，250 → 251。Lua support 不属于 helper-only API；真实隔离认证显式补入 379 个产品/测试夹具文件，无原目录兜底。manifest 中原 copy 基线元数据保留，新阶段基线见 union packet；无新增通用框架。

## 验证

- `npm run build:data`、`npm run build:theme`、`npm run build:ui`：沿用已有生成器，生成本地离线 Lua 依赖（不提交 build）。
- `node --test tests/mobile-card-release.test.mjs`：**3/3 PASS，42,336.384183 ms**；原输出断言验证 7 + 26 + 2 Lua 情形。见 `behavior-v3.log`。
- `node docs/evidence/potion-pointer-union-20261116/pointer-behavior/verify.mjs`：**24 控制 PASS**；三文件 Git 源逐字一致、195 当前输入认证、missing/empty/drift/null、CRLF、pointer 父视图、同步 scope 退出失效及恢复。
- `node docs/evidence/potion-pointer-union-20261116/pointer-behavior/verify-copy.mjs`：复用前轮原 32 控制，仅更新准确集合数量；**32/32 PASS**。真实临时目录根入口 import、copy-from-copy、源/目标逃逸与硬链接拒绝、显式夹具完整认证及改坏产品拒绝。日志中预期红堆栈来自负控，最终 PASS。
- `python .../pointer-behavior/capture.py`：重新生成全部本轮绑定字节一致；`git diff --check` 通过。

首跑因缺生成 `abyss_theme` 三例未启动；补 data/theme 后仍缺 `abyss_map_layout`，随后使用原 build:ui 完成全部前置生成。两次失败日志原样保留，不能当作产品缺陷或隐藏为首轮通过。

## 边界与接续

本轮没有跑 Full、calibration 78 或 integrated 19 全套。六个 pointer CI helper/packet 和其余 pointer CI 新断言仍待按准确原父视图接续；未声称它们已恢复。未修改旧原始 packet/pins、产品代码、Backlog、原 PR。两个已有 LFS materialization 排除提交。离线 Lua/Fengari 回归不等于官方客户端/ready/手机实测，也不等于可合并或可发版。

## 独立复审

父线程独立复审通过：三原文件精确 ad6、195 输入、所有旧父视图 SHA 和已有 source 全文保留、未改输入整行不变；另 **15 项独立 missing/empty/drift、恢复及两父视图控制 PASS**。脚本和日志见 `review-*`。本轮按此窄范围准予准备分支提交，不改变上述发布/设备/剩余 CI 边界。
