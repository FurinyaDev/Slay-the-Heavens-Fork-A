# Blocked replay continuation after #829 and #854

The original deck and current potion facade tests now pass the battle UI owner check and both stop at `src/lua/abyss_deck_ui.lua`. The original detached Forethought fixture separately fails because it lacks `scripts/deck-ui-layout.mjs`. Release was `369d77e8fedf184532cd9af763458043821c175d` at validation.

Apply [the original combined patch](combined-replay-auth-369d77e8.patch) first, then [this incremental patch](replay-continuations-829-854.patch). The incremental patch SHA-256 is `984affcabfec23be75831744cb65705d8f0857862b36a3b99443cfc399481c01`. This branch stores both as evidence.

## Verified locally

- #829 uniquely reverses the two authenticated battle UI hunks after the #826 Traveler projection. #854 verifies all five linked event-art source identities before reversing any of them.
- All six transitions passed exact predecessor and forward reconstruction checks with LF and CRLF. Warm reads rejected drift, stale inputs or mixed owner versions, and deletion. The earlier five reward and battle-detail owner proofs and the #856 copier receipt also passed.
- Both original #856 shop regressions passed, including V4 and the official-layout shop fixture. The existing helper-copy and shop/deck source drift and deletion checks passed.
- The shared sweep accepted 106 of 116 owners, up from 102. Final cross-owner authorization is still unverified because the identity loop stops early. No hosted Full or device run was performed.

## Remaining owner checks

The hashes are projected and expected SHA-256 prefixes. Paths are relative to `src/lua/`.

| Priority | Owner | Projected → expected |
|---|---|---|
| 1 | `abyss_deck_ui.lua` | `149749bc2d93` → `081875a171ff` |
| 1 | `abyss_game_ui.lua` | `b0d51fcb3dc7` → `04456f26110a` |
| 1 | `abyss_game_ui_overlays.lua` | `c7d7b0ea5b82` → `c576f46a30c8` |
| 2 | `abyss_merchant.lua` | `13c87894da49` → `e6e88e409e6d` |
| 2 | `abyss_node_ui.lua` | `ee955fc31379` → `93afa0ae2dbe` |
| 2 | `abyss_node_ui_faces.lua` | `96daa6b2890d` → `415b7c3230b1` |
| 2 | `abyss_node_ui_lifecycle.lua` | `6a47d61b6e3c` → `141c1a4ec43d` |
| 2 | `abyss_node_ui_shop.lua` | `6e7db9779cf9` → `56723361a9ff` |
| 2 | `abyss_shop_ui.lua` | `1a58da9f7572` → `b2eb4bf26b04` |
| 3 | `abyss_potion_discard_ui.lua` | `e84242489575` → `023c094dee52` |

The deck projection reaches the #794 successor. Its exact #794 parent is `32699ee125a6`, so a further predecessor is still required. The shop group still requires the production-source lineage around #834. The potion discard overlay reaches #793.
