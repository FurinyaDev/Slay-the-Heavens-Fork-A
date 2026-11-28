# STS1 地图视觉参照

固定来源为 STS1 Java 反编译快照 `319009d5df0a82d9fb0f23cc22322286c6a87ec0`。桌面列距 128、层距 150，节点中心扰动上限为横向 27、纵向 37。节点绘制和命中框使用同一偏移。连线读取两端偏移并在连线上排布图元，桌面点距 17、源端留 29、目标端留 20，禁用线黑色透明度 25%。点纹理的内部位置和角度有轻微变化。 [MapRoomNode](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/map/MapRoomNode.java) · [Settings](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/core/Settings.java) · [MapEdge](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/map/MapEdge.java) · [MapDot](https://github.com/aeubanks/sts/blob/319009d5df0a82d9fb0f23cc22322286c6a87ec0/vfx/MapDot.java)

| 原版第一幕实拍 | 核对内容 |
| --- | --- |
| `1N5BTEWR0Z7YR` | 同一名义层的图标有高度差，支路在可见区逐层合并，短虚线离图标边缘留空。 [原图](https://i.imgur.com/iJXVehw.jpeg) · [种子来源](https://www.reddit.com/r/slaythespire/comments/1kdfsnu/a_no_good_awful_map_for_silent/) |
| `5ATZ1CBFWOLV8` | 多条不对称分支跨越同一层，平行线段之间保留可辨间距。 [原图](https://i.redd.it/a5ehty273dse1.jpeg) · [种子来源](https://www.reddit.com/r/slaythespire/comments/1jphokz/ive_always_heard_of_the_wall_of_death_but_this_is/) |
| `288WT2429IRM` | 地图上部汇入固定居中首领。斜线上的重复短笔划弱于节点图案。 [原图所在投影片第 34 页](https://www.cs.cornell.edu/courses/cs5152/2025sp/lectures/lecture14/slides-14.pdf#page=34) |

项目适配采用 116 列距和 92 层距，横纵扰动上限分别为 16 和 14。纵向收紧扰动以保留至少 64 的相邻常规层中心距和 56×56 的现有热区。常规层整体可向视口中心平移最多 40，按边界裁限。首领继续居中。坐标由地图种子、相对层和列生成，运行时使用现有投影和触区。

线段沿两端的共享坐标轴排列，点距从 11 起，较长的斜线拉长点距以容纳在八个图元中。禁用线采用原版的 25% 黑色透明度，行经和可达路线保留项目墨色及满不透明度。短笔划使用现有图元。 [项目复测与视觉对照](README.md)
