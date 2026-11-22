# Release v2 historical replay evidence

**Blocked WIP.** The original deck replay and original current potion facade test still fail at `src/lua/abyss_battle_ui.lua`. The detached Forethought test separately fails because its fixture lacks `scripts/deck-ui-layout.mjs`. Restoring that file alone still leaves a separate deck source identity mismatch.

The [combined patch](combined-replay-auth-369d77e8.patch) was validated against Release commit `369d77e8fedf184532cd9af763458043821c175d` (#856). SHA-256 `9e74aa18dbac4f4a1cb02b7034209a02b83bafb0945a00afe4c39c69922fa22d`. The patch restores exact Git predecessors for two reward owners from #827 and three battle-detail owners from #794/#826. It preserves the #856 helper-copy predecessor, the existing historical archives, and production bytes. The patch is stored here as evidence.

## Verified locally

- All five repaired owners passed exact Git blob and SHA-256 checks, LF/CRLF projection, and fresh drift and deletion rejection. The battle-detail group also rejected mixed source epochs.
- Four existing source, helper-copy, and drift/deletion checks passed. Both #856 shop regressions and the exact LF/CRLF copier receipt passed.
- The shared closure accepted 102 of 116 owner identities. Final cross-owner authorization remains unverified while the identity loop fails. No hosted Full or official device run was performed.

## Remaining closure in priority order

Paths below are relative to `src/lua/`. Hashes are observed and expected SHA-256 prefixes.

| Priority | Owner | Observed → expected | Relevant lineage |
|---|---|---|---|
| 1 | `abyss_battle_ui.lua` | `86d3b3aeb80d` → `c703bb46e116` | #826 reaches #829 before #783/#782 |
| 2 | `abyss_game_ui.lua` | `d8cfde2203a4` → `04456f26110a` | #854, #839, #825, #832, #794 |
| 2 | `abyss_lowcost_art.lua` | `7e90fa294e7f` → `3d57972c5f3f` | #854 |
| 2 | `abyss_node_ui.lua` | `8c177f254f39` → `93afa0ae2dbe` | #854 before the #834 shop chain |
| 2 | `abyss_node_ui_events.lua` | `dd2b5d3bdbf3` → `c3d425e0c65b` | #854, #839, #772 |
| 2 | `abyss_ui.lua` | `7179af597575` → `19989127f817` | #854, #839, #782 |
| 3 | `abyss_merchant.lua` | `13c87894da49` → `e6e88e409e6d` | #834, #800 |
| 3 | `abyss_node_ui_faces.lua` | `96daa6b2890d` → `415b7c3230b1` | #834 |
| 3 | `abyss_node_ui_lifecycle.lua` | `6a47d61b6e3c` → `141c1a4ec43d` | #834, #829, #832, #810, #800 |
| 3 | `abyss_node_ui_shop.lua` | `6e7db9779cf9` → `56723361a9ff` | #834, #832, #800 |
| 3 | `abyss_shop_ui.lua` | `1a58da9f7572` → `b2eb4bf26b04` | #834, #788 |
| 4 | `abyss_deck_ui.lua` | `149749bc2d93` → `081875a171ff` | #794 parent `32699ee125a6`, then earlier deck history |
| 4 | `abyss_game_ui_overlays.lua` | `c7d7b0ea5b82` → `c576f46a30c8` | #794, #784 |
| 5 | `abyss_potion_discard_ui.lua` | `e84242489575` → `023c094dee52` | #839 reaches the #793 version |
