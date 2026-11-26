local M = {}

local function isBasicShape(image)
    return image >= 100001 and image <= 100006
end

local function paint(control, row, platform)
    local basicShape = isBasicShape(row[1])
    assert(isBasicShape(control.imageId) == basicShape, 'chapter scene renderer family differs')
    assert(control:SetImage(platform.imageSource, row[1]) ~= false)
    if not basicShape then
        control.imageType = platform.imageTypes.stretch
        assert(control.imageType == platform.imageTypes.stretch, 'chapter scene image mode rejected')
    end
    assert(control:SetPivot(row[6], row[7]) ~= false)
    assert(control:SetLocalScale(row[8], row[9], 1) ~= false)
    assert(control:SetLocalRotation(0, 0, row[10]) ~= false)
    assert(control:SetSizeDelta(row[4], row[5]) ~= false)
    assert(control:SetAnchoredPosition(row[2], row[3]) ~= false)
    control.imageColor = platform.color(row[12], row[13], row[14], row[15])
    local masked = row[11] == 1
    control.enableMask = masked
    if masked then
        assert(control:SetFillHorizontal(platform.imageFillRight, .5) ~= false)
    else
        assert(control:SetFillUnused() ~= false)
    end
end

local function paintChapter(host, rows, size, batchSize, platform)
    for first = 1, size, batchSize do
        local batch = assert(host:GetChild('paintBatch' .. (1 + math.floor((first - 1) / batchSize))))
        for index = first, math.min(size, first + batchSize - 1) do
            local control = assert(batch:GetChild('paintSlot' .. index))
            local row = rows[index]
            if row then paint(control, row, platform) end
            assert(control:SetVisible(row and true or false) ~= false)
        end
    end
end

local function sceneData()
    return require('abyss_chapter_battle_scene_data')
end

function M.bind(host, platform, loadData)
    if not host then return nil end
    local data
    local chapter = 1 -- Act I is authored in the native layout.
    local failedChapter
    local function publish(rows)
        assert(host:SetVisible(false) ~= false)
        paintChapter(host, rows, data.slotCount, data.batchSize, platform)
        assert(host:SetVisible(true) ~= false)
    end
    return function(nextChapter)
        if chapter == nextChapter then
            failedChapter = nil
            return true
        end
        if failedChapter == nextChapter then return false end
        local started
        local ok, reason = pcall(function()
            if not data then data = (loadData or sceneData)() end
            local rows = assert(data.rows[nextChapter])
            started = true
            publish(rows)
        end)
        if not ok then
            -- Restore the previous art in place only if every slot can be
            -- repainted. Until the act changes, retain the neutral backing or
            -- recovered scene without retrying from every UI refresh.
            if started and not (chapter and pcall(publish, data.rows[chapter])) then
                chapter = nil
                pcall(function() host:SetVisible(false) end)
            end
            failedChapter = nextChapter
            print('chapter_battle_scene_paint_failed ' .. tostring(reason))
            return false
        end
        chapter, failedChapter = nextChapter, nil
        return true
    end
end

return M
