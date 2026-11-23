-- Offline player policy. Reads legal choices and visible battle information.
local Combat = require('abyss_combat')
local Actor = require('abyss_actor')
local Run = require('abyss_run')
local Nodes = require('abyss_nodes')
local M = {}

local priorities = {
    silent = {noxious_fumes=98, blade_dance=92, bouncing_flask=88, poisoned_stab=86, dash=85,
        corpse_explosion=82, catalyst=78, deadly_poison=76, footwork=73, leg_sweep=70,
        dagger_spray=68, backflip=66, predator=64, piercing_wail=60, bane=59, sucker_punch=56,
        dagger_throw=55, dodge_and_roll=54, accuracy=48, adrenaline=46, flying_knee=44},
    defect = {defragment=100, electrodynamics=98, glacier=96, ball_lightning=92, cold_snap=88,
        biased_cognition=85, sunder=81, doom_and_gloom=78, charge_battery=75, chill=74,
        coolheaded=72, capacitor=69, loop=67, sweeping_beam=64, rebound=62, beam_cell=59,
        melter=56, go_for_the_eyes=55, steam_barrier=53, equilibrium=50, darkness=48},
    watcher = {tantrum=98, wallop=96, talk_to_the_hand=92, mental_fortress=88, fear_no_evil=86,
        empty_fist=85, bowling_bash=83, wheel_kick=81, cut_through_fate=77, inner_peace=75,
        crush_joints=74, sash_whip=69, third_eye=65, protect=63, rushdown=60, empty_body=57,
        consecrate=55, follow_up=53, flurry_of_blows=50, swivel=47},
}
local blockOps = {block=true, autoShields=true, stackBlock=true, halt=true,
    xBlock=true, watcherFinalSpiritShield=true, escapePlan=true}
local scaledAttackOps = {barrageDamage=true, finisherDamage=true, flechettesDamage=true,
    skewer=true, watcherFinalRagnarok=true, glassKnife=true}
local stanceEnter = {eruption=true,tantrum=true,indignation=true,crescendo=true}
local stanceExit = {vigilance=true,empty_fist=true,empty_body=true,empty_mind=true,
    inner_peace=true,tranquility=true,fear_no_evil=true}
local specialValue = {defragment=19, electrodynamics=24, biased_cognition=28,
    noxious_fumes=24, corpse_explosion=14, footwork=16, accuracy=11, mental_fortress=13,
    rushdown=11, darkness=9, chill=11, blade_dance=13, piercing_wail=8, rebound=2,
    capacitor=12, loop=12, talk_to_the_hand=15, doom_and_gloom=9, glacier=7}

function M.scoreCard(run, id)
    local count = 0
    for _, card in ipairs(run.deck) do if card.cardId == id then count = count + 1 end end
    local priority = priorities[run.character][id] or 20
    if id == 'accuracy' then
        for _, card in ipairs(run.deck) do if card.cardId == 'blade_dance' then priority = priority + 29 end end
    end
    return priority - count * 19
end

function M.reward(run)
    local slot, score = 0, 39
    for i, id in ipairs(Run.rewardOptions(run)) do
        local rank = M.scoreCard(run, id)
        if rank > score then slot, score = i, rank end
    end
    return slot
end

local function incoming(battle, target)
    local enemy = battle.enemies[target]
    if enemy.hp <= (enemy.statuses.poison or 0) then return 0 end
    local total, intent = 0, Combat.intent(battle, target)
    for _, effect in ipairs(intent and intent.effects or {}) do
        if effect.op == 'damage' then
            total = total + Combat.attackAmount(battle, enemy, battle.player, effect.value) * (effect.times or 1)
        end
    end
    return total
end

local function threats(battle)
    local byEnemy, total = {}, 0
    for i, enemy in ipairs(battle.enemies) do
        if Actor.isActive(enemy) then byEnemy[i] = incoming(battle, i); total = total + byEnemy[i] end
    end
    return byEnemy, total
end

local function statusValue(enemy, effect, threat)
    if effect.status == 'poison' and effect.value > 0 then return effect.value * 2.2 end
    if effect.status == 'weak' and (enemy.statuses.weak or 0) == 0 then return threat * .31 + 3 end
    if effect.status == 'vulnerable' and (enemy.statuses.vulnerable or 0) == 0 then return 5 end
    if effect.status == 'strength' and effect.value < 0 then return -effect.value * 4 end
    return 0
end

