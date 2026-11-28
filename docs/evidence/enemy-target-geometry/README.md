# TASK-116 敌人选中热区

基线 `32a15219aecd145c59cb1b2fcf477e5556766e5d`。本切片面向 v2.2.0 后续版本，验收目标分支为 `develop`。

## STS1 证据

| 路径 | 固定快照观察 |
| --- | --- |
| 几何 | 怪物构造以尺寸生成矩形，`refreshHitboxLocation` 将 draw position、局部偏移和高度换算为中心。改变大小时重建矩形。 [AbstractMonster 构造](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/monsters/AbstractMonster.java#L132-L151) · [AbstractCreature 位置](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/core/AbstractCreature.java#L209-L218) · [AbstractMonster 改尺寸](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/monsters/AbstractMonster.java#L831-L841) |
| 矩形与框 | 矩形四边采用开区间。四角由 Hitbox 中心及宽高派生，原版额外施加带动画的视觉偏移（15 × scale 的偏移初值）。本切片沿用项目四角样式，以静态矩形边界直接表示有效区。 [Hitbox](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/helpers/Hitbox.java#L39-L66) · [AbstractCreature 准星](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/core/AbstractCreature.java#L801-L833) |
| 单体卡牌 | 按 MonsterGroup 列表顺序取首只命中，跳过死亡、垂死和撤离敌人。点选确认、非点拖的松手路径都校验 `canUse`，提交携带目标入队。原版箭头向指针插值，锁定改变颜色和缩放。 [目标输入](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/characters/AbstractPlayer.java#L856-L935) · [入队](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/characters/AbstractPlayer.java#L1259-L1278) · [箭头](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/characters/AbstractPlayer.java#L1785-L1802) |
| 目标药水 | 指针路径复用怪物 Hitbox 和同一列表顺序，确认后对命中目标执行药水并销毁槽位。本项目仍以自己的 Combat 与 Run 资格校验为准。 [PotionPopUp](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/ui/panels/PotionPopUp.java#L179-L212) |
| 触屏 | 同一桌面代码在触屏模式调整指针、拖拽和松手行为，敌人矩形测试共用。iOS 官方更新日志记录触控及拖牌视觉改动，未公开矩形容差。当前没有原版手机运行测量。 [桌面输入](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/characters/AbstractPlayer.java#L1140-L1229) · [iOS 发行记录](https://apps.apple.com/us/app/slay-the-spire/id1491530147) |

Java 证据来自项目沿用的固定社区反编译快照，构建身份未获官方认证。正式 STS1 PC、移动端交互实测仍待补。

## 本项目根因与改动

单位视图只有落地 Byrd 使用攻击矩形锚点，其余四角来自立绘大小。原生 `hit` 先由单位视图写成旧尺寸，再由演员渲染切换到正确宽高。拖牌和药水各读几何并维护自己的查找循环，原生确认依赖宿主命中的控件顺序。

现在四角与原生控件直接消费同一 `EnemyView.geometry`。拖牌、目标药水和带坐标的原生确认共用开区间、按列表顺序的命中逻辑。只提供原生 Click 的宿主沿用控件所绑定的身份。按下与确认仍要求同一触点和目标身份，Combat 负责是否合法，Run 负责提交。画稿、卡牌、药水和怪物规则沿用原实现。既有攻击箭头样式保持，移动瞄准的演员高亮复用同帧命中结果。

## 几何对照与触控

[全敌人前后对照](comparison.html) 覆盖 67 条构造几何和 2 条额外姿态，金色四角是选中框，青色矩形是实际热区，灰色代表立绘画布。原生造型为本地素材的离线近似投影。23 条只具客户端资源的条目以图标 ID 或级别回退标示。图中每对居中到各自立绘，相对位置和宽高取自 [Before](before.csv) 和 [After](after.csv)。69 条的候选框全部对齐，68 条从旧位置变化，攻击矩形尺寸与位置在这组对照中一致。遮挡及完整队形仍需同候选真机检查。

最小普通矩形为小酸液团/小尖刺团的 86.7 × 66.7 设计单位。在 844 × 390 的等比例离线视口里，约为 47.0 × 36.1 视口单位。实际物理尺寸、可点击净空与舒适度取决于设备、安全区和宿主输入。落地 Byrd 沿用既有基于立绘测量并带 44 设计单位下限的矩形。缺少原版手机容差与官方设备测量，普通热区保持原有尺寸，触控舒适度保留待验。

## 性能与复现

5 只敌人、指针命中最后一只，交替运行 A/B 各五次，每次 20,000 个目标药水样本。LuaHBTeX 的 `os.clock` 中位数从 390.779 ms 到 326.198 ms（-16.5%）。这是查找循环的离线 CPU 数据。每只敌人每次完整渲染的原生热区尺寸写入从两次到一次，位置写入仍一次，控件数增量为零。正式 GIL 容量、GPU、内存和真实帧时间留待官方候选验证。[原始数据](performance.txt)

在仓库根目录生成基础数据与官方布局主题。对比基线时先把修改过的 Lua 模块从固定基线导出到单独目录，再用它作为 `probe.lua` 的第一个参数。候选使用 `src/lua`。传第二个参数 `bench` 可复跑药水样本。

```sh
npm run build:data
node --input-type=module <<'JS'
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {officialAssetsTheme} from './scripts/official-assets-layout.mjs';
import {buildUiTheme} from './scripts/build-ui-theme.mjs';
const dir = 'build/targeting-official';
mkdirSync(dir, {recursive:true});
const theme = dir + '/theme.json';
writeFileSync(theme, JSON.stringify(officialAssetsTheme(JSON.parse(readFileSync('data/presentation/ui_theme.json')))));
buildUiTheme(theme, undefined, dir + '/abyss_theme.lua');
JS
luahbtex --luaonly docs/evidence/enemy-target-geometry/probe.lua src/lua
python docs/evidence/enemy-target-geometry/render.py
```
