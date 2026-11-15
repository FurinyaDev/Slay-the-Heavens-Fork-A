# PC输入与末击结算：本轮定向诊断

仅源码/真实Lua与mock原生Host诊断，未触GUI。以下序列来自现有回归夹具的可控实验，**不是用户实际PC事件记录**，不将可复现的采样边界缺陷冒充PC12全部根因。

## 快速甩牌：已找到最小可实施缺陷

release基线`36b9b157`的既有`tests/lua/hand_flick_intent.lua`用3个Drag样本，在50ms内上移75画布单位，能打出无目标防御牌。将相同起点、终点和总时长约简为1个Drag，当前实现算出竖直速度0，未打出。原因是`abyss_battle_card_bindings.beginCardDrag`没有将真实Down起点送进既有`Intent`采样历史；后续Drag和Up坐标相同时，历史没有位移差。

单变量内存实验：仅在`CardInput.begin`后调用既有`Intent.sample(g,g.sx,g.sy)`，稀疏同路径速度由0变1500，能打出且仅扣1能量；200ms慢抬与横扫均不误出。初版慢抬0.4s触发长按详情，探针错误读取已取消gesture，已保留失败输出；改用未触发长按的0.2s作为慢速对照，没有改生产规则或阈值。原始实验脚本`sparse-flick-probe.lua`；成功输出目录`diagnosis-sparse-v2/`。

主线程已明确批准独立修复，工作树`.worktrees/release-pc-sparse-flick-1115`，基于origin/release。生产最小变化为bindings读取既有Intent，并在真实Down初始化`CardInput.begin`后采样起点；没有预输入、新快捷键、阈值或busy门禁调整。新增真实Host回归先确认RED：`sparse_card_flick.lua:18`“a fast upward release with zero or one Drag must play exactly one defend”；同轮安全组通过。新树最初缺Fengari是环境失败，复制现有锁定依赖后才取得该真实RED，不能混称两者。

## 末击死亡→奖励：尚无新的源码缺陷证明

本轮直接加载release现树生成模块、绕过历史source投影运行三份现有夹具：

- `drag_response.lua`：3/3，指针跟随不重算手牌、目标变化预览、取消/换战身份通过。
- `hand_flick_intent.lua`：4组，通过既有密集上甩/慢抬/横扫/方向规则。
- `original_monster_death.lua`：normal/fast源死亡时钟、alpha、独立动作时钟、末敌计时完成后victory gate及幂等死亡通过。

输出：`diagnosis-release/tests-lua-*.lua.log`。这些只证明已覆盖的构造状态与逻辑顺序；不证明用户末击现场闪屏不存在。源码同时核到：`abyss_battle_render_state.syncRewardOwner`要求`not owner.busy`才显示reward；`abyss_feedback.advanceQueue`在victory前等待`pendingMonsterExit()`。不能据原始转写的“先闪再死”擅改已成立的计时/忙碌门禁。下一步仍需当前正式候选身份、末击前后逐帧图/视频、每帧ready与反馈阶段/Run.phase日志，核对页面遮罩、反馈死亡、victory与奖励揭幕实际先后。

## 他人脏树检查

`.worktrees/battle-input-followup-1115`改的是TASK-76：详情打开时退休旧动作权限、牌堆Down/Click门禁恢复，并非上述稀疏上甩问题。其来源闭包已有官方牌堆epoch RED，未提交成果不可直接移植或覆盖。`.worktrees/pc-battle-closeout-1115`保留取消提示、分裂、旧死亡测试相关成果；这不意味着末击现场已验收。此轮未改这两树。

PC12（含连续操作/busy与系统负载）、PC13、PC20继续未完成。诊断不是DIAGNOSED即产品验收，仍需同候选官方ready、PC与受影响手机路径和容量证据。

## 独立修复交付

修复已保存为`e279a1bd`（feat/release-pc-sparse-flick-1115），仅5文件111新增行，其中生产3行；未推送。12有效+8安全Host场景GREEN，既有flick/mobile release/gesture注册通过，架构351/1989、质量6165/6165 report-only、Luacheck零新增6历史/2214测量通过。历史drag-click的6来源/注册合同通过；原冻结运行时回放在环境修正后仍超过原30000ms总期限，cases1、2已PASS、phase=lua，其余连带未运行成功。此项如实保留未通过，不改旧断言或时限。Git内证据`docs/qa/playtests/pc-sparse-flick-20261115.md`。
