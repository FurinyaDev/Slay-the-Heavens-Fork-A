-- Formal generated GameUI with deterministic source-history Act II grouping.
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run=require('abyss_run')
local Queue=require('abyss_encounter_queue')
local Art=require('abyss_byrd_ground_trial')
local EnemyView=require('abyss_battle_enemy_view')
local root=F.Viewport.apply(F.control({children=F.Layout}),1280,720)
local scene=root:GetChild('battlePanel'):GetChild('chapterBattleScene')
local sceneRows=require('abyss_chapter_battle_scene_data').rows
for _,batch in pairs(scene.children)do
    for name,slot in pairs(batch.children)do
        local index=tonumber(name:match('%d+'))
        slot.imageId=(sceneRows[1][index] or sceneRows[2][index])[1]
        slot.SetFillHorizontal=function()end
        slot.SetFillUnused=function()end
    end
end
local actorApi=F.monsterActors()
local instantiate=actorApi.instantiate
local serial=0
actorApi.templateIndexByDefinition={byrd=4}
actorApi.instantiate=function(index,parent)
    if index~=4 then return instantiate(index,parent)end
    local actor=F.control(F.Templates.AbyssMonsterActor41,parent)
    serial=serial+1
    parent.children['trialByrd'..serial]=actor
    return actor
end
local platform={
    seed=10,prologue=false,imageSource='static',imageFillRight=3,
    color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end,monsterActors=actorApi}
local ui=F.GameUI.new(root,F.Data,F.Presentation,'click',platform)
root.ui=ui
assert(F.start(ui))
local panel=root:GetChild('battlePanel')
local surface=require('abyss_monster_surfaces').get(panel)
local function enter()
    ui.run.phase,ui.run.nodeFlow,ui.run.floor,ui.run.act='map',nil,18,2
    ui.run.encounters=Queue.new('10',2)
    assert(Queue.peek(ui.run.encounters,'normal')=='3 Byrds')
    assert(Run.startRoomCombat(ui.run,'normal'))
    F.Combat.draw(ui.run.combat,20)
    return ui.run.combat
end
local function controls(actor)
    local box=assert(surface:find(actor.id),'missing actor')
    local art=box:GetChild('monsterArt')
    local group=art:GetChild('monsterSamples'):GetChild('group000')
    return box,art,group
end
local function shape(group,index)return group:GetChild(string.format('shape%04d',index-1))end
local function counts(group,max)
    local visible=0
    for i=1,max do if shape(group,i).visible then visible=visible+1 end end
    return visible
end
local function near(a,b)return math.abs(a-b)<1e-8 end
local function point(box,name)return box.y+box:GetChild(name).y end
local function matching(actor,box,art)
    local g=EnemyView.geometry(actor,platform.nativeMonsterArtEnabled)
    assert(near(box.y,g.y))
    assert(near(point(box,'hit'),g.hitY))
    assert(near(point(box,'hp'),g.y+g.healthTextY))
    assert(near(point(box,'intentIcon'),g.y+g.intentY))
    if art and art.visible then assert(near(art.y,box:GetChild('portrait').y))end
    if g.footprints then
        for _,name in ipairs({'plate','border'})do
            assert(box:GetChild(name).visible and near(point(box,name),g.y+g.groundY-1))
        end
        assert(g.hitHeight>=F.Theme.layout.statusIcon.minimumTouch and g.hitHeight<90)
        assert(g.intentY-g.portrait*Art.crown<45 and g.healthWidth==160)
    else assert(not box:GetChild('plate').visible and not box:GetChild('border').visible)end
end
local function strike()
    for index,card in ipairs(ui.run.combat.hand)do
        if card.cardId=='strike'then
            F.click(root,'battlePanel','card'..index)
            assert(ui.battleUI.selected==card.uid)
            return
        end
    end
    error('no Strike in legal hand')
end
local function attackActor(actor)
    local box=assert(surface:find(actor.id))
    local hit=box:GetChild('hit')
    assert(hit and hit.click)
    hit.click()
end
local function settle(observe)
    for _=1,240 do
        ui:update(.025)
        if observe then observe() end
        if not ui.battleUI.busy then return end
    end
    error('battle feedback did not settle')
end
local function intent(actor)return actor.intents[actor.intentIndex].id end
local function endTurn()
    local control=panel:GetChild('endTurn')
    local hit=control.click and control or control:GetChild('hit')
    assert(hit.click)
    hit.click()
end

