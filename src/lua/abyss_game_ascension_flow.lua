-- Application adapter for the shared TASK-53 player save. The provider reads its
-- ascension section and atomically merges a role's absolute target. This flow
-- owns pending intents for the live session and has no settlement authority.
local Progress = require('abyss_ascension_progress')

local M = {}

local function readSection(save)
    if not save or type(save.readAscension)~='function' then return nil,'ascension_save_unavailable' end
    local called, section, reason = pcall(save.readAscension)
    if not called or reason~=nil then return nil,'ascension_save_read_failed' end
    return section
end

local function writeGoal(save, role, goal)
    if type(save.mergeAscension)~='function' then return false,'ascension_save_unavailable' end
    -- The gateway cannot mutate the intent later used to retry a lost acknowledgement.
    local target = {highestUnlocked=goal.highestUnlocked, highestCleared=goal.highestCleared}
    local called, accepted, outcome = pcall(save.mergeAscension, role, target)
    if not called or accepted~=true then return false,'ascension_save_write_failed' end
    return true, (outcome=='updated' or outcome=='unchanged') and outcome or 'acknowledged'
end

local function report(log, version, run, role, outcome)
    local record = 'ABYSS_ASCENSION version='..tostring(version or run.version)
        ..' character='..tostring(role)..' seed='..run.runSeed
        ..' ascension='..run.ascension..' source='..tostring(run.seedSource)..' result='..outcome
    pcall(log, record)
end

local function prepareGoal(save, entry, run)
    local section, reason = readSection(save)
    if reason then return false,reason end
    local goal, outcome = Progress.recordVictory(section, run, entry.map)
    if not goal then
        entry.done = outcome~='invalid_ascension_save'
        return false,outcome
    end
    entry.goal, entry.map = goal, nil
    return true
end

local function applyGoal(save, entry, run)
    if not entry.goal then
        local ready, reason = prepareGoal(save, entry, run)
        if not ready then return false,reason end
    end
    local accepted, outcome = writeGoal(save, entry.role, entry.goal)
    if accepted then entry.done, entry.goal = true, nil end
    return accepted, outcome
end

function M.new(save, version, log)
    if type(save)~='table' then save=nil end
    log = log or print
    local intents = setmetatable({}, {__mode='k'})
    local flow = {}

    local function attempt(entry, run)
        if entry.busy then return false,'ascension_save_busy' end
        entry.busy = true
        local accepted, outcome = applyGoal(save, entry, run)
        entry.busy = false
        report(log, version, run, entry.role, outcome)
        return accepted, outcome
    end

    function flow.getHighestUnlocked(characterId)
        local section, reason = readSection(save)
        if reason then return 0,reason end
        local progress, invalid = Progress.read(section, characterId)
        if not progress then return 0,invalid end
        return progress.highestUnlocked
    end

    function flow.complete(run, map)
        local allowed, reason = Progress.qualifies(run, map)
        if not allowed then
            if reason=='ascension_seed_ineligible' then report(log, version, run, Progress.characterId(run), reason) end
            return false,reason
        end
        if intents[run] then return false,'ascension_already_processed' end
        local entry = {role=Progress.characterId(run), map=map}
        intents[run] = entry
        return attempt(entry, run)
    end

    function flow.retry(run)
        local entry = intents[run]
        if not entry or entry.done then return false,'no_pending_ascension_write' end
        return attempt(entry, run)
    end

    return flow
end

return M
