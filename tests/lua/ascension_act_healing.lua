local Run = require('abyss_run')
local Acts = require('abyss_acts')
local Data = require('abyss_copy').copy(require('abyss_data'))

Data.rules.ascensionEnabled = true

local function transition(level, hp, expected, preventHealing)
    local run = Run.new(Data, '42', {experimental=true, campaign=true}, {ascension=level, seedSource='internal'})
    local terminalFloor = Acts.get(1).last
    run.hp, run.floor, run.phase, run.pendingAct = hp, terminalFloor, 'act_transition', 2
    run.nodeFlow = {complete=true, floor=terminalFloor, roomKind='boss_treasure', result='boss_treasure_complete'}
    if preventHealing then run.relics[#run.relics+1] = 'mark_of_bloom' end
    local maxHp = run.maxHp

    assert(Run.advanceAct(run))
    assert(run.hp == expected, 'A' .. level .. ' HP ' .. hp .. ' gave ' .. run.hp .. ', expected ' .. expected)
    assert(run.maxHp == maxHp and run.runSeed == '42' and run.ascension == level)
    assert(run.act == 2 and run.phase == 'map')
    assert(not Run.advanceAct(run) and run.hp == expected, 'transition was replayed')
end

transition(4, 39, 80)
transition(5, 39, 70)
transition(5, 74, 79) -- Round 4.5 restored HP up to five.
transition(5, 77, 79)
transition(5, 80, 80)
transition(5, 39, 39, true)
print('ok A5 rounds missing-health recovery and respects the existing no-heal hook')
