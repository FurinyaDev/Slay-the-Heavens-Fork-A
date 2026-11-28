local Combat, Run = require('abyss_combat'), require('abyss_run')
local Data = require('abyss_data')
local Random = require('abyss_sts_random')

local function effect(enemy, intentId, operation)
    for _, intent in ipairs(enemy.intents) do
        if intent.id == intentId then
            for _, item in ipairs(intent.effects) do
                if item.op == operation then return item end
            end
        end
    end
    error(enemy.definitionId .. '/' .. intentId .. '/' .. operation)
end

local function battle(id, level)
    local streams = Run.roomStreams({runSeed = '32187654'}, 1)
    local state = Combat.new(Data, {enemies = {id}, roomSeed = streams.seed, roomStreams = streams,
        seed = 42, deck = {}, ascension = level})
    return state, state.enemies[1]
end

local _, disabled = battle('jaw_worm', 14)
assert(effect(disabled, 'jaw_worm_1', 'damage').value == 11)
assert(package.loaded.abyss_ascension_enemies == nil, 'disabled loaded enemy variants')

Data.rules.ascensionEnabled = true
local _, zero = battle('jaw_worm', 0)
assert(effect(zero, 'jaw_worm_1', 'damage').value == 11)
assert(package.loaded.abyss_ascension_enemies == nil, 'A0 loaded enemy variants')

local _, a1 = battle('jaw_worm', 1)
assert(effect(a1, 'jaw_worm_1', 'damage').value == 11)
local _, a2 = battle('jaw_worm', 2)
assert(effect(a2, 'jaw_worm_1', 'damage').value == 12, 'A2 chomp')
assert(effect(a2, 'jaw_worm_3', 'gainStatus').value == 4, 'A2 bellow')
assert(a2.hpRange.min == 40 and a2.hpRange.max == 44)
local _, a7 = battle('jaw_worm', 7)
assert(a7.hpRange.min == 42 and a7.hpRange.max == 46)
assert(effect(a7, 'jaw_worm_1', 'damage').value == 12)

local _, a2Sentry = battle('sentry', 2)
local _, a3Sentry = battle('sentry', 3)
local _, a8Sentry = battle('sentry', 8)
assert(effect(a2Sentry, 'sentry_1', 'damage').value == 9)
assert(effect(a3Sentry, 'sentry_1', 'damage').value == 10)
assert(a3Sentry.hpRange.min == 38 and a3Sentry.hpRange.max == 42)
assert(a8Sentry.hpRange.min == 39 and a8Sentry.hpRange.max == 45)

local _, a3Boss = battle('guardian', 3)
local _, a4Boss = battle('guardian', 4)
local _, a9Boss = battle('guardian', 9)
assert(effect(a3Boss, 'guardian_2', 'damage').value == 32)
assert(effect(a4Boss, 'guardian_2', 'damage').value == 36)
assert(effect(a4Boss, 'guardian_6', 'damage').value == 10)
assert(a4Boss.hp == 240 and a4Boss.statuses.mode_shift == 30)
assert(a9Boss.hp == 250 and a9Boss.statuses.mode_shift == 35)

local run = Run.new(Data, '42', nil, {ascension = 14, seedSource = 'player'})
assert(Run.startCombat(run, 'jaw_solo'))
local owner = run.combat
assert(effect(owner.enemies[1], 'jaw_worm_1', 'damage').value == 12)
local catalog = owner.catalog.enemies.jaw_worm
assert(effect(catalog, 'jaw_worm_1', 'damage').value == 11 and catalog.hpRange.min == 40)
local summoned = Combat.summonEnemies(owner, {{id = 'shield_gremlin', x = 0, y = 0}})[1]
assert(effect(summoned, 'shield_gremlin_2', 'damage').value == 8 and summoned.hpRange.min == 13)
assert(effect(summoned, 'shield_gremlin_1', 'block').value == 8)

local slimeBattle, slime = battle('slime_boss', 14)
assert(slime.maxHp == 150 and effect(slime, 'slam', 'damage').value == 38)
local hpDraws = slimeBattle.monsterHpRng.counter
Combat.damage(slimeBattle, slimeBattle.player, slime, 90, true)
assert(Combat.endTurn(slimeBattle))
assert(slimeBattle.monsterHpRng.counter == hpDraws, 'split drew an implicit HP roll')
local children = 0
for _, child in ipairs(slimeBattle.enemies) do
    if child.definitionId == 'spike_slime_l' or child.definitionId == 'acid_slime_l' then
        children = children + 1
        assert(child.hp == 60 and child.maxHp == 60, 'split HP must come from the parent')
        local expected = child.definitionId == 'spike_slime_l' and 18 or 12
        assert(effect(child, child.definitionId .. '_1', 'damage').value == expected)
    end
end
assert(children == 2)

local eventRun = Run.new(Data, '42', {campaign = true, experimental = true}, {ascension = 14, seedSource = 'player'})
local encounter = assert(Run.prepareEventEncounter(eventRun, 'Lagavulin Event', 7))
local prepared = encounter.prepared
assert(prepared.ascension == 14 and prepared.actors[1].hpRange.min == 112)
assert(effect(prepared.actors[1], 'attack', 'damage').value == 20)
local streams = Run.roomStreams(eventRun, 7)
local options = {roomSeed = streams.seed, roomStreams = streams, preparedEncounter = prepared, ascension = 14}
local staged = Combat.new(Data, options)
assert(staged.enemies[1].hp == prepared.actors[1].hp)
assert(staged.monsterHpRng.counter == Random.restore(prepared.monsterHpRng).counter)
options.ascension = 3
assert(not pcall(Combat.new, Data, options), 'event actors accepted with a mismatched difficulty')

print('ASCENSION_ENEMIES_ACT1_PASS')
