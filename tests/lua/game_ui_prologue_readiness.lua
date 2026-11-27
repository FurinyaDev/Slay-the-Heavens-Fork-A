-- Native page readiness is independent of visibility deliberately suppressed by the cover.
local View=require('abyss_game_ui_view')
local owner={openingPrepared=6,starting=false,run={},map={},mode='node'}
local target={active=false}
local visits=0
local function child(name)
    visits=visits+1
    assert(name==(owner.mode=='node' and 'nodePanel' or 'mapPanel'),'read an unrelated page')
    return target
end
local progress=View.openingProgress(owner,child,{nativePageLifecycle=true,
    background=setmetatable({},{__index=function()error('unrelated background readiness read')end})})
assert(progress()==6 and visits==1,'inactive native destination is not ready')
target.active=true;assert(progress()==7)
owner.starting=true;assert(progress()==6);owner.starting=false
owner.openingPrepared=4;local before=visits;assert(progress()==4 and visits==before)
owner.openingPrepared=6;owner.mode='map';target.active=false;assert(progress()==6)
target.active=true;assert(progress()==7)
owner.mode='battle';before=visits;assert(progress()==6 and visits==before)
print('LUA_OPENING_NATIVE_READINESS_PASS')

local F=dofile('tests/lua/support/game_ui_fixture.lua')
local cursors={CursorDown='down',CursorUp='up',CursorEnter='enter',CursorExit='exit',CursorEndDrag='endDrag'}

local function wrappedIntro(id,touchId)
    local canvas=F.control({children=F.Layout})
    local root=F.Viewport.apply(canvas,1280,720)
    local eventView=root:GetChild('nodePanel'):GetChild('eventView')
    local getChild=eventView.GetChild
    local option=getChild(eventView,'option1')
    option.id=id
    local wrapper={__index=option,__newindex=option,__eq=function(a,b)
        return rawequal(rawget(a,'native') or a,rawget(b,'native') or b)
    end}
    function eventView:GetChild(name)
        if name=='option1' then return setmetatable({native=option},wrapper) end
        return getChild(self,name)
    end
    local a,b=eventView:GetChild('option1'),eventView:GetChild('option1')
    assert(a==b and not rawequal(a,b),'test must use different Lua wrappers for the same live native control')
    local ui=F.GameUI.new(root,F.Data,F.Presentation,'click',{
        seed=42,prologue=true,campaign=true,campaignProfile='competition-two-act',
        characterProfile='production',imageSource='static',cursorEvents=cursors,
        color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end,
    })
    root.ui=ui
    local function startIntro()
        assert(F.start(ui))
        for _=1,80 do if not ui.prologue:covering() then break end;ui:update(.05)end
        assert(ui.nodeUI.visible and not ui.prologue:covering())
        assert(ui.run.nodeFlow.event.stage=='neow_intro')
    end
    local hit=option:GetChild('hit')
    local function emit(name,x)
        return assert(hit.listeners[name])({touchId=touchId,GetUIPos=function()return x or 414,84 end})
    end
    local function continueIntro()
        emit('down');emit('up')
        local ok,reason=emit('click')
        assert(ok,'fresh opening pointer must advance: '..tostring(reason))
        assert(ui.run.nodeFlow.event.stage=='neow_blessing')
    end
    startIntro()
    emit('down');emit('exit',4);emit('up',4)
    assert(not emit('click') and ui.run.nodeFlow.event.stage=='neow_intro','dragging out must cancel')
    continueIntro()
    assert(not emit('click') and ui.run.nodeFlow.event.stage=='neow_blessing','duplicated click changed the blessing')
    assert(ui:openMenu() and ui:requestNavigation('abandon') and ui:confirmNavigation())
    startIntro()
    assert(not emit('click') and ui.run.nodeFlow.event.stage=='neow_intro','old click advanced a new run')
    continueIntro()
end

wrappedIntro('neow-option-1')
wrappedIntro(101,7)
print('LUA_OPENING_NATIVE_ALIAS_PASS mouse=yes touch=yes drag_out=yes reentry=yes')
