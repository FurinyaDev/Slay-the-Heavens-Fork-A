local F=dofile('tests/lua/support/game_ui_fixture.lua')
local calls=0
local keyEvents={}
for _,index in ipairs({1,10,30,42})do
    keyEvents['KeyboardCraftspersonKey'..index..'Down']='key'..index
end
local stage=F.Viewport.apply(F.control({children=F.Layout}),1560,720,true)
local ui=F.GameUI.new(stage,F.Data,F.Presentation,'click',{
    prologue=false,imageSource='static',newSeed=function()calls=calls+1;return 42101 end,
    keyEvents=keyEvents,color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end})
local panel=stage:GetChild('characterPanel')
local editor=assert(panel:GetChild('seedEditor'),'enabled character screen omitted seed editor')
local function tap(box,name)
    return box:GetChild(name):GetChild('hit').click()
end
local function edit(input)
    for char in input:gmatch('.')do assert(tap(editor,char=='-' and 'minus' or 'digit'..char))end
end
local function expectRequest(expected)
    local confirm=ui.confirmCharacter
    local actual=false
    ui.confirmCharacter=function(_,request)actual=request;return false end
    assert(not tap(panel,'confirm') and type(actual)=='table' and actual.seed==expected)
    ui.confirmCharacter=confirm
end
assert(ui:start('ironclad'))
assert(tap(panel,'seedEntry') and editor.visible)
assert(not tap(panel,'confirm') and not tap(panel,'cancel'))
edit('9223372036854775808')
assert(not tap(editor,'apply') and editor.visible and editor:GetChild('status').text~='')
assert(tap(editor,'erase') and tap(editor,'digit7'))
assert(tap(editor,'apply') and not editor.visible)
expectRequest('9223372036854775807')
assert(tap(panel,'seedEntry') and tap(editor,'erase') and tap(editor,'cancel'))
expectRequest('9223372036854775807')
assert(tap(panel,'seedEntry') and tap(editor,'random'))
expectRequest(nil)
assert(tap(panel,'seedEntry'))
edit('-9223372036854775808')
assert(tap(editor,'apply'))
expectRequest('-9223372036854775808')
assert(tap(panel,'seedEntry') and tap(editor,'random') and tap(panel,'seedEntry'))
assert(editor.keyListeners.key30() and editor.keyListeners.key1() and editor.keyListeners.key42()
    and editor.keyListeners.key42() and editor.keyListeners.key10())
assert(tap(editor,'apply'))
expectRequest('0')
assert(not editor.keyListeners.key1())
assert(ui:closeCharacters() and ui:start('ironclad'))
expectRequest(nil)
assert(calls==0 and not ui.run,'editing or previewing a seed started a run or drew a new seed')
print('ASCENSION_SEED_EDITOR_PASS')
