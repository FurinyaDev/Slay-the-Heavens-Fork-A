# Calibration consumer continuation — PARTIAL / NOT GREEN

This is isolated preparation for original #679 `eabff9b0bf2cce17ae05913c0e5d47366d0ff173` and #711 `ad6fe84dbcc11e28e8a82258f889a6841b46c8c6`. It is not a current Release integration, Full pass, hosted run, or device acceptance. The third pointer defect remains with its existing owner.

## Identity and implementation

- Previous delivery: remote `d2a8fa6d3d0beba9774b07083589a867497efba2`, local equivalent `b073f3af91fdde67fe19ffbd84f0e0e936a635eb`, tree `bfae02a08cefe0f87aab9172a675bd87bc50b749`.
- Exact prior union packet retained as `tests/helpers/potion-pointer-ci-before-calibration.json.gz`, SHA256 `7b049aac614a17f37f3c272e11c45df127c43f83d5109567018ea548ac921081`. Existing before-selection/before-integrated packets and original parent identities are untouched.
- `capture.py` regenerates the 187-input packet deterministically. Only calibration's current source binding changes; the other 186 rows and original parent views remain complete.
- Original 78 test bodies, names and assertions remain byte-for-byte unchanged. Reader wiring before the test declarations changes, including five explicitly synchronous initialization captures; both top-level data imports occur outside those captures.
- Tests receive fresh synchronous authentication and the original `t` context. No authorization crosses an await. Outside the scope, ordinary public reads stay fresh. Historical byte memo returns Buffer clones, is cleared in `finally`, and never caches caller-supplied current readers.
- `sliceTools` retains only its fixed historical inventory within the active scope, returns array clones, and rediscovers outside that scope. This avoids the original Golden Idol `filter` calling the complete inventory chain 836 times. Product owner reads remain actual union-current bytes, not historical potion bytes.
- No production code, budgets, test assertions, historical pins, pointer product fixes or CI copier implementation changed. The copier is still product-only; CI-copy closure is **not** delivered.

## Runs, including failures and stopped experiments

- Baseline: original complete 78, **40 pass / 38 fail**, 29,478.515920 ms (`baseline.log.gz`).
- v1 and v2 were explicitly interrupted with exit 130 while expensive historical authentication ran; their empty output is not a pass.
- v3 was interrupted with exit 130, then investigated without editing bound on-disk sources. `init-diagnostic-loader.mjs` only logged initialization with a no-matching-test pattern; its file-level success is **not** a test suite result. It reached registration in 13.3s. `progress-diagnostic-loader.mjs` added wrapper entry/exit logs and identified repeated historical inventory work; that diagnostic was also interrupted, exit 130.
- v4: complete 78, **63 pass / 15 fail**, 165,025.528474 ms (`focused-v4.log.gz`).
- v5: selected former failures only, **9 pass / 6 fail** of 15, 80,648.900024 ms (`targeted-v5.log.gz`). Results from different candidates are not added together as a final pass.
- Final frozen source: complete **78 tests, 72 pass / 6 fail, 0 skipped**, **199,485.773096 ms**, exit **1**. Full raw output is retained losslessly in `focused-final.log.gz`; `final-summary.log` lists the six exact failing contracts and totals. Overall status is **FAIL / NOT MERGE READY**, not a completed consumer closure.
- Author controls: `node docs/evidence/potion-pointer-union-20261116/calibration-next/controls.mjs`, **20 pass** (`controls.log`): original complete test bodies, exact prior archive, corruption/missing/empty, consumer rollback, scope exit/throw/thenable, CRLF and recovery.
- Generator repeated with identical SHA256 output (`deterministic.log`); `git diff --check` passed. No Full or repeated integrated19 suite was run.

## Exact remaining work

Six historical-inventory contracts expose a real source-domain mismatch:

1. `joint historical inventory rejects missing duplicate and unknown files while current discovery remains complete`.
2. `ratchet current inventory preserves raw Full coverage and refuses source drift after a warm projection`.
3. `combined closeout validates raw current sources and complete Full discovery independently of immutable slice views`.
4. `noncombat immutable added inventory keeps its full source and unknown-cost rejection checks`.
5. `run HUD continuation authenticates complete current sources and raw Full inventory without rewriting historical receipts`.
6. `menu current complete JS and Lua workload retains Full budgets and every added Lua byte`.

The first category passes an intentionally historical reader into the new raw-current union validator, which correctly rejects historical `config/architecture.json` (`fresh union owner config/architecture.json`). The second category's old negative-control readers use `historicalRead(...) + (path === added ? '\n' : '')`, coercing unrelated Buffer archives to strings, so the new exact `fresh pre-calibration union` check correctly fires before the intended added-file assertion. Do not loosen the assertions to accept arbitrary errors or skip current authentication.

Next bounded task: define explicit raw-current authentication vs historical projection/mutation reader contracts through `jointCiInventoryAt -> closeoutInventory -> runHudPriorInventory -> stsStylePriorInventory -> integratedPriorInventory`, plus `menuRedPriorLua`. Preserve all historical contracts, validate current bytes using the actual caller's raw reader, retain binary types in fault injection, and verify the intended exact rejecting path/domain. Finish these six before claiming calibration closed. Then complete the separately pending pointer assertions and isolated CI-copy closure.

Backlog CLI is unavailable (`backlog: command not found`); `.agents/skills` is absent. No manual Backlog edit. Two existing historical LFS materializations (`closeout-ci-source.json.gz`, `release-source-epoch.json.gz`) are local test inputs only and excluded from the commit.
