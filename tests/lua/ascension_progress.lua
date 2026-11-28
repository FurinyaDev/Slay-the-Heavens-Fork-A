local Nodes = require('abyss_nodes')
local Map = require('abyss_map')
local registered, Progress = pcall(require, 'abyss_ascension_progress')
assert(registered, 'missing ascension progress rules')

local function recordVictory(section, run, map)
    local allowed, reason = Progress.qualifies(run, map)
    if not allowed then return nil,reason end
    return Progress.recordVictory(section, Progress.characterId(run), run.ascension)
end

local prepareVictory = dofile('tests/lua/support/ascension_victory_fixture.lua')
local run, map = prepareVictory(0, 'random')
assert(not recordVictory(nil, run, map), 'Act 2 Boss victory before treasure must not unlock')
assert(Nodes.enter(run, map, Map.available(map)[1].id))
assert(not recordVictory(nil, run, map), 'unfinished Act 2 treasure must not unlock')
assert(Nodes.leaveTreasure(run))

local fresh = assert(Progress.read(nil, 'ironclad'))
assert(fresh.highestUnlocked == 0 and fresh.highestCleared == nil, 'no fabricated historical clear')
local goal, result = recordVictory(nil, run, map)
assert(result == 'unlocked' and goal.highestUnlocked == 1 and goal.highestCleared == 0)
local saved, changed = Progress.merge(nil, 'ironclad', goal)
assert(changed == 'updated')
assert(Progress.read(saved, 'ironclad').highestUnlocked == 1)
assert(Progress.read(saved, 'silent').highestUnlocked == 0)
assert(Progress.read(saved, 'silent').highestCleared == nil)
assert(not recordVictory(saved, run, map), 'repeated settlement or a lower retry must not advance')
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
    assert(not recordVictory(nil, run, map))
end
run.seedSource = 'random'
run.ascension = nil
assert(not recordVictory(nil, run, map), 'legacy/flag-off run must not advance')
run.ascension = 0
local before = run.phase
for _, phase in ipairs({'defeat', 'map', 'reward'}) do
    run.phase = phase
    assert(not recordVictory(nil, run, map), phase .. ' must not advance')
end
run.phase = before
local signature = map.sourceSignature
map.sourceSignature = 'unrelated source'
assert(not recordVictory(nil, run, map), 'different map owner must not advance')
map.sourceSignature = signature
local originalSeed = run.runSeed
run.runSeed, map.runSeed = nil, nil
assert(not recordVictory(nil, run, map), 'missing run identity must not advance')
run.runSeed, map.runSeed = originalSeed, originalSeed

run.ascension = 14
assert(not recordVictory(saved, run, map), 'a locked challenge cannot advance')
local previous = {ironclad={highestUnlocked=14, highestCleared=13}}
local maximum, completion = recordVictory(previous, run, map)
assert(completion == 'max_cleared' and maximum.highestUnlocked == 14 and maximum.highestCleared == 14)
local highest = assert(Progress.merge(previous, 'ironclad', maximum))
assert(not recordVictory(highest, run, map), 'repeat A14 clear does not write')
assert(rawequal(Progress.merge(highest, 'ironclad', goal), highest), 'stale write must not regress')
assert(highest.ironclad.highestUnlocked == 14 and highest.ironclad.highestCleared == 14)
print('PASS ascension progress: formal victory, role isolation, invalid save, and monotonic updates')
