local Run = require('abyss_run')
local Nodes = require('abyss_nodes')
local Map = require('abyss_map')
local Queue = require('abyss_encounter_queue')
local Data = require('abyss_data')
local finishRewards = dofile('tests/lua/support/finish_combat_rewards.lua')

local function newRun(level, source)
    -- Reach the real terminal owner through the public Boss combat, rewards, and chest APIs.
    -- Map traversal and the enemy deaths are controlled here, not a playthrough.
    local defaultFlag = Data.rules.ascensionEnabled
    Data.rules.ascensionEnabled = true
    local run = Run.new(Data, '3', {experimental=true, campaign=true, campaignProfile='competition-two-act'},
        {ascension=level, seedSource=source})
    Data.rules.ascensionEnabled = defaultFlag
    return run
end

return function(level, source, existingRun)
    local run = existingRun or newRun(level, source)
    run.act, run.floor, run.phase, run.nodeFlow = 2, 17, 'map', nil
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
    return run, map
end
