local F = dofile('tests/lua/support/game_ui_fixture.lua')
local Acts, Map, MapUI = require('abyss_acts'), require('abyss_map'), require('abyss_map_ui')
local Layout, Theme = require('abyss_map_layout'), require('abyss_theme')
local checkBounds = dofile('tests/lua/support/map_draw_bounds.lua')
local cursor = {CursorDown='down', CursorUp='up', CursorEnter='enter', CursorExit='exit', CursorDrag='drag'}
local capture = ... == 'capture' and dofile('scripts/official-assets-preview.lua') or nil
local mobile = Theme.officialAssets.mobileRunHud
local assets = {
    {{'The Guardian',112046}, {'Hexaghost',112028}, {'Slime Boss',112004}},
    {{'Champ',112018}, {'Automaton',112027}, {'Collector',112022}},
}

local function captureOrCheck(act, name, image, device)
    local chapter, map = Acts.get(act), Map.generate(F.Data, '42', act)
    local canvas = F.control({children=F.Layout})
    local root = F.Viewport.apply(canvas, 1280, 720)
    local panel = root:GetChild('mapPanel')
    local top = device == 'touch' and mobile.relicBar.origin[2]-mobile.hit/2 or Layout.viewport.top
    local calls = 0
    local ui = MapUI.new(panel, map, function(node)
        calls = calls + 1
        return Map.choose(map, node.id)
    end, 'click', {embedded=true, hudTop=top, cursor=cursor, imageSource='static',
        bossName=function(owner) assert(owner==map);return name end,
        color=function(r,g,b,a) return {r=r,g=g,b=b,a=a} end})
    local function at(kind, i) return F.mapControl(panel, kind..i) end
    while map.floor < chapter.boss-(capture and 2 or 1) do
        assert(Map.choose(map, Map.available(map)[1].id))
    end
    if capture then
        panel:SetVisible(true)
        assert(ui:scrollBy(10000))
        capture.capture('act'..act..'-'..name..'-'..device,ui,root,'seed 42, floor '..map.floor..', terminal scroll')
        return
    end

    local boss = assert(Map.available(map)[1])
    local box
    for i,node in ipairs(map.nodes) do
        if node.id == boss.id then box = at('node',i) end
    end
    assert(box and boss.floor==chapter.boss)
    assert(ui:focusCurrent())
    ui:setNavigationEnabled(true)
    local icon, hit = box:GetChild('icon'), box:GetChild('hit')
    assert(box.visible and hit.visible and icon.imageId==image)
    assert(icon.sizeDeltaX==252 and icon.sizeDeltaY==252)
    assert(hit.sizeDeltaX==126 and hit.sizeDeltaY==126)
    local viewport = {left=Layout.viewport.left,right=Layout.viewport.right,bottom=Layout.viewport.bottom,top=top}
    checkBounds(box,viewport)
    assert(top-box.y-icon.sizeDeltaY/2==8,'terminal framing margin')

    local edgeIndex, approaches = 0, 0
    for _,node in ipairs(map.nodes) do
        for _,id in ipairs(node.nextIds) do
            if node.type~='boss' then
                edgeIndex=edgeIndex+1
                if id==boss.id then
                    approaches=approaches+1
                    local edge=at('edge',edgeIndex)
                    assert(edge.visible and edge:GetChild('routeInk1').visible)
                    local angle, length = math.rad(edge.localRotationZ),edge.sizeDeltaX
                    local x,y=edge.x+math.cos(angle)*length/2,edge.y+math.sin(angle)*length/2
                    assert(math.abs(math.max(math.abs(box.x-x),math.abs(box.y-y))-132)<.01,'approach crosses portrait margin')
                end
            end
        end
    end
    assert(approaches>0)
    local event = device=='touch' and {touchId=17} or {}
    hit.listeners.down(event)
    for _=1,12 do
        assert(ui:update(.08))
        assert(icon.sizeDeltaX==252 and icon.sizeDeltaY==252)
        checkBounds(box,viewport)
    end
    hit.listeners.up(event)
    assert(hit.listeners.click(event) and map.floor==chapter.boss and calls==1)
    assert(not hit.listeners.click(event) and calls==1)
    print(('PASS BOSS_EMBLEM act=%d image=%d input=%s approaches=%d'):format(act,image,device,approaches))
end

for act, bossAssets in ipairs(assets) do
    for i, boss in ipairs(bossAssets) do
        local name, image = table.unpack(boss)
        if not capture or i==1 then
            captureOrCheck(act,name,image,'mouse')
            captureOrCheck(act,name,image,'touch')
        end
    end
end
if capture then capture.print() end
