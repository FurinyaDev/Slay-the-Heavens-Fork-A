local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local EnemyView=require('abyss_battle_enemy_view')
local host,ui,panel,event,tap=H.setup({'strike','strike'},{'wizard_gremlin','wizard_gremlin'})
local battle=host.run.combat
local first,second=table.unpack(battle.enemies)
local g=EnemyView.geometry(first)
tap('card1',1)
local box=H.F.actorControl(panel,'enemy1')
local corner=box:GetChild('targetV1_1')
assert(math.abs(box.x+corner.x-(g.hitX+g.hitWidth/2))<1e-7,'reticle right edge must follow the offset hitbox')
assert(box:GetChild('hit').sizeDeltaX==g.hitWidth,'native control must use hitbox width')
local energy=battle.energy
event('enemy2','down',2,g.hitX,g.hitY)
event('enemy2','up',2,g.hitX,g.hitY)
event('enemy2','click',2,g.hitX,g.hitY)
assert(first.hp<first.maxHp and second.hp==second.maxHp and battle.energy==energy-1,'native overlap must choose first enemy')
assert(not EnemyView.contains(g,g.hitX+g.hitWidth/2,g.hitY),'source boundary is open')
assert(EnemyView.contains(g,g.hitX+g.hitWidth/2-.01,g.hitY),'just inside the boundary')
assert(not EnemyView.contains(g,g.hitX+g.hitWidth/2+.01,g.hitY),'just outside the boundary')
assert(EnemyView.targetAt(battle,g.hitX,g.hitY)==1)
first.hp=0
assert(EnemyView.targetAt(battle,g.hitX,g.hitY)==2,'dead target cannot shadow a live target')
second.halfDead=true
assert(not EnemyView.targetAt(battle,g.hitX,g.hitY),'half-dead target is invalid')
local guardian={definitionId='guardian',hp=1,statuses={}}
local upright=EnemyView.geometry(guardian)
guardian.aiPhase='defense'
local curled=EnemyView.geometry(guardian)
assert(curled.hitHeight<upright.hitHeight,'posture must update hit geometry')

for _,touchScreen in ipairs({false,true}) do
    local host,_,_,event,tap=H.setup({'strike','strike'},{'acid_slime_s'},{
        touchScreen=function()return touchScreen end
    })
    local battle=host.run.combat
    local actor=battle.enemies[1]
    local g=EnemyView.geometry(actor)
    tap('card1',3)
    event('enemy1','down',4,g.hitX,g.hitY)
    event('enemy1','up',4,g.hitX+g.hitWidth/2+1,g.hitY)
    event('enemy1','click',4,g.hitX+g.hitWidth/2+1,g.hitY)
    assert(actor.hp==actor.maxHp and battle.energy==3,'outside click spent energy')
    event('enemy1','down',5,g.hitX+g.hitWidth/2-1,g.hitY)
    event('enemy1','up',5,g.hitX+g.hitWidth/2-1,g.hitY)
    event('enemy1','click',5,g.hitX+g.hitWidth/2-1,g.hitY)
    assert(actor.hp<actor.maxHp and battle.energy==2,'small enemy inside click did not commit')
    event('enemy1','click',5,g.hitX,g.hitY)
    assert(battle.energy==2,'duplicate click spent energy')
end
do
    local host,_,_,event=H.setup({'defend'},{'hexaghost'},{touchScreen=function()return true end})
    local battle=host.run.combat
    battle.enemies[1].sourcePosition={x=0,y=100}
    host:refresh()
    local g=EnemyView.geometry(battle.enemies[1])
    local x,y=g.hitX,g.hitY+g.hitHeight/2-1
    event('card1','down',6)
    event('card1','drag',6,x,y)
    event('dragLayer','up',6,x,y)
    assert(battle.energy==2,'enemy hitbox still counts as a drop zone for untargeted cards')
end

local P=dofile('tests/lua/support/potion_gesture_fixture.lua')
local host,ui,_,event,_,drain,_,_,emit,potionTap=P.setup({'defend'},{'wizard_gremlin','wizard_gremlin'})
local battle=host.run.combat
local target,carrier=table.unpack(battle.enemies)
carrier.halfDead=true
host.run.potions[1]='fire_potion'
host:refresh()
potionTap(6)
assert(ui.potionAim,'fixture did not arm targeted potion')
local g=EnemyView.geometry(target)
local hp=target.hp
event('enemy2','down',7,g.hitX,g.hitY)
event('enemy2','up',7,g.hitX,g.hitY)
emit('enemy2','click',7) -- Some hosts omit position on Click after a positioned Up.
drain()
local resolved,untouched=table.unpack(host.run.combat.enemies)
assert(host.run.potions[1]==nil and resolved.hp==math.max(0,hp-20) and untouched.hp==carrier.hp,
    'half-dead carrier must not swallow a valid overlapping potion target')
print('enemy target geometry passed')
