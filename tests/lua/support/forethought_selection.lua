local GameUI=require('abyss_game_ui')
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run=require('abyss_run')
local Reveal=require('abyss_page_reveal')
local make=GameUI.new
local width,height=650,360

local function nativeHost()
    local canvas=F.control({children=F.Layout})
    local stage=canvas:GetChild('stage')
    for _,name in ipairs({'nodePanel','choicePanel'}) do
        local page=stage:GetChild(name)
        page.active=true
        function page:SetActive(active)
            self.active=active
            F.setEngineActive(self,active)
        end
    end
    local host
    GameUI.new=function(root,data,presentation,click,platform)
        assert(platform.nativePageLifecycle and platform.touchScreen(),'formal mobile profile fell back')
        host=make(root,data,presentation,click,platform)
        return host
    end
    local actors=F.monsterActors()
    package.loaded.abyss_monster_actor_binding={enabled=true,templateIndex=actors.templateIndex,
        containerTemplateIndex=actors.containerTemplateIndex,powerTemplateIndex=actors.powerTemplateIndex}
    script={object=canvas,GetParam=function()return false end,
        EnableUpdate=function(self,on)self.updating=on end}
    Enum={CursorEventType={CursorClick='click',CursorDown='down',CursorUp='up',CursorEndDrag='endDrag'},
        ImageSource={StaticReference='static'},Device={Mobile='mobile',MobileController='mobile-controller'}}
    Color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end
    game={IsTestPlay=function()return true end,GetUICanvasSize=function()return width,height end,
        GetDevice=function()return 'mobile' end,GetCursorUIPos=function()return 0,0 end,
        InstantiateClientUIControl=actors.instantiate,DestroyClientUIControl=actors.destroy}
    -- Portrait templates are linked by the native importer, outside this Host replay.
    local portraits=require('abyss_traveler_portraits')
    local makePortraits=portraits.new
    local function quiet() end
    portraits.new=function()
        return {tick=quiet,sync=quiet,syncResult=quiet,battlePose=quiet,
            status=function()return {} end,release=quiet,onEngineDestroy=quiet,
            readyForPage=function()return true end}
    end
    dofile('src/lua/abyss_ui.lua')
    OnStart()
    GameUI.new,portraits.new=make,makePortraits
    assert(host and script.updating and host.pageReveal:usesFade(),'native start did not bind fade and updates')
    assert(stage.localScaleX==math.min(width/1280,height/720),'native canvas was not scaled')
    return host,stage,function()
        OnUpdate(1/60)
        assert(script.updating and not host.disabled,'native update stopped')
    end
end

local function fixtureHost()
    GameUI.new=function(root,data,presentation,click,platform)
        platform.presentationReady=function()return true end
        return make(root,data,presentation,click,platform)
    end
    local host,stage=F.fixture(nil,nil,nil,{CursorDown='down',CursorUp='up'})
    GameUI.new=make
    F.Viewport.apply(stage.parent,width,height)
    host:resize(width,height)
    return host,stage,function()
        host:update(1/60)
        if host.pageReveal:step(Reveal.intent(host)) then host:refresh() end
        host.pageReveal:paint(true)
    end
end

local host,root,tick
if ABYSS_FORETHOUGHT_NATIVE then host,root,tick=nativeHost()
else host,root,tick=fixtureHost() end
local function settle()
    for _=1,240 do
        if not (host.pageReveal:covered() or host.starting or host.battleUI.busy
            or host.prologue and host.prologue:covering()) then return end
        tick()
    end
    error('Forethought page did not become ready')
end
settle()
host.seed=1
assert(host:start());settle()
assert(host:selectCharacter('traveler'));settle()
if not ABYSS_FORETHOUGHT_NATIVE then assert(host:selectElement('ironclad'));settle() end
assert(host:confirmCharacter());settle()
if host.mode=='node' then
    for _,option in ipairs({1,2,1}) do
        assert(F.click(root,'nodePanel','eventView/option'..option));settle()
    end
end
-- Set a first-floor combat checkpoint before driving the actual battle controls.
host.run.floor=1
assert(Run.startCombat(host.run,'raven_adept_solo'))

