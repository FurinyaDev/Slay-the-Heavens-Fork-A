-- 独立实验脚本。挂在测试关卡始终可见的客户端控件上。
local requestName, replyName = 'STH_EXP_BRIDGE_REQUEST', 'STH_EXP_BRIDGE_REPLY'
local maxWaitSeconds = 5
local operations = { 'echo', 'unsupported', 'silent' }
local statuses = { 'applied', 'duplicate', 'conflict', 'unsupported', 'readback_mismatch' }
local pending = {}
local bindings = {}

local function send(operation, sequence, value)
    if pending[sequence] then
        print('STH_EXP_BRIDGE wait', sequence)
        return true
    end

    pending[sequence] = maxWaitSeconds
    local ok, reason = pcall(function()
        local signal = game.ServerSignal(requestName)
        signal:AddInt(operation)
        signal:AddInt(sequence)
        signal:AddInt(value)
        signal:SendSignal()
    end)
    if ok then
        print('STH_EXP_BRIDGE sent_local', operations[operation], sequence, value)
    else
        pending[sequence] = nil
        print('STH_EXP_BRIDGE send_error', sequence, tostring(reason))
    end
    return true
end

local function onReply(_, parameters)
    local sequence, statusCode, value = parameters[1], parameters[2], parameters[3]
    local status = statuses[statusCode]
    if type(sequence) ~= 'number' or not status or type(value) ~= 'number' then
        print('STH_EXP_BRIDGE malformed_reply', tostring(sequence), tostring(statusCode), tostring(value))
        return
    end
    if not pending[sequence] then
        print('STH_EXP_BRIDGE unmatched_reply', sequence, status, value)
        return
    end
    pending[sequence] = nil
    print('STH_EXP_BRIDGE reply', sequence, status, value)
end

local function bind(key, operation, sequence, value)
    local callback = function() return send(operation, sequence, value) end
    bindings[key] = callback
    script.object:AddKeyEventListener(key, callback)
end

function OnStart()
    local keys = Enum.KeyEventType
    script:RegisterServerSignalHandler(replyName, onReply)
    bind(keys.KeyboardCraftspersonKey1Down, 1, 1, 101)
    bind(keys.KeyboardCraftspersonKey2Down, 1, 1, 101)
    bind(keys.KeyboardCraftspersonKey3Down, 1, 1, 103)
    bind(keys.KeyboardCraftspersonKey4Down, 2, 2, 202)
    bind(keys.KeyboardCraftspersonKey5Down, 3, 3, 303)
    script:EnableUpdate(true)
    print('STH_EXP_BRIDGE ready')
end

function OnUpdate(dt)
    for sequence, wait in pairs(pending) do
        local left = wait - dt
        if left <= 0 then
            pending[sequence] = nil
            print('STH_EXP_BRIDGE timeout_unknown', sequence)
        else
            pending[sequence] = left
        end
    end
end

function OnDestroy()
    script:UnregisterServerSignalHandler(replyName)
    for key, callback in pairs(bindings) do
        script.object:RemoveKeyEventListener(key, callback)
    end
end
