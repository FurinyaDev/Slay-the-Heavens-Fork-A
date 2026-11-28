-- Progress operations over the ascension section owned by the player save.
-- Victory returns an absolute target so an unacknowledged write can be retried.
local Acts = require('abyss_acts')
local Rules = require('abyss_ascension_rules')

local M = {}
local finalFloor = Acts.get(2).last

local function plain(value)
    return type(value)=='table' and getmetatable(value)==nil
end

local function validRecord(record)
    if not plain(record) or not Rules.validLevel(record.highestUnlocked) then return false end
    for key in pairs(record) do
        if key~='highestUnlocked' and key~='highestCleared' then return false end
    end
    local cleared = record.highestCleared
    if cleared==nil then return record.highestUnlocked==0 end
    return Rules.validLevel(cleared) and record.highestUnlocked==math.min(cleared+1, Rules.maximum)
end

function M.read(section, characterId)
    if type(characterId)~='string' or characterId=='' then return nil,'invalid_character' end
    if section~=nil and not plain(section) then return nil,'invalid_ascension_save' end
    local record = section and section[characterId]
    if record==nil then return {highestUnlocked=0} end
    if not validRecord(record) then return nil,'invalid_ascension_save' end
    return {highestUnlocked=record.highestUnlocked, highestCleared=record.highestCleared}
end

local function finalTreasure(flow)
    return plain(flow) and flow.type=='treasure' and flow.roomKind=='boss_treasure'
        and flow.complete==true and flow.result=='boss_treasure_complete' and flow.floor==finalFloor
end

local function matchingMap(run, map, flow)
    if not plain(map) or map.act~=2 or map.floor~=finalFloor then return false end
    if type(run.runSeed)~='string' or run.runSeed~=map.runSeed or map.seed~=flow.mapSeed then return false end
    return type(map.sourceSignature)=='string' and map.sourceSignature==flow.mapSignature
        and type(flow.id)=='string' and map.currentNodeId==flow.id
        and plain(map.path) and map.path[#map.path]==flow.id
end

local function wonBoss(run)
    local result = run.lastResult
    return run.encounterTier=='boss' and type(run.encounterId)=='string' and plain(result)
        and result.outcome=='victory' and result.encounterId==run.encounterId and result.allEnemiesEscaped==false
end

local function formalVictory(run, map)
    if run.campaign~=true or not Acts.isCompetition(run) or run.act~=2 or run.floor~=finalFloor then return false end
    if run.phase~='victory' or run.ending~='two_act_complete' or run.pendingAct~=nil then return false end
    local flow = run.nodeFlow
    return finalTreasure(flow) and matchingMap(run, map, flow) and wonBoss(run)
end

function M.recordVictory(section, run, map)
    if not plain(run) or not Rules.validLevel(run.ascension) or run.seedSource~='random' then
        return nil,'ineligible_ascension_run'
    end
    if not formalVictory(run, map) then return nil,'not_formal_victory' end
    local characterId = run.character
    if characterId==nil then characterId='ironclad' end
    local current, reason = M.read(section, characterId)
    if not current then return nil,reason end
    local level = run.ascension
    if level~=current.highestUnlocked or level==current.highestCleared then return nil,'not_advancing_ascension' end
    if level==Rules.maximum then
        return {highestUnlocked=level, highestCleared=level},'max_cleared'
    end
    return {highestUnlocked=level+1, highestCleared=level},'unlocked'
end

function M.merge(section, characterId, goal)
    local current, reason = M.read(section, characterId)
    if not current then return nil,reason end
    if not validRecord(goal) or goal.highestCleared==nil then return nil,'invalid_ascension_target' end
    if current.highestCleared~=nil and goal.highestCleared<=current.highestCleared then
        return section,'unchanged'
    end
    local nextSection = {}
    for id, record in pairs(section or {}) do nextSection[id] = record end
    nextSection[characterId] = {highestUnlocked=goal.highestUnlocked, highestCleared=goal.highestCleared}
    return nextSection,'updated'
end

return M
