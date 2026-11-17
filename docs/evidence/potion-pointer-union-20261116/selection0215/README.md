# Selection historical consumer continuation (PARTIAL)

Base: `7d02a6ae3be107730b7c1c128720e22c8431cbbe`. Neither original PR head nor any product Lua is changed.

The original selection-map consumer ran 7 cases: 4 PASS and 3 FAIL on the union. Its legacy reader was interpreting live pointer owners as potion/selection history. The minimal adapter now enters the explicitly named potion predecessor only after authenticating all 352 current product sources and all 187 CI inputs. The six synchronous original test bodies are unchanged; each runs within a fresh synchronous capture and drops its scoped reader in `finally`. The seventh asynchronous isolated production-copy test retains the fresh public reader. All original assertions are retained.

A first public-reader-only adapter was terminated (exit 130) while still producing no results, because repeated nested historical reads repeatedly scanned the full current corpus. No test deadline/budget was raised. The scoped adapter passed all 7 cases in 6.24 seconds; `tests.log` is the final successor-bound rerun, not Full CI.

The prior `7d02a6a` packet remains byte-for-byte as `potion-pointer-ci-before-selection.json.gz` with its exact `ed0dd1a…` pin. The successor explicitly names that commit/hash, preserves all original parent view hashes and sources, the complete 187-input set, and every current binding except this one consumer. Its generation uses exact parent Git blobs and verified LFS identities, not test results. An initial overly strict comparison of serialized view shape rejected the newly necessary before-source field; fixed to preserve original SHA and all previously stored source bytes while authenticating new full before source.

Run `python docs/evidence/potion-pointer-union-20261116/selection0215/capture.py` to reproduce the successor packet. Run `node --test tests/release-selection-map-source.test.mjs` and `node docs/evidence/potion-pointer-union-20261116/selection0215/verify.mjs` for the focused checks. Historical `release-source-epoch.json.gz` and `closeout-ci-source.json.gz` were materialized locally; they are not changed deliverables.

## Remaining

Only the existing 7-case selection historical consumer has been continued. The other two consumers, #711's additional pointer assertions/helpers, and full isolated CI-copy closure remain pending. The seventh test proves production-helper copy only, not the new CI-helper closure. No Full, Hosted CI, official GIL, PC/mobile or release acceptance is claimed. `backlog` CLI was unavailable, so no manual Backlog edits were made.
