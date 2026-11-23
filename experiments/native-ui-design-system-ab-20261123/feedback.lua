local root, hoverFx, trailFx, hoverOwner
local trailX, trailY, nextTrail, trailUntil, elapsed = nil, nil, 0, nil, 0
local hoverEnabled = MODE=='hover' or MODE=='theme' and hover
local trailEnabled = MODE=='trail' or MODE=='theme' and trail
local enabled = hoverEnabled or trailEnabled

local function desktop()
    return game.GetDevice()==Enum.Device.KeyboardAndMouse
end

local function stop(fx)
    if fx and fx.alive and fx.visible then
        fx:StopAnimation()
        fx:SetVisible(false)
    end
end

local function clean()
    hoverOwner,trailX,trailY,trailUntil=nil,nil,nil,nil
    nextTrail=elapsed
    stop(hoverFx)
    stop(trailFx)
end

local function play(fx,x,y)
    fx:SetAnchoredPosition(x,y)
    fx:SetVisible(true)
    fx:PlayAnimation()
end

function OnStart()
    root=script.object
    hoverFx=root:GetChild('hoverFx')
    trailFx=root:GetChild('trailFx')
    hoverFx:StopAnimation()
    trailFx:StopAnimation()
    local panel=root:GetChild('buttons')
    local row=panel:GetChild('row0')
    for _, button in ipairs(row:GetChildren()) do
        local priority=button.name=='button0' or button.name=='button5'
        if hoverEnabled and (not priorityOnly or priority) then
            button:AddCursorEventListener(Enum.CursorEventType.CursorEnter,function()
                if not enabled or not desktop() or not button.interactable then return end
                hoverOwner=button
                play(hoverFx,button:GetAnchoredPosition())
            end)
            button:AddCursorEventListener(Enum.CursorEventType.CursorExit,function()
                if hoverOwner==button then hoverOwner=nil;stop(hoverFx) end
            end)
        end
        button:AddCursorEventListener(Enum.CursorEventType.CursorClick,function()print('FX_CLICK',button.name)end)
    end
    root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey9Down,function()
        enabled=false
        script:EnableUpdate(false)
        clean()
        return true
    end)
    root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey8Down,function()
        enabled=false
        script:EnableUpdate(false)
        panel:SetVisible(false)
        clean()
        return true
    end)
    if trailEnabled and desktop() then script:EnableUpdate(true) end
end

function OnUpdate(dt)
    if not trailEnabled or not enabled then return end
    if not desktop() then clean();return end
    elapsed=elapsed+math.max(0,dt)
    if trailUntil and elapsed>=trailUntil then stop(trailFx);trailUntil=nil end
    if elapsed<nextTrail then return end
    nextTrail=elapsed+trailInterval
    local x,y=game.GetCursorUIPos()
    if trailX and (x-trailX)^2+(y-trailY)^2>=trailDistance^2 then
        local w,h=game.GetUICanvasSize()
        play(trailFx,x-w/2,y-h/2)
        trailUntil=elapsed+trailLifetime
        trailX,trailY=x,y
    elseif not trailX then trailX,trailY=x,y end
end

function OnDisable() clean() end
function OnDestroy() clean() end
