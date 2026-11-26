package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Flow=require('abyss_card_flow')
local Theme=require('abyss_theme')
local function control()
 local c={visible=false,children={}}
 function c:GetChild(name)self.children[name]=self.children[name]or control();return self.children[name]end
 function c:SetVisible(v)self.visible=v end
 function c:SetAnchoredPosition(x,y)self.x,self.y=x,y end
 function c:SetLocalScale(x,y)self.sx,self.sy=x,y end
 function c:SetImage()end
 return c
end
local root=control()
local flow=Flow.new(root,{color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end,imageSource='static'})
local catalog={cards={strike={type='attack',name='打击'},inflame={type='power',name='燃烧'}}}
local function frame(hand,draw,discard,exhaust)return{hand=hand or{},draw=draw or{},discard=discard or{},exhaust=exhaust or{},catalog=catalog}end
local a={uid=1,cardId='strike'}
flow:playing(a,{tx=200,ty=50})
flow:sync(frame(),frame(nil,nil,{a}),nil,true)
assert(flow.waiting[1].uid==1 and flow.waiting[1].to=='discard')
assert(flow.waiting[1].start[1]==200)
flow:update(Theme.motion.slow,catalog,{})
local trail=root:GetChild('feedback'):GetChild('cardTrail1')
assert(trail.visible and trail.x==Theme.layout.discardPile.position[1])
assert(trail.y==Theme.layout.discardPile.position[2])
flow:update(0.01,catalog,{})
assert(not trail.visible and not flow:busy())
flow:sync(frame({a}),frame(nil,nil,nil,{a}))
assert(flow.waiting[1].to=='exhaust')
local B=Flow.burn
flow:update(B.hold,catalog,{})
-- Exhaust lifts in place (ExhaustCardEffect) instead of the discard shrink-fly.
local burning=flow.active[1]
assert(trail.visible and trail.x==burning.start[1] and trail.y>=burning.start[2]+B.lift-1e-6 and trail.sx>0.5)
flow:update(B.burn*0.9,catalog,{})
assert(trail.children.plate.imageColor.a<255 and trail.children.name.text=='')
flow:update(B.burn*0.1+B.fly,catalog,{})
assert(trail.x==Theme.layout.topBar.exhaustIcon[1] and trail.y==Theme.layout.topBar.y)
flow:reset()
flow:sync(frame(nil,nil,{a}),frame(nil,{a}), 'reshuffle')
assert(flow.waiting[1].from=='discard'and flow.waiting[1].to=='draw')
flow:reset()
flow:sync(frame({a}),frame({a}),'enemy_turn')
assert(flow.waiting[1].to=='retain')
flow:reset()
local power={uid=2,cardId='inflame'}
flow:playing(power,{tx=-300,ty=40})
flow:sync(frame(),frame(),nil,true)
assert(flow.waiting[1].to=='power'and flow.waiting[1].uid==2)
flow:reset()
local batch={};for i=1,25 do batch[i]={uid=i,cardId='strike'}end
flow:sync(frame(batch),frame(nil,nil,batch))
flow:update(0,catalog,{})
local count=0;for _ in pairs(flow.active)do count=count+1 end
assert(count==10 and #flow.waiting==15)
flow:reset();assert(not flow:busy()and next(flow.inPlay)==nil)
for slot=1,10 do assert(not root:GetChild('feedback'):GetChild('cardTrail'..slot).visible)end
flow:sync(frame({a}),frame(nil,nil,{a}))
flow:sync(frame(nil,nil,{a}),frame(nil,{a}),'reshuffle')
flow:update(0,catalog,{})
local concurrent=0;for _,entry in pairs(flow.active)do if entry.uid==a.uid then concurrent=concurrent+1 end end
assert(concurrent==1,'the same UID cannot be in two simultaneous native trajectories')
assert(#flow.waiting==1,'the next route must wait for its UID to arrive')

local wide=control()
wide.parent={sizeDeltaX=1680}
wide.anchorMinX,wide.anchorMaxX=0,1
for pile,anchor in pairs({draw=0,discard=1,exhaust=1})do
    wide:GetChild(pile..'Icon').anchorMinX=anchor
end
local animated=Flow.new(wide,{color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end,imageSource='static'})
local function route(from,to)
    local before,after=frame(),frame()
    before[from],after[to]={a},{a}
    animated:sync(before,after)
end
route('hand','discard')
animated:update(0,catalog,{})
route('discard','draw')
assert(animated.active[1].finish[1]==Theme.layout.discardPile.position[1]+200)
assert(animated.waiting[1].start[1]==Theme.layout.discardPile.position[1]+200)
assert(animated.waiting[1].finish[1]==Theme.layout.drawPile.position[1]-200)
wide.parent.sizeDeltaX=1560
animated:update(0,catalog,{})
assert(animated.active[1].finish[1]==Theme.layout.discardPile.position[1]+140)
assert(animated.waiting[1].start[1]==Theme.layout.discardPile.position[1]+140)
assert(animated.waiting[1].finish[1]==Theme.layout.drawPile.position[1]-140)
animated:update(Theme.motion.slow,catalog,{})
local moved=wide:GetChild('feedback'):GetChild('cardTrail1')
assert(moved.x==Theme.layout.discardPile.position[1]+140 and moved.y==Theme.layout.discardPile.position[2])
animated:update(.01,catalog,{})
animated:update(Theme.motion.slow,catalog,{})
local drawSlot,drawEntry=next(animated.active)
assert(drawEntry.to=='draw' and drawEntry.arrived)
local drawn=wide:GetChild('feedback'):GetChild('cardTrail'..drawSlot)
assert(drawn.x==Theme.layout.drawPile.position[1]-140 and math.abs(drawn.y-Theme.layout.drawPile.position[2])<1e-8)
animated:reset()
route('hand','exhaust')
animated:update(B.hold+B.burn+B.fly,catalog,{})
assert(moved.x==Theme.layout.topBar.exhaustIcon[1]+140 and moved.y==Theme.layout.topBar.y)
wide.parent.sizeDeltaX=1280
animated:update(0,catalog,{})
assert(moved.x==Theme.layout.topBar.exhaustIcon[1] and moved.y==Theme.layout.topBar.y)
print('ok card_flow - UID destinations, endpoints, retain, power, shuffle and bounded pool')
