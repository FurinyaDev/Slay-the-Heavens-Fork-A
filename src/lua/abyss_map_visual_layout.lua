-- Stable map-space anchors for the view. The run continues to own logical rows and lanes.
local Theme = require('abyss_theme')
local MapLayout = require('abyss_map_layout')
local M = {routeStyle = Theme.presentationProfile == 'official-assets-first' and Theme.officialAssets.mapRoutes}

local function clamp(n, low, high) return math.max(low, math.min(high, n)) end
function M.floorY(chapter, floor)
    local y = MapLayout.firstY + math.max(0, floor - chapter.first) * Theme.layout.map.floorGap
    if floor == chapter.boss then return y + Theme.layout.map.bossFloorLift end
    if chapter.act == 3 and floor == chapter.last then return y + 2 * Theme.layout.map.bossFloorLift end
    return y
end
-- MapRoomNode attaches independent offsets to both the glyph and its hitbox.
-- Mix only immutable presentation inputs so reloads reproduce offsets without
-- consuming the run RNG. Keep products inside the Lua signed integer range.
local function visualOffset(seed, row, lane, axis, limit)
    local value = (seed + row * 3251 + lane * 1699 + axis * 7919) % 65521
    value = ((value ~ (value >> 7)) * 25173 + 13849) % 65521
    value = ((value ~ (value >> 5)) * 25173 + 13849) % 65521
    return value % (2 * limit + 1) - limit
end

function M.positions(map, chapter)
    if not map then return end
    local style = M.routeStyle
    local positions, sum, count = {}, 0, 0
    local left, right = math.huge, -math.huge
    local gap = Theme.layout.map.columnGap
    local middle = (MapLayout.lanes + 1) / 2
    local seed = 0
    if style then
        local identity = tostring(map.mapSeed or map.seed or '')
        for i = 1, #identity do seed = (seed * 131 + identity:byte(i)) % 65521 end
    end
    for _, node in ipairs(map.nodes) do
        local x, y = (node.lane - middle) * gap, M.floorY(chapter, node.floor)
        local generated = style and chapter.act ~= 4 and node.floor < chapter.boss
        if generated then
            local row = node.floor - chapter.first + 1
            x = x + visualOffset(seed, row, node.lane, 1, style.jitterX)
            y = y + visualOffset(seed, row, node.lane, 2, style.jitterY)
            sum, count = sum + x, count + 1
            left, right = math.min(left, x), math.max(right, x)
        end
        positions[node.id] = {x = x, y = y, generated = generated}
    end
    if count > 0 then
        -- Shift the graph as a whole to soften lateral bias while preserving
        -- lane order and its silhouette. Keep outer rooms clear of the paper edges.
        local shift = clamp(-sum / count, -style.maxShift, style.maxShift)
        shift = clamp(shift, -style.routeHalfWidth - left, style.routeHalfWidth - right)
        for _, point in pairs(positions) do
            if point.generated then point.x = point.x + shift end
        end
    end
    return positions
end

return M