local battle=enter()
local lead,sibling=battle.enemies[1],battle.enemies[2]
assert(lead.definitionId=='byrd' and lead.statuses.flight==3 and sibling.statuses.flight==3)
lead.statuses.flight=1 -- legal one-stack point just before final attack contact
ui:refresh()
local box,art,group=controls(lead)
local siblingBox,_,siblingGroup=controls(sibling)
local flightY,oldHealth,oldEnergy=box.y,lead.hp,battle.energy
assert(not Art.isGrounded(lead)and counts(group,41)==41 and counts(siblingGroup,41)==41)
matching(lead,box,art)

strike()
attackActor(lead)
settle()
assert(lead.statuses.flight==0 and intent(lead)=='stunned')
assert(lead.hp==oldHealth-3 and battle.energy==oldEnergy-1)
assert(controls(lead)==box and art.visible and counts(group,41)==26)
assert(not shape(group,27).visible and not shape(group,41).visible)
assert(controls(sibling)==siblingBox and counts(siblingGroup,41)==41 and not siblingBox:GetChild('plate').visible)
assert(Art.isGrounded(lead) and box.y<flightY-80)
matching(lead,box,art)

local count=0
for _,control in ipairs({art,box:GetChild('plate'),box:GetChild('border'),shape(group,1),shape(group,26),shape(group,41)})do
    for _,method in ipairs({'SetImage','SetVisible','SetAnchoredPosition','SetLocalScale','SetLocalRotation'})do
        local normal=control[method]
        control[method]=function(self,...)
            count=count+1
            return normal(self,...)
        end
    end
end
for _=1,60 do ui:update(.016)end
assert(count==0,'grounded idle artwork/shadows emitted repeated native writes: '..count)

platform.nativeMonsterArtEnabled=false
ui:refresh()
local fallbackBox=assert(surface:find(lead.id))
assert(fallbackBox~=box and not box.alive and not art.alive)
local fallbackPortrait=fallbackBox:GetChild('portrait')
local fallbackArt=fallbackBox:GetChild('monsterArt')
local fallbackDrawing=fallbackPortrait.visible and fallbackPortrait or fallbackBox:GetChild('portraitArt')
assert(fallbackDrawing and fallbackDrawing.visible,'native-off retains the existing fallback artwork')
local fallbackPool=fallbackArt and fallbackArt:GetChild('monsterSamples')
for _,sampleGroup in pairs(fallbackPool and fallbackPool.children or {})do
    for _,sample in pairs(sampleGroup.children)do assert(not sample.visible,'native-off exposed a trial raster shape')end
end
assert(near(fallbackBox.y,flightY),'native-off fallback must retain its original center')
matching(lead,fallbackBox)
local fallbackY=fallbackDrawing.y
for _=1,12 do ui:update(.016)end
assert(not near(fallbackDrawing.y,fallbackY),'native-off fallback must retain its idle motion')
platform.nativeMonsterArtEnabled=true
ui:refresh()
ui:update(.016)
box,art,group=controls(lead)
local freshSibling,freshSiblingArt,freshSiblingGroup=controls(sibling)
siblingGroup=freshSiblingGroup
assert(freshSibling~=siblingBox and freshSiblingArt.visible and not fallbackBox.alive and art.visible and counts(group,41)==26)
matching(lead,box,art)

endTurn();settle()
assert(lead.statuses.flight==0 and intent(lead)=='headbutt' and counts(group,41)==26)
local reach,shadowReach=0,0
local plate=box:GetChild('plate')
local baseline=plate.x
local oldPlayerHp=battle.player.hp
endTurn()
settle(function()
    local current=art.x or 0
    reach=math.max(reach,math.abs(current))
    shadowReach=math.max(shadowReach,math.abs(plate.x-baseline))
    assert(near(current,box:GetChild('portrait').x),'art detached from attack pose')
end)
assert(reach>1 and shadowReach>1,'grounded headbutt and its contact must move')
assert(battle.player.hp<oldPlayerHp and lead.statuses.flight==0 and intent(lead)=='airborne')
endTurn();settle()
assert(lead.statuses.flight==3 and not Art.isGrounded(lead))
assert(controls(lead)==box and counts(group,41)==41 and shape(group,41).visible)
matching(lead,box,art)
assert(near(box.y,flightY) and counts(siblingGroup,41)==41)

local nextBattle=enter()
ui:refresh()
local newBox,_,newGroup=controls(nextBattle.enemies[1])
assert(newBox~=box and not box.alive,'new battle must release old Byrd owner and pool')
assert(nextBattle.enemies[1].statuses.flight==3 and counts(newGroup,41)==41 and not newBox:GetChild('plate').visible)
print('BYRD_GROUND_TRIAL_PASS true Strike, native geometry/controls, no idle writes, native-off fallback, headbutt, relift and new-owner negative')
