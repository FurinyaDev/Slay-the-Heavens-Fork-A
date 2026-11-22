# v2.0.0 Windows checkout pack evidence

The 128 MiB gate applies to all retained Git packs after checkout and comparison prefetch. A historical hosted Windows job at `409da03bdb8419fea88832d437c9ebeec5f4c418` measured 141,493,735 bytes and failed the gate. [Hosted Windows job](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/44964506526/job/137040333854)

This evidence branch preserves the verified forward patch as documentation. The patch was tested against the Release snapshot `a67385f3158b6bae26e74ecc5aa155b20bfa3f33` (tree `c22b759edb93e9119c82e5af536616c59b7a2ccd`). The local prototype was `092ac0aeaf003d9a91d1155c9e749c9ab2c8d425` (tree `f1ca025c61c9a8d1b212db075a14f0b8cd6ff917`). The patch carries only forward Git object changes, including four 132-byte pointer literals. The evidence branch itself has parent `369d77e8fedf184532cd9af763458043821c175d` after [#856](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/856). All live archives, CI and test files match that parent. Revalidate the prototype on the then-current Release base before opening an executable PR. This evidence branch is retained for maintainer follow-up and has no merge PR.

## Verification

A Linux proxy used a fresh Git database, Git 2.52.0, Node 24.19.0, Windows checkout line-ending settings, depth two, `blob:none`, retained fetch packs and the repository's unchanged comparison, pack and whitespace checks.

| Rehearsal | Comparison base | Git pack bytes | Gate |
| --- | --- | ---: | --- |
| Release at `a67385f` | `25d389968670c0812f8b9565157cf32642fb58e2` | 143,161,880 | Fail |
| Prototype at `092ac0a` | `a67385f3158b6bae26e74ecc5aa155b20bfa3f33` | 128,323,887 | Pass |
| Two-parent checkout `99c982d0c89fea9854915d590c03f126bc748aad` | `5a972c7371d0217ce4d9806df35ba1464c50f40f` | 128,800,583 | Pass |

Whitespace passed in all three runs. The two-parent run prefetched 29 comparison blobs totaling 1,748,211 raw bytes. The prototype passed the license audit and all 27 targeted storage tests. A cold checkout restored the four inputs to identical sizes, SHA-256 hashes and Git blob IDs from a verified local bundle while their old raw Git blobs remained absent. The values above are Linux proxy results. A hosted Windows run and the required CI are pending.

## Patch and object readback

Check the SHA-256 of [the forward patch](release-a67385f.forward.patch) against `e1615df712d9872789bd539fdecb1d4ee75cbf69a49c8331bd32fee541ede438`. In a disposable worktree at the exact Release SHA above, run `git apply --index --check <patch>`, then `git apply --index <patch>` and verify that `git write-tree` returns `f1ca025c61c9a8d1b212db075a14f0b8cd6ff917`.

| Repository path | Original Git blob | LFS SHA-256 | Bytes |
| --- | --- | --- | ---: |
| `tests/fixtures/integration-ci-epochs.json.gz` | `03b23f9c08167f93b9fe02e1f7855d2fe5056c67` | `542755e50f64d062f3d407114a58d9b429add0d8bd667b7430ef2b0fc5cf5532` | 2,436,891 |
| `tests/fixtures/pr323-historical-fixtures.json.gz` | `16ce40fae511b39072f695159a60f8bc6a818bb7` | `0016ea0a00171a413c2697329ea87487c19c575b6148a325285e35a24b4e8759` | 5,112,323 |
| `tests/helpers/integrated-ci-source.json.gz` | `7507dd9dadee24535388a3cf3493313564612a1c` | `f0b7137f7d0462dff36b78e39a39aab8804ba9a097b1b72bdf6686cf10f15c35` | 3,222,350 |
| `tests/helpers/sts-style-prior-runtime.json.gz` | `d790bd83f77ef44eb682aca5c08617b0b06f9c2c` | `10bf3b7d960e4c02ae2d64e26d8d5f16824439b9396949973f08ccec1c9d9330` | 4,216,851 |

The authenticated GitHub LFS download query returned object-level HTTP 404 for all four OIDs. A maintainer with authorized LFS access can recover each byte stream with `git cat-file blob <Git-blob>`, check the listed size and SHA-256, and feed the verified stream through `git lfs clean -- <path>` in the disposable worktree. The output must match the corresponding staged pointer byte-for-byte.

If the maintainer authorizes the migration, upload only the four verified OIDs to the canonical repository with `git lfs push --object-id origin --stdin`. Fetch the four paths back from the canonical remote into an empty LFS cache using the local candidate ref. Recompute size and SHA-256 and run the repository's storage and license checks before pushing a separate executable task branch or opening a PR. Keep the protected Release ref untouched and verify the agreed candidate in hosted Windows with the unchanged gate.
