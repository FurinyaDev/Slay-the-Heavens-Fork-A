local Combat, Run = require('abyss_combat'), require('abyss_run')
local Data, Random = require('abyss_data'), require('abyss_sts_random')
Data.rules.ascensionEnabled = true

local function effect(enemy, moveId, op)
    for _, move in ipairs(enemy.intents) do
        if move.id == moveId then
            for _, entry in ipairs(move.effects) do
                if entry.op == op then return entry end
            end
        end
    end
    error(enemy.definitionId .. '/' .. moveId .. '/' .. op)
end

local function battle(id, level)
    local ids = id == 'gremlin_leader' and {'mad_gremlin', 'shield_gremlin', id} or {id}
    local streams = Run.roomStreams({runSeed = '32187654'}, 18)
    local state = assert(Combat.new(Data, {enemies = ids, roomSeed = streams.seed, roomStreams = streams,
        deck = {}, seed = 42, hp = 200, maxHp = 200, ascension = level}))
    return state, state.enemies[#ids]
end

-- Health endpoints and action values are independent V2.3.4 source vectors.
local vectors = {
    {'spheric_guardian', 20, false, {'slam', 'damage', 11}, {'frail_attack', 'damage', 11}, {'harden', 'damage', 11}},
    {'centurion', 78, 83, {'slash', 'damage', 14}, {'fury', 'damage', 7}},
    {'mystic', 50, 58, {'attack', 'damage', 9}, {'buff', 'enemyStrengthAll', 3}},
    {'snake_plant', 78, 82, {'chomp', 'damage', 8}},
    {'chosen', 98, 103, {'poke', 'damage', 6}, {'zap', 'damage', 21}, {'debilitate', 'damage', 12}},
    {'shelled_parasite', 70, 75, {'fell', 'damage', 21}, {'double_strike', 'damage', 7},
        {'life_suck', 'enemyVampireDamage', 12}},
    {'byrd', 26, 33, {'peck', 'damage', 6, 'times'}, {'swoop', 'damage', 14}},
    {'snecko', 120, 125, {'bite', 'damage', 18}, {'tail', 'damage', 10}},
    {'mugger', 50, 54, {'mug', 'damage', 11}, {'lunge', 'damage', 18}},
    {'bandit_pointy', 34, false, {'pointy_special', 'damage', 6}},
    {'bandit_leader', 37, 41, {'cross_slash', 'damage', 17}, {'agonizing_slash', 'damage', 12}},
    {'bandit_bear', 40, 44, {'maul', 'damage', 20}, {'lunge', 'damage', 10}},
    {'taskmaster', 57, 64, {'whip', 'makeTempCardInDiscard', 2}, {'whip', 'damage', 7}},
    {'book_of_stabbing', 168, 172, {'multi_stab', 'damage', 7}, {'big_stab', 'damage', 24}},
    {'gremlin_leader', 145, 155, {'encourage', 'enemyEncourage', 4}, {'stab', 'damage', 6}},
    {'collector', 300, false, {'fireball', 'damage', 21}, {'buff', 'block', 18}, {'buff', 'enemyStrengthAll', 4}},
    {'automaton', 320, false, {'flail', 'damage', 8}, {'hyper_beam', 'damage', 50},
        {'boost', 'block', 12}, {'boost', 'gainStatus', 4}},
    {'champ', 440, false, {'heavy_slash', 'damage', 18}, {'face_slap', 'damage', 14},
        {'gloat', 'gainStatus', 3}, {'anger', 'gainStatus', 9}, {'execute', 'damage', 10},
        {'defensive_stance', 'block', 18}, {'defensive_stance', 'gainStatus', 6}},
    {'torch_head', 40, 45, {'tackle', 'damage', 7}},
    {'bronze_orb', 54, 60, {'beam', 'damage', 8}},
}
for _, vector in ipairs(vectors) do
    local id, min, max = vector[1], vector[2], vector[3]
    local _, enemy = battle(id, 14)
    if max then
        assert(enemy.hpRange.min == min and enemy.hpRange.max == max, id .. ' HP range')
        assert(enemy.hp >= min and enemy.hp <= max, id .. ' sampled HP')
    else
        assert(enemy.hp == min and enemy.maxHp == min, id .. ' fixed HP')
    end
    for i = 4, #vector do
        local move = vector[i]
        assert(effect(enemy, move[1], move[2])[move[4] or 'value'] == move[3], id .. '/' .. move[1])
    end
end

local base, baseByrd = battle('byrd', 1)
local hard, hardByrd = battle('byrd', 2)
assert(effect(baseByrd, 'peck', 'damage').times == 5)
assert(effect(hardByrd, 'peck', 'damage').times == 6)
assert(baseByrd.hp == hardByrd.hp and hardByrd.hpRange.min == 25)
for _, state in ipairs({base, hard}) do
    local actor = state.enemies[1]
    for i, move in ipairs(actor.intents) do if move.id == 'peck' then actor.intentIndex = i end end
    assert(Combat.endTurn(state))
end
assert(base.player.hp == 195 and hard.player.hp == 194, 'peck hit count did not reach combat execution')

local _, a2Taskmaster = battle('taskmaster', 2)
local _, a3Taskmaster = battle('taskmaster', 3)
assert(effect(a2Taskmaster, 'whip', 'makeTempCardInDiscard').value == 1)
assert(effect(a3Taskmaster, 'whip', 'makeTempCardInDiscard').value == 2)
assert(a3Taskmaster.hpRange.min == 54)

local _, a3Champ = battle('champ', 3)
local _, a4Champ = battle('champ', 4)
assert(effect(a3Champ, 'heavy_slash', 'damage').value == 16)
assert(effect(a4Champ, 'heavy_slash', 'damage').value == 18)
assert(effect(a4Champ, 'defensive_stance', 'block').value == 15)

local leader, _ = battle('gremlin_leader', 14)
assert(leader.enemies[1].hpRange.min == 21 and leader.enemies[2].hpRange.min == 13)
local collector8 = battle('collector', 8)
local collector9 = battle('collector', 9)
for _, state in ipairs({collector8, collector9}) do assert(Combat.endTurn(state)) end
local function torchMin(state)
    for _, enemy in ipairs(state.enemies) do
        if enemy.definitionId == 'torch_head' then return enemy.hpRange.min end
    end
end
assert(torchMin(collector8) == 38 and torchMin(collector9) == 40, 'boss summon did not use A9')

local first, firstEnemy = battle('mugger', 14)
local again, againEnemy = battle('mugger', 14)
local stream = Random.snapshot(first.monsterHpRng)
local replay = Random.snapshot(again.monsterHpRng)
assert(firstEnemy.hp == againEnemy.hp and stream.counter == replay.counter
    and stream.words[1] == replay.words[1] and stream.words[2] == replay.words[2])

print('ASCENSION_ENEMIES_ACT2_PASS')
