local Input=require('abyss_battle_input_state')
local input={}
local receipt={cardInputs={},actionInputs={input},potionInputs={},enemyInputs={}}
local services=Input.install({},receipt,{stage={},platform={},options={}}, {})
for id=1,64 do services.pointerBegin(input,{touchId=id})end
local count=0;for _ in pairs(input.active)do count=count+1 end
assert(count<=16,'unbounded current origin evidence')
local e={touchId=100};local state=services.pointerBegin(input,e)
local token={touch=100};input.held=token;services.pointerArm(input,token,e,state)
services.pointerEnd(input,e);input.held=nil;input.released=token
assert(not services.pointerTake(input,{}),'saturated pointer accepted anonymously')
services.pointerClear(input)
e={touchId=101};state=services.pointerBegin(input,e);token={touch=101};input.held=token
services.pointerArm(input,token,e,state);services.pointerEnd(input,e);input.held=nil;input.released=token
assert(services.pointerTake(input,{})==token,'cancel barrier did not recover from saturation')
print('SATURATION_PASS retained='..count..' limit=16 fresh_recovered=true')
