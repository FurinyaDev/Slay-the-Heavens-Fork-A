local Run = require('abyss_run')
local Data = require('abyss_data')
local enabled = require('abyss_copy').copy(Data)
enabled.rules.ascensionEnabled = true

local traveler = {experimental=true, character='ironclad'}

local function expectState(run, hp, maxHp, slots)
    assert(run.hp == hp and run.maxHp == maxHp,
        'expected ' .. hp .. '/' .. maxHp .. ', got ' .. run.hp .. '/' .. run.maxHp)
    assert(Run.potionCapacity(run) == slots, 'incorrect starting potion capacity')
    assert(run.scoreStats.startingMaxHp == maxHp, 'incorrect opening HP score baseline')
end

expectState(Run.new(Data, '42', traveler), 80, 80, 3)
for _, vector in ipairs({
    {0, 80, 80, 3}, {5, 80, 80, 3}, {6, 72, 80, 3},
    {10, 72, 80, 3}, {11, 72, 80, 2}, {13, 72, 80, 2}, {14, 68, 75, 2},
}) do
    local level, hp, maxHp, slots = table.unpack(vector)
    local run = Run.new(enabled, '42', traveler, {ascension=level, seedSource='internal'})
    assert(run.ascension == level)
    expectState(run, hp, maxHp, slots)
end
assert(enabled.rules.player.maxHp == 80 and enabled.rules.player.potionSlots == 3)

local other = {experimental=true, character='silent'}
local original = Run.new(enabled, '42', other, {ascension=13, seedSource='internal'})
local atCap = Run.new(enabled, '42', other, {ascension=14, seedSource='internal'})
assert(atCap.maxHp == original.maxHp and atCap.hp == original.hp, 'A14 deduction leaked to another role')

local run = Run.new(enabled, '42', traveler, {ascension=14, seedSource='internal'})
assert(Run.obtainPotion(run, 'fire_potion') and Run.obtainPotion(run, 'block_potion'))
local ok, why = Run.obtainPotion(run, 'regen_potion')
assert(not ok and why == 'potion_slots_full')
assert(Run.startRoomCombat(run, 'normal'))
assert(run.combat.player.hp == 68 and run.combat.player.maxHp == 75 and run.combat.potionCapacity == 2)
assert(Run.obtainRelic(run, 'Potion Belt'))
assert(Run.potionCapacity(run) == 4, 'Potion Belt must extend the active capacity by two')

print('ok A6/A11/A14 use cumulative, role-specific opening state')
