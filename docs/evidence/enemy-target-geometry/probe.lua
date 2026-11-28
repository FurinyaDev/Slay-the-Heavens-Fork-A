-- Run from the repo root after build:theme and build:data. arg[1] can be
-- a directory containing the baseline versions of the same Lua modules.
package.path=(arg[1] or 'src/lua')..'/?.lua;src/lua/?.lua;build/targeting-official/?.lua;build/lua/?.lua;'..package.path
local Theme=require('abyss_theme')
assert(Theme.presentationProfile=='official-assets-first')
package.loaded.abyss_monster_art_data={status='refined-release'}
local View=require('abyss_battle_enemy_view')
local Unit=require('abyss_battle_unit_view')
local Targeting=require('abyss_battle_targeting')
local function noop() end
local render=Unit.new(noop,noop,noop)
local file=assert(io.open('src/lua/abyss_monster_source_geometry.lua'))
local ids={}
for line in file:lines() do
    local id=line:match("^ %['([%w_]+)'%]=")
    if id then ids[#ids+1]=id end
end
file:close()
local function box()
    local children={}
    local unit={}
    function unit:GetChild(name)
        if not children[name] then
            children[name]={
                SetVisible=noop,
                SetSizeDelta=function(c,w,h)c.sizeDeltaX,c.sizeDeltaY=w,h end,
                SetAnchoredPosition=function(c,x,y)c.x,c.y=x,y end,
                sizeDeltaX=name:match('^targetH') and 20 or 3,
                sizeDeltaY=name:match('^targetV') and 20 or 3
            }
        end
        return children[name]
    end
    return unit
end
local function actor(id)
    return {definitionId=id,id=id,hp=50,maxHp=50,block=0,statuses={}}
end
local function sample(id,a)
    local g=View.geometry(a,true)
    local b=box()
    render(b,a,g.portrait,nil,Theme.layout.battleUnit.nameWidth,true,g.hitWidth,g)
    local h,v=b:GetChild('targetH1_1'),b:GetChild('targetV1_1')
    print(table.concat({id,g.x,g.y,g.portrait,g.hitX,g.hitY,g.hitWidth,g.hitHeight,
        g.x+v.x,g.y+h.y,g.x+b:GetChild('targetV-1_-1').x,g.y+b:GetChild('targetH-1_-1').y},','))
end
if arg[2]=='bench' then
    local owner={}
    local selector=Targeting.install(owner,{}, {platform={}}, {aimReady=function()return true end})
    local enemies={}
    for i,id in ipairs({'sentry','wizard_gremlin','gremlin_nob','acid_slime_s','guardian'}) do
        enemies[i]=actor(id)
        enemies[i].sourcePosition={x=(i-3)*180,y=0}
    end
    local target=View.geometry(enemies[5],true)
    local aim={battle={enemies=enemies},x=target.hitX,y=target.hitY}
    assert(select(2,selector.potionDragTarget(aim))==5)
    for _=1,300 do selector.potionDragTarget(aim) end
    collectgarbage('collect')
    local start=os.clock()
    for _=1,20000 do selector.potionDragTarget(aim) end
    print(string.format('potion 5 enemies / 20,000 samples CPU ms: %.3f',(os.clock()-start)*1000))
else
    print('id,artX,artY,artSize,hitX,hitY,width,height,right,top,left,bottom')
    for _,id in ipairs(ids)do
        local a=actor(id)
        if id=='byrd' then a.statuses.flight=3; a.powerOrder={'flight'}; a.statusDefinitions={flight={name='Flight'}} end
        sample(id,a)
    end
    sample('byrd_grounded',actor('byrd'))
    local guardian=actor('guardian')
    guardian.aiPhase='defense'
    sample('guardian_defense',guardian)
end
