-- Fengari smoke test of the Lua fixture using a mock UI and transport.
local fixture = assert(arg[1], 'usage: fengari verify-client-fixture.lua save-probe.lua')
local status = {}
local children, callbacks, requests, handlers = {status = status}, {}, {}, {}
Enum = {CursorEventType = {CursorClick = 'click'}}
script = {
    object = {GetChild = function(_, name) return children[name] end},
    RegisterServerSignalHandler = function(_, name, cb) handlers[name] = cb end,
    UnregisterServerSignalHandler = function(_, name) handlers[name] = nil end,
}
game = {ServerSignal = function(name)
    local params = {}
    assert(name == 'STH_EXP_SAVE_REQUEST')
    return {
        AddInt = function(_, value) params[#params + 1] = value end,
        SendSignal = function() requests[#requests + 1] = params end,
    }
end}
local expected = {
    read = {0, 0}, baseline = {1, 101}, net_before = {1, 211}, net_after = {1, 212},
    kill_before = {1, 311}, kill_after = {1, 312}, inner = {2, 401}, outer = {3, 402},
}
for name in pairs(expected) do
    children[name] = {AddCursorEventListener = function(_, event, cb)
        assert(event == 'click')
        callbacks[name] = cb
    end}
end
assert(loadfile(fixture))()
OnStart()
assert(#requests == 0)
local signal = 'STH_EXP_SAVE_OBSERVATION'
assert(handlers[signal])
for name, values in pairs(expected) do
    assert(callbacks[name]())
    assert(requests[#requests][1] == values[1] and requests[#requests][2] == values[2])
    assert(status.text:find('waiting for in-session readback', 1, true))
end
handlers[signal](signal, {2, 401, 1, 401, 1, 401, true, 'EXP-é-千', {11, 22, 33}})
assert(status.text:find('saved=401 flag=true label=EXP-é-千 samples=[11,22,33]', 1, true))
OnDestroy()
assert(not handlers[signal])
print('STH_EXP_SAVE_CLIENT_FIXTURE_PASS')
