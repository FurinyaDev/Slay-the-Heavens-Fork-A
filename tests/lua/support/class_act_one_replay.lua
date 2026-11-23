-- Local controller replay using real Host selection and public Run/Nodes commands.
package.path = 'src/lua/?.lua;build/lua/?.lua;' .. package.path
local F = dofile('tests/lua/support/game_ui_fixture.lua')
local Policy = dofile('tests/lua/support/class_act_one_policy.lua')
local EventCards = dofile('scripts/m3-event-card-policy.lua')
local RelicChoices = dofile('scripts/m3-relic-choice-policy.lua')
local Run, Nodes, Combat = require('abyss_run'), F.Nodes, F.Combat
local Pending = require('abyss_relic_pending')

local function command(label, ok, reason)
    assert(ok, label .. ': ' .. tostring(reason))
end

local function open(character, seed)
    local root = F.Viewport.apply(F.control({children=F.Layout}), 1280, 720)
    local ui = F.GameUI.new(root, F.Data, F.Presentation, 'click', {
        seed=tostring(seed), campaign=true, campaignProfile='full-source', imageSource='static', color=function() return {} end,
    })
    command('select and confirm ' .. character, F.start(ui, character))
    local run = assert(ui.run)
    assert(run.character == character and run.campaignProfile == 'full-source' and ui.mode == 'map')
    assert(ui.map.floor == 0 and run.act == 1 and run.combat == nil)
    return ui, run, ui.map
end

