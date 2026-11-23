-- Offline input playback. All state changes go through the public commands.
local Run=require('abyss_run')
local Nodes=require('abyss_nodes')
local Pending=require('abyss_relic_pending')

local function relicChoice(run,_,step)
 local view=assert(Pending.view(run),'missing mandatory relic choice')
 assert(view.key==step.key,'unexpected mandatory relic choice owner')
 for _,row in ipairs(view.rows)do
  local token=row.token
  if token.kind==step.kind and token.uid==step.uid and token.choice==step.choice and token.index==step.index then
   return Pending.resolve(run,token,Run)
  end
 end
 return false,'recorded_relic_choice_unavailable'
end

local function selectCard(run,_,step)
 local choice=assert(run.combat.pendingChoice,'missing recorded card choice')
 assert(choice.op==step.op,'unexpected card choice operation')
 return Run.chooseCard(run,choice.token,step.uid)
end

local function selectHand(run,_,step)
 local choice=assert(run.combat.pendingHandChoice,'missing recorded hand choice')
 assert(choice.mode==step.mode,'unexpected hand choice mode')
 return Run.chooseHand(run,{step.uid},choice.token,run.combatGeneration)
end

local function playCard(run,_,step)
 for _,card in ipairs(run.combat.hand)do
  if card.uid==step.uid and card.cardId==step.cardId then return Run.play(run,step.uid,step.target) end
 end
 return false,'recorded_card_unavailable'
end

local function selectRewardCard(run,_,step)
 local options=Run.rewardOptions(run)
 if #options~=#step.offers then return false,'recorded_card_reward_mismatch' end
 for index,id in ipairs(options)do
  if id~=step.offers[index] then return false,'recorded_card_reward_mismatch' end
 end
 return Run.claimCardReward(run,step.index)
end

local function selectEvent(run,_,step)
 local event=run.nodeFlow.event
 if not event or event.id~=step.event or event.stage~=step.stage then return false,'recorded_event_mismatch' end
 return Nodes.chooseEvent(run,step.choice,step.uid)
end

local M={}
function M.potionReward(run)
 if run.rewards.potion.unavailable or Run.potionCount(run)>=run.data.rules.player.potionSlots then
  return Run.skipPotionReward(run)
 end
 return Run.claimPotionReward(run)
end

local commands={
 enter=function(run,map,step)return Nodes.enter(run,map,step.node)end,
 play=playCard,
 end_turn=Run.endTurn,
 choose_card=selectCard,
 choose_hand=selectHand,
 potion=function(run,_,step)
  if run.potions[step.slot]~=step.id then return false,'recorded_potion_mismatch' end
  return Run.usePotion(run,step.slot,step.target)
 end,
 gold=Run.claimGoldReward,
 potion_reward=M.potionReward,
 card_reward=selectRewardCard,
 stolen_gold=Run.claimStolenGoldReward,
 leave_rewards=Run.leaveCombatRewards,
 complete_combat=Nodes.completeCombat,
 event=selectEvent,
 claimTreasure=Nodes.claimTreasure,
 open_boss_treasure=Nodes.openTreasure,
 claimBossTreasure=function(run,_,step)return Nodes.claimBossTreasure(run,step.index)end,
 rest=Nodes.rest,
 upgrade=function(run,_,step)return Nodes.upgrade(run,step.uid)end,
 buyCardSlot=function(run,_,step)return Nodes.buyCardSlot(run,step.slot)end,
 removeCard=function(run,_,step)return Nodes.removeCard(run,step.uid)end,
 leaveShop=Nodes.leaveShop,
 mandatory_relic_choice=relicChoice,
 advance_act=function(run,map)
  if run.act>=3 then return false,'offline_campaign_ends_after_act3' end
  return Nodes.advanceAct(run,map)
 end,
}

function M.command(run,map,step)
 if run.floor~=step.floor or run.phase~=step.phase then return false,'recorded_room_mismatch' end
 local dispatch=commands[step.label]
 if not dispatch then return false,'unknown_replay_command' end
 return dispatch(run,map,step.details or {})
end

return M
