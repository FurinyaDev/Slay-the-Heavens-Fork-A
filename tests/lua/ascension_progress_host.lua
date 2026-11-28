local F = dofile('tests/lua/support/game_ui_fixture.lua')
local prepareVictory = dofile('tests/lua/support/ascension_victory_fixture.lua')
local Map = require('abyss_map')
local Nodes = require('abyss_nodes')

local entropyCalls, settlementCalls = 0, 0
local function createHost(enabled, save)
    local data = require('abyss_copy').copy(F.Data)
    data.rules.ascensionEnabled = enabled
    local canvas = F.control({children=F.Layout})
    local root = F.Viewport.apply(canvas, 1280, 720)
    return F.GameUI.new(root,data,F.Presentation,'click',{
        newSeed=function()entropyCalls=entropyCalls+1; return 3 end,
        settle=function(victory)
            assert(victory)
            settlementCalls=settlementCalls+1
            return true
        end,
        campaign=true, campaignProfile='competition-two-act', playerSave=save,
        imageSource='static', color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end,
    })
end

local function selectTraveler(host)
    assert(host:start() and host:selectCharacter('traveler'))
end

local function finishTreasure(host)
    local run, map = prepareVictory(nil,nil,host.run)
    host.map, host.mapUI.map, host.nodeUI.map = map, map, map
    assert(Nodes.enter(run, map, Map.available(map)[1].id))
    host:refresh()
    assert(host.nodeUI:press('back'))
    assert(host.run==run and run.phase=='victory' and host.mode=='victory')
end

local disabled = createHost(false, {
    readAscension=function()error('flag-off read')end,
    mergeAscension=function()error('flag-off write')end,
})
selectTraveler(disabled)
assert(disabled:confirmCharacter())
assert(package.loaded.abyss_game_ascension_flow==nil, 'legacy host loaded the progress flow')
assert(entropyCalls==1 and disabled.run.ascension==nil)

-- This port exercises the actual host lifecycle, without claiming platform persistence.
local Progress = require('abyss_ascension_progress')
local section = {ironclad={highestUnlocked=1, highestCleared=0}}
local reads, writes = 0, 0
local save = {
    readAscension=function() reads=reads+1; return section end,
    mergeAscension=function(characterId, goal)
        assert(characterId=='ironclad' and goal.highestUnlocked==2 and goal.highestCleared==1)
        writes=writes+1
        if writes<3 then return false end
        local nextSection, status = Progress.merge(section, characterId, goal)
        assert(nextSection, status)
        section = nextSection
        return true,status
    end,
}
local random = createHost(true, save)
selectTraveler(random)
local ok, reason = random:confirmCharacter({ascension=2})
assert(not ok and reason=='ascension_locked' and entropyCalls==1 and random.run==nil)
local accepted, why = random:confirmCharacter({ascension=1})
assert(accepted, why)
assert(random.run.ascension==1 and random.run.seedSource=='random' and entropyCalls==2)
finishTreasure(random)
assert(writes==1 and settlementCalls==0, 'terminal command creates the progress intent')
random:refresh()
assert(writes==1, 'rendering never writes progress')
assert(random:start() and writes==2 and random.characterOpen, 'temporary write failure cannot prevent a new run')
assert(random:selectCharacter('traveler'))
assert(random:confirmCharacter({ascension=1,seed='3'}))
assert(random.run.seedSource=='player' and entropyCalls==2)
finishTreasure(random)
assert(writes==2, 'player seed victory does not create another progress target')
assert(random:settle() and writes==3 and settlementCalls==1)
assert(section.ironclad.highestUnlocked==2, 'pending progress survived replacing its original run')
assert(not random:settle() and writes==3 and settlementCalls==1)

local failedOwner = {
    readAscension=function() return section end,
    mergeAscension=function() return false end,
}
local another = createHost(true, failedOwner)
selectTraveler(another)
assert(another:confirmCharacter({ascension=2}))
finishTreasure(another)
assert(another:settle() and settlementCalls==2, 'unconfirmed progress must not cancel the normal stage outcome')
print('PASS ascension progress host: authoritative levels, nonblocking retries, and seeded settlement')
