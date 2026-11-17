# Potion + pointer isolated helper-copy repair

Preparation base: `e88787704966f51a810bc1e6067e4b11aeadb49f`.
Original inputs remain #679 `eabff9b0bf2cce17ae05913c0e5d47366d0ff173` and #711 `ad6fe84dbcc11e28e8a82258f889a6841b46c8c6`.

## Observed defect and repair

The preparation branch advances the product source epoch but its isolated helper copier still expects the potion-only closeout helper (`217f68…`). A real copy throws `fresh helper copy identity: tests/helpers/closeout-source-epoch.mjs` because the exact union helper is `1dd29a…`.

Keep every prior helper-copy transition and original assertion. Append the exact union transition plus eight missing dependency files. Copying and importing the isolated epoch now reproduces all 352 current entries and 75 historical targets. No production code, old archive, test inventory, assertion, CI workflow, or release gate is changed.

## Verification

Run from repository root: `node docs/evidence/potion-pointer-union-20261116/copy0015/verify.mjs`.

43 checks pass: actual copy/import, exact nine identities, missing/empty/drift rejection for all nine dependencies, copy-from-copy, CRLF text normalization, same-root rejection, and escaped destination rejection. Binary gzip identities remain byte exact.

Local preparation required materializing two existing LFS objects: `release-source-epoch.json.gz` SHA256 `5e41bb3cf23863526a60f15ce164419221c123f6d88a8b2fb3da18c9806ab780` and `closeout-ci-source.json.gz` from the prior verified worktree. These are local environment repairs only and are NOT included as modifications.

## Remaining boundary

This closes only the isolated helper-copy seam. The four original unresolved integration files remain: `tests/helpers/integrated-ci-source.mjs`, `tests/integrated-ci-source.cases.mjs`, `tests/ci-complete-calibration.test.mjs`, and `tests/release-selection-map-source.test.mjs`. The full combined CI epoch and test manifest still need integration and independent review. Original PRs are unchanged. This is not hosted CI, official-client/phone acceptance, or permission to merge/release. No Full regression was launched.
