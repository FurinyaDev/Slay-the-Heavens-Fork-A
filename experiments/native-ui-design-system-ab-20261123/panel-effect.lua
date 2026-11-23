-- Standalone local tint on the reward-panel fixture.
local bindBank = OnStart
local tint, active
local function cancel()
    local old = active
    active = nil
    if old then old:Kill(false) end
    if tint and tint.alive then tint.imageColor=Color(245,215,154,0) end
end

function OnStart()
    bindBank()
    local root=script.object
    tint=root:GetChild('panelTint')
    root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey5Down,function()
        cancel()
        local sequence=game.TweenSequence()
        sequence:Append(game.Tween(tint,{imageColor=Color(245,215,154,32)},.12):SetEase(Enum.EaseType.OutCubic))
        sequence:Append(game.Tween(tint,{imageColor=Color(245,215,154,0)},.12):SetEase(Enum.EaseType.OutCubic))
        active=sequence
        sequence:SetOnComplete(function()
            if active==sequence then active=nil end
        end):Play()
        return true
    end)
    root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey9Down,function() cancel();return true end)
end

function OnDisable() cancel() end
function OnDestroy() cancel() end
