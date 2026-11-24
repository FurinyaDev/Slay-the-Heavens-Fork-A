local Theme = require("abyss_theme")
local M = {}
local baseWidth, baseHeight = table.unpack(Theme.canvas.base)

function M.measure(width, height, mobile)
    assert(type(width) == "number" and width > 0 and width < math.huge, "invalid canvas width")
    assert(type(height) == "number" and height > 0 and height < math.huge, "invalid canvas height")
    local scale = math.min(width / baseWidth, height / baseHeight)
    local w, h = width/scale, height/scale
    -- A mobile 16:9 report can also be the game's logical canvas. Retain
    -- DIAG-12's native paint allowance outside it, never extending input.
    local bleed = mobile and width/height >= baseWidth/baseHeight - 1e-6 and Theme.canvas.mobileBleedX or 0
    return {scale=scale, mobile=mobile, input={0,0,w,h}, visual={0,0,w+bleed/scale,h}}
end

local function find(node,path)
    for name in path:gmatch('[^/]+') do
        node=node and node:GetChild(name)
    end
    return node
end

-- Only scene art uses cover. Actors, cards and the entire native input tree
-- keep the shared fit scale; their centre is unchanged when the stage grows.
local scenes = {
    'menuPanel/menuRuinsScene', 'menuPanel/backdrop', 'menuPanel/lowpolyScene',
    'characterPanel/v25Background/landscape', 'characterPanel/veil',
    'characterPanel/lumineSelectionBackground',
    'officialBattleBackdrop', 'battlePanel/lowpolyScene',
}
local modalPanels = {
    'deckPanel', 'relicPanel', 'choicePanel', 'potionPanel',
    'characterPanel', 'exitPanel', 'runMenu', 'victoryEasterEgg',
}
local fullPlates = {
    'menuPanel/lowpolyVeil', 'characterPanel/officialBackdropVeil',
    'characterPanel/v25Background/selectionShade', 'mapPanel/v25MapPaper/darkField',
    'mapPanel/mapGroup1/mapField', 'battlePanel/feedback/deathShade', 'nodePanel/roomEffect/shade',
}
local bands = {
    'menuPanel/titleBand', 'nodePanel/headerShade', 'nodePanel/headerDivider',
    'mapPanel/mapGroup1/headerShade', 'mapPanel/mapGroup1/headerDivider',
    'battlePanel/feedback/v25TurnNotice/shade', 'battlePanel/feedback/v25TurnNotice/fadeTop',
    'battlePanel/feedback/v25TurnNotice/fadeBottom',
    'nodePanel/shopRoom/sky', 'nodePanel/shopRoom/distantWall', 'nodePanel/shopRoom/overheadBeam',
    'nodePanel/shopRoom/beamEdge', 'nodePanel/shopRoom/stoneFloor/slate',
    'nodePanel/shopRoom/stoneFloor/depth', 'nodePanel/shopRoom/stoneFloor/terraceEdge',
    'nodePanel/eventView/neowFigure/floorJoint0', 'nodePanel/eventView/neowFigure/floorJoint1',
    'nodePanel/eventView/neowFigure/floorJoint2',
}
local bottomFills = {
    {'nodePanel/shopRoom/stoneFloor/slate',-221,278},
    {'nodePanel/eventView/neowFigure/scene',-21.5,677},
    {'nodePanel/eventView/neowFigure/floor',-250,220},
    {'battlePanel/rewardStage/v25RewardField/dark',-22,676},
    {'battlePanel/rewardList/v25RewardField/dark',-22,676},
    {'nodePanel/treasureView/v25TreasureField/dark',-22,676},
    {'nodePanel/shopView/v25ShopCloth/perimeter',-21.5,677},
    {'nodePanel/pickerView/forgeShade',-22,676},
    {'deckPanel/pileChrome/shade',-21.5,677},
}

local function size(control,w,h)
    if control then control:SetSizeDelta(w,h) end
end

local function scale(control,x,y)
    if control then control:SetLocalScale(x,y,1) end
end

local function fitBar(bar,wide,upper)
    if not bar then return end
    for _, name in ipairs({'steel','topLight'}) do
        local control=bar:GetChild(name)
        if control then
            control:SetAnchoredPosition(0,upper/2)
            scale(control,wide,1+upper/control.sizeDeltaY)
        end
    end
    scale(bar:GetChild('barShadow'),wide,1)
end

