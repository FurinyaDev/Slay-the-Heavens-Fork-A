-- Experimental exact rows for the three reviewed M8 redraws.
local function decodeSlot(row, index)
    return {
        image = row[1], imageType = row[2] == 0 and 'basic' or 'stretch',
        position = {row[3], row[4]}, size = {row[5], row[6]},
        rotation = {row[7], row[8], row[9]}, colour = {row[10], row[11], row[12], row[13]},
        anchorMin = {.5, .5}, anchorMax = {.5, .5}, pivot = {.5, .5}, scale = {1, 1},
        path = {('group%03d'):format(math.floor(index / 60)), ('shape%04d'):format(index)},
    }
end

local function decode(packed)
    local assets = {}
    for id, entry in pairs(packed) do
        local metadata = entry.metadata
        metadata.slots = {}
        for index, row in ipairs(entry.rows) do
            metadata.slots[index] = decodeSlot(row, index - 1)
        end
        assets[id] = metadata
    end
    return assets
end
