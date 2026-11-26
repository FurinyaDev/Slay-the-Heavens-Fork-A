-- Isolated v2.2.0 study. Native source geometry sha256 0d4d6ca6a928ff528a7743be5d3bfbacd3363d000201b5030e51bdf37631a1df

-- Measured opaque crown and planted-toe bounds in the 106 px authored pose.
local M={foot=35/106,crown=12/106,touchWidth=82/106,footprints={{-12,9,3},{3,7,3}}}
local variant

function M.usesNativeByrd(actor,data)
    if not actor or actor.definitionId~='byrd' then return false end
    data=data or require('abyss_monster_art_data')
    return data.status=='refined-release'
end

function M.isGrounded(actor,data)
    return M.usesNativeByrd(actor,data) and actor.statuses~=nil and (actor.statuses.flight or 0)<=0
end

local parts={
    {100003,1,24,-10,25,13,0,0,-123,44,53,64,255}, -- tail silhouette
    {100003,1,23,-7,22,9,0,0,-111,55,63,72,255}, -- tail top plane
    {100002,1,7,-9,40,34,0,0,1,55,63,72,255}, -- resting body
    {100002,1,12,-5,27,23,0,0,9,83,101,115,255}, -- far folded wing
    {100001,1,4,-23,4,18,0,0,-14,139,105,71,255}, -- rear leg
    {100002,1,5,-32,13,4,0,0,-3,139,105,71,255}, -- rear planted foot
    {100001,1,3,-34,8,2,0,0,2,177,156,119,255}, -- rear flat toes
    {100001,1,-9,-24,4.4,20,0,0,8,177,156,119,255}, -- near leg
    {100002,1,-10,-32,15,5,0,0,5,139,105,71,255}, -- near planted foot
    {100001,1,-12,-34,10,2,0,0,0,209,180,136,255}, -- near flat toes
    {100002,0,-3,-9,35,30,0,0,-30,64,73,81,255}, -- original chest base
    {100002,0,-5.299999999999997,-10.600000000000001,27,29,0,0,-30,172,165,150,255}, -- original chest lower
    {100002,0,-7.399999999999999,-8.700000000000003,22,26,0,0,-30,214,203,179,255}, -- original ivory chest
    {100002,1,10,-11,32,23,0,0,-15,44,53,64,255}, -- near folded wing silhouette
    {100002,1,10,-8,31,16,0,0,-14,83,101,115,255}, -- near folded wing main plane
    {100003,1,12,-8,12,27,0,0,-108,83,101,115,255}, -- near folded wing tail tip
    {100002,1,9,-5,22,8,0,0,-18,109,129,142,255}, -- wing upper feather
    {100002,1,10,-11,19,6,0,0,-15,55,63,72,255}, -- closed primaries
    {100002,1,4,-6,10,7,0,0,-10,133,147,156,255}, -- wing shoulder
    {100002,0,-18,3,21,14,0,0,6,64,83,99,255}, -- original head 34
    {100002,0,-19,4.5,17.5,10.2,0,0,5,114,133,142,255}, -- original head 35
    {100003,0,-22.293329797729854,3.160468650808248,11.118462356660228,23.820510946661127,99.93310570521999,0,34.99740495592019,179,177,160,255}, -- original head 36
    {100003,0,-17.294792781188512,2.82272144698878,13.491967876350385,24.392628552085164,99.22303890573039,0,-149.42417024059586,179,177,160,255}, -- original head 37
    {100003,0,-30.883963926718856,-1.3305241321721724,11.543696851528987,3.6056451268098795,42.51925349728958,0,58.007182999818326,110,80,55,255}, -- original head 38
    {100003,0,-26.063632017965233,0.9449171195495865,179443854.69244263,7.458000000000003,90.00000160159084,0,-89.99999804718313,190,152,98,255}, -- original head 39
    {100002,0,-19,3.700000000000003,2.5,2.45,0,0,4,41,40,40,255}, -- original head 40
}

function M.art(airborne)
    if variant then return variant end
    local slots={}
    for index,s in ipairs(parts) do
        slots[index]={image=s[1],imageType=s[2]==0 and 'basic' or 'stretch',
            position={s[3],s[4]},size={s[5],s[6]},rotation={s[7],s[8],s[9]},colour={s[10],s[11],s[12],s[13]},
            anchorMin={.5,.5},anchorMax={.5,.5},pivot={.5,.5},scale={1,1}}
    end
    -- Reset the whole authored air footprint on each shape change. Only 26
    -- slots become visible on the ground and the actor's template stays put.
    variant={enemyId=airborne.enemyId,cardId=airborne.cardId,capacity=airborne.capacity,slots=slots,grounded=true}
    assert(#slots<=variant.capacity,'Byrd rest must fit the existing native actor pool')
    return variant
end

return M
