import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toLua } from '../scripts/build-lua-data.mjs';
import { runLua } from '../scripts/test-lua.mjs';

function verify(body) {
  const directory = mkdtempSync(join(tmpdir(), 'ascension-map-'));
  try {
    const file = join(directory, 'case.lua');
    writeFileSync(file, body);
    const result = runLua(file);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('A1 elite quotas follow Java left-associative float multiplication for each grid count', () => {
  const a1 = Array.from({ length: 106 }, (_, count) => Math.floor(
    Math.fround(Math.fround(count * Math.fround(.08)) * Math.fround(1.6)) + .5));
  verify(`local Rooms = require('abyss_map_rooms')
for i, expected in ipairs(${toLua(a1)}) do
    local base, raised = Rooms.quotas(i - 1), Rooms.quotas(i - 1, true)
    assert(raised.elite == expected, 'elite quota at grid count ' .. (i - 1))
    for _, kind in ipairs({'shop', 'camp', 'event'}) do
        assert(base[kind] == raised[kind], kind .. ' quota changed')
    end
end`);
});

test('both campaign acts replay A1 rooms while preserving A0 and topology', () => {
  verify(`local Map, Rooms = require('abyss_map'), require('abyss_map_rooms')
local Data = require('abyss_data')
local elevated = {endingUnlocked = false, emeraldOwned = false, eliteDensity = true}
local seed = '2780424839485660359'
local function same(left, right)
    if type(left) ~= 'table' then return left == right end
    if type(right) ~= 'table' then return false end
    for key, value in pairs(left) do if not same(value, right[key]) then return false end end
    for key in pairs(right) do if left[key] == nil then return false end end
    return true
end
local function count(rooms, kind)
    local total = 0
    for _, room in ipairs(rooms) do if room == kind then total = total + 1 end end
    return total
end
for act = 1, 2 do
    local base = Map.generate(Data, seed, act)
    local raised = Map.generate(Data, seed, act, elevated)
    assert(same(base, Map.generate(Data, seed, act)), 'ascension changed cached A0')
    assert(same(raised, Map.generate(Data, seed, act, elevated)), 'A1 replay diverged')
    assert(same(base.topologyState, raised.topologyState), 'map topology stream changed')
    for i, node in ipairs(base.nodes) do
        assert(node.id == raised.nodes[i].id and same(node.nextIds, raised.nodes[i].nextIds), 'topology changed')
    end
    local baseRooms, raisedRooms = Rooms.generate(seed, act), Rooms.generate(seed, act, true)
    local expected = raisedRooms.quotas.elite
    local added = expected - baseRooms.quotas.elite
    assert(added > 0 and #baseRooms.poolBeforeShuffle == #raisedRooms.poolBeforeShuffle)
    assert(count(baseRooms.poolBeforeShuffle, 'combat') - count(raisedRooms.poolBeforeShuffle, 'combat') == added)
    assert(count(raisedRooms.poolBeforeShuffle, 'elite') == expected)
    local actual = 0
    for _, node in ipairs(raised.nodes) do
        if node.type == 'elite' then
            assert(node.floor >= (act == 1 and 6 or 23), 'early elite')
            actual = actual + 1
        end
    end
    assert(actual == expected - count(raisedRooms.remainingRooms, 'elite'), 'legal placement or rejected quota lost')
    assert(actual > baseRooms.quotas.elite, 'fixed seed did not exhibit A1 increased presence')
    for _ = 1, 6 do assert(Map.choose(raised, Map.available(raised)[1].id)) end
    local original = Map.snapshot(raised)
    assert(Map.restore(Data, original) == nil, 'A1 map restored without trusted A1')
    assert(same(raised, assert(Map.restore(Data, original, elevated))))
end`);
});

test('the Run owns A1 map admission for every higher level', () => {
  verify(`local Run, Map = require('abyss_run'), require('abyss_map')
local Data = require('abyss_data')
local seed = '2780424839485660359'
local function mapContext(level, act)
    local config = level and {ascension = level, seedSource = 'player'}
    local run = Run.new(Data, seed, nil, config)
    run.act = act
    local context = assert(Run.freezeMapContext(run))
    assert(context.eliteDensity == Run.mapContext(run).eliteDensity)
    assert(run.mapBirthContext.eliteDensity == nil, 'difficulty lived outside the Run value')
    return context
end
local off = mapContext(nil, 1)
assert(off.eliteDensity == nil and package.loaded.abyss_ascension_rules == nil, 'flag-off performed ascension work')
Data.rules.ascensionEnabled = true
for act = 1, 2 do
    assert(mapContext(0, act).eliteDensity == nil, 'A0 enabled elite quota')
    local a1, a14 = mapContext(1, act), mapContext(14, act)
    assert(a1.eliteDensity == true and a14.eliteDensity == true)
    local map = Map.generate(Data, seed, act, a1)
    assert(Map.restore(Data, map, a14), 'higher difficulty lost the cumulative map rule')
end`);
});
