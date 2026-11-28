# STS1 地图视觉参照

固定来源为 STS1 Java 反编译快照 `319009d5df0a82d9fb0f23cc22322286c6a87ec0`。桌面列距 128、层距 150，节点中心扰动上限为横向 27、纵向 37。节点绘制和命中框使用同一偏移。连线读取两端偏移并在连线上排布图元，桌面点距 17、源端留 29、目标端留 20，禁用线黑色透明度 25%。点纹理的内部位置和角度有轻微变化。 [MapRoomNode](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/map/MapRoomNode.java) · [Settings](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/core/Settings.java) · [MapEdge](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/map/MapEdge.java) · [MapDot](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/vfx/MapDot.java)

| STS1 原版实拍 | 核对内容 |
| --- | --- |
| `1N5BTEWR0Z7YR` | 同一名义层的图标有高度差，支路在可见区逐层合并，短虚线离图标边缘留空。 [原图](https://i.imgur.com/iJXVehw.jpeg) · [种子来源](https://www.reddit.com/r/slaythespire/comments/1kdfsnu/a_no_good_awful_map_for_silent/) |
| `5ATZ1CBFWOLV8` | 多条不对称分支跨越同一层，平行线段之间保留可辨间距。 [原图](https://i.redd.it/a5ehty273dse1.jpeg) · [种子来源](https://www.reddit.com/r/slaythespire/comments/1jphokz/ive_always_heard_of_the_wall_of_death_but_this_is/) |
| `288WT2429IRM` | 地图上部汇入固定居中首领。斜线上的重复短笔划弱于节点图案。 [原图所在投影片第 34 页](https://www.cs.cornell.edu/courses/cs5152/2025sp/lectures/lecture14/slides-14.pdf#page=34) |
| Interface In Game（第二幕，v2.0） | 可达宝箱悬停时显示近白底层描边，墨色图标仍在上面。在缩到 1100×619 的原图中，纸面约为 x=187–915，外侧可见节点约为 x=315–775。该窗口的节点中心横向覆盖约为纸面的 63%。 [原图](https://interfaceingame.com/wp-content/uploads/slay-the-spire/slay-the-spire-map.jpg) · [出处](https://interfaceingame.com/screenshots/slay-the-spire-map/) |

## 最底一层的稀疏入口

- 一张开局实拍中的三个入口集中在纸面中间约 40% 的区间，对应缩到 1000 像素宽时的 x≈353、496、620。悬停的左侧入口有白色轮廓。 [开局实拍](https://www.davetech.co.uk/pages/gamedevlevelselect/i/slay-the-spire-level-select.jpg) · [出处](https://www.davetech.co.uk/gamedevlevelselect)
- 另一张已经走到第 2 层、仍看得到底边的实拍里，两个底层入口约在 x=285、636，占纸面宽度约 53%。不同种子可产生不同宽度和重心。 [低层实拍](https://d1lss44hh2trtw.cloudfront.net/assets/editorial/2019/01/slay-the-spire-dungeon-crawler-map.jpg) · [出处](https://www.shacknews.com/article/109630/slay-the-spire-review-a-brilliant-mash-up-of-genres)
- `MapGenerator.createPaths` 从列 0–6 抽入口，只要求前两次起点不同。绘制直接读取房间的逻辑列和扰动。两个入口可以落在相邻列或同侧，也可以相隔多列。截图是两个具体例子，同侧的可能性来自源码中的列约束。 [MapGenerator](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/map/MapGenerator.java) · [MapRoomNode](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/map/MapRoomNode.java)

## 项目适配

原版在 1920×1080 下的七列名义跨度为 768，纸面约宽 1280，名义覆盖 60%。上一版项目 Draft 的名义跨度为 696，约占现有 838 宽纸面的 83%。修订后的 86 列距在同一纸面上覆盖 62%。以原版的层列比例 150:128 为依据，层距取 100。横纵扰动上限是 14 与 18，使相邻同层节点中心至少相隔 58、相邻常规层至少相隔 64，保留 56×56 触区。

常规节点整体最多平移 64，中心点限制在 x=±304 的纸内区域。保留支路的自然偏向与首领的居中位置。坐标由地图种子、相对层和列生成，运行时使用现有投影和触区。

原版 `MapRoomNode.render` 在高亮时先绘浅色房型轮廓，再绘墨色图标。项目复用图标下方的环形控件呈现近白轮廓，保持现有图标、控件数量和点击范围。 [原版悬停画面](https://interfaceingame.com/screenshots/slay-the-spire-map/)

线段沿两端的共享坐标轴排列，点距从 11 起，较长的斜线拉长点距以容纳在八个图元中。禁用线采用原版的 25% 黑色透明度，行经和可达路线保留项目墨色及满不透明度。短笔划使用现有图元。 [项目复测与视觉对照](README.md)