local function pointer(hit,touch,name)
    assert(hit.activeInHierarchy and hit.raycastTarget~=false,'unavailable hit: '..name)
    local ancestor=hit
    while ancestor do
        assert(ancestor.visible,'hidden hit: '..name)
        ancestor=ancestor.parent
    end
    local event={touchId=touch,GetUIPos=function()
        local card=hit.parent
        return width/2+(card.x or 0)*root.localScaleX,height/2+(card.y or 0)*root.localScaleX
    end}
    if hit.listeners.down then hit.listeners.down(event) end
    if hit.listeners.up then hit.listeners.up(event) end
    return hit.click(event)
end

local panel=root:GetChild('battlePanel')
local deck=root:GetChild('deckPanel')
local grid=deck:GetChild('grid')
local close=deck:GetChild('close'):GetChild('hit')
local cover=root:GetChild('pageReveal')
local Random=require('abyss_sts_random')
local function rngState(battle)
    local values={}
    for _,key in ipairs({'shuffleRng','cardRandomRng','aiRng','monsterHpRng','cardRng','miscRng'}) do
        local state=Random.snapshot(assert(battle[key],key))
        values[#values+1]=table.concat(state.words,':')..':'..state.counter
    end
    return table.concat(values,';')
end

local function beginChoice(upgraded)
    local streams=Run.roomStreams(host.run,1)
    local battle=F.Combat.new(F.Data,{deck={'defend','forethought','defend','defend','defend','defend'},
        enemies={'raven_adept'},roomStreams=streams,roomSeed=streams.seed})
    host.run.combat=battle
    host:refresh();settle()
    local slot
    for i,card in ipairs(battle.hand) do
        if card.cardId=='forethought' then slot=i;card.upgraded=upgraded end
    end
    assert(slot,'fixture must draw Forethought')
    local rng=rngState(battle)
    pointer(panel:GetChild('card'..slot):GetChild('hit'),70,'battle card')
    local play=panel:GetChild('playArea')
    pointer(play.click and play or play:GetChild('hit'),71,'play area')
    settle()
    local choice=assert(battle.pendingChoice,'playing Forethought must open a choice')
    assert(choice.multiple==upgraded and host.deckUI.visible)
    if upgraded then
        for _,state in ipairs({'normal','hover','pressed','disabled'}) do
            assert(close:GetChild(state):GetChild('label').text=='确认选择')
        end
        assert(close.interactable and close.raycastTarget,'zero selections must be confirmable')
        assert(deck:GetChild('title').text:match('已选0$'))
    else
        assert(not close.parent.visible and not close.raycastTarget,'base Forethought picks one directly')
    end
    assert(rngState(battle)==rng,'opening Forethought changed RNG')
    return battle,choice,rng
end

local function multiChoice(expected)
    local battle,choice,rng=beginChoice(true)
    local session,epoch=host.deckUI.openSession,host.pageReveal.epoch
    local first,second=choice.uids[1],choice.uids[2]
    local firstCell,secondCell=assert(grid.items[0]),assert(grid.items[1])
    local firstHit,secondHit=firstCell:GetChild('hit'),secondCell:GetChild('hit')
    local count,priorBottom=#battle.hand,battle.draw[1]
    assert(priorBottom,'fixture must have an existing draw-pile bottom')
    local function verifySelection(selected)
        assert(host.deckUI.openSession==session and host.pageReveal.epoch==epoch
            and not host.pageReveal:covered() and not cover.visible,'selection restarted page preparation')
        assert(grid.items[0]==firstCell and grid.items[1]==secondCell,'selection rebuilt the card controls')
        assert(battle.pendingChoice==choice and #choice.selected==#selected and #battle.hand==count)
        for index,uid in ipairs(selected) do assert(choice.selected[index]==uid,'wrong selected UID') end
        assert(deck:GetChild('title').text:match('已选'..#selected..'$'),'selection count did not update')
        local chosen={}
        for _,uid in ipairs(selected) do chosen[uid]=true end
        assert(firstCell:GetChild('uid').text==(chosen[first] and '已选择' or ''),'first card feedback')
        assert(secondCell:GetChild('uid').text==(chosen[second] and '已选择' or ''),'second card feedback')
        assert(rngState(battle)==rng,'selection changed RNG')
    end
    local function verifyNowAndNextFrame(action,selected)
        verifySelection(selected)
        tick()
        verifySelection(selected)
        if ABYSS_FORETHOUGHT_NATIVE then
            print('FORETHOUGHT_TRACE action='..action..' uids=['..table.concat(selected,',')..']'
                ..' immediate=ready next-frame=ready epoch='..epoch..' session='..session)
        end
    end

    local originalToken=choice.token
    assert(not firstHit.click({touchId=100,dragging=true}),'cancelled gesture was accepted')
    assert(choice.token==originalToken,'cancelled gesture consumed the choice token')
    verifyNowAndNextFrame('cancelled-drag',{})
    pointer(firstHit,100,'first choice card');verifyNowAndNextFrame('first-tap',{first})
    assert(not Run.chooseCard(host.run,originalToken,0),'superseded token confirmed')
    pointer(secondHit,101,'second choice card');verifyNowAndNextFrame('second-tap',{first,second})
    if expected<2 then
        pointer(secondHit,101,'repeat second card');verifyNowAndNextFrame('toggle-second-off',{first})
    end
    if expected==0 then
        pointer(firstHit,100,'repeat first card');verifyNowAndNextFrame('toggle-first-off',{})
    end
    local chooseCard=host.battleUI.chooseCard
    local confirmations=0
    host.battleUI.chooseCard=function(self,token,uid)
        if uid==0 then confirmations=confirmations+1 end
        return chooseCard(self,token,uid)
    end
    pointer(close,103,'confirm choice')
    assert(confirmations==1,'first click must submit exactly once')
    close.click({touchId=103})
    assert(confirmations==1,'duplicate click reached the submit handler')
    host.battleUI.chooseCard=chooseCard
    settle()
    assert(not deck.visible and not battle.pendingChoice and panel.visible and host.battleUI.active,'did not return to battle')
    assert(#battle.hand==count-expected and battle.draw[expected+1]==priorBottom and rngState(battle)==rng,
        'confirmation changed an unselected card or RNG')
    if expected>0 then assert(battle.draw[expected].uid==first and battle.draw[expected].freeToPlayOnce) end
    if expected==2 then assert(battle.draw[1].uid==second and battle.draw[1].freeToPlayOnce) end
    print('FORETHOUGHT_TRACE confirm='..expected..' selection-epoch='..epoch..' open-session='..session)
end

multiChoice(1)
if ABYSS_FORETHOUGHT_NATIVE then
    multiChoice(0)
    multiChoice(2)
    local battle,choice,rng=beginChoice(false)
    local uid,count,priorBottom=choice.uids[1],#battle.hand,battle.draw[1]
    pointer(grid.items[0]:GetChild('hit'),110,'base choice card')
    settle()
    assert(not deck.visible and not battle.pendingChoice and panel.visible and host.battleUI.active)
    assert(#battle.hand==count-1 and battle.draw[1].uid==uid and battle.draw[1].freeToPlayOnce
        and battle.draw[2]==priorBottom and rngState(battle)==rng,'base Forethought settlement changed')
    local chosen=battle.draw[1]
    F.Combat.draw(battle,#battle.draw)
    local slot
    for i,card in ipairs(battle.hand) do if card.uid==uid then slot=i end end
    assert(slot and F.Combat.cardDefinition(battle,chosen).cost==0,'next draw lost the free play')
    host:refresh();settle()
    local energy=battle.energy
    pointer(panel:GetChild('card'..slot):GetChild('hit'),111,'free card')
    local play=panel:GetChild('playArea')
    pointer(play.click and play or play:GetChild('hit'),112,'play free card')
    settle()
    assert(battle.energy==energy and not chosen.freeToPlayOnce and F.Combat.cardDefinition(battle,chosen).cost==1,
        'free play must consume the flag without spending energy')
    print('FORETHOUGHT_TRACE base-single-tap uid='..uid..' free-play-spent=0')
    OnDestroy()
end
print('FORETHOUGHT_SELECTION_HOST_PASS')
