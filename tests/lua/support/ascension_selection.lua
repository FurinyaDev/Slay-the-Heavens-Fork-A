local F=dofile('tests/lua/support/game_ui_fixture.lua')
local calls=0
local limits={silent=1}
local stage=F.Viewport.apply(F.control({children=F.Layout}),1280,720)
local ui=F.GameUI.new(stage,F.Data,F.Presentation,'click',{
    prologue=false,imageSource='static',newSeed=function()calls=calls+1;return 42101 end,
    getHighestUnlocked=function(id)return limits[id] or 0 end,
    color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end})
local panel=stage:GetChild('characterPanel')
local picker=assert(panel:GetChild('ascensionPicker'),'enabled character screen omitted ascension picker')
local function tap(name)
    return picker:GetChild(name):GetChild('hit').click()
end
local function chooseIronclad()
    assert(ui:start())
    assert(ui:selectCharacter('traveler'))
end
assert(not picker.visible)
chooseIronclad()
assert(picker.visible and picker:GetChild('rank').text=='A0')
assert(not tap('previous') and not tap('next'))
limits.ironclad=2
ui:refresh()
assert(not tap('previous') and tap('next') and picker:GetChild('rank').text=='A1')
assert(picker:GetChild('rule').text:find('精英',1,true))
assert(tap('next') and picker:GetChild('rank').text=='A2')
assert(not tap('next') and picker:GetChild('rank').text=='A2')
assert(picker:GetChild('unlock').text:find('A2',1,true))
assert(ui:selectElement('silent') and picker:GetChild('rank').text=='A0')
assert(tap('next') and not tap('next'))
assert(ui:selectElement('ironclad') and picker:GetChild('rank').text=='A0')
limits.ironclad=14
ui:refresh()
for _=1,14 do assert(tap('next'))end
assert(not tap('next') and picker:GetChild('rank').text=='A14')
assert(picker:GetChild('rule').text:find('生命上限',1,true))
assert(ui:closeCharacters() and calls==0 and not ui.run)
chooseIronclad()
assert(picker:GetChild('rank').text=='A0' and tap('next'))
local confirm=ui.confirmCharacter
ui.confirmCharacter=function(self,request)
    assert(request.ascension==1 and request.seed==nil,'confirmation routed the wrong run options')
    return false
end
assert(not panel:GetChild('confirm'):GetChild('hit').click() and calls==0 and not ui.run)
ui.confirmCharacter=confirm
assert(tap('previous'))
assert(panel:GetChild('confirm'):GetChild('hit').click() and calls==1 and ui.run.runSeed=='42101')
print('ASCENSION_SELECTION_PASS')
