-- Run with the generated official profile ahead of src/lua on LUA_PATH.
local Map, UI = require('abyss_map'), require('abyss_map_ui')
local Acts, Layout = require('abyss_acts'), require('abyss_map_layout')
local Theme, Viewport = require('abyss_theme'), require('abyss_viewport')
local F = dofile('tests/lua/support/game_ui_fixture.lua')
local spec
for _, root in ipairs(require('abyss_ui_layout')) do
    for _, child in ipairs(root.children or {}) do
        if child.name == 'mapPanel' then spec = child end
    end
end
assert(spec)
local function colour(r,g,b,a) return {r=r,g=g,b=b,a=a} end
local cursor = {CursorDown='down', CursorUp='up', CursorDrag='drag'}
local function makeUi(panel, map, hudTop)
    local ui
    ui = UI.new(panel, map, function(node) return Map.choose(ui.map, node.id) end,
        'click', {embedded=true, imageSource='static', color=colour, cursor=cursor, hudTop=hudTop})
    return ui
end
local panel = F.control(spec)
local ui = makeUi(panel, Map.generate(F.Data, 1))
local nodes, edges = {}, {}
for i=1,Layout.maxNodes do nodes[i]=F.mapControl(panel,'node'..i) end
for i=1,Layout.maxEdges do edges[i]=F.mapControl(panel,'edge'..i) end