local function extendWall(masonry,width)
    if not masonry then return end
    local growth=(width-masonry.sizeDeltaX)/2
    if growth==0 then return end
    for row=0,6 do
        local left=masonry:GetChild('stone'..row*8)
        local right=masonry:GetChild('stone'..(row*8+7))
        left:SetAnchoredPosition(left.anchoredPositionX-growth/2,left.anchoredPositionY)
        left:SetSizeDelta(left.sizeDeltaX+growth,left.sizeDeltaY)
        right:SetAnchoredPosition(right.anchoredPositionX+growth/2,right.anchoredPositionY)
        right:SetSizeDelta(right.sizeDeltaX+growth,right.sizeDeltaY)
    end
    masonry:SetSizeDelta(width,baseHeight)
end

local function paintScene(stage,visual)
    local w,h=visual[3],visual[4]
    local wide,tall=w/baseWidth,h/baseHeight
    local cover=math.max(wide,tall)
    for _,path in ipairs(scenes) do scale(find(stage,path),cover,cover) end
    local battleScene=find(stage,'battlePanel/v25BattleScene')
    if battleScene then
        -- At 16:9 the scene ends under the HUD. In a taller view retain
        -- colour to the actual canvas edge, including the scene's Y offset.
        local sceneCover=tall>1 and math.max(cover,(h+44)/676) or cover
        scale(battleScene,sceneCover,sceneCover)
    end
    for _,name in ipairs({'sceneEdgeLeft','sceneEdgeRight'}) do
        local strip=find(stage,'menuPanel/'..name)
        if strip then strip:SetVisible(cover<=1+1e-6) end
    end
    for _,path in ipairs(fullPlates) do size(find(stage,path),w,h) end
    for _,path in ipairs(bands) do scale(find(stage,path),wide,1) end
    local overhang=(h-baseHeight)/2
    for _,layer in ipairs(bottomFills) do
        local control=find(stage,layer[1])
        if control then
            control:SetAnchoredPosition(0,layer[2]-overhang/2)
            control:SetSizeDelta(w,layer[3]+overhang)
        end
    end
    for _,path in ipairs({'battlePanel/topBar','mapPanel/officialRunBar','nodePanel/officialRunBar'}) do
        fitBar(find(stage,path),wide,overhang)
    end
    -- These panels deliberately have a framed inner area at 16:9. Keep
    -- that frame and extend the same material into any newly available area.
    scale(find(stage,'nodePanel/backdrop'),wide,tall)
    scale(find(stage,'menuPanel/deathShade'),wide,tall)
    extendWall(find(stage,'nodePanel/eventView/neowFigure/masonry'),w)
end

local function fitModals(stage,frame)
    for _,name in ipairs(modalPanels) do
        local panel=stage:GetChild(name)
        if panel then
            if name~='characterPanel' then size(panel:GetChild('veil'),frame.visual[3],frame.visual[4]) end
            size(panel:GetChild('blocker'),frame.input[3],frame.input[4])
        end
    end
    size(find(stage,'nodePanel/shopDismiss'),frame.input[3],frame.input[4])
    for _,path in ipairs({'battlePanel/statusInfo/hit','battlePanel/potionHelp/potionPopup/dismiss','potionPanel/dismiss'}) do
        size(find(stage,path),frame.input[3],frame.input[4])
    end
    size(find(stage,'battlePanel/statusDismiss'),frame.input[3]-2*Theme.canvas.safe.x,
        frame.input[4]-Theme.layout.topBar.height-Theme.canvas.safe.y)
end

local function fitSettings(stage,frame)
    local settings=stage:GetChild('exitEntry')
    if not settings then return end
    local w,h=frame.input[3],frame.input[4]
    local inset=Theme.canvas.safe
    local extra=(w-baseWidth)/2
    local x,y=math.max(0,extra-inset.x),0
    if frame.mobile then
        local base=Theme.layout.exitMenu.entry
        local hud=Theme.presentationProfile=='official-assets-first' and Theme.officialAssets.battleHud.menu or base
        x=math.min(x,w/2-inset.x-base[3]/2-hud[1])
        y=math.min(0,h/2-inset.y-base[4]/2-hud[2])
    end
    settings:SetAnchoredPosition(x,y)
    local deck=stage:GetChild('deckEntry')
    if deck then deck:SetAnchoredPosition(0,y) end
end

function M.apply(root, width, height, mobile)
    local frame = M.measure(width,height,mobile)
    local stage = assert(root:GetChild("stage"), "missing stage")
    -- The generated backdrop stretches with horizontal bleed beyond its native parent.
    -- Canvas dimensions belong only to the uniformly scaled content stage.
    assert(root:GetChild("canvasBackdrop"), "missing canvas backdrop")
    stage:SetLocalScale(frame.scale,frame.scale,1)
    stage:SetSizeDelta(frame.input[3],frame.input[4])
    paintScene(stage,frame.visual)
    fitModals(stage,frame)
    fitSettings(stage,frame)
    return stage, frame.scale, frame
end
return M
