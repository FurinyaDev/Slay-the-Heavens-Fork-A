-- Read state, issue Run commands. No damage/energy/outcome rules live in this view.
local Actors = require("abyss_actor")
local CardDisplay = require("abyss_card_display")
local Run = require("abyss_run")
local RewardOwner = require("abyss_battle_reward_owner")
local RewardLayout = require("abyss_battle_reward_layout")
local Theme = require("abyss_theme")
local M = {}
local C, L = Theme.color, Theme.layout
local function usesSharedActionFace(name)
    return Theme.presentationProfile=='official-assets-first' and (name=='skip' or name=='start')
end
-- Explicit ports preserve the approved implementation without a shared constructor closure.
function M.install(owner, ownership, host, dependencies)
    local closeInfo
    local function isCard(spec)
        return spec and (spec.kind=="card" or spec.kind=="rewardCard")
    end
    local function endTurnFace(part,state)
        local fill=state=='disabled' and C.panelSunken or L.endTurn.faceColour
        for _,name in ipairs({'plate','plateLeft','plateRight'})do dependencies.tint(part:GetChild(name),fill)end
        dependencies.ink(part:GetChild('label'),state=='disabled' and C.textMuted or L.endTurn.textColour)
    end
    local function button(name, enabled, primary, caption)
        local box = dependencies.child(name)
        box.interactable,box.raycastTarget = enabled == true,enabled == true
        for _, state in ipairs({"normal", "hover", "pressed", "disabled"}) do
            local part = box:GetChild(state)
            if caption then part:GetChild("label").text = caption end
            if name=='endTurn' then
                endTurnFace(part,state)
            elseif not usesSharedActionFace(name)
                and not RewardLayout.paintButton(name,part,state,owner.run,host.platform,dependencies.tint,dependencies.ink)
                and (state == "normal" or state == "hover") then
                dependencies.tint(part:GetChild("plate"), primary and (state == "hover" and C.goldBright or C.geo) or C.panelRaised)
                dependencies.ink(part:GetChild("label"), primary and C.textOnLight or C.goldBright)
            end
        end
    end
    function owner:resize(width, height)
        local cancelled = dependencies.cancelPotionAim("已取消药水瞄准。") or self.gesture ~= nil or self.carry ~= nil
        dependencies.cancelCardInputs()
        dependencies.cancelPotionInputs()
        dependencies.cancelActionInputs()
        for _, input in ipairs(ownership.enemyInputs) do input.held, input.released = nil, nil end
        if cancelled then self.gesture, self.carry, self.selected, self.suppressClick = nil, nil, nil, true end
        self:closePowerTip()
        if closeInfo() then cancelled = true end
        self.canvasWidth, self.canvasHeight = width, height
        local k = math.min(width / Theme.canvas.base[1], height / Theme.canvas.base[2])
        dependencies.child("dragLayer"):GetChild("hit"):SetSizeDelta(width/k,height/k)
        if not host.options.embedded then -- The host owns the single canvas scale.
            host.stage:SetLocalScale(k, k, 1)
            host.root:GetChild("backdrop"):SetSizeDelta(width, height)
        end
        local handWidth = host.pileLayout.extraWidth()
        local handChanged = handWidth ~= (self.handWidthExtra or 0)
        self.handWidthExtra = handWidth
        if cancelled or (handChanged and self.active and self.run and self.run.phase=='combat') then self:render() end
    end
    local function describeInfo(battle, info, actor)
        return host.infoContent(owner.data, owner.presentation, battle, info, actor)
    end
    closeInfo = function(preserveHover)
        if host.potionPopup and host.potionPopup:close() then return true end
        if not owner.info then return false end
        -- Unpinned hover readers yield to a new gesture. Explicit and held readers consume their close.
        local info=owner.info
        local passThrough=info.transient and (isCard(info) or info.powerTips)
        owner.info = nil
        local handFocus
        if isCard(info) then
            if not preserveHover and owner.hover==info.slot then
                owner.hover,owner.handHover=nil,nil
                handFocus=info.kind=='card'
            end
            if owner.help and owner.help.source==info.source then owner.help=nil end
        end
        dependencies.child("statusInfo"):SetVisible(false)
        if info.powerTips then dependencies.child("statusDismiss"):SetVisible(false) end
        return true,passThrough,handFocus
    end
    function owner:canPinPowerTips(source)
        local info = self.info
        return info and info.powerTips and info.source == source and (info.pages or 1) > 1
            and not self.selected and not self.potionAim
    end
    function owner:dismissEnemyHelp(source)
        local info = self.info
        if not info or not info.powerTips or source and (info.source ~= source or not info.transient) then return false end
        return closeInfo()
    end
    function owner:closePowerTip(source)
        if not self.powerTip or source and source ~= self.powerTip.source then return end
        self.powerTip = nil
        host.renderInfo(self.run and self.run.combat)
        return true
    end
    function owner:showPowerTip(spec, source, touch)
        local run = self.run
        if not run or run.phase ~= "combat" or not self.active or self.info then return end
        local tip = self.powerTip
        if touch and tip and tip.source == source and tip.touch then
            return self:closePowerTip(source)
        end
        self.powerTip = {kind = "powerTips", index = 0, statusId = spec.statusId, offset = spec.offset,
            source = source, touch = touch, battle = run.combat, position = not touch and spec.position or nil}
        host.renderInfo(run.combat)
    end
    function owner:showStatus(index)
        local run = self.run
        if not self.active or self.busy or self.gesture or not run or run.phase ~= "combat" then return false end
        local actor = index == 0 and run.combat.player or run.combat.enemies[index]
        if not Actors.isPresent(actor) then return false end
        local cancelled=dependencies.cancelPotionAim("已取消药水瞄准。")
        if self.info and self.info.index == index and self.info.id == actor.id then
            local _,_,handFocus=closeInfo()
            self:renderDetailsOnly(cancelled,handFocus)
        else
            self.info = {index = index, id = actor.id, battle = run.combat}
            self:renderDetailsOnly(cancelled)
        end
        return true
    end
    local function helpContext(spec)
        local run=owner.run
        if not spec or not run or not owner.active or owner.busy then return end
        local reward=spec.kind=='rewardCard' and RewardOwner.ready(owner,spec)
        if run.phase~='combat' and not reward then return end
        local battle=run.combat
        local actor=spec.index==0 and battle.player or battle.enemies[spec.index]
        if Actors.isPresent(actor) then return battle,actor,reward end
    end
    local function handSlot(battle,uid)
        for slot,instance in ipairs(battle.hand)do if instance.uid==uid then return slot end end
    end
    function owner:cardHelpReady(info,covered)
        local run=self.run
        if not isCard(info) or not run or not (self.active or covered) or self.busy or run~=info.run or run.combat~=info.battle then return false end
        if info.reward then
            return RewardOwner.ready(self,info.reward,covered) and Run.rewardOptions(run)[info.slot]==info.reward.cardId
        end
        if run.phase~="combat" or run.combat.phase~="player" or run.combat.turn~=info.turn then return false end
        local instance=run.combat.hand[info.slot]
        return instance and instance.uid==info.uid
    end
    function owner.hasOverflowCard(_,info)
        return isCard(info) and CardDisplay.bodyOverflows(dependencies.child('card'..info.slot):GetChild('label'))
    end
    function owner:openOverflowCard(info)
        return host.options.onCardFocus and self:cardHelpReady(info) and self:hasOverflowCard(info)
            and not (self.gesture or self.carry or self.selected or self.potionAim or self.potionMenu)
            and host.options.onCardFocus(info)
    end
    local function openCardHelp(spec,source,transient,battle,actor,reward)
        local slot=spec.slot or handSlot(battle,spec.uid)
        local info={kind=spec.kind,index=0,id=actor.id,actor=actor,uid=spec.uid,slot=slot,source=source,
            run=owner.run,battle=battle,turn=battle.turn,transient=transient==true,
            reward=reward and spec or nil,press=spec.press}
        if not slot or not owner:cardHelpReady(info) then return false end
        local cancelled=dependencies.cancelPotionAim("已取消药水瞄准。")
        owner.info=info
        if owner.hover~=slot then owner:setHover(slot,cancelled)
        else owner:renderDetailsOnly(cancelled) end
        return owner.info==info
    end
    local function repeatsEnemyHelp(info, spec, source, battle, actor)
        return info and not info.transient and info.powerTips and info.actor == actor
            and info.battle == battle and info.turn == battle.turn and info.source == source
            and info.statusId == spec.statusId and info.offset == spec.offset
    end
    local function openEnemyHelp(spec, source, transient, battle, actor)
        if owner.gesture or owner.carry or owner.potionMenu or owner.potionAim and owner.potionAim.moving then return false end
        local info = owner.info
        if transient and info and not info.transient then return false end
        if not transient and repeatsEnemyHelp(info, spec, source, battle, actor) then return closeInfo() end
        owner.help = nil
        owner.info = {index=spec.index, id=actor.id, actor=actor, battle=battle, turn=battle.turn,
            powerTips=true, source=source, statusId=spec.statusId, offset=spec.offset, transient=transient==true}
        if not transient then
            dependencies.cancelActionInputs()
            for _, input in pairs(ownership.enemyInputs) do input.held, input.released = nil, nil end
        end
        host.renderInfo(battle)
        return owner.info~=nil
    end
    function owner.openHelp(_, spec, source, transient)
        if owner.info and owner.info.press then return false end
        local battle,actor,reward=helpContext(spec)
        if not actor then return false end
        if isCard(spec) then return openCardHelp(spec,source,transient,battle,actor,reward) end
        if spec.powerTips then return openEnemyHelp(spec,source,transient,battle,actor) end
        local cancelled=dependencies.cancelPotionAim("已取消药水瞄准。")
        owner.info={index=spec.index,id=actor.id,battle=battle,kind=spec.kind,statusId=spec.statusId,
            offset=spec.offset,uid=spec.uid,source=source,transient=transient==true,
            slot=spec.slot,potionId=spec.potionId,inventory=spec.inventory}
        owner:renderDetailsOnly(cancelled)
        return owner.info~=nil
    end
    function owner.queueHelp(_,spec,source,held,touch,card)
        if owner.info and owner.info.press then return end
        local battle, actor = helpContext(spec)
        if not actor then return end
        owner.help={spec=spec,source=source,held=held,touch=touch,t=0,run=owner.run,battle=battle,
            turn=battle.turn,actor=actor,card=card}
    end
    function owner.cardHelpSpec(_,slot)
        local run=owner.run
        if run and run.phase=='reward' and owner.rewardScreen=='cards' then
            local id=Run.rewardOptions(run)[slot]
            if not id then return end
            return RewardOwner.capture({kind='rewardCard',index=0,battle=run.combat,slot=slot,cardId=id,
                upgraded=run.rewards.cardUpgrades and run.rewards.cardUpgrades[slot]==true},owner,run)
        end
        local battle=owner.run and owner.run.phase=="combat" and owner.run.combat
        local instance=battle and battle.hand[slot]
        if not instance then return end
        -- Every live hand card needs a read-only detail route, even without keywords.
        return {kind="card",index=0,uid=instance.uid,slot=slot}
    end
    function owner:potionHelpSpec(slot)
        local run = self.run
        if not run or run.phase ~= "combat" or not run.potions[slot] or slot>Run.potionCapacity(run) then return end
        return {kind="potion",index=0,slot=slot,potionId=run.potions[slot],inventory=run.potions}
    end
    return {
        button=button, describeInfo=describeInfo, closeInfo=closeInfo, endTurnFace=endTurnFace
    }
end
return M
