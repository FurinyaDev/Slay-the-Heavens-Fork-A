-- TASK-53 owns the shared player save and acknowledges its atomic merge.
-- Pending session intents are scalars, independent of UI and Run lifetimes.
local Progress = require('abyss_ascension_progress')
local Rules = require('abyss_ascension_rules')

local M = {}

local function readSection(save)
    if not save or type(save.readAscension)~='function' then return nil,'ascension_save_unavailable' end
    local called, section, reason = pcall(save.readAscension)
    if not called or reason~=nil then return nil,'ascension_save_read_failed' end
    return section
end

local function writeGoal(save, role, goal)
    if type(save.mergeAscension)~='function' then return false,'ascension_save_unavailable' end
    local target = {highestUnlocked=goal.highestUnlocked, highestCleared=goal.highestCleared}
    local called, accepted, outcome = pcall(save.mergeAscension, role, target)
    if not called or accepted~=true then return false,'ascension_save_write_failed' end
    return true, (outcome=='updated' or outcome=='unchanged') and outcome or 'acknowledged'
end

local function report(log, entry, outcome)
    local record = 'ABYSS_ASCENSION version='..tostring(entry.version)
        ..' character='..tostring(entry.role)..' seed='..entry.seed
        ..' ascension='..entry.level..' source='..tostring(entry.source)..' result='..outcome
    pcall(log, record)
end

local function prepareGoal(save, entry)
    local section, reason = readSection(save)
    if reason then return false,reason end
    local goal, outcome = Progress.recordVictory(section, entry.role, entry.level)
    if not goal then
        entry.done = outcome~='invalid_ascension_save'
        return false,outcome
    end
    entry.goal = goal
    return true
end

local function applyGoal(save, entry)
    if not entry.goal then
        local ready, reason = prepareGoal(save, entry)
        if not ready then return false,reason end
    end
    return writeGoal(save, entry.role, entry.goal)
end

function M.new(save, version, log)
    if type(save)~='table' then save=nil end
    log = log or print
    local completed = setmetatable({}, {__mode='k'})
    local pending = {}
    local flow = {}

    local function attempt(levels, entry)
        if entry.busy then return false,'ascension_save_busy' end
        entry.busy = true
        local accepted, outcome = applyGoal(save, entry)
        entry.busy = false
        if accepted then
            -- Acknowledging the maximum target subsumes every lower one.
            for level=0,entry.level do levels[level]=nil end
        elseif entry.done then
            levels[entry.level]=nil
        end
        if next(levels)==nil then pending[entry.role]=nil end
        report(log, entry, outcome)
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
        if not allowed and reason~='ascension_seed_ineligible' then return false,reason end
        if completed[run] then return false,'ascension_already_processed' end
        completed[run] = true
        local entry = {role=Progress.characterId(run), version=version or run.version,
            level=run.ascension, source=run.seedSource, seed=run.runSeed}
        if not allowed then
            report(log, entry, reason)
            return false,reason
        end
        local levels = pending[entry.role] or {}
        pending[entry.role] = levels
        levels[entry.level] = levels[entry.level] or entry
        return attempt(levels, levels[entry.level])
    end

    function flow.retryPending()
        local accepted, outcome = false, 'no_pending_ascension_write'
        for _, levels in pairs(pending) do
            for level=Rules.maximum,0,-1 do
                local entry = levels[level]
                if entry then accepted, outcome = attempt(levels, entry) end
            end
        end
        return accepted, outcome
    end

    return flow
end

return M
