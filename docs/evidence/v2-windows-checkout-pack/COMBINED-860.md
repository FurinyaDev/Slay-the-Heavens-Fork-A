# Windows checkout pack with Release replay fixes

This evidence uses [#860](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/860) at head `5424fe7da66171c26138b6cc07a06c0ec9d8f833` and Release base `369d77e8fedf184532cd9af763458043821c175d`. The local storage candidate was `bdf859479b7642feaa391c5c4b097bd95b9da959`, tree `71a86e3575ab5e9c0702a3d7e4931bffe1889221`.

The [forward patch](pr860-5424fe7.forward.patch) carries the original evidence patch forward with one context adjustment. The three storage edits in `tests/helpers/fork-preflight-source.mjs` preserve #860's replay imports and the order of its source provenance checks. The four archived inputs have the same paths, Git blob IDs, SHA-256 hashes and sizes listed in [the first evidence record](README.md).

## Local cold checkout

The Linux proxy used Git 2.52.0, Node 24.19.0, `core.autocrlf=true`, a new Git database, depth two, `blob:none`, retained fetch packs, and the existing comparison, pack and whitespace checks.

| Checkout | Explicit comparison base | Retained pack bytes | 128 MiB gate |
| --- | --- | ---: | --- |
| Candidate `bdf8594` | #860 head `5424fe7da66171c26138b6cc07a06c0ec9d8f833` | 128,405,126 | Pass |
| Two-parent checkout `184f0c1db0344442079c6ef4662d73259b48d83e` | Older Release `a67385f3158b6bae26e74ecc5aa155b20bfa3f33` | 128,842,687 | Pass |

The synthetic merge used Release `369d77e8` and candidate `bdf8594` as its two parents. Whitespace passed in both checkouts. The older comparison fetched 18 blobs totaling 1,167,025 raw bytes. Cold restoration verified all four original hashes, sizes and Git blob identities. All four original raw Git blobs stayed absent from the Git database, and the retained pack remained 128,405,126 bytes.

## Replay and storage checks

After materialization, the default data and UI builds and the license audit passed. The following bounded invocation exited zero with 36 passes, no failures, skips or cancellations. It exercised the original historical deck runner and source contract, default and official-profile Forethought hosts, Forethought's predecessor checks, the native potion shell trace, live potion management, and the existing LFS guard suites.

```sh
timeout -k 5s 145s node --test --test-concurrency=2 \
  tests/deck-browse-filters.test.mjs tests/deck-browse-source-inverse.test.mjs \
  tests/potion-shell-trace-equivalence.test.mjs tests/potion-sts-structure.test.mjs \
  tests/forethought-selection.test.mjs tests/ci-reviewed-lfs.test.mjs \
  tests/ci-runtime-preview-lfs.test.mjs
```

The separate `assertIntegrationSuccessorsCurrent()` diagnostic failed with `fresh Release capacity source: scripts/build-ui.mjs` on both the unmodified #860 head and this candidate. Broader integration verification therefore remains open. These runs certify neither a hosted Windows job nor Full CI.

## Readback and branch scope

Patch SHA-256 is `38c7f280b59cada947e57a45e120872206f9e041ea9eb5d2fd7ff75322901d05`. A fresh Git index at #860's exact head accepted the patch and wrote tree `71a86e3575ab5e9c0702a3d7e4931bffe1889221`. The four proposed pointers appear only inside the inert patch. The previous remote check returned 404 for the four proposed LFS objects. An executable task branch remains blocked on authorized object upload and clean readback, current-base revalidation, and hosted Windows verification. The protected Release branch and #860 are outside this evidence update.
