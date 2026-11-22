# Release combat pile opening, TASK-4.21

Local proof only. Upstream #868 was approved and merged to develop,
not Release. This evidence branch stores a local proof and inert patch; it is not a live implementation or PR.
The Release base, candidate and exact tree are recorded in commit.txt.
The one unified patch changes only abyss_card_skin.lua and abyss_deck_ui.lua.
It preserves #864's single-card details/upgrade preview and inDetail guard,
#865 return revision, and leaves every #866 module unchanged.

A/B on the same official generated layout and controlled native Lua Host,
with 7 cards per cold draw, discard, and exhaust pile. Each published the
first complete viewport in 1 -> 0 Host update rounds, with 834 -> 642
calls to position/size/scale/rotation/visibility setters over the entire
card subtree, and 8 -> 1 item size reads. Both issue the same 2 refreshes.
Counting scope is wider than #868's 680 -> 488 frame writes; both observe
192 fewer operations. Card orders, card IDs and live V4 labels matched. V4
non-hand play-preview queries fell 1 -> 0 per pile. Deferred probe and
partial fills properly held the cover; callbacks from the retired session
could not paint the reopened pile. The #864 inspector and upgrade round trip
reused the ready cells; #865 rejected a stale return press. These are offline
update/call counts, not PC/phone latency or a final package.

Run in an isolated checkout of the base with the required exact LFS inputs
available (Node 24, existing npm deps). The probe must be under tests/ for
relative imports; these are not new files in the real test inventory.

```sh
cp probe-source.mjs.txt tests/.release-pile-868-proof.mjs
node tests/.release-pile-868-proof.mjs
git apply --check release-pile-868-selective.patch
git apply release-pile-868-selective.patch
node tests/.release-pile-868-proof.mjs
cp retained-host-probe.mjs.txt tests/.release-868-retained.mjs
node --test --test-name-pattern='real Host reuses' tests/.release-868-retained.mjs
node scripts/check-architecture.mjs
```

The original Release Host regression passed before the patch. Its old
synchronous-cold assertion expects the calibration item to stay pending
until the next update. The isolated candidate version checks that the
submitting callback hides the provisional item, then requires same-turn
complete publication, retains the local cover assertion in the delayed path,
and keeps all other guard, inspector, return and 100-sort coverage. The
tracked tests/deck-browser-reveal-reuse.test.mjs has not been changed.
If promoted, port those additional assertions and the #868 visual-equivalence
cases from tests/sts-card-reference-runtime.test.mjs; preserve exact Release
historical owner bindings in the existing review lane rather than applying
develop's archive unmodified. Do not change native CI or treat this as
hosted verification. No Full, device operation, live source push or game publication.
