# Deck lineage and detached Forethought evidence

**Blocked WIP.** The original deck, current potion facade, and detached Forethought tests now reach the shared next blocker `src/lua/abyss_game_ui.lua` (`b0d51fcb3dc7` projected, `04456f26110a` expected). The identity sweep advanced from 106 to 107 of 116. The detached fixture now copies the live layout owner, and its separate missing-layout failure was cleared.

## Exact patch

Apply [the original combined patch](combined-replay-auth-369d77e8.patch), then [the #829/#854 continuation](replay-continuations-829-854.patch), then [this deck continuation](replay-deck-lineage-794-790.patch) against Release `369d77e8fedf184532cd9af763458043821c175d`. This incremental patch has SHA-256 `48431b97a088f343d61bcdbb8aab01d016be185fc5f875ad8aec0cca936543ff`. The branch stores the patch as evidence.

| Deck boundary | Exact successor Git blob | Exact predecessor Git blob |
|---|---|---|
| #794 → its parent `2bcd0fbd` | `a2e1b44d163311dd0c65d1043cb282b5992e6709` | `c5ae3926694ef6d80f52e53ee09d0f6ae78c7de3` |
| #790 → its parent `7381cf71` | `c5ae3926694ef6d80f52e53ee09d0f6ae78c7de3` | `55d1b8d4926fe027e22d090de9fc0fd57c2bf1c7` |

The #794 predecessor is byte-identical to the #790 successor. The #790 predecessor matches the frozen deck at `36b9b157` (SHA-256 `081875a171ffb00d25036fc98713540880d237f6b67933713453bf3fe75e7673`). The fixture change reuses the live-layout copy from `f8a57509`.

## Verified locally

- Both inverse transitions used unique fragments and reconstructed their exact forward Git bytes. The complete detached deck projection passed in LF and CRLF, with fresh rejection of stale deck epochs, drift, and deletion of the deck or live layout. The preceding recording contract and #856 copier receipt also passed.
- The existing map-deck owner, helper-copy, and shop/deck source drift/deletion checks passed. Both original #856 shop regressions passed.
- Nine owners still fail the shared identity sweep. After game UI and its overlays, the outstanding groups are shop/node source history and potion discard UI. Final cross-owner authorization remains unverified. No Full dispatch, production edit, or protected write was performed.
