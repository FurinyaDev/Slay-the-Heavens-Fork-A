local GameUI=require('abyss_game_ui')
local make=GameUI.new
GameUI.new=function(root,data,presentation,event,platform)
    if ABYSS_FORETHOUGHT_NATIVE then
        platform.nativePageLifecycle=true
        for _,name in ipairs({'nodePanel','choicePanel'})do
            local page=root:GetChild(name)
            page.active=true
            function page:SetActive(active) self.active=active end
        end
    end
    platform.presentationReady=function()return true end
    return make(root,data,presentation,event,platform)
end
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local reveal=require('abyss_page_reveal')
local pointer=ABYSS_FORETHOUGHT_NATIVE and {touchScreen=function()return true end} or nil
local host,_,_,_,tap,drain,_,root=H.setup(
    {'forethought','bludgeon','defend','defend'},{'raven_adept'},pointer)
local function tick()
    host:update(0.06)
    if host.pageReveal:step(reveal.intent(host)) then host:refresh() end
end
local function settle()
    for _=1,6 do tick() end
    assert(not host.pageReveal:covered(),'ready page remained covered')
end
host:resize(650,360)
settle()
local battle=host.run.combat
local slot
for i,card in ipairs(battle.hand) do
    if card.cardId=='forethought' then slot=i;card.upgraded=true end
end
assert(slot)
tap('card'..slot,70);tap('playArea',71);drain();settle()
assert(battle.pendingChoice and battle.pendingChoice.multiple and host.deckUI.visible)
local deck=root:GetChild('deckPanel')
local grid=deck:GetChild('grid')
local close=deck:GetChild('close'):GetChild('hit')
assert(close:GetChild('normal'):GetChild('label').text=='确认选择')
local session,epoch=host.deckUI.openSession,host.pageReveal.epoch
local function assertSamePage()
    assert(not host.pageReveal:covered() and host.pageReveal.epoch==epoch
        and host.deckUI.openSession==session,'selection restarted page preparation')
end
local function clickCard(index,touch,count,feedback)
    local cell=assert(grid.items[index])
    cell:GetChild('hit').click({touchId=touch})
    assertSamePage()
    assert(#battle.pendingChoice.selected==count)
    assert(deck:GetChild('title').text:match('已选'..count..'$'))
    assert(cell:GetChild('uid').text==feedback)
    tick()
    assertSamePage()
end
clickCard(0,100,1,'已选择')
local first=battle.pendingChoice.selected[1]
local stale=battle.pendingChoice.token
clickCard(1,101,2,'已选择')
assert(not H.Run.chooseCard(host.run,stale,0),'superseded tokens cannot confirm')
clickCard(1,102,1,'')
assert(battle.pendingChoice.selected[1]==first)
local count=#battle.hand
close.click({touchId=103})
assert(not host.deckUI.visible and not battle.pendingChoice and #battle.hand==count-1 and battle.draw[1].uid==first)
assert(battle.draw[1].freeToPlayOnce,'Forethought lost its one-time free play')
assert(not close.click({touchId=103}),'duplicate confirmation must not retake control')
print('FORETHOUGHT_SELECTION_HOST_PASS')
