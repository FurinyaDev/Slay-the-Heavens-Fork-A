local Run = require('abyss_run')
local Nodes = require('abyss_nodes')
local Map = require('abyss_map')
local Queue = require('abyss_encounter_queue')
local Data = require('abyss_data')
local finishRewards = dofile('tests/lua/support/finish_combat_rewards.lua')

local registered, Progress = pcall(require, 'abyss_ascension_progress')
assert(registered, 'missing ascension progress rules')

-- Reach the real terminal owner through the public Boss combat, rewards, and chest APIs.
-- Map traversal and the enemy deaths are controlled here, not a playthrough.
local defaultFlag = Data.rules.ascensionEnabled
Data.rules.ascensionEnabled = true
local run = Run.new(Data, '3', {experimental=true, campaign=true, campaignProfile='competition-two-act'},
    {ascension=0, seedSource='random'})
Data.rules.ascensionEnabled = defaultFlag
run.act = 2
run.bossInitialization, run.encounters = Queue.initializeBoss(Queue.new(run.runSeed, 2))
local map = Map.generate(run.data, run.runSeed, 2, assert(Run.freezeMapContext(run)))
while Map.available(map)[1].floor < 33 do
    assert(Map.choose(map, Map.available(map)[1].id))
end
assert(Nodes.enter(run, map, Map.available(map)[1].id))
for _, enemy in ipairs(run.combat.enemies) do enemy.hp = 0 end
assert(Run.finishCombat(run))
assert(Run.claimCardReward(run, 0))
finishRewards(run)
assert(Nodes.completeCombat(run, map))
assert(not Progress.recordVictory(nil, run, map), 'Act 2 Boss victory before treasure must not unlock')
assert(Nodes.enter(run, map, Map.available(map)[1].id))
assert(not Progress.recordVictory(nil, run, map), 'unfinished Act 2 treasure must not unlock')
assert(Nodes.leaveTreasure(run))

local fresh = assert(Progress.read(nil, 'ironclad'))
assert(fresh.highestUnlocked == 0 and fresh.highestCleared == nil, 'no fabricated historical clear')
local goal, result = Progress.recordVictory(nil, run, map)
assert(result == 'unlocked' and goal.highestUnlocked == 1 and goal.highestCleared == 0)
local saved, changed = Progress.merge(nil, 'ironclad', goal)
assert(changed == 'updated')
assert(Progress.read(saved, 'ironclad').highestUnlocked == 1)
assert(Progress.read(saved, 'silent').highestUnlocked == 0)
assert(Progress.read(saved, 'silent').highestCleared == nil)
assert(not Progress.recordVictory(saved, run, map), 'repeated settlement or a lower retry must not advance')
assert(rawequal(Progress.merge(saved, 'ironclad', goal), saved), 'duplicate absolute write is a no-op')

local damaged = {ironclad={highestUnlocked=3, highestCleared=0}}
local none, errorReason = Progress.read(damaged, 'ironclad')
assert(none == nil and errorReason == 'invalid_ascension_save')
assert(not Progress.merge(damaged, 'ironclad', goal), 'do not overwrite a damaged record')
assert(not Progress.merge(false, 'ironclad', goal), 'non-table save cannot be treated as missing')
assert(not Progress.merge(saved, 'silent', {highestUnlocked=15, highestCleared=14}))
local twoRoles = assert(Progress.merge(saved, 'silent', {highestUnlocked=3, highestCleared=2}))
assert(Progress.read(twoRoles, 'ironclad').highestUnlocked == 1)
assert(Progress.read(twoRoles, 'silent').highestCleared == 2)
assert(Progress.read(saved, 'silent').highestCleared == nil, 'save update must not mutate input')

for _, source in ipairs({'player', 'internal'}) do
    run.seedSource = source
    assert(not Progress.recordVictory(nil, run, map))
end
run.seedSource = 'random'
run.ascension = nil
assert(not Progress.recordVictory(nil, run, map), 'legacy/flag-off run must not advance')
run.ascension = 0
local before = run.phase
for _, phase in ipairs({'defeat', 'map', 'reward'}) do
    run.phase = phase
    assert(not Progress.recordVictory(nil, run, map), phase .. ' must not advance')
end
run.phase = before
local signature = map.sourceSignature
map.sourceSignature = 'unrelated source'
assert(not Progress.recordVictory(nil, run, map), 'different map owner must not advance')
map.sourceSignature = signature
local originalSeed = run.runSeed
run.runSeed, map.runSeed = nil, nil
assert(not Progress.recordVictory(nil, run, map), 'missing run identity must not advance')
run.runSeed, map.runSeed = originalSeed, originalSeed

run.ascension = 14
assert(not Progress.recordVictory(saved, run, map), 'a locked challenge cannot advance')
local previous = {ironclad={highestUnlocked=14, highestCleared=13}}
local maximum, completion = Progress.recordVictory(previous, run, map)
assert(completion == 'max_cleared' and maximum.highestUnlocked == 14 and maximum.highestCleared == 14)
local highest = assert(Progress.merge(previous, 'ironclad', maximum))
assert(not Progress.recordVictory(highest, run, map), 'repeat A14 clear does not write')
assert(rawequal(Progress.merge(highest, 'ironclad', goal), highest), 'stale write must not regress')
assert(highest.ironclad.highestUnlocked == 14 and highest.ironclad.highestCleared == 14)
print('PASS ascension progress: formal victory, role isolation, invalid save, and monotonic updates')
