local function compare(left, right, path)
    assert(type(left) == type(right), path)
    if type(left) ~= 'table' then assert(left == right, path); return end
    for key, value in pairs(left) do compare(value, right[key], path .. '.' .. key) end
    for key in pairs(right) do assert(left[key] ~= nil, path .. '.' .. key) end
end

local fixtures = dofile('tests/lua/support/bounded_native_art_fixture.lua')
local Display = require('abyss_card_display')
local Runtime = require('abyss_card_art_runtime')
local function readModule(path)
    local before = os.clock()
    local chunk = assert(loadfile(path))
    local parsed = os.clock()
    local assets = chunk()
    return assets, parsed - before, os.clock() - parsed
end

local function render(assets)
    fixtures.configure(Runtime)
    local presentation = {armaments = {}, cleave = {}, heavy_blade = {}}
    Display.bindNativeAssets(presentation, assets)
    local card = fixtures.face()
    local fallback, holder = card:GetChild('art'), card:GetChild('artSamples')
    local pictures = {}
    for _, id in ipairs({'cleave', 'armaments', 'heavy_blade'}) do
        local art = presentation[id].nativeArt
        assert(not Display.writeNativeArt(card, {id = id}, art, fixtures.platform, fallback))
        assert(fallback.visible and not holder.visible, 'partial drawing exposed')
        local begin = #fixtures.created
        for _ = 1, 50 do Runtime.update() end
        assert(Display.writeNativeArt(card, {id = id}, art, fixtures.platform, fallback))
        assert(not fallback.visible and holder.visible)
        local image = {}
        for index = begin + 1, #fixtures.created do
            local control = fixtures.created[index]
            if control.kind == 'image' then image[#image + 1] = control end
        end
        assert(#image == #art.slots, 'unexpected instance count for ' .. id)
        pictures[id] = image
    end
    Display.clearNativeArt(card)
    assert(fallback.visible and not holder.visible and Runtime.status().livePools == 0)
    return pictures
end

local visualFields = {'image', 'imageType', 'imageColor', 'position', 'size', 'rotation', 'scale',
    'anchorMin', 'anchorMax', 'pivot', 'templateIndex'}
local function comparePictures(baseline, packed)
    for id, images in pairs(baseline) do
        for index, expected in ipairs(images) do
            local actual = packed[id][index]
            assert(not expected.alive and not actual.alive, 'released card leaked a control')
            for _, field in ipairs(visualFields) do
                compare(expected[field], actual[field], id .. '.' .. index .. '.' .. field)
            end
        end
    end
end

local baseline, baselineParse, baselineExecute = readModule(EXACT_CARD_BASELINE)
local packed, packedParse, packedExecute = readModule(EXACT_CARD_PACKED)
compare(baseline, packed, 'metadata')
comparePictures(render(baseline), render(packed))
print('EXACT_CARD_ART_PASS 3 IDs, 6534 slots, unchanged card renderer and released controls')
print(('EXACT_CARD_ART_TIMING baseline_load=%.6f baseline_execute=%.6f packed_load=%.6f packed_execute=%.6f')
    :format(baselineParse, baselineExecute, packedParse, packedExecute))
