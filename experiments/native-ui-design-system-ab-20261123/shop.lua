local root, shelf, leave, active

local function stop(reset)
    local obsolete = active
    active = nil
    if not obsolete then return end
    for _, handle in ipairs(obsolete.handles) do handle:Kill(false) end
    if reset and shelf.alive and leave.alive then
        shelf:SetAnchoredPosition(0, 0)
        leave:SetAnchoredPosition(-510, -290)
    end
end

local function begin()
    stop(false)
    if not shelf.alive or not leave.alive then return end
    local w, h = game.GetUICanvasSize()
    local run = {handles={}, finished={}, left=2, time=0, w=math.max(1280,w), h=math.max(720,h)}
    active = run
    shelf:SetAnchoredPosition(0, run.h)
    leave:SetAnchoredPosition(-510-run.w, -290)
    local function finish()
        if active ~= run then return end
        if not shelf.alive or not leave.alive then stop(false);return end
        active = nil
        print('SHOP_FINISH')
    end
    if MODE=='lua' then
        run.finish=finish
        return
    end

    local function tween(target, field, value)
        return game.Tween(target,{[field]=value},SECONDS):SetEase(Enum.EaseType.OutCubic)
    end
    local tracks = {tween(shelf,'anchoredPositionY',0),tween(leave,'anchoredPositionX',-510)}
    if MODE=='tween' then
        for i, handle in ipairs(tracks) do
            run.handles[i]=handle
            handle:SetOnComplete(function()
                if active~=run or run.finished[i] then return end
                run.finished[i]=true
                run.left=run.left-1
                if run.left==0 then finish() end
            end)
        end
        for _, handle in ipairs(run.handles) do handle:Play() end
    else
        local sequence=game.TweenSequence():Append(tracks[1]):Join(tracks[2])
        run.handles[1]=sequence
        sequence:SetOnComplete(finish):Play()
    end
end

function OnStart()
    root=script.object
    local shop=root:GetChild('shop')
    shelf=shop:GetChild('shelf')
    leave=shop:GetChild('leave')
    root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey2Down,function() begin();return true end)
    root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey9Down,function() stop(true);return true end)
    root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey8Down,function() root:SetActive(false);return true end)
    script:EnableUpdate(true)
end

function OnUpdate(dt)
    local run=active
    if not run then return end
    if not shelf.alive or not leave.alive then stop(false);return end
    if MODE~='lua' then return end
    run.time=run.time+math.max(0,dt)
    local p=math.min(1,run.time/SECONDS)
    local remaining=(1-p)^3
    shelf:SetAnchoredPosition(0,run.h*remaining)
    leave:SetAnchoredPosition(-510-run.w*remaining,-290)
    if p>=1 then run.finish() end
end

function OnDisable() stop(false) end
function OnDestroy() stop(false) end
