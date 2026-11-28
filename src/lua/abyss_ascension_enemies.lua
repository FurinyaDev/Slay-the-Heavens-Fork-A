-- Actor-local numeric variants for STS1 V2.3.4. See the v2.3.0 rule evidence.
local Rules = require('abyss_ascension_rules')
local M = {}

local attackRule = {normal = 'normalAttack', elite = 'eliteAttack', boss = 'bossAttack'}
local statsRule = {normal = 'normalStats', elite = 'eliteStats', boss = 'bossStats'}

local variants = {
    raven_adept = {
        attack = {raven_adept_2 = {gainStatus = 4}},
        hpRange = {50, 56},
    },
    jaw_worm = {
        attack = {jaw_worm_1 = {damage = 12}, jaw_worm_3 = {gainStatus = 4}},
        hpRange = {42, 46},
    },
    red_louse = {
        biteRange = {6, 8},
        hpRange = {11, 16}, curlUpRange = {4, 8},
    },
    green_louse = {
        biteRange = {6, 8},
        hpRange = {12, 18}, curlUpRange = {4, 8},
    },
    acid_slime_s = {
        attack = {acid_slime_s_1 = {damage = 4}},
        hpRange = {9, 13},
    },
    acid_slime_m = {
        attack = {acid_slime_m_1 = {damage = 8}, acid_slime_m_3 = {damage = 12}},
        hpRange = {29, 34},
    },
    acid_slime_l = {
        attack = {acid_slime_l_1 = {damage = 12}, acid_slime_l_3 = {damage = 18}},
        hpRange = {68, 72},
    },
    spike_slime_s = {
        attack = {spike_slime_s_1 = {damage = 6}},
        hpRange = {11, 15},
    },
    spike_slime_m = {
        attack = {spike_slime_m_1 = {damage = 10}},
        hpRange = {29, 34},
    },
    spike_slime_l = {
        attack = {spike_slime_l_1 = {damage = 18}},
        hpRange = {67, 73},
    },
    looter = {
        attack = {looter_1 = {damage = 11}, looter_lunge = {damage = 14}},
        hpRange = {46, 50},
    },
    blue_guard = {
        attack = {blue_guard_1 = {damage = 13}, blue_guard_2 = {damage = 8}},
        hpRange = {48, 52},
    },
    red_guard = {
        attack = {red_guard_1 = {damage = 14}, red_guard_3 = {damage = 9}},
        hpRange = {48, 52},
    },
    fungi_beast = {
        attack = {fungi_beast_2 = {gainStatus = 4}},
        hpRange = {24, 28},
    },
    mad_gremlin = {
        attack = {mad_gremlin_1 = {damage = 5}},
        hpRange = {21, 25},
    },
    sneaky_gremlin = {
        attack = {sneaky_gremlin_1 = {damage = 10}},
        hpRange = {11, 15},
    },
    fat_gremlin = {
        attack = {fat_gremlin_1 = {damage = 5}},
        hpRange = {14, 18},
    },
    wizard_gremlin = {
        attack = {wizard_gremlin_3 = {damage = 30}},
        hpRange = {22, 26},
    },
    shield_gremlin = {
        attack = {shield_gremlin_2 = {damage = 8}},
        guard = {shield_gremlin_1 = {block = 8}},
        hpRange = {13, 17},
    },
    gremlin_nob = {
        attack = {gremlin_nob_2 = {damage = 8}, gremlin_nob_3 = {damage = 16}},
        hpRange = {85, 90},
    },
    lagavulin = {
        attack = {lagavulin_2 = {damage = 20}, lagavulin_3 = {damage = 20}},
        hpRange = {112, 115},
    },
    lagavulin_awake = {
        attack = {attack = {damage = 20}},
        hpRange = {112, 115},
    },
    sentry = {
        attack = {sentry_1 = {damage = 10}},
        hpRange = {39, 45},
    },
    guardian = {
        attack = {guardian_2 = {damage = 36}, guardian_6 = {damage = 10}},
        hp = 250, shiftThreshold = 35,
    },
    hexaghost = {
        attack = {tackle = {damage = 6}, inferno = {damage = 3}},
        hp = 264,
    },
    slime_boss = {
        attack = {slam = {damage = 38}},
        hp = 150,
    },
}

local function range(limits)
    return {min = limits[1], max = limits[2]}
end

local function applyMoves(enemy, changes)
    if not changes then return end
    for _, move in ipairs(enemy.intents) do
        local effects = changes[move.id]
        if effects then
            for _, effect in ipairs(move.effects) do
                effect.value = effects[effect.op] or effect.value
            end
        end
    end
end

local function applyAttack(enemy, variant)
    applyMoves(enemy, variant.attack)
    if variant.biteRange then enemy.ai.biteRange = range(variant.biteRange) end
end

local function applyStats(enemy, variant)
    if variant.hpRange then enemy.hpRange = range(variant.hpRange) end
    if variant.hp then enemy.hp = variant.hp end
    if variant.curlUpRange then enemy.ai.curlUpRange = range(variant.curlUpRange) end
    if variant.shiftThreshold then enemy.ai.initialThreshold = variant.shiftThreshold end
    applyMoves(enemy, variant.guard)
end

function M.apply(enemy, level)
    local variant = variants[enemy.id]
    if not variant then return end
    if Rules.active(level, attackRule[enemy.tier]) then applyAttack(enemy, variant) end
    if Rules.active(level, statsRule[enemy.tier]) then applyStats(enemy, variant) end
end

return M