local function takeUids(candidates, count)
    local uids = {}
    for i = 1, count do uids[i] = assert(candidates[#candidates - i + 1], 'missing eligible card') end
    return uids
end

local function discardChoices(run, pending)
    local hand = {}
    local allowed = {}
    for _, uid in ipairs(pending.handUids) do allowed[uid] = true end
    for _, held in ipairs(run.combat.hand) do if allowed[held.uid] then hand[#hand + 1] = held end end
    table.sort(hand, function(a, b)
        local x, y = Policy.scoreCard(run, a.cardId), Policy.scoreCard(run, b.cardId)
        if a.cardId == 'tactician' or a.cardId == 'reflex' then x = -999 end
        if b.cardId == 'tactician' or b.cardId == 'reflex' then y = -999 end
        if x ~= y then return x > y end
        return a.uid < b.uid
    end)
    local uids = {}
    for i = 1, pending.count do uids[i] = assert(hand[#hand - i + 1]).uid end
    return uids
end

local function battleChoice(run, coverage)
    local state, generation = run.combat, run.combatGeneration
    local discard, pile, hand = state.pendingDiscard, state.pendingPileChoice, state.pendingHandChoice
    local scry, choice = state.pendingScry, state.pendingChoice
    if discard then
        command('discard', Run.chooseDiscard(run, discardChoices(run, discard), discard.token, generation))
        coverage.discard = true
    elseif pile then
        command('pile', Run.choosePile(run, takeUids(pile.candidateUids, pile.count), pile.token, generation))
    elseif hand then
        command('hand', Run.chooseHand(run, takeUids(hand.handUids, hand.count), hand.token, generation))
    elseif scry then
        command('scry', Run.chooseScry(run, {}, scry.token, generation))
    elseif choice then
        command('card choice', Run.chooseCard(run, choice.token, choice.multiple and 0 or choice.uids[1]))
    else return false end
    return true
end

local function battle(run, coverage)
    if battleChoice(run, coverage) then return end
    local slot, aim = Policy.potion(run)
    if slot then command('drink potion ' .. tostring(run.potions[slot]), Run.usePotion(run, slot, aim)); return end
    local uid, target = Policy.play(run)
    if not uid then command('end turn', Run.endTurn(run)); return end
    local before = run.combat
    local nextEvent = #before.events + 1
    command('play', Run.play(run, uid, target))
    coverage.played = coverage.played + 1
    for i = nextEvent, #before.events do
        local record = before.events[i]
        if record.kind == 'orb_effect' or record.kind == 'stance' then coverage[record.kind] = true end
    end
end

local function rewards(run, coverage)
    local rewards = run.rewards
    if rewards.goldClaimed == false then command('reward gold', Run.claimGoldReward(run)) end
    if rewards.stolenGold and not rewards.stolenGold.claimed then command('reward stolen gold', Run.claimStolenGoldReward(run)) end
    local potion = rewards.potion
    if potion and not potion.resolved then
        if potion.unavailable or Run.potionCount(run) >= Run.potionCapacity(run) then
            command('skip potion', Run.skipPotionReward(run))
        else command('reward potion', Run.claimPotionReward(run)) end
    end
    if not rewards.cardResolved then
        local slot, count = Policy.reward(run), #run.deck
        command('reward card', Run.claimCardReward(run, slot))
        if #run.deck > count then coverage.reward = coverage.reward + 1 end
        return
    end
    command('leave rewards', Run.leaveCombatRewards(run))
end

local function flipStoneCards(run, map)
    local view = Nodes.view(run, map).node.event.match
    if view.phase == 'play' then
        for _, slot in ipairs(view.slots) do
            if slot.enabled then return Nodes.chooseEvent(run, 'flip', slot.token) end
        end
    elseif view.resolveToken then return Nodes.chooseEvent(run, 'resolve', view.resolveToken)
    elseif view.completionToken then return Nodes.chooseEvent(run, 'finish', view.completionToken) end
    return false, 'missing visible match command'
end

local function eventOption(run, flow)
    local selected, best
    local ranks = {leave=10, proceed=9, continue=9, pray=12, heal=run.hp < run.maxHp - 18 and 11 or 0}
    if flow.event.id == 'goop' and run.hp > 35 then ranks.gather = 11 end
    for _, option in ipairs(Nodes.eventOptions(run, flow)) do
        local score = ranks[option.choice] or 0
        if option.enabled ~= false and not option.disabled and (not best or score > best) then
            selected, best = option, score
        end
    end
    return selected
end

local function event(run, map, flow)
    local selected = eventOption(run, flow)
    if not selected and flow.event.id == 'match_game' then
        command('match game', flipStoneCards(run, map))
        return
    end
    assert(selected, 'event without an enabled choice: ' .. flow.event.id)
    local uid = EventCards.uid(run, map, selected, Policy.scoreCard)
    if selected.picker == 'purify' and not uid then
        for _, card in ipairs(Nodes.view(run, map).node.purgeCards) do
            if not uid or card.cardId:match('^strike_') then uid = card.uid end
        end
    end
    command('event ' .. flow.event.id .. '/' .. selected.choice, Nodes.chooseEvent(run, selected.choice, uid))
end

local function closeCombat(run, map, flow, coverage)
    command('close combat room', Nodes.completeCombat(run, map))
    if run.lastResult.outcome == 'victory' then coverage.victories = coverage.victories + 1 end
    if flow.type == 'boss' then
        assert(run.lastResult.outcome == 'victory' and run.floor == 16)
        coverage.boss = assert(flow.encounterId)
        coverage.bossHp = run.hp
    end
end

local function room(run, map, coverage, roomCommands)
    local flow = run.nodeFlow
    local kind = flow.type
    if flow.eventCombat or kind == 'combat' or kind == 'elite' or kind == 'boss' then closeCombat(run, map, flow, coverage)
    elseif kind == 'event' then event(run, map, flow)
    elseif kind == 'shop' then
        local action, ok, why = Policy.shop(run, map, roomCommands)
        command('shop ' .. action, ok, why)
        if action == 'buy' or action == 'remove' then coverage[action] = (coverage[action] or 0) + 1 end
    elseif kind == 'camp' then
        if flow.restReward then command('rest reward', Nodes.claimRestReward(run, 0))
        else command('camp', Policy.camp(run, map, coverage)) end
    elseif kind == 'treasure' then command('leave treasure', Nodes.leaveTreasure(run))
    else error('unknown room type: ' .. tostring(kind)) end
end

local function loadout(run)
    local fields = {}
    for _, card in ipairs(run.deck) do fields[#fields + 1] = table.concat({card.uid, card.cardId, tostring(card.upgraded)}, ':') end
    return table.concat(fields, '|')
end

local function preservedResources(run)
    local values = {loadout(run), run.gold, run.nextDeckUid, table.concat(run.relics, ',')}
    for slot = 1, Run.potionCapacity(run) do values[#values + 1] = run.potions[slot] or '-' end
    return table.concat(values, '/')
end

local function verifyOpeningBattle(run)
    local state = assert(run.combat)
    assert(state.turn == 1 and state.energy == 3)
    if run.character == 'silent' then
        assert(#state.hand >= 7 and not state.player.statuses.noxious_fumes and not state.player.statuses.footwork)
    elseif run.character == 'defect' then
        assert(state.orbs.slots == 3 and #state.orbs.balls == 1 and state.orbs.balls[1].kind == 'lightning')
        assert(not state.player.statuses.focus and not state.player.statuses.electrodynamics)
    else
        assert(state.player.stance == 'Neutral' and not state.player.statuses.mantra)
        local miracles = 0
        for _, card in ipairs(state.hand) do if card.cardId == 'miracle' then miracles = miracles + 1 end end
        assert(miracles == 1)
    end
end

local function enterActTwo(ui, run, map, coverage, seed)
    assert(coverage.boss and run.pendingAct == 2 and map.floor == 17)
    assert(coverage.reward > 0 and coverage.buy and coverage.remove and coverage.upgrade)
    local mechanic = ({silent='discard',defect='orb_effect',watcher='stance'})[run.character]
    assert(coverage[mechanic], 'class mechanic not exercised: ' .. mechanic)
    local before = preservedResources(run)
    ui:refresh()
    command('Host advances Act I', ui:advanceAct())
    assert(run.act == 2 and map.act == 2 and run.phase == 'map' and preservedResources(run) == before)
    local node = assert(Nodes.available(run, map)[1])
    assert(node.floor == 18 and node.type == 'combat')
    command('enter first Act II battle', Nodes.enter(run, map, node.id))
    verifyOpeningBattle(run)
    print('CLASS_ACT_ONE_PASS', run.character, seed, coverage.boss, coverage.bossHp,
        coverage.victories, coverage.reward, coverage.buy, coverage.remove, coverage.upgrade, coverage.played, run.encounterId)
end

local function enterNextRoom(run, map, coverage)
    local node = Policy.chooseNode(run, map, coverage)
    command('enter ' .. node.id, Nodes.enter(run, map, node.id))
    local flow = run.nodeFlow
    print('CLASS_ROOM', run.character, run.runSeed, run.floor, flow.type, run.hp,
        flow.encounterId or flow.event and flow.event.id or '')
end

local function replay(character, seed)
    local ui, run, map = open(character, seed)
    local coverage = {victories=0, reward=0, played=0}
    local roomCommands = {}
    for _ = 1, 1800 do
        local token = RelicChoices.choose(run, Policy.scoreCard)
        if token then command('required relic choice', Pending.resolve(run, token))
        elseif run.phase == 'defeat' then error(character .. ' defeated at floor ' .. run.floor)
        elseif run.phase == 'act_transition' then return enterActTwo(ui, run, map, coverage, seed)
        elseif run.phase == 'combat' then battle(run, coverage)
        elseif run.phase == 'reward' then rewards(run, coverage)
        elseif run.nodeFlow and not run.nodeFlow.complete then room(run, map, coverage, roomCommands)
        else enterNextRoom(run, map, coverage); roomCommands = {} end
    end
    error('class replay command limit: ' .. character .. ' ' .. seed .. ' floor=' .. run.floor)
end

replay(assert(CLASS_REPLAY_CHARACTER), 19)
