# Independent review: explicit inventory reader domains

PASS for this scoped preparation implementation and the checks below. Not complete pointer CI-helper closure, current Release integration, Hosted CI, or official/device acceptance.

Independent final-source verification: 31 reader-domain controls, 11 extracted calibration-wrapper controls, 5 extracted inventory-cache controls, 13 shared synchronous-snapshot controls: **60/60**. Separately, the two original integrated source/copy contracts selected by `^(integration validates complete raw sources|integration copy closure)` passed **2/2**, 68,143.39802 ms. This was not a repeat of all 19 integrated tests or a Full run. Scripts referenced from prior directories remain unchanged; their final-source outputs are saved here.

The seven inventory entry points retain `currentRead=read` (or `readSource`) as the default, so old callers' custom current readers remain authenticated rather than silently replaced by disk. Explicit separate raw-current readers propagate through the full nested chain, including ratchet's second closeout call. Historical/custom mutation bytes still reach their original exact assertions. Controls cover direct and noncaller current corruption, omitted-argument behavior, historical mutations, binary archive freshness, malformed binary predecessor rejection, copy isolation and recovery. No cross-await authorization or public cache was introduced.

Structural review verifies all 78 original test names/order and expected assertions. Only three fault-injection callbacks in the original bodies changed: append LF to the intended text target while preserving unrelated binary Buffers. No negative control or error matcher was removed or broadened. Original 187 input identities and parent views are preserved except the three explicitly advanced current bindings; 184 other whole rows are unchanged. Five additional changed helpers are explicitly authenticated, producing exactly 192 inputs, with both original parent sources checked byte-for-byte against Git. The exact prior packet and all older historical pins remain archived. Product source/data/config and the selection consumer are unchanged.

Review caught and resolved two cross-contract regressions before delivery:
1. An accidental replacement referenced an undeclared `currentRead` in `assertStsStyleCiCurrent`. The unrelated function was restored to its original implementation and a real bad-current-reader call now verifies its exact rejection rather than allowing a ReferenceError to masquerade as a pass.
2. New current coverage of `run-hud-ci-source.mjs` makes its corruption fail earlier at the union validator. The original integrated test's single known path was changed to the existing exact union-owner category. The assertion itself and other rows are unchanged. The initial red result remains in `review-integrated-red.log`; the final two-contract pass is `review-integrated-targeted.log`.

Final calibration suite evidence is in the author's final log and README; earlier green/interrupted candidates are not substituted for that final run. No original PR head or release branch is changed by this review.

## Reviewed SHA256
- `tests/ci-complete-calibration.test.mjs`: `de34bbb32d4622307b03d95d42015e9158f14c88b294cd3bcd9f5bef8e95b871`
- `tests/integrated-ci-source.cases.mjs`: `e2b2f0a1568696c4cd35dba9e9951332fa6c6f79b9972ed0710693349f5c7231`
- `tests/helpers/integrated-ci-source.mjs`: `282140f546cb0ca79272b3b8349b2bcce0ffa89f37af037bdae22d430d0340d3`
- `tests/helpers/joint-ui-ci-source-inverse.mjs`: `b3460055dba46295824b0d2c3ce663072d723c25f2736f12af9bd51359c69a99`
- `tests/helpers/closeout-ci-source.mjs`: `4b7367ac045c96ab7b10ba09cf4f5687a62961c95cad960a359d0333545385b0`
- `tests/helpers/run-hud-ci-source.mjs`: `db3cd7f2e2900df2352c4e001e64e8e66850fc78f11960117c8d789676ff9bd8`
- `tests/helpers/sts-style-ci-source.mjs`: `65f166ddf62a8756152ac65ab406683cea084994b51a504e900a3a8c60a97592`
- `tests/helpers/menu-red-ci-source.mjs`: `24d3c488340895ca2f86737fa17695d6c95e4c0db0004563e990ab4c98945e66`
- `tests/helpers/potion-pointer-ci-union.mjs`: `d1c239984ca5694aae4dbb987bb5afb02777d552d750b865aa2454f1b3ad77f7`
- `tests/helpers/potion-pointer-ci-union.json.gz`: `0347d209241d64516606376302ecdd8d0c90d13237628eb3b9f702ec9c51dc79`
- `tests/helpers/potion-pointer-ci-before-readers.json.gz`: `2550d7de0c1b491e342b2a50d453fd4553593f524da152181da6cff0fcdd0435`
