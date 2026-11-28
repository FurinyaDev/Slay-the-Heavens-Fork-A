local F=dofile('tests/lua/support/game_ui_fixture.lua')
local seed='9223372036854775807'
local stage=F.Viewport.apply(F.control({children=F.Layout}),1680,720,true)
local ui=F.GameUI.new(stage,F.Data,F.Presentation,'click',{
    seed=seed,prologue=false,imageSource='static',
    color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end})
local menu=stage:GetChild('runMenu')
local detail=assert(menu:GetChild('runSeedDetails'),'enabled layout omitted run seed display')
local function shown(name)return detail:GetChild(name).text end
assert(not detail.visible)
assert(ui:start('ironclad') and ui:confirmCharacter())
assert(ui.run.runSeed==seed)
ui.run.ascension=ui.run.ascension or 0 -- T01 adds this field when the candidate is combined.
ui.run.seed=31997
assert(ui:openMenu() and detail.visible)
assert(shown('seed')==seed,'display rounded the run seed or took it from the mutable battle stream')
local metadata=shown('metadata')
local version=require('abyss_narrative').codeVersion
assert(metadata:find(version,1,true) and metadata:find('旅行者（岩）',1,true) and metadata:find('A0',1,true))
ui.run.ascension=14
ui:refresh()
assert(shown('metadata'):find('A14',1,true) and shown('seed')==seed)
assert(ui:closeExit() and not menu.visible)
print('ASCENSION_RUN_SEED_DISPLAY_PASS')
