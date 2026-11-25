local Scene = require('abyss_chapter_battle_scene')
Enum = {ImageSource={StaticReference=1}, ImageType={Basic=1, Stretch=2}, ImageFillHorizontalType={Right=3}}
Color = {FromRGBA=function(r,g,b,a) return {r,g,b,a} end}

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
        assert(side == Enum.ImageFillHorizontalType.Right and amount == .5)
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
second.imageId, second.imageType = 106057, Enum.ImageType.Stretch
local function batch(control, name)
    return {GetChild=function(_, key) assert(key == name); return control end}
end
local batches = {paintBatch1=batch(first,'paintSlot1'),paintBatch2=batch(second,'paintSlot2')}
local host = {visible=true,GetChild=function(_,key) return batches[key] end,
    SetVisible=function(self,value) self.visible=value;writes=writes+1 end}
local loads = 0
local swap = assert(Scene.bind(host,function() loads=loads+1;return data end))

assert(swap(1) and writes == 0 and loads == 0)
assert(swap(2) and loads == 1)
assert(host.visible and first.imageId == 100003 and first.enableMask and first.fill == .5)
assert(second.visible and second.imageId == 106095 and second.imageType == Enum.ImageType.Stretch)
local prior = writes
assert(swap(2) and writes == prior)

assert(swap(1))
assert(first.imageId == 100001 and not first.enableMask and not first.fill)
assert(second.visible and second.imageId == 106057 and second.imageType == Enum.ImageType.Stretch)
failImage = 106095
assert(not swap(2))
assert(host.visible and first.imageId == 100001)
assert(second.visible and second.imageId == 106057 and second.imageType == Enum.ImageType.Stretch)
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


print('CHAPTER_BATTLE_SCENE_POOL_PASS')
