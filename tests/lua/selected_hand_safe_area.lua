package.path = 'src/lua/?.lua;build/lua/?.lua;' .. package.path
local Theme = require('abyss_theme')
local layout = require('abyss_battle_card_layout').install({})
local original = Theme.motion.hoverScale
local function box()
    local b = {localRotationZ=0, children={}}
    function b:GetChild(name)
        if not self.children[name] then self.children[name]=box() end
        return self.children[name]
    end
    function b:SetAnchoredPosition(x,y) self.x,self.y=x,y end
    function b:SetLocalScale(x,y) self.sx,self.sy=x,y end
    function b:SetSizeDelta(w,h) self.w,self.h=w,h end
    function b:SetVisible(v) self.visible=v end
    function b:SetAsLastSibling() end
    return b
end
local cases = 0
for _,scale in ipairs({0.95,original,1.5}) do
 Theme.motion.hoverScale=scale
 for count=1,10 do for index=0,count-1 do
  local b=box()
  local rest=layout.placeCard(b,count,index,false)
  local restAngle=b.localRotationZ*math.pi/180
  local restHalf=(Theme.layout.card.size[2]*math.abs(math.cos(restAngle))+Theme.layout.card.size[1]*math.abs(math.sin(restAngle)))/2
  layout.placeCard(b,count,index,true)
  local halfW,halfH=Theme.layout.card.size[1]*scale/2,Theme.layout.card.size[2]*scale/2
  local floor=-Theme.canvas.base[2]/2+Theme.canvas.safe.y
  assert(b.y-halfH>=floor-1e-8,'selected card clipped')
  assert(b.y+halfH<=Theme.canvas.base[2]/2-Theme.canvas.safe.y,'selected top clipped')
  assert(math.abs(b.x)+halfW<=Theme.canvas.base[1]/2-Theme.canvas.safe.x,'selected horizontal clipped')
  local hit=b:GetChild('hit')
  local low=b.y+(hit.y-hit.h/2)*scale
  local high=b.y+(hit.y+hit.h/2)*scale
  assert(low<=rest[2]-restHalf+1e-8 and high>=rest[2]+restHalf-1e-8,'hit lost idle pose')
  assert(low<=b.y-halfH+1e-8 and high>=b.y+halfH-1e-8,'hit lost selected pose')
  assert(math.min(high,Theme.canvas.base[2]/2)-math.max(low,-Theme.canvas.base[2]/2)>=44,'visible hit below minimum')
  assert(hit.w*scale>=44 and hit.localRotationZ==0,'selected hit transform changed')
  assert(b:GetChild('glow').visible==true,'selection feedback missing')
  cases=cases+1
 end end
end
Theme.motion.hoverScale=original
print('ok selected hand safety '..cases..' actual Lua placements')

do
    local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
    local EnemyView=require('abyss_battle_enemy_view')
    local measure=EnemyView.geometry
    local barX,barY=460,-145
    EnemyView.geometry=function(enemy,nativeArt)
        local geometry=measure(enemy,nativeArt)
        geometry.healthX=barX-geometry.x
        geometry.healthY=barY-geometry.y
        geometry.healthTextY=geometry.healthY
        return geometry
    end
    local host,ui,panel,event,tap,_,_,stage=H.setup({'strike'},nil,{touchScreen=function()return false end})
    local _,_,frame=H.F.Viewport.apply(stage.parent,1680,720)
    host:resize(1680,720,frame)
    host:update(10)
    local card=panel:GetChild('card1')
    local hit=card:GetChild('hit')
    local enemy=H.F.actorControl(panel,'enemy1')
    local hp=enemy:GetChild('hp')
    local battle=host.run.combat
    local idleY=card.y
    local expectedY=math.max(idleY+Theme.motion.hoverLift,
        -Theme.canvas.base[2]/2+Theme.canvas.safe.y+Theme.layout.card.size[2]*original/2)
    local function pose()
        return table.concat({card.x,card.y,card.localScaleX,card.localRotationZ,hit.x,hit.y,hit.sizeDeltaX,hit.sizeDeltaY},',')
    end
    assert(ui.handWidthExtra>0 and math.abs(enemy.x+hp.x-barX)<1e-8,'wide fixture did not draw the clear health label')
    tap('card1',7)
    host:update(10)
    assert(ui.selected==battle.hand[1].uid,'tap did not select the card')
    assert(math.abs(card.y-expectedY)<1e-8 and math.abs(card.localScaleX-original)<1e-8 and card.localRotationZ==0)
    local clear=pose()
    for _,y in ipairs({-145,-180}) do
        barX,barY=card.x,y
        host:refresh()
        host:update(1/60)
        assert(math.abs(enemy.x+hp.x-barX)<1e-8 and math.abs(enemy.y+hp.y-y)<1e-8,
            'fixture did not move the rendered health label into the reading lane')
        assert(pose()==clear,'enemy health changed the selected hand pose or hit area')
        host:update(10)
        assert(pose()==clear,'enemy health changed the settled hand pose or hit area')
    end
    tap('card1',7)
    event('card1','exit',7)
    host:update(10)
    assert(not ui.selected and card.y==idleY and card.localScaleX==1 and #battle.hand==1 and battle.energy==3,
        'same-card cancel did not restore the idle pose without playing the card')
    EnemyView.geometry=measure
    host:disable()
    print('ok wide selected hand ignores enemy health geometry')
end
