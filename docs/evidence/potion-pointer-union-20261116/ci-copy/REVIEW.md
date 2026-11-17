# Independent review: isolated CI helper-copy closure

PASS for the explicitly declared offline helper-copy scope. This is not pointer-added test integration, current Release integration, Hosted CI, or official/device acceptance.

Independent final-candidate checks: **11 copy controls + 13 shared snapshot controls = 24/24 PASS**. Copy controls use actual temporary filesystem trees, not mocks. They verify full fixed copy, post-warm corruption of each captured trust-root/manifest and an ordinary helper, no target file writes after a bad-source preflight, source/destination escape rejection, hardlink target rejection without normalizing or modifying its CRLF source counterpart, same-root refusal, binary identity and copy-from-copy. The snapshot script is the unchanged `../integrated-next/review-snapshot.mjs`; the output here is from this candidate. The independent first draft expected a different hardlink error label; it was corrected to assert the actual exact single-link error, not to accept arbitrary errors.

Structural review separately confirms the old product copier's source prefix is byte-for-byte retained, the exact previous packet is archived, all original parent views and 191 other whole input rows are unchanged, and the current input set is exactly 193. The fixed 246-entry manifest excludes the four explicit trust roots; its hashes match actual files. A traversal from the three declared import roots covers all 91 relative static import/data edges and 69 reachable files inside the 250-file copy set. All current helper/fixture identity inputs are also included. Source/data/config and the prior calibration/integrated/selection consumer files are unchanged.

The trust boundary is the already trusted loaded repository entry, not arbitrary `sourceRoot`. Fixed manifest identities and private initialization-captured root bytes are used to authenticate every source copy. No source-root content self-certifies itself and no missing source falls back to the original tree. The copied entry remains subject to the same trusted-code assumption as any executable; this is not a standalone cryptographic attestation of an arbitrarily modified repository. The unchanged product-only API is independently covered by the author's original 43-control regression; I did not duplicate that full verifier.

Reviewed the author's real isolated imports and copy-from-copy child processes, explicit 377 current fixtures followed by full 193-input authentication, and expected owner-corruption rejection. Their final verifier has 32 passing checks. Generator/VM files included as hash witnesses are not promised to run alone without their external scripts/npm dependencies; the README states that boundary. The first missing dynamic-fixture failure remains archived rather than hidden.

The new copier preflights all source identities and all target leaf/parent constraints before writing content. It rejects target symlinks (internal, external or dangling) and every multi-linked target file; this intentionally stricter destination policy prevents hardlink alias writes. Text normalization follows the existing helper-byte function; binary witnesses remain byte-exact. No Full or duplicate calibration/integrated suite was run for this stage.

## Reviewed SHA256
- `tests/helpers/copy-integration-source-closure.mjs`: `1843812a64af0736b1a1873f5d07c63f53601b99fa20bb7d62384d58fc98e53b`
- `tests/helpers/potion-pointer-ci-copy-closure.json`: `fb1c1fe424be631d9662adcd09fe06966dbe9d3c8c2c1a5edb11f8e1bd3ea9a2`
- `tests/helpers/potion-pointer-ci-union.mjs`: `14441c5171399d9f84a3460a1c487342a1562f05dd2dc80fe76e6feb82df8e6f`
- `tests/helpers/potion-pointer-ci-union.json.gz`: `c3b5c1472a46517f1dd3c636cb9a639737829782a4b8651faeb1f12523193345`
- `tests/helpers/potion-pointer-ci-before-copy.json.gz`: `0347d209241d64516606376302ecdd8d0c90d13237628eb3b9f702ec9c51dc79`
