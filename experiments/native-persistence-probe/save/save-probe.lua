-- Client viewport fixture for the isolated EXP save stage.
-- All messages report observations. The server graph is the only writer.
local requestName = 'STH_EXP_SAVE_REQUEST'
local replyName = 'STH_EXP_SAVE_OBSERVATION'
local buttons = {
    {'read', 0, 0}, {'baseline', 1, 101},
    {'net_before', 1, 211}, {'net_after', 1, 212},
    {'kill_before', 1, 311}, {'kill_after', 1, 312},
    {'inner', 2, 401}, {'outer', 3, 402},
}
local status

local function show(message)
    print('STH_EXP_SAVE ' .. message)
    status.text = message
end

local function onObservation(_, values)
    local op, requested, rows, session, schema, saved, flag, label, samples = table.unpack(values)
    local inner = type(samples) == 'table' and table.concat(samples, ',') or '<unavailable>'
    show(string.format('readback op=%s req=%s rows=%s session=%s schema=%s saved=%s flag=%s label=%s samples=[%s]',
        tostring(op), tostring(requested), tostring(rows), tostring(session), tostring(schema),
        tostring(saved), tostring(flag), tostring(label), inner))
end

local function send(op, token)
    show(string.format('sent op=%d req=%d; waiting for in-session readback', op, token))
    local signal = game.ServerSignal(requestName)
    signal:AddInt(op)
    signal:AddInt(token)
    signal:SendSignal()
    return true
end

function OnStart()
    local root = script.object
    status = assert(root:GetChild('status'), 'missing save probe status')
    script:RegisterServerSignalHandler(replyName, onObservation)
    for _, row in ipairs(buttons) do
        local name, op, token = table.unpack(row)
        local button = assert(root:GetChild(name), 'missing save probe button: ' .. name)
        button:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
            return send(op, token)
        end)
    end
    show('ready; click Read before any write')
end

function OnDestroy()
    script:UnregisterServerSignalHandler(replyName)
end
