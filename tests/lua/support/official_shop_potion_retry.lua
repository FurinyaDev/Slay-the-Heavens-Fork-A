local GameUI=require('abyss_game_ui')
local create=GameUI.new
local F
GameUI.new=function(root,data,presentation,event,platform)
 local active={}
 for _,name in ipairs({'nodePanel','choicePanel'})do
  local page=root:GetChild(name);local prior=getmetatable(page);active[page]=true
  setmetatable(page,{__index=function(c,key)if key=='active'then return active[c]end;return prior.__index(c,key)end,
   __newindex=function(c,key,value)assert(key~='active','active is readonly');return prior.__newindex(c,key,value)end})
  page.SetActive=function(c,value)active[c]=value;F.setEngineActive(c,value)end
 end
 platform.nativePageLifecycle=true
 return create(root,data,presentation,event,platform)
end
F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run,Map=require('abyss_run'),require('abyss_map')
local route=dofile('tests/lua/support/map_routes.lua')
local advance=dofile('tests/lua/support/shop_timeline.lua')
local cursor={CursorDown='down',CursorUp='up',CursorEnter='enter',CursorExit='exit',CursorEndDrag='endDrag'}
local function tap(hit,id)
 local control=hit
 while control do
  assert(control.visible and control.activeInHierarchy~=false,'shop input target was hidden: '..hit.name)
  control=control.parent
 end
 local event={touchId=id}
 hit.listeners.down(event);hit.listeners.up(event)
 return hit.click(event)
end
for _,mobile in ipairs({false,true})do
 local host,root=F.fixture(nil,nil,nil,cursor,nil,nil,{touchScreen=function()return mobile end})
 assert(F.start(host));local run=host.run;run.gold=1000
 for _,id in ipairs({'fire_potion','block_potion','regen_potion'})do assert(Run.obtainPotion(run,id))end
 local path=route.to(host.map,function(node)return node.type=='shop'end)
 for i=1,#path-1 do assert(Map.choose(host.map,path[i]))end
 host:refresh();assert(host.mapUI:choose(path[#path]))
 local panel=root:GetChild('nodePanel')
 assert(tap(panel:GetChild('merchant'):GetChild('talk'):GetChild('hit'),1))
 advance(host)
 local offer=run.nodeFlow.potions[1];assert(not offer.unavailable)
 local tile=panel:GetChild('shopView'):GetChild('goods'):GetChild('potion1'):GetChild('hit')
 local confirm=panel:GetChild('confirm')
 local function purchase(id)
  if not mobile then return tap(tile,id) end
  local gold=run.gold
  assert(tap(tile,id) and confirm.visible and run.gold==gold)
  return tap(confirm:GetChild('hit'),id+1)
 end
 local ok,why=purchase(2)
 assert(not ok and why=='potion_slots_full' and not confirm.visible)
 assert(run.gold==1000 and not offer.sold and Run.potionCount(run)==3)
 local popup=root:GetChild('potionPanel')
 assert(tap(root:GetChild('potionEntry'):GetChild('slot2'):GetChild('hit'),4))
 assert(popup.visible and tap(popup:GetChild('discard'),5))
 assert(not popup.visible and not run.potions[2] and run.gold==1000)
 assert(purchase(6))
 assert(not confirm.visible and run.nodeFlow.potions[1].sold)
 assert(run.potions[2]==offer.id and Run.potionCount(run)==3 and run.gold==1000-offer.price)
end
print('OFFICIAL_SHOP_POTION_DISCARD_PASS')
