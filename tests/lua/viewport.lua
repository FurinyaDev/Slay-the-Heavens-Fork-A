local NativeContract = dofile('tests/lua/support/native_ui_contract.lua')
local Viewport = require("abyss_viewport")
local Layout = require("abyss_ui_layout")
local Theme = require('abyss_theme')
local backdropSpec, stageSpec
for _, spec in ipairs(Layout) do
    if spec.name == "canvasBackdrop" then backdropSpec = spec end
    if spec.name == "stage" then stageSpec = spec end
end
assert(backdropSpec and stageSpec)
local stage = {}
function stage:SetLocalScale(x, y, z) self.scale = {x, y, z} end
function stage:SetSizeDelta() end
function stage:GetChild() end
local backdrop = { delta = {backdropSpec.size[1], backdropSpec.size[2]} }
function backdrop:SetSizeDelta(w, h) NativeContract.sizeDelta(w,h); self.delta = {w, h} end
local root = {}
function root:GetChild(name)
    if name == "stage" then return stage end
    if name == "canvasBackdrop" then return backdrop end
end
local cases = {
    -- Canvas API and actual host need not have the same width.
    {1280, 720, 2556, 1179}, {1280, 720, 2268, 1179},
    {1920, 1080, 1920, 1080}, {2340, 1080, 2340, 1080},
    {2400, 1080, 2400, 1080}, {2520, 1080, 2520, 1080},
    {2048, 1536, 2048, 1536}, {2732, 2048, 2732, 2048},
    {1280, 720, 1280, 720},
}
for _, device in ipairs(cases) do
    -- Repeat after portrait/tablet/wide-screen changes: no accumulated enlargement.
    for _ = 1, 3 do
        local returned, scale = Viewport.apply(root, device[1], device[2])
        local expected = math.min(device[1] / 1280, device[2] / 720)
        assert(returned == stage and scale == expected)
        assert(stage.scale[1] == expected and stage.scale[2] == expected and stage.scale[3] == 1)
        for axis = 1, 2 do
            local low = backdropSpec.anchor and backdropSpec.anchor.min[axis] or 0.5
            local high = backdropSpec.anchor and backdropSpec.anchor.max[axis] or 0.5
            local extent = device[axis + 2]
            local actual = extent * (high - low) + backdrop.delta[axis]
            assert(actual == extent + (axis == 1 and 400 or 0), "background must overscan host width only")
        end
        assert(stageSpec.size[1] * scale <= device[1] + 1e-9)
        assert(stageSpec.size[2] * scale <= device[2] + 1e-9)
    end
end
for _, bad in ipairs({0, -1, math.huge, 0/0, "1280"}) do
    assert(not pcall(Viewport.apply, root, bad, 720))
    assert(not pcall(Viewport.apply, root, 1280, bad))
end
print("PASS viewport: independent host coverage, uniform content and repeated resize (9 devices)")

local control = dofile('tests/lua/support/game_ui_fixture.lua').control
local nativeRoot = control({name='root',kind='container',children=Layout})
local function at(node, path)
    for name in path:gmatch('[^/]+') do node = assert(node:GetChild(name),path) end
    return node
end

for _, device in ipairs({{1280,720}, {1560,720}, {1680,720}, {960,720}, {1384.916,720,true},
    {1280,720,true}, {960,720,true}, {1599.9998,899.9998}, {1280,720}}) do
    local s, k, frame = Viewport.apply(nativeRoot, device[1], device[2], device[3])
    local visualWidth = (device[1] + (device[3] and device[1]>=1280 and 400 or 0))/k
    local inputWidth, inputHeight = device[1]/k, device[2]/k
    assert(s.sizeDeltaX == inputWidth and s.sizeDeltaY == inputHeight)
    assert(math.abs(frame.visual[3]-visualWidth)<.00001 and frame.visual[4] == inputHeight)
    for _, path in ipairs({'menuPanel/lowpolyVeil','exitPanel/veil','runMenu/veil','deckPanel/veil','choicePanel/veil','relicPanel/veil'}) do
        local veil = at(s,path)
        assert(math.abs(veil.sizeDeltaX-visualWidth)<.00001 and veil.sizeDeltaY == inputHeight,path)
    end
    for _, name in ipairs({'exitPanel','runMenu','deckPanel','choicePanel','relicPanel'}) do
        local hit = at(s,name..'/blocker')
        assert(hit.sizeDeltaX == inputWidth and hit.sizeDeltaY == inputHeight,name)
    end
    local background = at(s,'officialBattleBackdrop')
    local cover = math.max(visualWidth/1280,inputHeight/720)
    assert(math.abs(background.localScaleX-cover)<.00001 and background.localScaleX==background.localScaleY)
    local entry = at(s,'exitEntry')
    if device[3] then
        local menu=Theme.presentationProfile=='official-assets-first' and Theme.officialAssets.battleHud.menu
            or Theme.layout.exitMenu.entry
        assert(entry.anchoredPositionX+menu[1]+24<=inputWidth/2-40)
        assert(entry.anchoredPositionY+menu[2]+24<=inputHeight/2-20)
    else
        assert(entry.anchoredPositionX == math.max(0,(inputWidth-1280)/2-40))
    end
    local card, player = at(s,'battlePanel/card1'), at(s,'battlePanel/hero')
    assert(card.localScaleX == nil and player.localScaleX == nil,'content never receives cover scale')
    local figure=at(s,'nodePanel/eventView/neowFigure')
    local masonry=figure:GetChild('masonry')
    if masonry then
        for i=0,6 do
            local left,right=masonry:GetChild('stone'..i*8),masonry:GetChild('stone'..(i*8+7))
            local extra=(visualWidth-1280)/2
            assert(math.abs(left.anchoredPositionX-left.sizeDeltaX/2+637-(i%2)*60+extra)<0.01)
            assert(math.abs(right.anchoredPositionX+right.sizeDeltaX/2-(637+(i%2)*3)-extra)<0.01)
            assert(left.sizeDeltaY==62 and right.sizeDeltaY==62)
        end
        local inner=masonry:GetChild('stone18')
        assert(inner.sizeDeltaX==154 and inner.localScaleX==nil,'inner masonry keeps the original spacing')
        local statue=at(figure,'geoStatue')
        assert(statue.localScaleX==nil and statue.localScaleY==nil,'statue must not be stretched with the wall')
        local steel=at(s,'nodePanel/officialRunBar/steel')
        assert(math.abs(338.5+steel.anchoredPositionY+steel.sizeDeltaY*steel.localScaleY/2-inputHeight/2)<.01)
        local dismiss=at(s,'potionPanel/dismiss')
        assert(dismiss.sizeDeltaX==inputWidth and dismiss.sizeDeltaY==inputHeight)
    end
    local transition=at(s,'pageReveal')
    local gate=require('abyss_page_reveal').new(transition,function()return false end,nil,{full={0,0,1280,720}})
    gate:resize(device[1],device[2],frame)
    assert(math.abs(at(transition,'veil').sizeDeltaX-visualWidth)<.00001)
    assert(at(transition,'blocker').sizeDeltaX==inputWidth)
end
