-- Real chapter maps and generated native controls; no chapter combat is faked.
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Map=require('abyss_map')
local MapUI=require('abyss_map_ui')
local count=0
local function test(name,fn)fn();count=count+1;print('ok chapter map '..count..' - '..name)end
local function fixture(act,map)
    local root=F.Viewport.apply(F.control({children=F.Layout}),1280,720)
    local panel=root:GetChild('mapPanel')
    map=map or Map.generate(F.Data,'42',act)
    local ui=MapUI.new(panel,map,function(node)return Map.choose(map,node.id)end,'click',{
        embedded=true,imageSource='static',color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end})
    return ui,panel,map
end
local function box(panel,map,id)
    for i,node in ipairs(map.nodes)do
        if node.id==id then return F.mapControl(panel,'node'..i)end
    end
    error('missing real node')
end
test('later chapters expose legal first nodes at local row one',function()
    for _,act in ipairs({2,3,4})do
        local ui,panel,map=fixture(act)
        assert(ui.navigationEnabled,'chapter start incorrectly locked')
        assert(ui.scroll==0,'chapter start incorrectly scrolled to global floor')
        for _,node in ipairs(Map.available(map))do
            local control=box(panel,map,node.id)
            assert(control.visible and control:GetChild('hit').visible,'first node is offscreen or inert')
            assert(control.y==require('abyss_map_layout').firstY,'global floor leaked into local geometry')
        end
        assert(F.mapControl(panel,'title').text:find(require('abyss_acts').get(act).name,1,true))
    end
end)
test('each complete chapter route remains reachable within the same viewport',function()
    for _,act in ipairs({2,3,4})do
        local ui,panel,map=fixture(act)
        local rooms=0
        while #Map.available(map)>0 do
            ui:setNavigationEnabled(true)
            local node=Map.available(map)[1]
            ui:focusCurrent()
            local control=box(panel,map,node.id)
            local hit=control:GetChild('hit')
            if node.roomKind=='boss_treasure' then
                assert(act==2 and #Map.available(map)==1 and not control.visible and not hit.visible)
                assert(not hit.click(),'host-owned boss treasure must not accept a map click')
                -- Project the host's automatic room entry after the boss rewards.
                assert(Map.choose(map,node.id));ui:render()
            else
                assert(control.visible and hit.visible,'next chapter room is offscreen')
                assert(hit.click())
            end
            assert(map.floor==node.floor)
            rooms=rooms+1
        end
        assert(rooms==(act==4 and 4 or 17))
        local notice=F.mapControl(panel,'notice').text
        if act==2 then assert(notice:find('宝箱',1,true))
        else assert(not notice:find('宝箱',1,true),'ending falsely described as Boss treasure')end
    end
end)
test('restored later chapters focus local progress and wait for the host grant',function()
    local map=Map.generate(F.Data,'42',3)
    for _=1,8 do assert(Map.choose(map,Map.available(map)[1].id))end
    local restored=assert(Map.restore(F.Data,Map.snapshot(map)))
    local ui,panel=fixture(3,restored)
    assert(not ui.navigationEnabled)
    assert(box(panel,restored,restored.currentNodeId).visible,'restored current room is offscreen')
    ui:setNavigationEnabled(true)
    local node=Map.available(restored)[1]
    assert(box(panel,restored,node.id):GetChild('hit').click())
    assert(restored.floor==node.floor)
end)
test('restoring either boss or boss treasure retains the route and hides the map exit',function()
    local Acts=require('abyss_acts')
    local Layout=require('abyss_map_layout')
    local Theme=require('abyss_theme')
    for act=1,2 do
        local chapter=Acts.get(act)
        local map=Map.generate(F.Data,'42',act)
        local ordinary, chest
        for _,node in ipairs(map.nodes)do
            if node.floor==chapter.first+8 and node.type=='treasure' then ordinary=node end
            if node.floor==chapter.last and node.roomKind=='boss_treasure' then chest=node end
        end
        assert(ordinary and chest)
        local ui,panel=fixture(act,map)
        assert(ui:setScroll(Layout.firstY+8*Theme.layout.map.floorGap-Layout.focusY))
        assert(box(panel,map,ordinary.id).visible,'ordinary treasure missing')

        while map.floor<chapter.boss-1 do assert(Map.choose(map,Map.available(map)[1].id))end
        local boss=Map.available(map)[1]
        assert(boss.nextIds[1]==chest.id)
        local edgeCount=0
        for _,node in ipairs(map.nodes)do
            if node.id~=boss.id then edgeCount=edgeCount+#node.nextIds end
        end
        for floor=chapter.boss-1,chapter.last do
            local snapshot=Map.snapshot(map)
            local restored=assert(Map.restore(F.Data,snapshot))
            local restoredUI,restoredPanel=fixture(act,restored)
            assert(restored.floor==floor and #restored.path==floor-chapter.first+1)
            assert(restored.currentNodeId==snapshot.currentNodeId and not restoredUI.navigationEnabled)
            assert(restoredUI:setScroll(Layout.bossTreasureMaxScroll))
            assert(box(restoredPanel,restored,boss.id).visible,'boss missing from map end')
            local hidden=box(restoredPanel,restored,chest.id)
            assert(not hidden.visible and not hidden:GetChild('hit').visible,'treasure has a map target')
            assert(not F.mapControl(restoredPanel,'edge'..(edgeCount+1)).visible,'treasure has a map edge')
            assert(not restoredUI:choose(chest.id) and restored.floor==floor)
            if floor<chapter.last then
                local available=Map.available(restored)
                assert(#available==1 and available[1].id==(floor==chapter.boss and chest.id or boss.id))
                assert(Map.choose(map,available[1].id))
            end
            print(('RESTORED_MAP_END act=%d floor=%d boss=visible treasure=hidden edge=hidden'):format(act,floor))
        end
    end
end)
print('CHAPTER_MAP_PASS '..count)
