-- Read state, issue Run commands. No damage/energy/outcome rules live in this view.
local Combat = require("abyss_combat")
local Theme = require("abyss_theme")
local CardInput = require("abyss_card_input")
local EnemyView = require('abyss_battle_enemy_view')
local M = {}
local L = Theme.layout
-- Explicit ports preserve the approved implementation without a shared constructor closure.
function M.install(owner, _ownership, host, dependencies)
    local D = L.cardDrag
    local function nativeMonsterArtEnabled()
        return not host.platform or host.platform.nativeMonsterArtEnabled~=false
    end
    local function enemySlot(count, i, enemy)
        return EnemyView.position(count, i, enemy, nativeMonsterArtEnabled())
    end
    local function enemyPosition(battle,index)
        local entry,slot,count=EnemyView.find(battle,index,battle==owner.displayBattle and owner.feedback or nil)
        assert(entry,'enemy has no visible presentation slot')
        return enemySlot(count,slot,entry.actor)
    end
    -- STS mobile port: keep the grab offset at pickup, then ease the card to
    -- the finger-above pose over the first 80px instead of snapping +270.
    local function dragPose(g)
        local lift = g.touchScreen and 270*g.sourceScale or 0
        local gx, gy = g.grabDx or 0, g.grabDy or lift
        local dist = math.sqrt((g.x-(g.sx or g.x))^2+(g.y-(g.sy or g.y))^2)
        local t = math.max(0, math.min(1, dist/80))
        local k = t*t*(3-2*t)
        return g.x + gx*(1-k), g.y + gy + (lift-gy)*k
    end
    local function inPlayArea(x,y)
        local area = D.playArea
        return math.abs(x-area[1]) <= area[3]/2 and math.abs(y-area[2]) <= area[4]/2
    end
    local function enemyTargetAt(battle,x,y)
        if math.abs(x)>Theme.canvas.base[1]/2 or math.abs(y)>Theme.canvas.base[2]/2 then return end
        return EnemyView.targetAt(battle,x,y,nativeMonsterArtEnabled())
    end
    local function dragTarget(g)
        if not dependencies.dragReady(g) then return false end
        local battle = g.battle
        local ok, reason = Combat.canPlay(battle,g.uid,nil)
        if not ok and reason ~= "invalid_target" then return false end
        local hovered=enemyTargetAt(battle,g.x,g.y)
        CardInput.sample(g, g.x, g.y, hovered, not ok)
        if g.cancelled then return false, nil, g.aiming end
        if ok then return g.dropZone, nil end
        return g.aiming and hovered ~= nil and Combat.canPlay(battle,g.uid,hovered) or false, hovered, g.aiming
    end
    local function potionDragTarget(aim)
        if not dependencies.aimReady(aim) or not aim.x or not aim.y then return false,nil,true end
        local target=enemyTargetAt(aim.battle,aim.x,aim.y)
        return target~=nil,target,true
    end
    return {
        enemySlot=enemySlot, enemyPosition=enemyPosition, dragPose=dragPose, inPlayArea=inPlayArea, dragTarget=dragTarget,
        potionDragTarget=potionDragTarget, enemyTargetAt=enemyTargetAt
    }
end
return M
