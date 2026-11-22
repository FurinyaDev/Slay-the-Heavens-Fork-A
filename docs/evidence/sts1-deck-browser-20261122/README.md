# 卡组与牌堆浏览截图

Release 候选为 `03d0d6710124b7ac9efaf2b0b4bfa8c0ff3b295f`。使用正式配置 `--official-assets --native-page-lifecycle --refined-release-monsters`，依次在真实项目 Lua 的 Host 夹具里点按永久卡组、抽牌堆、弃牌堆和消耗堆入口，等待页面就绪并导出当前原生控件状态，通过 BeyondSimulator 0.5.2 捕获原始 1600×900 PNG。最后加上冰冻之眼，同样点按抽牌堆复验。

| 场景 | 截图观察 |
|---|---|
| [永久卡组](permanent.png) | 三项排序、角色底色、金色选中、十张首页卡面 |
| [普通抽牌堆](draw.png) | 左下标识、用途与稀有度说明、十张首页卡面 |
| [弃牌堆](discard.png) | 右下标识、用途说明、六张卡保持牌堆次序 |
| [消耗堆](exhaust.png) | 消耗说明、不同稀有度和状态卡 |
| [冰冻之眼](draw-frozen-eye.png) | 首页从下一张实际抽取牌开始，稀有度说明隐藏 |

云端模拟器部分图库纹理请求失败，截图保留模拟器的缺图及渲染结果。官方客户端和实体手机画面仍待核验。[原始图校验和与缺图 ID](receipt.json)

[原版规则与本项目适配](../../design/UI_DESIGN.md#卡组与战斗牌堆浏览)