local function orbValue(battle, effect, threat)
    local orb = battle.orbs.balls[1]
    local focus = battle.orbs.focus or 0
    if effect.op == 'dualcastOrb' then
        if not orb then return 0 end
        if orb.kind == 'lightning' then return math.max(0, 16 + focus * 2) end
        if orb.kind == 'dark' then return (orb.stored or 6) * 1.6 end
        if orb.kind == 'frost' then return math.min(threat * 1.3, 10 + focus * 2) end
        return 5
    end
    if effect.op ~= 'channelOrb' then return 0 end
    if effect.orb == 'lightning' then return 10 + focus * 2 end
    if effect.orb == 'frost' then return 7 + math.max(0, focus) * 2 end
    if effect.orb == 'dark' then return 10 end
    return 6
end

local function attackValue(battle, definition, effect, preview, enemy)
    if effect.op == 'conditional' and effect['if'] == 'target_poison' and (enemy.statuses.poison or 0) > 0 then
        return assert(preview['then'][1].low)
    end
    if not preview or not preview.low or definition.type ~= 'attack' then return 0 end
    local times = effect.times == 'X' and battle.energy or effect.times or 1
    return preview.low * (scaledAttackOps[effect.op] and 1 or times)
end

local function otherEffectValue(battle, definition, effect, enemy, threat)
    if effect.op == 'applyStatus' then return statusValue(enemy, effect, threat) end
    if effect.op == 'draw' then return math.min(effect.value, 3) * (battle.energy > definition.cost and 3 or 1) end
    if effect.op == 'energy' then return effect.value * (#battle.hand > 2 and 7 or 2) end
    return battle.orbs and orbValue(battle, effect, threat) or 0
end

local function stats(battle, card, definition, aim, threat)
    local previews, enemy = Combat.cardPreview(battle, card, aim), battle.enemies[aim]
    local damage, block, utility, payment = 0, 0, specialValue[definition.id] or 0, 0
    for i, effect in ipairs(definition.effects) do
        local op, preview = effect.op, previews[i]
        if preview and blockOps[op] then block = block + preview.low
        elseif op == 'loseHp' then payment = payment + effect.value
        else
            damage = damage + attackValue(battle, definition, effect, preview, enemy)
            utility = utility + otherEffectValue(battle, definition, effect, enemy, threat)
        end
    end
    if definition.id == 'wallop' then block = block + math.max(0, damage - enemy.block) end
    return damage, block, utility, payment
end

local function wrathFollowup(battle, definition)
    local follow, exit = 0, false
    for _, held in ipairs(battle.hand) do
        local card = Combat.cardDefinition(battle, held)
        if card.id ~= definition.id and card.cost <= math.max(0, battle.energy - definition.cost) then
            if card.type == 'attack' then follow = follow + 1 end
            if stanceExit[card.id] and card.id ~= 'fear_no_evil' and card.id ~= 'inner_peace' then exit = true end
        end
    end
    return follow, exit
end

local function stanceValue(battle, definition, threat, damage, enemy)
    local stance = battle.player.stance
    if stance == 'Wrath' and stanceExit[definition.id] then return threat * 1.15 + 4 end
    if stance == 'Wrath' or not stanceEnter[definition.id] then return 0 end
    if damage >= enemy.hp + enemy.block then return 5 end
    local follow, exit = wrathFollowup(battle, definition)
    local exposure = math.max(0, threat * 2 - battle.player.block)
    return follow * 5 - (exit and exposure * .25 or exposure * 1.25)
end

local function scorePlay(battle, card, aim, incomingNow, threat)
    local definition = Combat.cardDefinition(battle, card)
    local enemy = battle.enemies[aim]
    local damage, block, utility, payment = stats(battle, card, definition, aim, threat)
    local beatsTarget = damage >= enemy.hp + enemy.block
    local value = math.min(damage, enemy.hp + enemy.block) + utility - payment * 2
    value = value + math.min(block, math.max(0, threat - battle.player.block)) * 1.65
    value = value + stanceValue(battle, definition, threat, damage, enemy)
    if beatsTarget then value = value + incomingNow * 1.4 + 13 end
    if definition.type == 'attack' then value = value - (enemy.statuses.sharp_hide or 0) * 1.5 end
    if definition.type == 'skill' and enemy.statuses.enrage then value = value - enemy.statuses.enrage * 5 end
    if definition.id == 'miracle' and (battle.energy > 0 or #battle.hand == 1) then return -1 end
    if payment >= battle.player.hp then return -1 end
    return value / math.max(.65, definition.costMode == 'all_energy' and battle.energy or definition.cost)
end

function M.play(run)
    local state = run.combat
    local byEnemy, threat = threats(state)
    local uid, target, best = nil, nil, 0
    for _, card in ipairs(state.hand) do
        for i = 1, #state.enemies do
            if byEnemy[i] and Combat.canPlay(state, card.uid, i) then
                local score = scorePlay(state, card, i, byEnemy[i], threat)
                if score > best then uid, target, best = card.uid, i, score end
            end
        end
    end
    return uid, target
end

local openingPotions = {strength_potion=true, dexterity_potion=true, essence_of_steel=true,
    cultist_potion=true, metallicize_potion=true, focus_potion=true}

local function drinkSelf(id, battle, boss, deficit)
    if id == 'fruit_juice' or id == 'regen_potion' and battle.player.hp <= battle.player.maxHp - 15 then return true end
    if id == 'block_potion' then return deficit >= (boss and 9 or 15) end
    if id == 'energy_potion' then return boss and battle.energy == 0 and #battle.hand >= 2 end
    return boss and battle.turn == 1 and openingPotions[id]
end

local function potionTarget(battle, byEnemy)
    local target, lowestHp
    for index, enemy in ipairs(battle.enemies) do
        local hp = enemy.hp + enemy.block
        if byEnemy[index] and (not lowestHp or hp < lowestHp) then target, lowestHp = index, hp end
    end
    return target, lowestHp
end

local function drinkAtTarget(id, turn, boss, hp, danger)
    if id == 'fire_potion' then return hp <= 20 and (boss or danger >= 6) or boss and turn >= 4 end
    return boss and turn == 1 and (id == 'poison_potion' or id == 'fear_potion')
end

function M.potion(run)
    local state = run.combat
    local byEnemy, threat = threats(state)
    local boss = run.nodeFlow.type == 'boss'
    local deficit = threat - state.player.block
    local target, lowestHp = potionTarget(state, byEnemy)
    for slot = 1, Run.potionCapacity(run) do
        local id = run.potions[slot]
        if drinkSelf(id, state, boss, deficit) then return slot end
        if target and drinkAtTarget(id, state.turn, boss, lowestHp, byEnemy[target]) then return slot, target end
    end
end

function M.chooseNode(run, map, coverage)
    local bestNode, best
    for _, node in ipairs(Nodes.available(run, map)) do
        local value = ({combat=12, event=17, shop=15, camp=31, treasure=21, elite=-50})[node.type] or 0
        if node.type == 'combat' and node.floor < 5 then value = value + 15 end
        if node.type == 'event' and run.hp < run.maxHp * .57 then value = value + 10 end
        if node.type == 'shop' and run.gold >= 75 then value = value + 20 end
        if node.type == 'camp' and not coverage.upgrade then value = value + 7 end
        if not best or value > best then bestNode, best = node, value end
    end
    return assert(bestNode, 'no legal next room')
end

function M.camp(run, map, coverage)
    if run.hp < run.maxHp * .7 and (coverage.upgrade or run.floor == 15) then return Nodes.rest(run) end
    local bestUid, best
    for _, card in ipairs(Nodes.view(run, map).node.upgradeCards) do
        local score = M.scoreCard(run, card.cardId)
        if card.cardId == 'eruption' or card.cardId == 'zap' or card.cardId == 'neutralize' then score = 110 end
        if not best or score > best then bestUid, best = card.uid, score end
    end
    if not bestUid then return Nodes.rest(run) end
    local ok, why = Nodes.upgrade(run, bestUid)
    if ok then coverage.upgrade = bestUid end
    return ok, why
end

function M.shop(run, map, done)
    local view = Nodes.view(run, map).node
    local slot, best = nil, 40
    if not done.buy then
        for i, offer in ipairs(view.cards) do
            if not offer.unavailable and not offer.sold and offer.price <= run.gold then
                local score = M.scoreCard(run, offer.id)
                if score > best then slot, best = i, score end
            end
        end
    end
    if slot then done.buy = true; return 'buy', Nodes.buyCardSlot(run, slot) end
    if not done.remove and view.removeAvailable and run.gold >= view.removePrice then
        for _, card in ipairs(run.deck) do
            local isStrike = card.cardId:match('^strike_')
            if isStrike then done.remove = true; return 'remove', Nodes.removeCard(run, card.uid) end
        end
    end
    return 'leave', Nodes.leaveShop(run)
end

return M
