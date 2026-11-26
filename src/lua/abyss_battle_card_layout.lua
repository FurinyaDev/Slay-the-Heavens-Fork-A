-- Read state, issue Run commands. No damage/energy/outcome rules live in this view.
local Run = require("abyss_run")
local Theme = require("abyss_theme")
local Viewport = require('abyss_viewport')
local Actors = require('abyss_actor')
local EnemyView = require('abyss_battle_enemy_view')
local M = {}
local L = Theme.layout
-- Explicit ports preserve the approved implementation without a shared constructor closure.
function M.install(owner, _ownership, host, _dependencies)
    local R = L.rewardPick
    local health
    local function prepareHandFocus(battle)
        health = nil
        if not battle or (owner.handWidthExtra or 0) <= 0 or Theme.presentationProfile ~= 'official-assets-first' then return end
        health = {}
        local platform = host and host.platform
        for _, enemy in ipairs(battle.enemies) do
            if Actors.isActive(enemy) then
                local g = EnemyView.geometry(enemy, platform and platform.nativeMonsterArtEnabled)
                local x = g.x + g.healthX
                local halfWidth = (g.healthWidth or g.hitWidth) / 2 + Theme.space.border
                -- Protect both the visible bar border and the native 1.2em health text.
                local bottom = math.min(g.healthY - g.healthHeight / 2 - Theme.space.border,
                    g.healthTextY - Theme.font.body * .6)
                health[#health + 1] = {left = x - halfWidth, right = x + halfWidth,
                    bottom = g.y + bottom - Theme.space.xs}
            end
        end
    end
    local function placeHandHit(box, w, h, restAngle, point, scale)
        local r = restAngle * math.pi / 180
        local c,s = math.abs(math.cos(r)),math.abs(math.sin(r))
        local restH,restW = (h*c+w*s)/2,(w*c+h*s)/2
        local hotH = h * point.focusScale / 2
        local low = math.min(point.baseY-restH,point.focusY-hotH)
        local high = math.max(point.baseY+restH,point.focusY+hotH)
        local dy,a = (low+high)/2-point[2],box.localRotationZ*math.pi/180
        local hit = box:GetChild('hit')
        -- Inverse the card transform: one world-space hit rectangle covers both poses.
        hit:SetAnchoredPosition(math.sin(a)*dy/scale,math.cos(a)*dy/scale)
        local width=math.max(restW*2,w*point.focusScale)
        -- Adjacent hand centres own disjoint horizontal lanes. Keeping a full
        -- hover-width receiver here lets a later sibling steal the initial press.
        hit:SetSizeDelta(math.min(width,point.hitWidth or width)/scale,(high-low)/scale)
        hit:SetLocalScale(1,1,1)
        hit.localRotationZ = -box.localRotationZ
    end
    local function placeCard(box, count, index, selected, measureOnly)
        local w, h = L.card.size[1], L.card.size[2]
        local x, baseY, angle, spacing = Viewport.handSlot(count, index, owner.handWidthExtra)
        local focusY,focusScale,ceiling = Viewport.handFocus(baseY, x, health)
        local y = selected and focusY or baseY
        local laneWidth=count>1 and spacing or nil
        local point={x, y, baseY=baseY,hitWidth=laneWidth,focusY=focusY,focusScale=focusScale,ceiling=ceiling}
        if measureOnly then return point end
        box:SetAnchoredPosition(x, y)
        local scale = selected and focusScale or 1
        box:SetLocalScale(scale, scale, 1)
        box.localRotationZ = selected and 0 or angle
        placeHandHit(box,w,h,angle,point,scale)
        box:GetChild("glow"):SetVisible(selected)
        box:SetAsLastSibling()
        return point
    end
    local function rewardTarget(slot)
        local hot = owner.hover == slot
        return hot and R.hoverScale or R.scale, hot and R.hoverLift or 0
    end
    local function placeReward(box, count, index, anim, hot)
        local hit = box:GetChild('hit')
        hit:SetAnchoredPosition(0,0)
        hit:SetSizeDelta(L.card.size[1],L.card.size[2])
        hit:SetLocalScale(1,1,1)
        hit.localRotationZ = 0
        local x = (index - 1 - (count - 1) / 2) * R.step
        box:SetAnchoredPosition(x, R.y + anim.lift + anim.rise)
        box:SetLocalScale(anim.scale, anim.scale, 1)
        box.localRotationZ = 0
        box:GetChild("glow"):SetVisible(hot)
        -- Later siblings draw on top: neighbours first, the hovered card last.
        if not hot then box:SetAsLastSibling() end
        return {x, R.y}
    end
    local function canHover()
        return owner.active and not owner.busy and not owner.gesture and not owner.carry
    end
    local function hoverCard(run,slot)
        if not run or not slot then return end
        if run.phase=='combat' and run.combat.phase=='player' then return run.combat.hand[slot] end
        if run.phase=='reward' and owner.rewardScreen=='cards' then return nil,Run.rewardOptions(run)[slot] end
    end
    function owner:setHover(slot, full)
        local run = self.run
        local hand,reward = hoverCard(run,slot)
        if slot and not (canHover() and (reward or hand)) then slot,hand = nil,nil end
        if self.hover == slot then return end
        self.hover = slot
        self.handHover = hand and {run=run,battle=run.combat,turn=run.combat.turn,slot=slot,uid=hand.uid}
        if full then return self:render() end
        if not host.cardView.refreshHover() then return self:render(true) end
        if self.info then self:renderDetailsOnly() end
    end
    return {
        prepareHandFocus=prepareHandFocus, placeCard=placeCard, rewardTarget=rewardTarget, placeReward=placeReward, canHover=canHover
    }
end
return M
