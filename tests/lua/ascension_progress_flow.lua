local Nodes = require('abyss_nodes')
local Map = require('abyss_map')
local Progress = require('abyss_ascension_progress')
local prepareVictory = dofile('tests/lua/support/ascension_victory_fixture.lua')
local registered, Flow = pcall(require, 'abyss_game_ascension_flow')
assert(registered, 'missing ascension progress application service')

local function finish(level, source)
    local run, map = prepareVictory(level, source)
    assert(Nodes.enter(run, map, Map.available(map)[1].id))
    assert(Nodes.leaveTreasure(run))
    return run, map
end

local messages = {}
local function log(message) messages[#messages+1] = message end
local run, map = finish(0, 'random')
local unavailable = Flow.new(nil, 'v2.3.0', log)
local locked, unavailableStatus = unavailable.getHighestUnlocked('ironclad')
assert(locked==0 and unavailableStatus=='ascension_save_unavailable')
local accepted, reason = unavailable.complete(run, map)
assert(not accepted and reason=='ascension_save_unavailable')
assert(messages[#messages]:find('version=v2.3.0', 1, true)
    and messages[#messages]:find('character=ironclad', 1, true)
    and messages[#messages]:find('seed=3', 1, true)
    and messages[#messages]:find('ascension=0 source=random', 1, true)
    and messages[#messages]:find('ascension_save_unavailable', 1, true))

-- Unit-only save port. Both early refusal and a lost acknowledgement are genuine
-- failures for the service; the test owner applies the real monotonic merge.
local section, reads, writes = nil, 0, 0
local readFailure = false
local flow = Flow.new({
    readAscension=function()
        reads = reads+1
        if readFailure then error('temporary read failure') end
        return section
    end,
    mergeAscension=function(role, goal)
        assert(role=='ironclad')
        writes = writes+1
        if writes==1 then
            goal.highestUnlocked = 15 -- the outbound value must not alias the pending intent.
            return false
        end
        local nextSection, status = Progress.merge(section, role, goal)
        assert(nextSection, status)
        section = nextSection
        if writes==2 then error('lost acknowledgement after merge') end
        return true, status
    end,
}, 'v2.3.0', log)
assert(flow.getHighestUnlocked('ironclad')==0)

accepted, reason = flow.complete(run, map)
assert(not accepted and reason=='ascension_save_write_failed' and writes==1)
assert(flow.getHighestUnlocked('ironclad')==0)
assert(not flow.complete(run, map) and writes==1, 'repeated finish cannot create another intent')
assert(not flow.retry(run) and writes==2)
assert(flow.getHighestUnlocked('ironclad')==1, 'read after durable owner accepted the intent')
accepted, reason = flow.retry(run)
assert(accepted and reason=='unchanged' and writes==3, 'lost acknowledgement replays the same absolute goal')
assert(not flow.retry(run) and writes==3)
assert(not flow.complete(run, map) and writes==3)

local seeded, seededMap = finish(1, 'player')
local beforeReads = reads
accepted, reason = flow.complete(seeded, seededMap)
assert(not accepted and reason=='ascension_seed_ineligible' and writes==3 and reads==beforeReads)
assert(messages[#messages]:find('source=player result=ascension_seed_ineligible', 1, true))
assert(seeded.phase=='victory', 'seeded run retains its formal gameplay result')

local another, anotherMap = finish(1, 'random')
assert(another.runSeed==run.runSeed)
assert(flow.complete(another, anotherMap) and writes==4, 'same seed can belong to a distinct legitimate random run')
assert(flow.getHighestUnlocked('ironclad')==2 and flow.getHighestUnlocked('silent')==0)

local third, thirdMap = finish(2, 'random')
readFailure = true
accepted, reason = flow.complete(third, thirdMap)
assert(not accepted and reason=='ascension_save_read_failed' and writes==4)
readFailure = false
assert(flow.retry(third) and writes==5, 'restored reader completes the pending intent')
assert(flow.getHighestUnlocked('ironclad')==3)

section.ironclad.highestUnlocked = 10
local beforeWrites = writes
locked, reason = flow.getHighestUnlocked('ironclad')
assert(locked==0 and reason=='invalid_ascension_save')
assert(not flow.retry(another) and writes==beforeWrites)
print('PASS ascension progress flow: safe reads, failed and lost writes, seeded eligibility, and distinct runs')
