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

## Release advances

- Overlaying the changed native files from `39ade2db20f879d1c069ae9f2193dc9e6ff90273` failed at the fresh Release capacity source check for `scripts/build-native-candidate.mjs`. The source receipt sweep also reported `scripts/audit-native-candidate.mjs`. Release then advanced again to `d0399a4473c1f5ba8a2ccf9d080b71fb0efaf152`, whose additional changes were outside this seven-file patch.
- This patch is blocked for #860. Hosted Full was not dispatched and #860 was not updated for this follow-up.
