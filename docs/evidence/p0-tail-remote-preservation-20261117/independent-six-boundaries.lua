package.path='./?.lua;'..package.path
package.loaded.abyss_theme={layout={cardDrag={threshold=8}},canvas={base={1280,720}}}
package.loaded.abyss_combat={}
package.loaded.abyss_actor={}
package.loaded.abyss_run={}
package.loaded.abyss_battle_enemy_view={}
package.loaded.abyss_card_input={}
package.loaded.abyss_battle_reward_owner={capture=function()end}
package.loaded.abyss_controller={bind=function()end,pointerBlocked=function()return false end}
local Input=require('abyss_battle_input_state')
local Gestures=require('abyss_battle_card_gestures')
local Actions=require('abyss_battle_action_bindings')
local function scenario(mode)
 local control={listeners={}}
 function control:AddCursorEventListener(event,fn)self.listeners[event]=fn end
 local owner={active=true,dragEnabled=true,selected=nil,selectionEpoch=1,
  run={phase='combat',combat={phase='player',turn=1,hand={}}}}
 function owner:render()end
 local ownership={cardInputs={},actionInputs={},potionInputs={},enemyInputs={}}
 local host={options={embedded=false},cursor={CursorDown='down',CursorUp='up',CursorEndDrag='end'},clickEvent='click',platform={}}
 local input=Input.install(owner,ownership,host,{})
 local closes,closeCalls=0,0
 local deps={closeInfo=function()closeCalls=closeCalls+1;if owner.info then owner.info=nil;closes=closes+1;return true end;return false end}
 for k,v in pairs(input)do deps[k]=v end
 local gesture=Gestures.install(owner,ownership,host,deps)
 for k,v in pairs(gesture)do deps[k]=v end
 deps.child=function()return control end
 local commands=0
 Actions.install(owner,ownership,host,deps).bind('endTurn',function()commands=commands+1 end)
 local event=mode:match('nil') and {} or {touchId=mode=='other' and 8 or 7}
 control.listeners.down(event)
 if mode~='held' then control.listeners.up(event) end
 assert(ownership.actionInputs[1][mode=='held' and 'held' or 'released'],'real action token')
 owner.info={kind='status'}
 local otherInput={}
 ownership.cardInputs[1]=otherInput
 local closeEvent=mode=='nilclose' and {} or {touchId=7}
 input.pointerBegin(otherInput,closeEvent)
 assert(gesture.down(closeEvent))
 otherInput.held,otherInput.released=nil,nil
 assert(owner.swallow and owner.swallow.touch==closeEvent.touchId)
 if mode=='fresh' then control.listeners.down(event);control.listeners.up(event) end
 control.listeners.click(event)
 assert(commands==((mode=='other' or mode=='fresh')and 1 or 0),'first click admission '..mode)
 local retained=ownership.actionInputs[1].released~=nil
 local heldRetained=ownership.actionInputs[1].held~=nil
 if mode=='held' then control.listeners.up(event) end
 control.listeners.click(event)
 local expected=(mode=='other' or mode=='fresh')and 1 or 0
 assert(commands==expected,'stale command replay '..mode)
 if mode=='released' or mode=='held' or mode=='nilclose' then
  assert(not retained and not heldRetained,'close tail must retire matching held/released '..mode)
 end
 if mode=='other' or mode=='nil' then assert(owner.swallow and owner.swallow.touch==7,'foreign click stole close marker '..mode)end
 assert(closes==1,'new close side effect '..mode)
 print('PASS '..mode..' released='..tostring(retained)..' held='..tostring(heldRetained)..' commands='..commands..' successful_closes='..closes..' closeInfo_calls='..closeCalls)
end
for _,mode in ipairs({'released','held','other','nil','nilclose','fresh'})do scenario(mode)end
print('P0_REMOTE_SIX_BOUNDARIES_PASS')
