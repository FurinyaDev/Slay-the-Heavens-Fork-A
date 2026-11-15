local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local T=require('abyss_theme')
local count=0
local function receiver(p,name,kind)
 local box=H.F.actorControl(p,name)
 local hit=box.listeners and box or box:GetChild('hit')
 return assert(hit.listeners[kind])
end
local function invalid(kind)
 if kind=='missing'then return {touchId=7}end
 return {touchId=7,GetUIPos=function()return kind=='nan' and 0/0 or math.huge,360 end}
end
for _,touch in ipairs({false,true})do
 for _,kind in ipairs({'missing','nan','infinity'})do
  for _,boundary in ipairs({'down','up'})do
   local h,u,p,e=H.setup({'defend','defend'},nil,{touchScreen=function()return touch end})
   local b=h.run.combat;local x,y=p:GetChild('card1').x,T.layout.hand.y
   if boundary=='down'then
    receiver(p,'card1','down')(invalid(kind))
    assert(not u.gesture,'invalid Down must not seed a drag or intent samples')
    h:update(.05);e('card1','up',7,x+5,y+75)
   else
    e('card1','down',7,x,y);assert(u.gesture and #u.gesture.intentSamples==1,'real Down must own the first sample')
    h:update(.05);e('dragLayer','drag',7,x+5,y+75)
    receiver(p,'dragLayer','up')(invalid(kind))
   end
   assert(b.energy==3 and #b.hand==2 and b.player.block==0,'invalid '..boundary..' submitted a card')
   count=count+1
  end
 end
end
print('REVIEW_SPARSE_INVALID_PASS '..count)
