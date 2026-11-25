package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Native=dofile('tests/lua/support/native_art_controls.lua')
local Runtime=require('abyss_card_art_runtime')
if ABYSS_RUNTIME_REQUIRE_READY then
 for id,count in pairs({armaments=1834,cleave=2657,heavy_blade=2043})do
  local art=assert(F.Presentation[id].nativeArt,'actual builder omitted ready artwork: '..id)
  assert(art.runtime==true and #art.slots==count,'actual builder must use the complete frozen ready source')
 end
 local total,compact=0,0
 for id,display in pairs(F.Presentation)do
  local art=display.nativeArt
  if art then
   total=total+1;assert(art.cardId==id and art.runtime==true,'bound artwork identity changed')
   if art.rectangles then
    compact=compact+1
    assert(art.rectangleEncoding=='xywh-rgb24-hex14' and #art.rectangles==art.rectangleCount*14,
     'actual builder must retain complete compact artwork')
   end
  end
 end
 assert(total==75 and compact==72,'actual builder must bind all75 approved card assets')
end
dofile('tests/lua/support/native_runtime_controls.lua').install(F,Runtime)
local Run,Map,Nodes=require('abyss_run'),require('abyss_map'),require('abyss_nodes')
local DeckUI,NodeUI=require('abyss_deck_ui'),require('abyss_node_ui')
local platform=F.withMonsterActors({imageSource='static',imageTypes={basic=17,stretch=23},color=function(...)return {...}end})
local r=Native.decorate(F.Viewport.apply(F.control({children=F.Layout}),1280,720))
local function drain()for _=1,450 do Runtime.update()end end
local function check(face,enabled)
 assert(face:GetChild('artSamples').visible==enabled,'native artwork binding visibility mismatch')
 local fallback=face:GetChild('art')
 assert(fallback.visible~=enabled,'native fallback visibility mismatch')
end
local function visibleThroughParents(control)
 while control do
  if not control.alive or not control.visible then return false end
  control=control.parent
 end
 return true
end
local function checkNodeArt(face,state)
 assert(visibleThroughParents(face)==(state~='hidden'),'card face visibility mismatch')
 assert(visibleThroughParents(face:GetChild('artSamples'))==(state=='native'),'native artwork visibility mismatch: '..state)
 for kind in pairs(F.Theme.icon.cardArt)do
  local fallback=face:GetChild('art_'..kind)
  assert(visibleThroughParents(fallback)==(state==kind),'unexpected visible fallback artwork: '..kind)
  if state==kind then assert(fallback.imageId,'visible fallback has no image')end
 end
end
local function phase(name)print('NATIVE_CARD_ART_RUNTIME_PHASE '..name)end
if ABYSS_RUNTIME_CONTEXT=='battle' then
 local run=Run.new(F.Data,42);run.deck={{uid=91,cardId='cleave',upgraded=true}}
 assert(Run.startCombat(run,'raven_adept_solo'))
 local battle=require('abyss_battle_ui').new(r:GetChild('battlePanel'),run.data,F.Presentation,'click',platform,{embedded=true})
 battle.run=run;battle:render();local face=r:GetChild('battlePanel'):GetChild('card1')
 check(face,false);drain();check(face,true)
 local name,body=face:GetChild('name').text,face:GetChild('label').text
 run.combat.player.statuses.strength=7;battle:render();check(face,true)
 assert(face:GetChild('name').text==name and face:GetChild('label').text~=body,'dynamic text not independent')
 battle:setActive(false);assert(Runtime.status().livePools==0,'inactive battle retained card pools')
 drain();check(face,false);battle:setActive(true);drain();check(face,true)
 run.combat.hand[1].cardId='heavy_blade';battle:render();check(face,false);drain();check(face,true)
 run.combat.hand[1].cardId='strike';battle:render();check(face,false);assert(Runtime.status().livePools==0)
 phase('battle-hand')
 for _,enemy in ipairs(run.combat.enemies)do enemy.hp=0 end
 assert(Run.finishCombat(run));run.rewards.cards={'cleave'};run.rewards.cardUpgrades={true}
 battle:render();battle.rewardScreen='cards';battle:render();drain();check(face,true)
 battle.rewardScreen='list';battle:render();assert(Runtime.status().livePools==0,'reward list retained card pools')
 phase('battle-reward')
elseif ABYSS_RUNTIME_CONTEXT=='deck-capacity' or ABYSS_RUNTIME_CONTEXT=='deck-scroll' or ABYSS_RUNTIME_CONTEXT=='deck-details' then
 local capacity=ABYSS_RUNTIME_CONTEXT=='deck-capacity'
 local scrolling=ABYSS_RUNTIME_CONTEXT=='deck-scroll'
 local run=Run.new(F.Data,42);run.deck={}
 for i=1,(scrolling or capacity) and 14 or 2 do run.deck[i]={uid=i,cardId=i%2==0 and 'heavy_blade' or 'cleave',upgraded=i==1}end
 local deck=DeckUI.new(r:GetChild('deckPanel'),F.Presentation,'click',platform,function()end)
 assert(deck:open(run));local grid=r:GetChild('deckPanel'):GetChild('grid')
 -- The capacity case keeps the default twelve visible native callbacks. The
 -- scroll case drives a three-item viewport of the same fourteen-card list;
 -- native recycling changes visible bindings, not the complete source artwork.
 if scrolling then grid.deferRefresh=true end
 deck:update()
 if scrolling then for i=0,2 do grid:recycle(i,i)end end
 local count=capacity and 10 or scrolling and 3 or 2
 if capacity then Runtime.update()else drain()end
 assert(Runtime.status().livePools==count,'real deck exceeded/failed pool bound')
 local item=grid.items[0];local face=item:GetChild('face')
 if capacity then check(face,false)else check(face,true)end
 if capacity then
  assert(Runtime.status().createdLastUpdate==64,'real deck escaped global creation bound')
  assert(Runtime.status().waitingPools==2,'overflow deck faces must wait without allocating')
  check(grid.items[10]:GetChild('face'),false);check(grid.items[11]:GetChild('face'),false)
  grid:recycle(1,99);grid:recycle(2,99);Runtime.update()
  assert(Runtime.status().waitingPools==0,'waiting deck faces did not receive released capacity')
  grid.destroyOnRecycle=true;grid:recycle(0,13);Runtime.update()
  assert(item.alive==false,'native decorator must preserve false read-only alive after destruction')
  assert(Runtime.status().livePools==10,'destroyed item leaked allocation budget')
  phase('deck-capacity-refill')
 elseif scrolling then
  local old=face:GetChild('artSamples').children[1];grid:recycle(0,12)
  assert(old.alive,'same-art recycled UID unnecessarily destroyed its native tree')
  assert(deck.bindings[item].uid==13,'art reuse retained stale card selection identity')
  drain();check(face,true) -- Identical noninteractive art does not release capacity.
  phase('deck-ready-reuse')
  grid:recycle(1,99);grid:recycle(2,99);drain();check(face,true)
  phase('deck-invalid-index')
 end
 local callback=grid.refreshCallback;local live=grid.items[0]
 if not scrolling and not capacity then
  assert(deck:showText('test','details'));assert(Runtime.status().livePools==0,'hidden deck grid retained native art')
  callback(live,0);drain();assert(Runtime.status().livePools==0,'late scroll callback revived hidden-grid art')
  platform.controllerApi={isController=function()return true end};deck:update();drain()
  assert(Runtime.status().livePools==0,'controller mode change revived hidden-grid art')
  phase('deck-hidden-callbacks')
  platform.controllerApi=nil
  assert(deck:back());deck:update();drain();assert(Runtime.status().livePools==count,'deck return did not refill')
  phase('deck-return')
 end
 assert(deck:close());assert(Runtime.status().livePools==0,'deck close retained native pools')
 callback(live,0);drain();assert(Runtime.status().livePools==0,'stale callback revived closed deck art')
 phase('deck-close')
 if not scrolling and not capacity then
  -- Deferred callbacks and destroy-on-refresh exercise calibration cancellation.
  grid.deferRefresh=true;grid.destroyOnRefresh=true;assert(deck:open(run))
  local calibrationCallback=grid.refreshCallback
  grid:flush();local calibrationItem=grid.items[0];deck:update()
  assert(calibrationItem.alive==false,'calibration must actually retire its old native item')
  assert(deck:close());grid:flush();calibrationCallback(calibrationItem,0);drain();assert(Runtime.status().livePools==0)
  phase('deck-deferred-calibration')
 end
elseif ABYSS_RUNTIME_CONTEXT:match('^node%-') then
 local function shop(cardId)
  local run=Run.new(F.Data,42);local map=Map.generate(run.data,42)
  local path=dofile('tests/lua/support/map_routes.lua').to(map,function(candidate)return candidate.type=='shop'end)
  for i=1,#path-1 do assert(Map.choose(map,path[i]))end
  assert(Nodes.enter(run,map,path[#path]))
  run.nodeFlow.cards[1].id=cardId
  run.deck={{uid=99,cardId='cleave',upgraded=true}}
  run.gold=1000
  return run,map
 end
 local run,map=shop('cleave')
 local panel=r:GetChild('nodePanel')
 local shelf,picker=panel:GetChild('shopView'),panel:GetChild('pickerView')
 local goods=shelf:GetChild('goods') or shelf
 local node=NodeUI.new(panel,run,map,F.Presentation,'click',function()end,platform)
 local face,pickFace=shelf:GetChild('card1'),picker:GetChild('card1')
 local pool=face:GetChild('artSamples')
 local talk=panel:GetChild('merchant'):GetChild('talk'):GetChild('hit')
 node:setVisible(true)
 local function frame()
  node:update(1/30);Runtime.update()
 end
 local function openShop()
  assert(visibleThroughParents(talk) and talk.click())
  for _=1,18 do frame()end
  assert(node.shopOpen and not node.shopBusy and visibleThroughParents(face),'shop did not publish the card shelf')
 end
 local function showNative(box,id)
  local art=box:GetChild('artSamples')
  for _=1,450 do if art.visible then break end;Runtime.update()end
  checkNodeArt(box,'native')
  local metadata=F.Presentation[id].nativeArt
  local count=0
  for _,group in ipairs(art.children)do
   assert(group.alive,'visible artwork retained a destroyed group')
   count=count+#group.children
  end
  assert(count==(metadata.rectangleCount or #metadata.slots),'wrong artwork shape count: '..id)
 end
 local function click(box)
  local hit=box:GetChild('hit');assert(visibleThroughParents(hit) and hit.click())
 end
 if ABYSS_RUNTIME_CONTEXT=='node-shop' then
  checkNodeArt(face,'hidden')
  assert(Runtime.status().livePools==0,'room entrance immediately allocated shop artwork')
  frame()
  local pending=assert(pool.children[1],'missing pending native allocation')
  assert(Runtime.status().livePools>0 and pending.alive and not pool.visible,'pending art was not staged')
  checkNodeArt(face,'hidden')
  node:setVisible(false)
  assert(Runtime.status().livePools==0 and not pending.alive and next(pool.children)==nil,'pending node pool leaked on hide')
  phase('node-pending-hide')
  for _=1,18 do frame()end
  assert(Runtime.status().livePools==0,'hidden node update restarted art')
  node:setVisible(true);openShop();checkNodeArt(face,'attack');showNative(face,'cleave')
  phase('node-show-ready')
 elseif ABYSS_RUNTIME_CONTEXT=='node-hidden' then
  openShop();showNative(face,'cleave')
  local ready=assert(pool.children[1]);assert(ready.alive)
  node:setVisible(false);node:render();frame();checkNodeArt(face,'hidden')
  assert(Runtime.status().livePools==0 and not ready.alive and next(pool.children)==nil,'hidden node render restarted art')
  phase('node-hidden-render')
  node:setVisible(true);checkNodeArt(face,'attack');frame()
  assert(pool.children[1] and pool.children[1].alive,'visible shelf did not resume art after hide')
  phase('node-visible-resume')
 elseif ABYSS_RUNTIME_CONTEXT=='node-reuse' then
  run.relics[#run.relics+1]='courier'
  openShop();showNative(face,'cleave')
  local old=assert(pool.children[1])
  local External,Random=require('abyss_external_random'),require('abyss_randomxs128')
  External.setReplayState(Random.snapshot(Random.fromSeed('1')))
  click(face);click(panel:GetChild('confirm'))
  assert(run.nodeFlow.cards[1].id=='wild_strike','fixture did not restock a different card in the same slot')
  assert(face:GetChild('name').text==F.Presentation.wild_strike.name and not old.alive and next(pool.children)==nil)
  checkNodeArt(face,'attack');showNative(face,'wild_strike')
  local replacement=assert(pool.children[1]);assert(replacement~=old and replacement.alive)
  node:render();frame();checkNodeArt(face,'native')
  assert(pool.children[1]==replacement,'same offer repainted by allocating a new card-art tree')
  phase('node-slot-reuse')
 elseif ABYSS_RUNTIME_CONTEXT=='node-reopen' then
  openShop()
  local previous=assert(pool.children[1]);assert(previous.alive)
  click(panel:GetChild('back'))
  checkNodeArt(face,'hidden');assert(not run.nodeFlow.complete)
  openShop()
  assert(pool.children[1]==previous and previous.alive,'warm reopening discarded the current offer artwork')
  phase('node-close-reopen')
  click(panel:GetChild('back'));node:update(.7);click(panel:GetChild('back'))
  assert(run.nodeFlow.complete and Runtime.status().livePools==0 and not previous.alive)
  checkNodeArt(face,'hidden');assert(next(pool.children)==nil)
  node.run,node.map=shop('armaments');node:render();openShop()
  checkNodeArt(face,'skill');showNative(face,'armaments')
  assert(face:GetChild('name').text==F.Presentation.armaments.name)
  phase('node-leave-new-shop')
 else
  openShop()
  if ABYSS_RUNTIME_CONTEXT=='node-picker' then showNative(face,'cleave')end
  local previous=assert(pool.children[1]);click(goods:GetChild('removal'));showNative(pickFace,'cleave')
  checkNodeArt(face,'hidden');assert(not previous.alive and next(pool.children)==nil,'picker retained shop art')
  if ABYSS_RUNTIME_CONTEXT=='node-picker' then
   phase('node-shop-to-picker')
  else
   local pickPool=pickFace:GetChild('artSamples');local old=assert(pickPool.children[1])
   click(panel:GetChild('back'));checkNodeArt(face,'attack');showNative(face,'cleave')
   checkNodeArt(pickFace,'hidden');assert(not old.alive and next(pickPool.children)==nil,'shop retained picker art')
   phase('node-picker-to-shop')
  end
 end
else error('missing runtime context selector')end
Runtime.clear();assert(Runtime.status().livePools==0)
print('NATIVE_CARD_ART_RUNTIME_CONTEXT_PASS '..ABYSS_RUNTIME_CONTEXT)
