local Run = require('abyss_run')
local CardPool = require('abyss_card_pool')
local Gold = require('abyss_gold_rewards')
local Random = require('abyss_sts_random')
local Data = require('abyss_data')
local enabledData = require('abyss_copy').copy(Data)
enabledData.rules.ascensionEnabled = true

local function newRun(seed, level)
    if level == nil then return Run.new(Data, seed) end
    return Run.new(enabledData, seed, nil, {ascension=level, seedSource='internal'})
end

local function equal(actual, expected)
    assert(actual == expected, tostring(actual) .. ' ~= ' .. tostring(expected))
end

local function sameRandom(actual, expected)
    local left, right = Random.snapshot(actual), Random.snapshot(expected)
    equal(left.counter, right.counter)
    for index, word in ipairs(left.words) do equal(word, right.words[index]) end
end

local function checkCardRewards(seed, act, baseline, reduced)
    local original = newRun(seed)
    original.act = act
    local originalIds, originalRng, originalOffset, originalUpgrades = CardPool.prepareRewards(original)
    for index, expected in ipairs(baseline) do equal(originalUpgrades[index], expected) end
    for _, level in ipairs({0, 11, 12}) do
        local run = newRun(seed, level)
        run.act = act
        local before = Random.cloneState(run.cardRng)
        local ids, rng, offset, upgrades = CardPool.prepareRewards(run)
        for index, expected in ipairs(level == 12 and reduced or baseline) do
            equal(upgrades[index], expected)
            equal(ids[index], originalIds[index])
        end
        equal(offset, originalOffset)
        sameRandom(rng, originalRng)
        sameRandom(run.cardRng, before)
    end
end

local none = {false, false, false}
checkCardRewards('3', 1, none, none)
checkCardRewards('3', 2, {true, false, false}, none)
checkCardRewards('1', 2, {false, false, true}, {false, false, true})
for act = 3, 4 do
    checkCardRewards('1', act, {false, true, true}, {false, false, true})
end
print('ok A12 halves upgrade chance without changing reward identities or RNG')

local function controlledGoldRandom(value)
    -- XS128 state with a=0 produces value in the range 0..10 after one draw.
    return Random.restore({words={'0000000000000000', string.format('%016x', value)}, counter=0})
end

local discounted = {71, 72, 73, 74, 74, 75, 76, 77, 77, 78, 79}
for index, expected in ipairs(discounted) do
    local original = controlledGoldRandom(index - 1)
    local owner = {miscRng=Random.cloneState(original), treasureRng=Random.cloneState(original), ascension=12}
    local base, baseKey, baseNext = Gold.prepare('boss', owner)
    owner.ascension = 13
    local actual, key, nextRng = Gold.prepare('boss', owner)
    equal(base, 94 + index)
    equal(actual, expected)
    equal(key, 'miscRng')
    equal(key, baseKey)
    equal(nextRng.counter, 1)
    sameRandom(nextRng, baseNext)
    sameRandom(owner.miscRng, original)
    sameRandom(owner.treasureRng, original)
    equal(Gold.prepare('normal', owner), 9 + index)
    equal(Gold.prepare('elite', owner), 24 + index)
end
print('ok A13 rounds all eleven source gold offers and preserves the original stream')

local run = newRun('42', 13)
assert(Run.obtainRelic(run, 'golden_idol'))
run.floor = 16
assert(Run.startRoomCombat(run, 'boss'))
run.combat.miscRng = controlledGoldRandom(3)
for _, enemy in ipairs(run.combat.enemies) do enemy.hp = 0 end
local originalGold = run.gold
assert(Run.finishCombat(run))
equal(run.rewards.gold, 93) -- round(98 * .75) + round(74 * .25)
equal(run.gold, originalGold)
assert(Run.claimGoldReward(run))
equal(run.gold, originalGold + 93)
print('ok formal A13 Boss reward freezes Golden Idol after the base gold reduction')
