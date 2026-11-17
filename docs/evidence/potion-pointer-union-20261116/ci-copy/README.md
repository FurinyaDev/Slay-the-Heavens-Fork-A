# Isolated potion/pointer CI helper-copy closure

## Scope and identity

Preparation only, preserving original #679 `eabff9b0bf2cce17ae05913c0e5d47366d0ff173` and #711 `ad6fe84dbcc11e28e8a82258f889a6841b46c8c6`. No original PR, product code, CI workflow, Full inventory or release decision changes.

Predecessor: remote `0e1eae89f1240572a35f34af5cb07dd0c3816a92`; equivalent local `897015390ffc30a66b62a0cf18b692626b6a9b12`, tree `302114977ea6680fa0f25f1f2223df0cc551bbde`. The exact previous union packet is retained in `tests/helpers/potion-pointer-ci-before-copy.json.gz` (`0347d209241d64516606376302ecdd8d0c90d13237628eb3b9f702ec9c51dc79`). All older archives and original parent pins are preserved.

The successor authenticates **193 current inputs**: the prior 192 plus the new fixed CI-copy manifest. Only the copier's old current row changes; all other previous whole rows remain unchanged. The new manifest has no invented historical-parent source.

## Actual entry point

`copyIntegrationCiClosure(directory, {sourceRoot})` in `tests/helpers/copy-integration-source-closure.mjs` copies **250 helper/fixture files**. The old `copyIntegrationSourceClosure` function body and its product-only file list are unchanged.

The fixed JSON manifest pins 246 helper/fixture dependencies, including the transitive static imports and explicit helper/fixture inputs needed by current freshness validation. This is the declared CI roots’ import dependencies plus their authenticated witness files, not a promise that every copied module is independently executable. Some generator/VM files are copied only as hash witnesses: for example `generate-sts-feedback-source` also needs scripts such as `ci-shards`/Lua-quality tooling, and VM helpers may need `build-lua-data`/`fengari`. Those unrelated tools and npm dependencies are not transplanted. Acceptance is the actual isolated CI-root imports and complete 193-input authentication below. It is not a broad copy of the repository or production owners. Four additional exact trusted files are the loaded copier entry, union reader, union packet and manifest itself. Their bytes are captured from the trusted loaded module's directory at initialization, never self-certified from arbitrary `sourceRoot`. The copier also matches its exact current row in the authenticated union packet. This avoids a copier→packet→reader→manifest hash cycle while still comparing every source file to a fixed or already captured identity.

Every source file is checked before destination file writes. Every destination is then preflighted before writing content. Fixed relative paths, realpath containment, source symlink rejection, destination parent/leaf symlink rejection (including dangling links), and single-link regular destination files prevent traversal, aliasing and hardlink writes into source data. Multi-linked destination files are deliberately rejected even if a second link happens to stay inside the destination. Text LF normalization preserves the existing semantics; gzip and other binary witnesses are never decoded or normalized. No missing dependency falls back to the live repository.

## Reproduction and observed evidence

Run from repository root:

```
python docs/evidence/potion-pointer-union-20261116/ci-copy/capture-closure.py
python docs/evidence/potion-pointer-union-20261116/ci-copy/capture.py
node docs/evidence/potion-pointer-union-20261116/ci-copy/verify.mjs
```

- The first real isolated run exposed a missing dynamic fixture (`act1-original-chain-35d392bc.json.gz`). `verify-v1.log.gz` preserves that failure. The closure was corrected by including all predecessor helper/fixture inputs, not by falling back to host reads.
- `verify-v2.log.gz`: **32 checks PASS**, 250 copied helpers/fixtures. Real temporary-directory child processes import `integrated-ci-source` and the copied copier; copy-from-copy works both through the host entry and through the copied entry.
- The helper-only API does not provide production owners or general test/workflow inputs. The verifier explicitly writes **377 current fixture files**, then runs full current authentication for the 352-entry source epoch and 193-input CI packet in a child process whose cwd is that temporary directory. A subsequent temporary owner mutation is rejected. The expected red stack is retained in the successful verifier log; it is a negative control, not a failed final run.
- Missing/empty/drifted manifest, three trust roots and prior packet reject before any target file is written. Source escape; internal/external/dangling target symlinks; destination-parent escape; hardlink aliasing; CRLF text and exact binary bytes are covered.
- `product-regression.log`: unchanged prior product-copy verifier **43/43 PASS**, preserving all 352 current entries and 75 targets and keeping the product copy free of the new CI union entry.
- `deterministic.log`: both capture generators reproduce identical manifest, copier and union hashes. Source `git diff --check` passes; raw red logs with whitespace are preserved losslessly as gzip if required for repository whitespace checks.
- Independent review: **24 controls PASS**, plus structural/DFS coverage checks. Scripts and outputs are stored as `review-*`; `REVIEW.md` records the scoped approval and exact identities. This is separate from the author’s 32 checks and original 43-check product regression.

## Explicit remaining work

This delivers a real executable isolated **CI helper closure**, not full pointer integration. The six still-unrestored pointer CI helper/packet files, two pointer Lua supports, and pointer-added assertions from #711 have not been silently imported or claimed covered. Current Release integration, Hosted Full, official import/ready and phone/device acceptance remain separate. No Full, calibration78 rerun or integrated19 rerun was needed for this isolated copy stage. Backlog CLI remains unavailable; no manual Backlog edits. Existing expanded historical LFS payloads are local test inputs only and excluded from the commit.
