local Run = require('abyss_run')
local Combat = require('abyss_combat')
local Copy = require('abyss_copy').copy
local Data = Copy(require('abyss_data'))
local Random = require('abyss_sts_random')
local LivingWall = require('abyss_living_wall')
local Capability = require('abyss_card_capability')
local Presentation = require('abyss_character_presentation')
local id = 'ascenders_bane'

Data.rules.ascensionEnabled = true
local function newRun(level)
    return Run.new(Data, '42', {experimental=true, character='ironclad'}, {ascension=level, seedSource='internal'})
end

local function findCard(cards)
    for _, card in ipairs(cards) do
        if card.cardId == id or card.id == id then return card end
    end
end

local lower, run = newRun(9), newRun(10)
assert(not findCard(lower.deck) and not findCard(lower.data.cards.cards))
assert(#run.deck == #lower.deck + 1 and run.deck[#run.deck].cardId == id)
assert(run.nextDeckUid == run.deck[#run.deck].uid + 1 and not run.deck[#run.deck].upgraded)
assert(not findCard(Data.cards.cards), 'A10 card leaked to the shared catalog')

local curse = assert(findCard(run.data.cards.cards))
assert(curse.type == 'curse' and curse.rarity == 'special' and curse.cost == -2)
assert(curse.ethereal and Capability.isImplemented(curse))
assert(run.data.cards.sourcePools.cardSourceMetadata[id].sourceId == 'AscendersBane')
local display = Presentation.preparePreview({}, {cards={cards={curse}}})[id]
assert(display.name == '进阶之灾' and display.cost == '—' and display.text:find('虚无', 1, true))

local uid = assert(findCard(run.deck)).uid
local deck = run.deck
local ok, why = Run.removeCard(run, uid)
assert(not ok and why == 'card_not_purgeable' and run.deck == deck and findCard(deck).uid == uid)
assert(not findCard(LivingWall.purgeCards(run)))
local flow = {event={}}
local before = Random.snapshot(run.miscRng)
assert(LivingWall.choose(run, flow, 'change'))
ok, why = LivingWall.choose(run, flow, 'change', uid)
assert(not ok and why == 'card_not_purgeable' and flow.event.stage == 'choose_card')
local after = Random.snapshot(run.miscRng)
assert(after.counter == before.counter and table.concat(after.words) == table.concat(before.words))

local function firstHand(owner)
    assert(Run.startRoomCombat(owner, 'normal'))
    local battle = owner.combat
    Combat.draw(battle, #battle.draw)
    if not findCard(battle.hand) then assert(Run.endTurn(owner)) end
    return assert(findCard(owner.combat.hand), 'fixed seed did not draw Ascender\'s Bane')
end

local restored = Copy(run)
local card = firstHand(restored)
assert(card.deckUid == uid)
ok, why = Run.play(restored, card.uid)
assert(not ok and why == 'unplayable_card')
assert(Run.endTurn(restored))
assert(findCard(restored.combat.exhaust).uid == card.uid and findCard(restored.deck).uid == uid)

local candle = newRun(14)
assert(Run.obtainRelic(candle, 'Blue Candle'))
card = firstHand(candle)
local hp, energy = candle.combat.player.hp, candle.combat.energy
assert(Run.play(candle, card.uid))
assert(candle.combat.player.hp == hp - 1 and candle.combat.energy == energy)
assert(findCard(candle.combat.exhaust).uid == card.uid and findCard(candle.deck).uid == card.deckUid)
print('ok A10 Ascender\'s Bane stays in the master deck and uses the existing Ethereal and Blue Candle rules')
