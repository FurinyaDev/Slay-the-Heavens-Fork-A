local F=dofile('tests/lua/support/game_ui_fixture.lua')
local section={ironclad={highestUnlocked=1,highestCleared=0}}
local reads,entropy=0,0
local readable=true
local function read()
    reads=reads+1
    if readable then return section end
    error('temporarily unavailable')
end
local function readDisplay(character)
    local ok,progress=pcall(read)
    return ok and progress[character] and progress[character].highestUnlocked or 0
end
local stage=F.Viewport.apply(F.control({children=F.Layout}),1280,720)
local ui=F.GameUI.new(stage,F.Data,F.Presentation,'click',{
    getHighestUnlocked=readDisplay,playerSave={readAscension=read,mergeAscension=function()return true end},
    prologue=false,imageSource='static',newSeed=function()entropy=entropy+1;return 42101 end,
    color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end})
local panel=stage:GetChild('characterPanel')
local picker=panel:GetChild('ascensionPicker')
local function tap(box,name)return box:GetChild(name):GetChild('hit').click()end
assert(ui:start('ironclad') and tap(picker,'next'))
assert(picker:GetChild('rank').text=='A1')
local settings=ui.characterSelection.ascension
readable=false
local before=reads
assert(settings:request('ironclad').ascension==1,'confirmation silently changed the visible A1 choice')
assert(reads==before and entropy==0 and ui.run==nil)

-- Where the shared save is wired, exercise the genuine button-to-Host admission path.
if package.loaded.abyss_game_ascension_flow then
    local accepted,reason=tap(panel,'confirm')
    assert(not accepted and reason=='ascension_locked' and entropy==0 and ui.run==nil)
    assert(picker:GetChild('rank').text=='A1')
    assert(picker:GetChild('unlock').text:find('重试',1,true))
end

ui:refresh()
assert(picker:GetChild('rank').text=='A0' and not tap(picker,'next'))
readable=true
ui:refresh()
assert(tap(picker,'next') and picker:GetChild('rank').text=='A1')
assert(tap(picker,'previous') and settings:request('ironclad').ascension==0)
assert(settings:request('silent')==nil,'another character received options from a stale view')
assert(tap(picker,'next') and ui:selectElement('silent'))
assert(settings:request('silent').ascension==0)
if package.loaded.abyss_game_ascension_flow then
    readable=false
    assert(tap(panel,'confirm') and ui.run.ascension==0 and entropy==1)
end
print('ASCENSION_CONFIRMATION_CHOICE_PASS')
