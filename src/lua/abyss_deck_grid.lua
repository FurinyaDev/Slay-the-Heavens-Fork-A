local CardDisplay=require('abyss_card_display')
local CardSkin=require('abyss_card_skin')
local PageReveal=require('abyss_page_reveal')
local Theme=require('abyss_theme')

local typeNames={attack='攻击',skill='技能',power='能力',status='状态',curse='诅咒'}
local M={typeNames=typeNames}

function M.textFitter(platform)
    if platform.deckBrowser or Theme.presentationProfile=='official-assets-first' then
        return CardDisplay.newTextFitter()
    end
end

function M.canPrepare(official,platform,grid)
    return official and not platform.deckBrowser and grid and grid.RefreshItems~=nil
end

function M.prepare(deck,grid,indexBases)
    if not deck.browserWarmupPending or deck.visible then return end
    deck.browserWarmupPending=false
    if indexBases[grid]~=nil then return end
    local generation=deck.generation
    local submitting,accepted=true,false
    local early={}
    local function remember(control,index)
        if deck.generation~=generation or deck.visible or indexBases[grid]~=nil
            or not control or control.alive==false or (index~=0 and index~=1) then return end
        pcall(control.SetVisible,control,false)
        if deck.generation==generation and not deck.visible then indexBases[grid]=index end
    end
    -- Hidden grids may defer callbacks. Opening the page supersedes the one-item probe.
    local ok,result=pcall(grid.RefreshItems,grid,1,function(control,index)
        if submitting then early.control,early.index=control,index
        elseif accepted then remember(control,index) end
    end)
    submitting,accepted=false,ok and result~=false
    if accepted then remember(early.control,early.index) end
    early.control,early.index=nil,nil
end

function M.paintPileHeading(root,deck,active,pileNames)
    if not deck.browserShell then return end
    local pileChrome=root:GetChild('pileChrome')
    local heading=pileChrome:GetChild('heading')
    local caption=active and pileNames[deck.pileKind]
    if caption and heading.text~=caption then heading.text=caption end
    heading:SetVisible(not not caption or deck.detailPages~=nil)
    for _,name in ipairs({'drawBadge','discardBadge'}) do
        local badge=pileChrome:GetChild(name)
        if badge and badge.visible then badge:SetVisible(false) end
    end
end

local function appearanceOf(deck,face,instance,display,definition,base,text)
    if not deck.browserShell or not CardSkin.referenceGeometry(face) then return end
    return {face,definition.id,definition.type,definition.rarity or false,definition.color or false,
        definition.originalV4 and definition.originalV4.role or false,display.name,not not instance.upgraded,
        definition.repeatable and (instance.upgrades or 1) or false,definition.cost,definition.costMode or false,
        base or false,not not deck.pileView,text}
end

local function containsSelection(deck,instance)
    for _,uid in ipairs(deck.choiceSelected or {}) do if uid==instance.uid then return true end end
    return false
end

function M.cardLook(deck,face,instance,display,definition,catalog,text)
    local printed=catalog.cards[instance.cardId]
    local base=instance.upgraded and printed.upgrade and printed.upgrade.cost or printed.cost
    return base,containsSelection(deck,instance),appearanceOf(deck,face,instance,display,definition,base,text)
end

local function sameAppearance(previous,current)
    if not previous or not current then return false end
    for index,value in ipairs(current) do
        if previous[index]~=value then return false end
    end
    return true
end

local function paintText(face,instance,display,definition,text,bodyUnchanged,fit,platform)
    CardDisplay.writeTitle(face:GetChild('name'),display.name,instance.upgraded,
        definition.repeatable and (instance.upgrades or 1) or nil,face:GetChild('type'),typeNames[definition.type] or definition.type,fit)
    local label=face:GetChild('label')
    local accepted=true
    if not bodyUnchanged then
        local _,written=CardDisplay.writeBody(label,text,face,fit)
        accepted=written
    end
    local ink=Theme.cardSkin.text.body
    if ink then label.fontColor=platform.color(ink.r,ink.g,ink.b,ink.a) end
    face:GetChild('cost').text=definition.cost==-2 and '' or definition.costMode=='all_energy' and 'X' or tostring(definition.cost)
    return accepted
end

local function finishPaint(deck,platform,palette,control,face,definition,base,selected,accepted)
    palette(face,definition)
    CardSkin.apply(face,definition,platform,{cost=definition.cost,baseCost=base,selected=selected,
        surfaceScope=deck.pileView and 'battle' or 'deck',templateKind=deck.browserShell and 'attack' or nil,
        templateMaterials=deck.browserShell})
    if deck.browserShell then
        for _,name in ipairs({'nativePlayableRim','glow','costHalo'}) do
            accepted=face:GetChild(name):SetVisible(false)~=false and accepted
        end
    end
    control:GetChild('uid').text=selected and '已选择' or ''
    return accepted
end

local function refreshArt(platform,face,art,definition,nativeArt,uid,syncArt)
    if nativeArt then
        CardDisplay.writeNativeArt(face,definition,nativeArt,platform,art,uid)
        return true
    elseif syncArt then
        local _,clean=CardDisplay.clearNativeArt(face,art)
        return not clean
    end
    return false
end

function M.painter(deck,platform,picture,palette)
    return function(control,face,instance,display,definition,base,selected,text,binding,appearance,browserFit)
        local previous=binding and binding.appearance
        local matches=sameAppearance(previous,appearance)
        local art=face:GetChild('art')
        local syncArt=not matches or display.nativeArt or binding.nativeArt or art.visible~=true
        if syncArt then PageReveal.registerSource(platform,'deckPanel') end
        local accepted=true
        if not matches then
            if binding then binding.appearance=nil end
            local bodyUnchanged=previous and previous[1]==face and binding.bodyText==text
            local fit=deck.browserShell and browserFit or nil
            local textAccepted=paintText(face,instance,display,definition,text,bodyUnchanged,fit,platform)
            accepted=CardDisplay.writeArt(art,definition,picture,face)~=false and textAccepted~=false
        end
        local artPending=refreshArt(platform,face,art,definition,display.nativeArt,instance.uid,syncArt)
        if matches then return accepted,artPending end
        return finishPaint(deck,platform,palette,control,face,definition,base,selected,accepted),artPending
    end
end

local function show(control)
    return control.visible==true or control:SetVisible(true)~=false
end

function M.showHit(deck,generation,control)
    if deck.generation~=generation or control.alive==false then return end
    local hit=control:GetChild('hit')
    if show(hit) and deck.generation==generation then return hit end
end

function M.publish(deck,generation,control)
    return show(control) and deck.generation==generation
end

return M
