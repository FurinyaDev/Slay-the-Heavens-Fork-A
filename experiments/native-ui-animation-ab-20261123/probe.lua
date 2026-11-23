-- Mounted on the isolated training UI. Numeric keys select or interrupt cases.
local Gate = require('abyss_page_reveal')
local Motion = require('abyss_node_ui_motion')
local Theme = require('abyss_theme')
local native = VARIANT ~= 'lua'
local root, panels, cover, gate, intent, ready
local slide, chest, chestOwner, fade
local scene, generation = 'buttons', 0

local function note(...)
    print('UI_AB',...)
end

local function resetFade()
    local previous = fade
    fade = nil
    if previous then previous.handle:Kill(false) end
end

local function paintAlpha(veil, ink, value, state, epoch)
    if not native or (state ~= 'fadingOut' and state ~= 'fadingIn') then
        resetFade()
        veil.imageColor = ink
        return
    end
    local outward = state == 'fadingOut'
    if not fade or fade.epoch ~= epoch or fade.state ~= state then
        resetFade()
        veil.imageColor = Color(0,0,0,outward and 0 or 255)
        local tween = game.Tween(veil,{imageColor=Color(0,0,0,outward and 255 or 0)},Theme.motion.slow)
            :SetEase(Enum.EaseType.InOutSine)
        local handle = VARIANT=='sequence' and game.TweenSequence():Append(tween) or tween
        local track = {state=state,epoch=epoch,handle=handle}
        fade = track
        handle:SetOnComplete(function()
            if fade == track and veil.alive then note('fade-complete',state,epoch) end
        end):Play()
    elseif value==(outward and 1 or 0) then
        resetFade()
        veil.imageColor=ink
    end
end

local function stop()
    generation = generation+1
    if slide then
        local previous=slide;slide=nil
        for _,handle in ipairs(previous.handles) do handle:Kill(false) end
    end
    if chest then chest:cancel();chest=nil end
    if gate then gate:abandon();gate=nil end
    resetFade()
end

local function show(name)
    stop()
    scene=name
    for key,panel in pairs(panels) do panel:SetVisible(key==name) end
    cover:SetVisible(false)
end

