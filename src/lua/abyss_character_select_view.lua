-- Native selection presentation. All numbers and deck entries come from loadouts.
local Theme=require('abyss_theme')
local Select=require('abyss_character_select')
local number=require('abyss_numbers').integer
local Motion=require('abyss_character_entrance')
local M={}
function M.installAscension(state,rules,panel,platform)
    if rules.ascensionEnabled~=true then return end
    state.ascension=require('abyss_character_ascension_ui').new(
        panel:GetChild('ascensionPicker'),platform.getHighestUnlocked)
end
local function visible(control,value)
    if control and control.visible~=value then control:SetVisible(value)end
end
local function text(control,value)
    if control.text~=value then control.text=value end
end
local function image(control,platform,entry)
    if control and entry and platform.imageSource and control.imageId~=entry.id then
        control:SetImage(platform.imageSource,entry.id)
    end
end
-- The legacy layout lists cards in type order.
local typeOrder={attack=1,skill=2,power=3,status=4,curse=5}
local function sortedDeck(info)
    local cards={}
    for i,card in ipairs(info.deck)do cards[i]=card end
    table.sort(cards,function(a,b)
        local x,y=typeOrder[a.type] or 9,typeOrder[b.type] or 9
        if x~=y then return x<y end
        if a.count~=b.count then return a.count>b.count end
        return a.id<b.id
    end)
    return cards
