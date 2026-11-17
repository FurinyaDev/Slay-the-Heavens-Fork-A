# Explicit current and historical inventory readers

Prepared continuation of original #679 `eabff9b0bf2cce17ae05913c0e5d47366d0ff173` and #711 `ad6fe84dbcc11e28e8a82258f889a6841b46c8c6`. This is not integration onto the newer Release, a hosted Full result, product/device acceptance, or completion of pointer CI additions / isolated CI-copy closure.

## Exact predecessor and coverage

- Previous remote delivery: `43be61802b62d9783e801ab672ecd5d52afec3a6`.
- Equivalent local parent: `5aea4918d2e250ea3bc9ff56135a8be0ffce7f76`; identical tree `c7cdcc312f2addd64f1d32e85720c699be44f489`.
- Its union packet remains byte-for-byte in `tests/helpers/potion-pointer-ci-before-readers.json.gz`, SHA256 `2550d7de0c1b491e342b2a50d453fd4553593f524da152181da6cff0fcdd0435`. Before-selection, before-integrated, before-calibration archives and all original parent pins remain unchanged.
- Successor authentication explicitly covers **192 inputs**, the complete prior 187 plus exactly five newly changed CI helpers: `joint-ui-ci-source-inverse`, `closeout-ci-source`, `run-hud-ci-source`, `sts-style-ci-source`, `menu-red-ci-source`. Each added helper includes exact original parent SHA256 and complete prior source. The prior 187 rows are preserved except the explicitly changed calibration, integrated consumer and integrated helper current bindings.

## Contract change

The historical source reader and the current-authentication reader are separate arguments through:

`jointCiInventoryAt / preRatchetInventory → closeoutInventory → runHudPriorInventory → stsStylePriorInventory → integratedPriorInventory`, and `menuRedPriorLua → integratedPriorInventory`.

All old signatures default `currentRead` to the caller's existing `read`, never silently to `readFileSync`. Explicit historic consumers pass both domains. The current reader undergoes complete fresh union validation; the historical reader still supplies the bytes checked by every original source/inventory assertion. `integratedRead` propagates the same explicit current reader for source and binary predecessor authentication. No new asynchronous scope or global cache is introduced.

The integrated consumer keeps its exact first-rejecting-owner assertion but updates only the run-HUD entry from the inner integration layer to the now-authenticated outer union input. Independent direct-source regression exposed this necessary owner-map continuation; no general rejection matcher is relaxed.

The calibration file adapts its historic calls explicitly while retaining actual current snapshot/raw bytes for authentication. All 78 test names, inventories, expected digests, costs, budgets and rejection matchers are preserved. Exactly three old negative-control callbacks now append LF **only** to the selected text file and return unrelated values unchanged, rather than coercing every non-target Buffer archive into a string. Their intended source corruption and original `/added inventory source/` or `/added menu Lua source/` assertions remain intact. Therefore test bodies are not claimed byte-identical this round.

## Validation chronology

- Baseline and earlier partial 72/78 result remain in `../calibration-next/`.
- `targeted-v1.log.gz`: 4/6 pass, 2 fail; exposed missing helper source coverage and the nested ratchet current-reader forwarding.
- `targeted-v2.log.gz`: 5/6 pass, 1 fail after adding the five helpers to the authenticated input set.
- `targeted-v3.log`: **6/6 pass**, 26,539.459024 ms; all original six failing contracts pass with unchanged rejection expectations.
- An initial full single-file run was explicitly stopped, exit 130, after independent review found a mechanical edit had leaked an undeclared variable into the unrelated `assertStsStyleCiCurrent` function. That function was restored byte-for-byte to its predecessor; the real custom-reader rejecting entry was added to author controls. `interrupted-before-sts-fix.log` is not a passing result.
- `focused-before-owner-map.log` records 78/78 passing before the exact integrated-owner mapping continuation (157,052.868227 ms); `focused-final.log` records the final frozen candidate after that mapping change: **78/78 PASS, 0 failed, 0 skipped, 159,057.023974 ms, exit 0**. No Full or repeated integrated19 suite was run.
- `controls.mjs` / `controls.log`: **40 author checks** passed. Exact previous packet and 192-input shape; five helpers' ten exact Git parent views; old custom-reader defaults and explicit current-reader corruption across inventory/source APIs; the restored StS validation entry; all eight changed CI source drifts; snapshot expiry and recovery.
- Deterministic packet regeneration reproduced identical helper/packet SHA256 (`deterministic.log`); `git diff --check` passed.
- Independent final review: **60/60 controls** plus the original two direct integrated source/copy contracts **2/2 PASS**, **68,143.39802 ms**. `REVIEW.md` binds the final source hashes. Review caught both the accidental StS variable and the precise run-HUD rejecting-owner change before delivery; neither was ignored. The raw initial red log named in the unchanged review is preserved losslessly as `review-integrated-red.log.gz`.

## Remaining boundaries

The final single-file run is green; this closes only the calibration reader-domain work. New pointer CI assertions, explicit CI helper-copy closure, current-Release integration, Hosted CI, and official/mobile acceptance remain separate unfinished work. The third pointer product defect stays with its existing owner.

No production sources, test budgets or assertion thresholds changed. No Backlog files were edited without CLI. Existing expanded historical `closeout-ci-source.json.gz` and `release-source-epoch.json.gz` are local test inputs only and excluded from submission. No original PR head is changed or pushed by this worker.
