# Release historical integration follow-up

This is evidence only. Apply the binary-capable Git patch after the existing `860-build-ui-predecessor.patch`. The verified local patch commit is `1ce05d244768a2fbc68b3a2f9d8d04a101e822dd`, with parent `ea0f024130b33400f8657ec0b0e092e0506002e4`. The latter was based on #860 head `5424fe7da66171c26138b6cc07a06c0ec9d8f833` and Release `369d77e8fedf184532cd9af763458043821c175d`.

- #834 supplies the exact Git parents for `scripts/cinematic-ui-layout.mjs`, `scripts/node-ui-layout.mjs`, and `tests/lua/support/node_ui_cases.lua`. Cinematic runs after the existing #839 projection.
- #854 supplies the Git parents for `scripts/lowcost-art.mjs` and `tests/lua/lowcost_art.lua`. #835 supplies the parents for `tests/lua/formal_campaign_entry.lua` and `tests/lua/full_source_campaign_entry.lua` after the #839 projection.
- Each fragment must occur exactly once in its direction. The projector checks Git blob and SHA-256 at both boundaries, confirms that applying the forward fragments reproduces the successor, and requires the original observed file on reread. The copier and inventory helper still project to their exact previous versions. The inventory adapter passes its own reader through to source authentication. The patch changes test helpers and adds a test fixture. Existing archives and product sources retain their bytes.

## Local verification

- `assertIntegrationSuccessorsCurrent`, `assertReleaseBootstrapCiCurrent`, and `assertIntegratedCurrent` all passed on the exact #860 base with both patches. The broad source assertion covered 224 source receipts and nine helper receipts.
- All seven paths reproduced the frozen receipt from LF and CRLF inputs. Probes rejected mixed endings, drift, initial deletion, and a reread returning the exact older Git parent, drift, mixed content, or deletion. The three post-#839 paths also rejected a reread returning the exact intermediate.
- An injected deletion on reread was rejected in the selection, menu, and native inventory views.
- Four of five focused Node regressions passed. The historical Lua discovery inventory assertion in `tests/sts-style-source-epoch.test.mjs` still reports four new entries before its later checks: `detail_latency.lua`, `potion_management_visual.lua`, `shop_entry.lua`, and `traveler_power_tooltip.lua`.

## Compatibility with the newer Release base

[The Git comparison](https://github.com/FurinyaWorks/Slay-the-Heavens/compare/369d77e8fedf184532cd9af763458043821c175d...d0399a4473c1f5ba8a2ccf9d080b71fb0efaf152) covers the two commits added after the tested base.

- [#861](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/861), `39ade2db20f879d1c069ae9f2193dc9e6ff90273`. A local overlay of the five modified native files first failed at the fresh Release capacity source check for `scripts/build-native-candidate.mjs`. The integration receipt sweep identified the two mismatches below.
- [#862](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/862), `d0399a4473c1f5ba8a2ccf9d080b71fb0efaf152`. The Git delta adds changes to `src/lua/abyss_game_ui_input.lua` and `tests/official-assets-runtime.test.mjs`. Neither overlaps the evidence patch's paths. Compatibility at this tip remains unverified because no combined test run was performed.

| #861 integration input | Observed LF SHA-256 | Frozen LF SHA-256 |
| --- | --- | --- |
| `scripts/build-native-candidate.mjs` | `49aebe0b04f9f97e0d3da3f27534e0e1505f2304cfc636bba66ce27c9d1ecb0d` | `89765d7f50b3eb91333a59d2ada471bb1c818297a784c4e8f3e9ec96832b962d` |
| `scripts/audit-native-candidate.mjs` | `89e15d085db8ed59ee852638a22cf0c3203500bf502feb066450c300d3adc21c` | `ab01c2defc016c05fb83429bb566c40c34ea29c90cbf731904c7c5114ca33438` |

#860 remains at `5424fe7da66171c26138b6cc07a06c0ec9d8f833` with its existing CI against the old base. No rebase, push to #860, or separate Full dispatch was performed.
