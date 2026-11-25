local Theme = require("abyss_theme")
local M = {}
local baseWidth, baseHeight = table.unpack(Theme.canvas.base)

function M.scale(width, height)
    return math.min(width / baseWidth, height / baseHeight)
end

function M.measure(width, height, mobile)
    assert(type(width) == "number" and width > 0 and width < math.huge, "invalid canvas width")
    assert(type(height) == "number" and height > 0 and height < math.huge, "invalid canvas height")
    local scale = M.scale(width, height)
    local w, h = width / scale, height / scale
    -- DIAG-12 measured paint outside the mobile logical canvas. Keep that
    -- allowance on visual covers only; the touchable rectangle comes from the API.
    local bleed = mobile and width / height >= baseWidth / baseHeight - 1e-6 and Theme.canvas.mobileBleedX or 0
    return { scale = scale, input = {0, 0, w, h}, visual = {0, 0, w + bleed / scale, h} }
end

local function finite(n)
    return type(n) == "number" and n == n and math.abs(n) < math.huge
end

-- Native pointer events are in lower-left canvas units. Stage positions
-- use the same fit scale and a centred origin. A missing axis remains unset.
function M.toStage(x, y, width, height)
    local validX, validY = finite(x), finite(y)
    local invalid = type(x) == "number" and not validX or type(y) == "number" and not validY
    local scale = M.scale(width, height)
    return validX and (x - width / 2) / scale or nil, validY and (y - height / 2) / scale or nil, invalid
end

function M.apply(root, width, height, mobile)
    local frame = M.measure(width, height, mobile)
    local stage = assert(root:GetChild("stage"), "missing stage")
    assert(root:GetChild("canvasBackdrop"), "missing canvas backdrop")
    stage:SetLocalScale(frame.scale, frame.scale, 1)
    stage:SetSizeDelta(frame.input[3], frame.input[4])
    return stage, frame.scale, frame
end
return M
