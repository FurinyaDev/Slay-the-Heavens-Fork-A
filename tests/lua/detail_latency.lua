local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local Trace=dofile('tests/lua/support/presentation_trace.lua')
local host,ui,panel,event,_,drain,_,root=H.setup({'bash','clothesline','defend'},nil,{touchScreen=function()return false end})
local counts={deck=0,close=0,refresh=0}
local function spy(object,key,counter)
 local old=object[key];object[key]=function(...) counts[counter]=counts[counter]+1;return old(...) end
end
spy(host.deckUI,'open','deck');spy(host.deckUI,'close','close');spy(host,'refresh','refresh')
assert(host:openRelics(1));assert(host.relicUI.visible and host.deckUI.visible and not ui.active)
assert(counts.deck==0 and counts.close==0,'relic entry built then discarded the deck')
assert(counts.refresh==1,'relic entry refreshed twice')
assert(host:closeDeck());assert(ui.active)
local failures={}
local function recordWrites(battlePanel)
 local recorder=Trace.new(true)
 local writes={}
 local idle={}
 function recorder:add(row)
  writes[#writes+1]={row[1],row[2]}
 end
 recorder:attach(battlePanel,'battle')
 return function(label,affected,action,mode)
  writes={}
  action()
  local totals={reader=0,cardFace=0,otherHand=0,siblings=0,monsters=0,other=0}
  local remaining={}
  if mode=='frame' then for key,count in pairs(idle)do remaining[key]=count end end
  for _,row in ipairs(writes)do
   local path,key=row[1],row[2]
   local write=path..'/'..key
   if mode=='idle' then idle[write]=(idle[write] or 0)+1 end
   local child,part=path:match('^battle/([^/]+)(.*)$')
   local slot=child and tonumber(child:match('^card(%d+)$'))
   local category='other'
   if child=='statusInfo' or child=='statusDismiss' then category='reader'
   elseif child and (child:match('^enemy') or child:match('^nativeActor') or part:match('/nativeActor')) then category='monsters'
   elseif slot then
    if key=='SetAsLastSibling' then category='siblings'
    elseif not affected[slot] then category='otherHand'
    elseif part:match('^/name') or part:match('^/type') or part:match('^/label') or part:match('^/art') or key=='SetImage' then category='cardFace'
    else category='focus' end
   end
   if remaining[write] and remaining[write]>0 then remaining[write]=remaining[write]-1
   else totals[category]=(totals[category] or 0)+1 end
  end
  print(string.format('DETAIL_WRITES %s reader=%d focus=%d face=%d other_hand=%d siblings=%d monsters=%d other=%d',
   label,totals.reader,totals.focus or 0,totals.cardFace,totals.otherHand,totals.siblings,totals.monsters,totals.other))
  if mode=='commit' then
   assert(totals.other+totals.otherHand+totals.monsters>0,'recorder missed the normal battle update')
  elseif mode~='idle' and totals.cardFace+totals.otherHand+totals.monsters+totals.other>0 then
   failures[#failures+1]=label
  end
 end
end
local function slots(battle)
 local result={}
 for slot,instance in ipairs(battle.hand)do result[instance.cardId]=slot end
 return result
end
local function tip(panel)
 return panel:GetChild('statusInfo'):GetChild('powerTips'):GetChild('tip1'):GetChild('copy').text
end
local function card(slot)return 'card'..slot end
local function cardHelp(ui,panel,slot)
 return ui:openHelp(ui:cardHelpSpec(slot),panel:GetChild(card(slot)):GetChild('hit'),false)
end
host:update(2)
ui:update(2)
local before=H.F.Combat.copy(host.run)
local measure=recordWrites(panel)
local hand=slots(host.run.combat)
local delay=H.F.Theme.layout.statusInfo.delay+0.001
measure('desktop-idle',{},function()ui:update(delay)end,'idle')
measure('desktop-enter',{[hand.bash]=true},function()event(card(hand.bash),'enter')end)
measure('desktop-open',{[hand.bash]=true},function()ui:update(delay)end,'frame')
assert(ui.info and tip(panel):find('易伤',1,true))
measure('desktop-switch',{[hand.bash]=true,[hand.clothesline]=true},function()
 event(card(hand.clothesline),'enter')
 event(card(hand.bash),'exit')
 ui:update(delay)
end,'frame')
assert(ui.info and tip(panel):find('虚弱',1,true))
measure('desktop-close',{[hand.clothesline]=true},function()event(card(hand.clothesline),'exit')end)
assert(not ui.info and not panel:GetChild('statusInfo').visible)
measure('explicit-open',{[hand.bash]=true},function()assert(cardHelp(ui,panel,hand.bash))end)
measure('explicit-switch',{[hand.bash]=true,[hand.clothesline]=true},function()assert(cardHelp(ui,panel,hand.clothesline))end)
measure('explicit-close',{[hand.clothesline]=true},function()assert(ui:cancelAim())end)
assert(not ui.info and not panel:GetChild('statusInfo').visible)
assert(cardHelp(ui,panel,hand.bash))
assert(ui:showStatus(0));assert(not ui.info)
measure('status-show-hide',{},function()
 assert(ui:showStatus(0));assert(ui.info.index==0)
 assert(ui:showStatus(0));assert(not ui.info and not panel:GetChild('statusInfo').visible)
end)
-- Down closes the explicit actor reader and consumes its Click.
local beforeHand=#host.run.combat.hand
assert(ui:showStatus(0))
local hit=panel:GetChild('card1'):GetChild('hit')
hit.listeners.down({touchId=71})
assert(not ui.info,'new Down must close explicit details')
if hit.listeners.up then hit.listeners.up({touchId=71}) end
hit.listeners.click({touchId=71})
assert(#host.run.combat.hand==beforeHand and not ui.selected,'close click passed through')
-- Content is re-read, never cached by mutable actor identity.
host.run.combat.player.hp=17
assert(ui:showStatus(0))
assert(panel:GetChild('statusInfo'):GetChild('summary').text:find('17',1,true))
ui:showStatus(0)
host.run.combat.player.hp=before.combat.player.hp
local function same(a,b)
 if type(a)~='table' or type(b)~='table' then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
assert(same(before,host.run),'detail browsing changed run/RNG')
-- The next physical touch may select a card; the dismissed gesture alone is consumed.
local function tapCard(touch)
 hit.listeners.down({touchId=touch})
 if hit.listeners.up then hit.listeners.up({touchId=touch}) end
 hit.listeners.click({touchId=touch})
end
assert(ui:showStatus(0))
local dismiss=panel:GetChild('statusDismiss')
assert(dismiss.visible,'actor reader must publish its outside-dismiss surface')
dismiss.click({touchId=72})
assert(not ui.info and not dismiss.visible and not ui.selected,'outside dismiss must close only the reader')
assert(ui:showStatus(0))
tapCard(73)
assert(not ui.info and not ui.selected and #host.run.combat.hand==beforeHand)
tapCard(74)
assert(ui.selected==host.run.combat.hand[1].uid and #host.run.combat.hand==beforeHand,
 'a deliberate second touch did not select the card')
assert(ui:cancelAim() and not ui.selected)
local battle=host.run.combat
measure('defend-commit',{},function()
 ui:playSlot(hand.defend)
 assert(ui.selected==battle.hand[hand.defend].uid)
 ui:playSelected(nil)
 drain()
end,'commit')
assert(battle.energy==2 and battle.player.block==5 and #battle.hand==2,'card play failed after detail dismissal')
-- A new Down can retire a mouse carry before the corresponding aim is repainted.
ui:update(2)
hand=slots(battle)
local beforeCarry=H.F.Combat.copy(host.run)
local dragLayer=panel:GetChild('dragLayer')
local enemyBorder=H.F.actorControl(panel,'enemy1'):GetChild('border')
local idleBorder=enemyBorder.imageColor
event(card(hand.bash),'down',81)
event(card(hand.bash),'drag',81,0,0)
event('dragLayer','up',81,0,0)
assert(ui.carry and ui.carry.aiming and not ui.carry.drawnTarget and dragLayer.visible,'fixture must leave Bash aiming without a target')
assert(not same(enemyBorder.imageColor,idleBorder),'fixture must highlight an eligible enemy while carrying')
event(card(hand.clothesline),'down',82)
assert(not ui.carry and ui.gesture,'the next card must own the new Down')
ui:update(delay)
assert(ui.info and ui.info.press and tip(panel):find('虚弱',1,true),'held read failed after taking over a carry')
assert(not dragLayer.visible,'held read left the previous targeting layer visible')
assert(same(enemyBorder.imageColor,idleBorder),'held read left the previous enemy aim highlight visible')
event(card(hand.clothesline),'up',82)
event(card(hand.clothesline),'click',82)
assert(not ui.info and not ui.selected and same(beforeCarry,host.run),'held read or its closing click played a card')
-- Guards preserved without opening a hidden deck first.
ui.busy=true;assert(not host:openRelics(1));ui.busy=false
host.exitOpen=true;assert(not host:openRelics(1));host.exitOpen=false
assert(host:openRelics(1));assert(not host:openRelics(1));assert(host:closeDeck())
local touchHost,touchUI,touchPanel,touchEvent,touchTap=H.setup({'bash','clothesline','defend'},nil,{touchScreen=function()return true end})
touchHost:update(2)
touchUI:update(2)
local touchHand=slots(touchHost.run.combat)
local touchBefore=H.F.Combat.copy(touchHost.run)
local touchMeasure=recordWrites(touchPanel)
touchMeasure('touch-idle',{},function()touchUI:update(delay)end,'idle')
touchEvent(card(touchHand.bash),'down',91)
touchMeasure('touch-open',{[touchHand.bash]=true},function()touchUI:update(delay)end,'frame')
assert(touchUI.info and touchUI.info.press and tip(touchPanel):find('易伤',1,true))
touchMeasure('touch-close',{[touchHand.bash]=true},function()
 touchEvent(card(touchHand.bash),'up',91)
 touchEvent(card(touchHand.bash),'click',91)
end)
assert(not touchUI.info and not touchUI.selected and not touchPanel:GetChild('statusInfo').visible)
assert(same(touchBefore,touchHost.run),'touch inspection consumed a card or modified RNG')
touchTap(card(touchHand.defend),93)
assert(touchUI.selected==touchHost.run.combat.hand[touchHand.defend].uid)
local selectedFace=touchPanel:GetChild(card(touchHand.defend))
local glow=selectedFace:GetChild('glow')
assert(glow.visible)
local rimEdge
if H.F.Theme.presentationProfile=='official-assets-first' then
 rimEdge=selectedFace:GetChild('nativePlayableRim'):GetChild('softEdge'):GetChild('vertical')
 assert(rimEdge.sizeDeltaX*rimEdge.localScaleX==6)
end
touchEvent(card(touchHand.bash),'down',92)
touchUI:update(delay)
assert(touchUI.info and touchUI.info.press and not glow.visible,'reading kept the former selection highlighted')
if rimEdge then assert(rimEdge.sizeDeltaX*rimEdge.localScaleX==4,'reading kept the native rim in selected mode') end
touchEvent(card(touchHand.bash),'up',92)
touchEvent(card(touchHand.bash),'click',92)
assert(not touchUI.selected and same(touchBefore,touchHost.run))
assert(#failures==0,'unrelated native writes during '..table.concat(failures,', '))
print('DETAIL_LATENCY_PASS')
