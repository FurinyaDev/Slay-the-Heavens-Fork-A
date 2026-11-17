# Independent review: calibration continuation (PARTIAL / NOT MERGE READY)

Acceptable to preserve on the existing preparation branch only. This is not a passing calibration suite, complete CI-copy closure, integration onto current Release, Hosted CI or official/device acceptance.

Independent controls against the frozen source: extracted actual calibration wrapper 11/11; extracted actual slice inventory 5/5; shared synchronous snapshot lifetime 13/13. The snapshot probe is the unchanged script in `../integrated-next/review-snapshot.mjs`, with this candidate's output saved here. Verified cloned buffers and inventory arrays, separate inventory view keys, no cache outside a synchronous scope, fresh next-scope discovery, retained Node test context, exception cleanup, post-await fresh-source rejection, invalid-input callback rejection and recovery. No duplicate calibration suite was run by the reviewer.

Structural comparison with delivered d2a8fa6 (local b073f3a has the same verified bfae02a tree) confirms all 78 original test bodies byte-for-byte unchanged, including all rejection matchers. Original names/order and assertion-method counts are unchanged. All original parent view identities/source bytes and the other 186 complete input rows are preserved. Prior selection/integrated consumers and product src/data/config are unchanged. The exact prior packet is archived and freshly checked; the successor names the actual remote predecessor d2a8fa6.

The read routing preserves two different domains: fixed historic CI readers use the authenticated potion predecessor, while `liveDiskReadFileSync` routes product sources/config to the authenticated current snapshot or fresh raw current reader. Module initialization scopes end before each dynamic-import await. Memoization is test-local and only around fixed historical readers/inventory, not arbitrary custom readers. Final original-test failures remain visible rather than accepting a wrong error domain or weakening assertions.

Known remaining failures involve joint/ratchet/closeout/noncombat/run-HUD/menu inventory validation: historical/custom mutation readers are being treated as raw-current authentication inputs, and some historical callbacks convert binary archive reads into strings. A separate explicit raw-current versus historical-reader contract is needed through the affected helper chain; this patch does not pretend that work is complete. Use the final full single-file log for exact results, not a sum of successful tests from earlier candidates.

Reviewed SHA256:
- `tests/ci-complete-calibration.test.mjs`: `e1437120d51c707fdc79c2207ea982568c66c4b93ea9cc19b93311e4af3b690e`
- `tests/helpers/potion-pointer-ci-union.mjs`: `0a1e4546d9d84b9393001b35cbf551ec3444161776b02616af25c5305c248ca1`
- `tests/helpers/potion-pointer-ci-union.json.gz`: `2550d7de0c1b491e342b2a50d453fd4553593f524da152181da6cff0fcdd0435`
- `tests/helpers/potion-pointer-ci-before-calibration.json.gz`: `7b049aac614a17f37f3c272e11c45df127c43f83d5109567018ea548ac921081`