end
-- The legacy selection summary shares no card faces with the deck browser.
local function renderStarterDeck(details,info)
    local parts={}
    for _,card in ipairs(sortedDeck(info))do parts[#parts+1]=card.name..'×'..number(card.count)end
    text(details:GetChild('deckTitle'),'初始牌组 · '..number(info.deckSize)..' 张')
    text(details:GetChild('deckSummary'),table.concat(parts,'  '))
end
local function selected(box,value)
    visible(box:GetChild('selected'),value)
end
local function paintBust(box,entry,platform)
    if not entry or not platform.imageSource then return end
    local hit=box:GetChild('hit')
    for _,state in ipairs({'normal','hover','pressed','disabled'}) do
        local face=hit:GetChild(state)
        local bust=face and face:GetChild('bust')
        image(bust,platform,entry)
    end
end
local function largeSlot(character,element)
    local slots=Theme.icon.heroSlots
    if character=='traveler' then return slots.large.traveler[element or 'ironclad'], slots.bust.traveler[element or 'ironclad'] end
    return slots.large[character], slots.bust[character]
end
local function showTravelerPortrait(portraits,key,native)
    for _,element in ipairs(Select.elements)do
        local name='traveler_'..element
        visible(portraits:GetChild(name),key==name and (element~='ironclad' or not native))
    end
end
local function paintPortraits(details,state,platform,originalSts)
    local large=largeSlot(state.character,state.element)
    local portraits=details:GetChild('portraits')
    local key=state.character=='traveler' and ('traveler_'..(state.element or 'ironclad')) or state.character
    local native=platform.portraits and platform.portraits.status and platform.portraits:status().selection
    if originalSts then visible(portraits,false)end
    for _,id in ipairs(Select.characters)do
        if id=='traveler' then
            showTravelerPortrait(portraits,key,native)
        else visible(portraits:GetChild(id),id==key) end
    end
    local portrait=portraits:GetChild(key)
    if portrait and portrait.visible and not originalSts then image(portrait,platform,large)end
    return large,native,not originalSts and portrait or nil
end
local function paintPortraitNote(details,info,large,native)
    local note=info.name
    if (not large or large.status=='placeholder') and not native then note=note..' · 肖像待补' end
    if large and large.playable==false then note=note..' · 非本次正式角色' end
    text(details:GetChild('portraitNote'),note)
end
local function paintCharacterButtons(panel,state,platform,originalSts,open,selection)
    for i,id in ipairs(Select.characters)do
        local box=panel:GetChild(i==5 and 'traveler' or 'character'..i)
        local allowed=(originalSts or open>1 or id=='traveler') and state:allowsCharacter(id)
        visible(box,allowed)
        selected(box,selection==id)
        local _,bust=largeSlot(id,id=='traveler' and (state.element or 'ironclad') or nil)
        if allowed and (not originalSts or id~='traveler') then paintBust(box,bust,platform)end
    end
end
local function paintThemesAndElements(panel,state,platform,elementsOpen)
    local traveler=state.character=='traveler'
    -- Theme layers are prebuilt per character/element; only visibility changes.
    local theme=traveler and state.element or state.character
    local group=panel:GetChild('themes')
    for _,id in ipairs(Select.characters)do if id~='traveler' then visible(group:GetChild(id),id==theme)end end
    for _,id in ipairs(Select.elements)do visible(group:GetChild(id),id==theme)end
    local elements=panel:GetChild('elements')
    visible(elements,traveler and elementsOpen>1)
    for i,id in ipairs(Select.elements)do
        local box=elements:GetChild('element'..i)
        local allowed=state:allowsElement(id)
        visible(box,allowed)
        selected(box,state.element==id)
        if allowed and elements.visible then paintBust(box,Theme.icon.heroSlots.bust.traveler[id],platform)end
    end
end
local function paintRelics(details,relicList)
    local relics,texts={},{}
    for _,r in ipairs(relicList)do relics[#relics+1]=r.name;if r.text and r.text~='' then texts[#texts+1]=r.text end end
    text(details:GetChild('relic'),#relics>0 and table.concat(relics,'、') or '无')
    text(details:GetChild('relicText'),table.concat(texts,' '))
end
local function paintInfo(details,info,nativeV25)
    text(details:GetChild('name'),info.name)
    text(details:GetChild('stats'),(nativeV25 and '生命：' or '生命  ')..number(info.maxHp)..(nativeV25 and '/' or ' / ')..number(info.maxHp))
    text(details:GetChild('gold'),(nativeV25 and '金币：' or '金币  ')..number(info.gold))
    paintRelics(details,info.relics)
    if not nativeV25 and details:GetChild('deckSummary') then renderStarterDeck(details,info) end
    for _,name in ipairs({'v25Story','v25RelicIcon'})do
        local detail=details:GetChild(name)
        if detail then visible(detail,info.id=='ironclad')end
    end
end
local function paintFigure(details,state,platform,originalSts,info)
    local large,native,portrait=paintPortraits(details,state,platform,originalSts)
    paintPortraitNote(details,info,large,native)
    return portrait
end
local function countAllowed(ids,allows)
    local count=0
    for _,id in ipairs(ids)do if allows(id)then count=count+1 end end
    return count
end
local function officialPanel(panel)
    return Theme.presentationProfile=='official-assets-first'
        and (panel:GetChild('stsCharacter')~=nil or panel:GetChild('v25Roster')~=nil)
end
function M.prepare(panel,state,platform)
    local roster=panel:GetChild('v25Roster')
    local open=countAllowed(Select.characters,function(id)return state:allowsCharacter(id)end)
    if roster then visible(roster,open==1) end
    paintCharacterButtons(panel,state,platform,panel:GetChild('stsCharacter')~=nil,open,nil)
end
function M.motion(panel,platform)
    local nativeV25=officialPanel(panel)
    return Motion.new(panel,platform,function(control,info)paintInfo(control,info,nativeV25)end)
end
local function paintPublished(panel,details,state,platform,motion,info,originalSts,nativeV25)
    local portrait
    if info then
        if not motion then paintInfo(details,info,nativeV25) end
        portrait=paintFigure(details,state,platform,originalSts,info)
    end
    if motion then
        local portraits=platform.portraits
        local native=portraits and portraits.status and portraits:status().selection
        motion:show(info,info and info.id=='ironclad' and native and (native.shown==true or native.phase=='ready'),portrait)
    else visible(panel:GetChild('confirm'),info~=nil) end
    local confirm=panel:GetChild('confirm'):GetChild('hit')
    local enabled=info~=nil and state:canConfirm()
    if confirm.interactable~=enabled then confirm.interactable=enabled end
    if confirm.raycastTarget~=enabled then confirm.raycastTarget=enabled end
    if state.ascension then state.ascension:paint(info and info.id)end
end
function M.render(panel,state,platform,published,motion)
    local info=state.info
    if published==false then info=nil end
    local originalSts=Theme.presentationProfile=='official-assets-first' and panel:GetChild('stsCharacter')~=nil
    local nativeV25=officialPanel(panel)
    text(panel:GetChild('hint'),state.notice or (nativeV25 and '' or (info and '查看初始信息，确认后开始冒险。' or '点击下方角色查看详情，再确认出发。')))
    -- 只剩一个可选角色/元素时不摆假选择钮（Pan 2026-10-31：单角色发版）。
    local open=countAllowed(Select.characters,function(id)return state:allowsCharacter(id)end)
    local elementsOpen=countAllowed(Select.elements,function(id)return state:allowsElement(id)end)
    local roster=nativeV25 and panel:GetChild('v25Roster')
    local selection=state.character
    if roster and (open==1 or selection=='traveler') then selection=nil end
    paintCharacterButtons(panel,state,platform,originalSts,open,selection)
    paintThemesAndElements(panel,state,platform,elementsOpen)
    local details=panel:GetChild('details');visible(details,info~=nil)
    if not nativeV25 then visible(panel:GetChild('deckView'),false)end
    if roster then
        visible(roster,open==1)
        visible(panel:GetChild('title'),info==nil)
        visible(roster:GetChild('selected'):GetChild('selection'),info~=nil)
    end
    paintPublished(panel,details,state,platform,motion,info,originalSts,nativeV25)
end
return M
