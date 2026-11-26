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

local Viewport=require('abyss_viewport')
local x,baseY,angle=Viewport.handSlot(10,9,400)
local ceiling=-152
local health={{left=x-40,right=x+40,bottom=ceiling}}
local y,scale,protectedY=Viewport.handFocus(baseY,x,health)
local halfHeight=Theme.layout.card.size[2]*scale/2
local floor=-Theme.canvas.base[2]/2+Theme.canvas.safe.y
assert(protectedY==ceiling and scale<=Theme.motion.hoverScale)
assert(y+halfHeight<ceiling and y-halfHeight>=floor-1e-8,'focused card exceeded health or safe bounds')
assert(Viewport.limitHandFocus(y+15,angle,scale,ceiling)<y,'rotated focus tween crossed the health lane')
local originalY,originalScale=Viewport.handFocus(baseY,-x)
local clearY,clearScale=Viewport.handFocus(baseY,-x,health)
assert(originalY==clearY and originalScale==clearScale,'a clear card slot changed its focus')
local lowBar=-180
local lowY,lowScale=Viewport.handFocus(baseY,x,{{left=x-40,right=x+40,bottom=lowBar}})
local lowHalf=Theme.layout.card.size[2]*lowScale/2
assert(lowY+lowHalf<lowBar and lowY-lowHalf>=floor-1e-8,'a low health bar pushed the settled card below the safe area')
print('ok wide selected hand preserves nearby health and the screen bottom')

do
    local profile=Theme.presentationProfile
    Theme.presentationProfile='official-assets-first'
    local EnemyView=require('abyss_battle_enemy_view')
    local measure=EnemyView.geometry
    local observed=false
    EnemyView.geometry=function(_,nativeArt)
        assert(nativeArt==false,'hand focus ignored the enemy renderer fallback mode')
        observed=true
        return {x=x,y=0,healthX=0,healthY=-130,healthTextY=-130,healthHeight=12,hitWidth=80}
    end
    local wide=require('abyss_battle_card_layout').install({handWidthExtra=400},nil,{platform={nativeMonsterArtEnabled=false}})
    wide.prepareHandFocus({enemies={{hp=1}}})
    local focus=wide.placeCard(box(),10,9,true)
    EnemyView.geometry=measure
    Theme.presentationProfile=profile
    assert(observed and focus.ceiling,'fallback health bounds did not reach wide focus')
    print('ok wide selected hand shares enemy fallback art geometry')
end