local function signature(value)
    if type(value) ~= 'table' then return tostring(value) end
    local keys, fields = {}, {}
    for k in pairs(value) do keys[#keys+1]=k end
    table.sort(keys)
    for _, k in ipairs(keys) do fields[#fields+1]=tostring(k)..'='..signature(value[k]) end
    return '{'..table.concat(fields,',')..'}'
end
local function dashGeometry(parent, dash, scroll)
    local theta = math.rad(parent.localRotationZ)
    local x = parent.x + dash.x * math.cos(theta) - dash.y * math.sin(theta)
    local y = parent.y + dash.x * math.sin(theta) + dash.y * math.cos(theta)
    return x, y+scroll, math.rad((dash.localRotationZ or 0) + parent.localRotationZ)
end
local function crossings(route, points)
    local function orientation(a,b,c) return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x) end
    local count = 0
    for i, e in ipairs(route) do
        for j=i+1,#route do
            local other=route[j]
            local a,b,c,d=points[e[1]],points[e[2]],points[other[1]],points[other[2]]
            if orientation(a,b,c)*orientation(a,b,d)<-1e-6 and orientation(c,d,a)*orientation(c,d,b)<-1e-6 then
                count=count+1
            end
        end
    end
    return count
end
local function intersects(a,b)
    return math.abs(a.x-b.x)<(a.w+b.w)/2 and math.abs(a.y-b.y)<(a.h+b.h)/2
end
local function sweep(map, capture)
    local snap, points, route, patterns = signature(Map.snapshot(map)), {}, {}, {}
    local chapter = Acts.get(map.act or 1)
    local byId = {}
    for _, n in ipairs(map.nodes) do byId[n.id]=n end
    for _, n in ipairs(map.nodes) do
        for _, id in ipairs(n.nextIds) do
            if byId[id].roomKind~='boss_treasure' then route[#route+1]={n.id,id} end
        end
    end
    assert(#map.nodes<=Layout.maxNodes and #route<=Layout.maxEdges)
    local elapsed = os.clock()
    ui.map=map
    assert(ui:focusCurrent())
    local bindElapsed = os.clock()-elapsed
    local paintElapsed,frames=0,0
    local gap = Theme.layout.map.floorGap
    local maxCase = chapter.terminal=='boss_treasure' and Layout.bossTreasureMaxScroll or Layout.maxScroll+2*Theme.layout.map.bossFloorLift
    local step=2*gap
    for desired=0,maxCase+step,step do
        local t=os.clock()
        assert(ui:setScroll(desired))
        paintElapsed,frames=paintElapsed+os.clock()-t,frames+1
        local scroll=ui.scroll
        for i,n in ipairs(map.nodes) do
            local box=nodes[i]
            if box.visible then
                local hit, icon=box:GetChild('hit'),box:GetChild('icon')
                local p={x=box.x,y=box.y+scroll,w=hit.sizeDeltaX,h=hit.sizeDeltaY,kind=n.type,
                    iw=icon.sizeDeltaX,iy=icon.y,ink=icon.imageColor}
                assert(math.abs(hit.anchoredPositionX)<.001 and math.abs(hit.anchoredPositionY)<.001)
                if points[n.id] then
                    assert(math.abs(points[n.id].x-p.x)<.001 and math.abs(points[n.id].y-p.y)<.001,'coordinate changed on scroll')
                end
                points[n.id]=p
            end
        end
        for i,e in ipairs(route) do
            local edge=edges[i]
            if edge.visible then
                assert(edge.y>=Layout.viewport.bottom and edge.y<=Layout.viewport.top)
                local best, list=(patterns[i] and patterns[i].total or 0), {}
                local total=0
                for dot=1,8 do
                    local dash=edge:GetChild('routeInk'..dot)
                    if dash.visible then
                        local x,y,angle=dashGeometry(edge,dash,scroll)
                        assert(y-scroll>=Layout.viewport.bottom-.01 and y-scroll<=Layout.viewport.top+.01)
                        local a,b=points[e[1]],points[e[2]]
                        if Theme.officialAssets.mapRoutes and a and b then
                            assert(math.abs((b.x-a.x)*(y-a.y-a.iy)-(b.y+b.iy-a.y-a.iy)*(x-a.x))<.01,
                                'dash leaves the shared node axis')
                        end
                        total=total+dash.sizeDeltaX
                        if capture then list[#list+1]={x,y,angle,dash.sizeDeltaX,dash.sizeDeltaY,dash.imageColor} end
                    end
                end
                if total>best then patterns[i]={total=total,dots=list} end
            end
        end
        assert(ui.scroll<=maxCase)
    end
    assert(ui.scroll==maxCase and ui:setScroll(0) and ui.scroll==0)
    for _, n in ipairs(map.nodes) do
        if n.roomKind~='boss_treasure' then assert(points[n.id], 'room never appears: '..n.id) end
    end
    for i=1,#route do assert(patterns[i] and patterns[i].total>0,'route never appears: '..i) end
    local total,count,left,right=0,0,math.huge,-math.huge
    for i,n in ipairs(map.nodes) do
        if n.floor<chapter.boss then
            local p=points[n.id]
            total,count=total+p.x,count+1
            left,right=math.min(left,p.x),math.max(right,p.x)
            for j=i+1,#map.nodes do
                local other=points[map.nodes[j].id]
                assert(not other or not intersects(p,other),'overlapping room hitboxes')
            end
        end
    end
    assert(signature(Map.snapshot(map))==snap,'painting mutated the map or RNG state')
    if capture then
        local function rgba(c) return ('%d,%d,%d,%d'):format(c.r,c.g,c.b,c.a) end
        for _,n in ipairs(map.nodes) do
            local p=points[n.id]
            if p then print('DRAW', map.seed,'node',p.x,p.y,p.iw,p.iy,n.type,rgba(p.ink)) end
        end
        for _,pattern in ipairs(patterns) do
            for _,d in ipairs(pattern.dots) do print('DRAW',map.seed,'dash',d[1],d[2],d[3],d[4],d[5],rgba(d[6])) end
        end
    end
    return total/count,right-left,#map.nodes,#route,crossings(route,points),bindElapsed,paintElapsed,frames,snap
end

local function touch(seed)
    local map=Map.generate(F.Data,seed)
    local mobile=Theme.officialAssets.mobileRunHud
    local top=mobile.relicBar.origin[2]-mobile.hit/2
    local panel=F.control(spec)
    local ui=makeUi(panel,map,top)
    local w,h=2556,1179
    assert(ui:resize(w,h) and ui:focusCurrent())
    local slot
    for i,n in ipairs(map.nodes) do if n.id==Map.available(map)[1].id then slot=i;break end end
    local box=F.mapControl(panel,'node'..slot)
    local hit=box:GetChild('hit')
    local x,y=box.x,box.y
    ui.map=assert(Map.restore(F.Data,Map.snapshot(map)))
    map=ui.map
    assert(ui:focusCurrent() and box.x==x and box.y==y,'map restore shifted the first tap target')
    assert(hit.visible and hit.sizeDeltaX>=44 and hit.sizeDeltaY>=44)
    local scale=Viewport.scale(w,h)
    local function event(id,x,y)
        return {touchId=id,GetUIPos=function()return w/2+x*scale,h/2+y*scale end}
    end
    local start=event(10,box.x,box.y)
    hit.listeners.down(start)
    hit.listeners.up(start)
    assert(not hit.listeners.click(event(11,box.x,box.y)))
    assert(hit.listeners.click(start) and map.currentNodeId==map.nodes[slot].id)
    local bg=F.mapControl(panel,'dragArea')
    local scroll=ui.scroll
    bg.listeners.down(event(10,0,0))
    bg.listeners.drag(event(10,0,-100))
    bg.listeners.up(event(10,0,-100))
    assert(math.abs(ui.scroll-scroll-100)<.01 and #map.path==1)
    assert(ui:focusCurrent(true))
    ui:update(Layout.scrollSeconds)
    assert(ui.scroll==scroll)
    assert(ui:setScroll(1e6))
    local mobileMax=Layout.bossTreasureMaxScroll+Layout.viewport.top-top
    assert(ui.scroll==mobileMax)
    local boss=F.mapControl(panel,'node'..(#map.nodes-1))
    assert(boss.visible and boss.y+boss.sizeDeltaY/2<=top)
    assert(ui:resize(1280,720))
end

local selection=os.getenv('MAP_CAPTURE')
if selection then
    for seed in selection:gmatch('%d+') do sweep(Map.generate(F.Data,seed),true);touch(seed) end
else
    for seed=1,128 do
        for act=1,3 do
            local map=Map.generate(F.Data,seed,act)
            local mean,span,n,e,c,b,p,f,snap=sweep(map)
            print('CHECK',seed,act,mean,span,n,e,c,b,p,f)
            print('SNAP',seed,act,snap)
        end
    end
    for _,seed in ipairs({1,42,128}) do touch(seed) end
    print('PASS', '128 seeds, 384 maps and three touch replays')
end