local function startTracks(tracks, label)
    local state = {tracks=tracks, label=label, time=0, handles={}, pending=#tracks}
    local ticket = generation
    slide = state
    local sequence = VARIANT=='sequence' and game.TweenSequence() or nil
    local function done()
        if slide~=state or ticket~=generation then return end
        state.pending=state.pending-1
        if state.pending==0 then
            slide=nil
            note('motion-complete',label)
        end
    end
    function state:begin(track)
        local t = game.Tween(track.box,{[track.property]=track.target},track.seconds):SetEase(track.ease)
        if sequence then sequence:Insert(track.delay,t)
        else self.handles[#self.handles+1]=t;t:SetOnComplete(done):Play() end
        track.started=true
    end
    for _,track in ipairs(tracks) do
        track.box[track.property]=track.from
        if native and (sequence or track.delay==0) then state:begin(track) end
    end
    if sequence then
        state.pending=1;state.handles[1]=sequence
        sequence:SetOnComplete(done):Play()
    end
end

local function track(box, axis, from, target, seconds, delay, ease, rate)
    return {box=box,property='anchoredPosition'..axis,from=from,target=target,
        seconds=seconds,delay=delay,ease=ease,rate=rate,snap=2/3}
end

local function openShop()
    show('shop')
    local panel, back = panels.shop:GetChild('shopView'), panels.shop:GetChild('shopBack')
    local x=math.min(Theme.layout.nativeNode.back[1],-510)
    local w,h=game.GetUICanvasSize()
    startTracks({
        track(panel,'Y',math.max(720,h),0,SHOP_SECONDS,0,Enum.EaseType.OutCubic),
        track(back,'X',x-math.max(1280,w),x,SHOP_SECONDS,0,Enum.EaseType.OutCubic),
    },'shop')
end

local function openCharacter()
    show('character')
    local panel=panels.character
    local info,confirm,cancel=panel:GetChild('details'),panel:GetChild('confirm'),panel:GetChild('cancel')
    -- Finite comparison against the in-flight STS1 recurrence, 9/60 and 2/3 snap.
    -- The second beat is one reference step late. Stock EaseType has no custom recurrence.
    startTracks({
        track(cancel,'X',-550-400*2/3,-550,37/60,0,Enum.EaseType.OutExpo,9),
        track(info,'X',-1000*2/3,0,43/60,1/60,Enum.EaseType.OutExpo,9),
        track(confirm,'X',550+400*2/3,550,37/60,1/60,Enum.EaseType.OutExpo,9),
    },'character-reference')
end

local function updateSlide(dt)
    local state=slide
    if not state then return end
    state.time=state.time+dt
    if VARIANT=='sequence' then return end
    local pending=0
    for _,t in ipairs(state.tracks) do
        local elapsed=state.time-t.delay
        if native then
            if not t.started and elapsed>=0 then state:begin(t) end
        elseif elapsed>=0 and not t.finished then
            local d=t.from-t.target
            local distance=t.rate and d*(1-t.rate/60)^(60*elapsed)
                or d*(1-math.min(1,elapsed/t.seconds))^3
            if t.rate and math.abs(distance)<t.snap or not t.rate and elapsed>=t.seconds then
                distance=0;t.finished=true
            end
            t.box[t.property]=t.target+distance
        end
        if not t.finished then pending=pending+1 end
    end
    if not native and pending==0 then slide=nil;note('motion-complete',state.label) end
end

local function openChest()
    show('treasure')
    local panel=panels.treasure:GetChild('treasureView')
    local fullscreen=panel:GetChild('fullscreenProbe')
    if fullscreen then
        assert(not fullscreen.visible)
        note('fullscreen-hidden',typeof(fullscreen))
    end
    panel:GetChild('rewardItem1'):SetVisible(true)
    chestOwner={visible=true,run={hp=42,maxHp=80,nodeFlow={type='treasure'}},map={},notice='',
        render=function()note('chest-presentation-complete')end}
    chest=Motion.new(chestOwner,function(key)return panels.treasure:GetChild(key)end,
        {enhancedRooms=true,color=Color,sound=function(cue)note('sound',cue)end})
    chest:start('openTreasure',{hp=42})
end

local function startReturn(which)
    show(which)
    local run={act=1}
    local source={page='nodePanel',mode='node',phase='node',run=run,nodeId=which,nodeType=which,act=1}
    local map={page='mapPanel',mode='map',phase='map',run=run,act=1}
    intent=source;ready=true
    gate=Gate.new(cover,function()return ready end,nil,{full={0,0,1280,720}},
        {color=Color,duration=Theme.motion.slow,entryDuration=Theme.motion.fast/2,paintAlpha=paintAlpha})
    gate:request(intent)
    -- The probe selects the source; normal Gate.step publishes it before 6 is accepted.
    gate.onReturn=function()
        return gate:depart(function()
            intent=map;ready=false
            panels[which]:SetVisible(false);panels.mapPanel:SetVisible(true)
            note('destination-projection',which)
            return true
        end,function()note('departure-cancel',which)end)
    end
end

local function exerciseButton(box)
    box:AddCursorEventListener(Enum.CursorEventType.CursorClick,function()
        note('click',box.name)
    end)
end

function OnStart()
    root=script.object
    panels={}
    for _,key in ipairs({'buttons','shop','character','treasure','mapPanel'}) do panels[key]=root:GetChild(key) end
    cover=root:GetChild('pageReveal')
    cover:GetChild('blocker'):AddCursorEventListener(Enum.CursorEventType.CursorClick,function()note('cover-hit')end)
    for _,key in ipairs({'buttonCurrent','buttonPreset','buttonStretch'}) do exerciseButton(panels.buttons:GetChild(key)) end
    local actions={
        [1]=function()show('buttons')end, [2]=openShop, [3]=openCharacter, [4]=openChest,
        [5]=function()startReturn('shop')end, [6]=function()if gate and gate.onReturn then gate.onReturn() end end,
        [7]=function()startReturn('treasure')end, [8]=function()ready=true end,
        [9]=function()if gate and gate:cancelDeparture() then return end;show('buttons')end,
        [10]=function()
            if scene~='buttons' then return end
            for _,key in ipairs({'buttonCurrent','buttonPreset','buttonStretch'}) do
                local box=panels.buttons:GetChild(key);box.interactable=not box.interactable
            end
        end,
    }
    for i=1,10 do
        root:AddKeyEventListener(Enum.KeyEventType['KeyboardCraftspersonKey'..i..'Down'],function()
            actions[i]();return true
        end)
    end
    script:EnableUpdate(true)
end

function OnUpdate(dt)
    updateSlide(dt)
    if chest then chest:update(dt) end
    if gate then gate:step(intent,dt) end
end

function OnDisable() stop() end
function OnDestroy() stop() end
