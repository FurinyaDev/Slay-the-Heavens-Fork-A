local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run=require('abyss_run')
local cursor={CursorDown='down',CursorUp='up',CursorExit='exit',CursorEndDrag='endDrag'}
local function hit(r,p,n)return r:GetChild(p):GetChild(n):GetChild('hit')end
local function release(control,id)
 local event={touchId=id}
 control.listeners.down(event);control.listeners.up(event)
 return event
end
local function tap(control,id)return control.click(release(control,id))end
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
local function roundTrip(h,r)
 local run,battle=h.run,h.run.combat
 local before=F.Combat.copy(run)
 assert(tap(hit(r,'exitEntry','open'),1) and tap(hit(r,'runMenu','mainMenu'),2))
 h:update(12);h:refresh()
 assert(not h.choiceUI.visible and not h.deckUI.visible,'pending choice covered title')
 assert(same(before,run) and h.run==run and run.combat==battle)
 assert(tap(hit(r,'menuPanel','continueRun'),3) and h.mode=='battle' and same(before,run))
end
do
 local h,r=F.fixture(nil,nil,nil,cursor);assert(F.start(h));assert(Run.startCombat(h.run,'raven_adept_solo'));h:refresh();F.win(h,r)
 local rewards=h.run.rewards
 roundTrip(h,r);assert(h.run.rewards==rewards and h.run.phase=='reward')
 F.click(r,'battlePanel','cardReward')
 assert(r:GetChild('battlePanel'):GetChild('skip').visible)
 roundTrip(h,r);assert(h.run.rewards==rewards and h.run.phase=='reward')
 h:disable()
end
do
 local h,r=F.fixture(nil,nil,nil,cursor);assert(F.start(h))
 -- Controlled deck of genuine card definitions, then use the real Headbutt command.
 h.run.deck={{uid=1,cardId='headbutt'}}
 for i=2,9 do h.run.deck[i]={uid=i,cardId='defend'}end
 h.run.nextDeckUid=10
 assert(Run.startCombat(h.run,'raven_adept_solo'))
 local battle=h.run.combat
 local all={};for _,pile in ipairs({battle.hand,battle.draw})do for _,card in ipairs(pile)do all[#all+1]=card end end
 battle.hand,battle.draw,battle.discard={},{},{}
 for _,card in ipairs(all)do
  if card.cardId=='headbutt'then battle.hand[1]=card else battle.discard[#battle.discard+1]=card end
 end
 h:refresh();F.click(r,'battlePanel','card1');F.click(r,'battlePanel','enemy1')
 local pending=assert(battle.pendingPileChoice)
 assert(h.choiceUI.visible)
 local card=hit(r,'choicePanel','card1')
 local stale=release(card,4)
 roundTrip(h,r)
 assert(battle.pendingPileChoice==pending and h.choiceUI.visible)
 assert(not card.click(stale) and #h.choiceUI.selected==0,'resume must reject a choice release from before settings')
 assert(tap(card,5) and tap(hit(r,'choicePanel','confirm'),6))
 assert(not battle.pendingPileChoice)
 h:disable()
end
print('SESSION_MENU_CHOICES_PASS 2')
