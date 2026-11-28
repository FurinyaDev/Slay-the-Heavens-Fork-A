-- Offline four-role entry probe. Source files and published candidates stay untouched.
local data = require('abyss_data')
local cards = require('abyss_presentation')
local baseline = require('abyss_run_admission')
local Run = require('abyss_run')
local Select = require('abyss_character_select')
local Map = require('abyss_map')
local Nodes = require('abyss_nodes')
local Combat = require('abyss_combat')
local roles = {ironclad='ironclad', raiden='RD', hutao='HT', arlecchino='AR'}
local campaign = 'competition-two-act'
assert(baseline.allows(campaign,'ironclad') and not baseline.allows(campaign,'raiden'))
local probe=assert(loadfile(assert(ROLE_ADMISSION_PROBE_PATH)))()
baseline.allows,baseline.accepts=probe.allows,probe.accepts
local selection=Select.new(data,cards,'production')
assert(not selection:select('furina'))
for _,role in ipairs({'ironclad','raiden','hutao','arlecchino'}) do
    local base=roles[role]
    selection:clear()
    assert(selection:select(role=='ironclad' and 'traveler' or role))
    assert(selection:canConfirm() and selection.info.id==role and selection.info.deckSize==10)
    local selectionOptions=Select.options(role) or {}
    selectionOptions.campaign,selectionOptions.experimental,selectionOptions.campaignProfile=true,true,campaign
    local run=Run.new(data,'42',selectionOptions)
    assert(run.campaignProfile==campaign and #run.deck==10 and run.act==1)
    if role~='ironclad' then
        assert(run.data.originalV4Role==base)
        assert(run.relics[1]=='original_v4_'..base:lower())
    end
    assert(Run.startRoomCombat(run,'normal'))
    local played=false
    for _,held in ipairs(run.combat.hand) do
        local target=not Combat.canPlay(run.combat,held.uid,nil) and 1 or nil
        if Combat.canPlay(run.combat,held.uid,target) then
            assert(Run.play(run,held.uid,target,'role-probe-'..role))
            played=true
            break
        end
    end
    assert(played)
    -- Controlled boss-treasure checkpoint using the native transition API.
    local map=Map.generate(run.data,run.runSeed,1)
    while #Map.available(map)>0 do assert(Map.choose(map,Map.available(map)[1].id)) end
    run.floor,run.phase=17,'node'
    run.nodeFlow={id=map.currentNodeId,floor=map.floor,type='treasure',roomKind='boss_treasure',mapSeed=map.seed,mapSignature=map.sourceSignature,complete=false,reward={relics={}}}
    assert(Nodes.claimBossTreasure(run,0) and Nodes.advanceAct(run,map) and run.act==2)
    assert(Nodes.enter(run,map,Map.available(map)[1].id))
    assert(run.phase=='combat' and #run.deck==10)
    while #Map.available(map)>0 do assert(Map.choose(map,Map.available(map)[1].id)) end
    run.floor,run.phase=34,'node'
    run.nodeFlow={id=map.currentNodeId,floor=map.floor,type='treasure',roomKind='boss_treasure',mapSeed=map.seed,mapSignature=map.sourceSignature,complete=false,reward={relics={}}}
    assert(Nodes.claimBossTreasure(run,0))
    assert(run.phase=='victory' and run.ending=='two_act_complete' and not run.pendingAct)
    assert(not Nodes.advanceAct(run,map))
    print('FOUR_ROLE_PROBE_PASS '..role)
end
