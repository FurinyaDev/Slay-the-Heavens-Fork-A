local Scene = require('abyss_chapter_battle_scene')
local platform = {imageSource=1,imageTypes={basic=1,stretch=2},imageFillRight=3,
    color=function(r,g,b,a) return {r,g,b,a} end}

local writes, failImage = 0, nil
local function actor()
    local control = {visible=true}
    function control:SetImage(_, id)
        writes = writes + 1
        if id == failImage then return false end
        self.imageId = id
    end
    function control:SetVisible(value) writes = writes + 1; self.visible = value end
    function control:SetFillUnused() self.fill = nil end
    function control:SetFillHorizontal(side, amount)
        assert(side == platform.imageFillRight and amount == .5)
        self.fill = amount
    end
    for _, name in ipairs({'SetPivot','SetLocalScale','SetLocalRotation','SetSizeDelta','SetAnchoredPosition'}) do
        control[name] = function() writes = writes + 1 end
    end
    return control
end
local function row(image, mask) return {image,0,0,10,10,.5,.5,1,1,0,mask,10,11,12,255} end
local data = {slotCount=2,batchSize=1,rows={{row(100001,0),row(106057,0)},{row(100003,1),row(106095,0)}}}
local first, second = actor(), actor()
first.imageId = 100001
second.imageId, second.imageType = 106057, platform.imageTypes.stretch
local function batch(control, name)
    return {GetChild=function(_, key) assert(key == name); return control end}
end
local batches = {paintBatch1=batch(first,'paintSlot1'),paintBatch2=batch(second,'paintSlot2')}
local host = {visible=true,GetChild=function(_,key) return batches[key] end,
    SetVisible=function(self,value) self.visible=value;writes=writes+1 end}
local loads = 0
local swap = assert(Scene.bind(host,platform,function() loads=loads+1;return data end))

assert(swap(1) and writes == 0 and loads == 0)
assert(swap(2) and loads == 1)
assert(host.visible and first.imageId == 100003 and first.enableMask and first.fill == .5)
assert(second.visible and second.imageId == 106095 and second.imageType == platform.imageTypes.stretch)
local prior = writes
assert(swap(2) and writes == prior)

assert(swap(1))
assert(first.imageId == 100001 and not first.enableMask and not first.fill)
assert(second.visible and second.imageId == 106057 and second.imageType == platform.imageTypes.stretch)
failImage = 106095
assert(not swap(2))
assert(host.visible and first.imageId == 100001)
assert(second.visible and second.imageId == 106057 and second.imageType == platform.imageTypes.stretch)
prior = writes
assert(not swap(2) and writes == prior)
failImage = nil
assert(swap(1) and writes == prior)
assert(swap(2) and second.visible and loads == 1)
assert(first.imageType == nil, 'built-in shape has no type write')
-- A malformed row cannot change a live slot into a different renderer family.
data.rows[1][2] = row(100002,0)
assert(not swap(1) and host.visible and second.imageId == 106095)
assert(first.imageId == 100003 and first.fill == .5)

local Theme = require('abyss_theme')
local EnemyView = require('abyss_battle_enemy_view')
local UnitView = require('abyss_battle_unit_view')
local slime = {definitionId='spike_slime_l',statuses={}}
local sentry = {definitionId='sentry',statuses={}}
local priorSlime, priorSentry = EnemyView.geometry(slime), EnemyView.geometry(sentry)
Theme.layout.enemyRow.groundContact = {y=-112, depth=.35, healthGap=8,
    feet={spike_slime_l=22/106}, footprints={}}
Theme.layout.player.groundedStatusLane = {-168,42}
local placed, flying = EnemyView.geometry(slime), EnemyView.geometry(sentry)
local sy = Theme.canvas.base[2]/1080
local function near(actual, expected) assert(math.abs(actual - expected) < .00001) end
near(placed.y - placed.portrait*22/106, -112)
near(placed.hitY - placed.hitHeight/2, -112 - 30*sy)
near(placed.y + placed.healthY, -120 - 48*sy)
near(placed.portrait, priorSlime.portrait)
near(flying.y, priorSentry.y)
near(flying.hitY, priorSentry.hitY)
assert(UnitView.noticeLift({},210,-35,true)==0)

local shadowWrites=0
local controls={}
local shadowBox={name='enemy'}
function shadowBox:GetChild(name)
    if not controls[name] then
        local control={name=name,sizeDeltaX=3,sizeDeltaY=3}
        local function write()
            if name=='plate' or name=='border' then shadowWrites=shadowWrites+1 end
        end
        control.SetSizeDelta,control.SetAnchoredPosition=write,write
        control.GetChild=shadowBox.GetChild
        function control:SetVisible(value) self.visible=value;write() end
        controls[name]=control
    end
    return controls[name]
end
local function noop()end
local function writeShadowMaterial(control)
    if control.name=='plate' or control.name=='border' then shadowWrites=shadowWrites+1 end
end
local renderUnit,poseUnit,retireUnit=UnitView.new(writeShadowMaterial,writeShadowMaterial,noop,noop)
local drawable={name='Grounded test',hp=20,maxHp=20,block=0,statuses={},statusDefinitions={}}
Theme.layout.enemyRow.groundContact.artSize=106
placed.footprints={{0,40}}
renderUnit(shadowBox,drawable,placed.portrait,1,100,false,100,placed)
assert(controls.plate.visible and not controls.border.visible)
local initial=shadowWrites
for _,s in ipairs({.98,1,1.02,1}) do
    near(poseUnit('enemy',shadowBox,0,0,s,s,1,'idle'),placed.groundY*(1-s))
    renderUnit(shadowBox,drawable,placed.portrait,1,100,false,100,placed)
end
assert(shadowWrites==initial,'steady shadow repeats no image, tint, placement or visibility writes')
near(poseUnit('enemy',shadowBox,20,0,1,1,1,'action'),0)
assert(shadowWrites==initial+1,'lunge owns exactly one position write per painted shadow')
assert(poseUnit('enemy',shadowBox,20,2,1,1,1,'hit')==2,'hit lift remains owned by the pose')
assert(shadowWrites==initial+1,'the same pose spends no repeat shadow write')
retireUnit(shadowBox)
assert(poseUnit('enemy',shadowBox,70,2,1,1,.25,'death')==2)
assert(shadowWrites==initial+1,'retired monsters do not touch their old shadow controls')
renderUnit(shadowBox,drawable,flying.portrait,1,100,false,100,flying)
assert(not controls.plate.visible and not controls.border.visible,'airborne actor has no contact shadow')

Theme.layout.player.groundShadow={y=-93,footprints={{-21,12},{28,18}}}
local renderHero=setmetatable({name='hero'},{__index=shadowBox})
local feedbackHero=setmetatable({name='hero'},{__index=shadowBox})
assert(renderHero~=feedbackHero,'distinct native child proxies')
renderUnit(renderHero,{name='Traveler',hp=20,maxHp=20,block=0,statuses={},statusDefinitions={}},210,1,100,false,100)
local priorHero=shadowWrites
near(poseUnit('player',feedbackHero,16,0,1,1,1,'action'),0)
assert(shadowWrites==priorHero+2,'hero shadow follows action across different native proxies')
near(poseUnit('player',feedbackHero,0,0,1,1,1,'idle'),0)
assert(shadowWrites==priorHero+4,'both hero footprints return to idle')

print('CHAPTER_BATTLE_SCENE_POOL_PASS')
