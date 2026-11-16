# Product sourceEpoch union: independently reviewed partial delivery

This slice continues #679 + #711 on the preparation branch only. It is not a completed CI-union gate and is not ready for release merge on this evidence alone.

Producer: `9b9e0a2eab4c3fa0783eb7e0f6b69389146bd8b3`.
Base preparation commit: `f92844b5456a6ac4b9d52b63c99dc9c29dc8704d`.

The full-domain union revealed that both `abyss_battle_ui.lua` and `abyss_battle_card_gestures.lua` need explicit merged-source bindings, even though Git auto-merges the latter. Both are pinned to complete producer text and SHA256. All unrelated paths must agree or have one unchanged predecessor; conflicting unbound paths fail closed. Existing historical proofs are not weakened.

Independent read-only review passed:
- 352/352 current source entries match producer Git text and SHA256.
- Both historical chains retained exactly: 75 targets, 122 owners.
- Two added history targets: LF / CRLF projection 4/4 passed.
- Each owner injected with missing, empty, and drifted content for both targets: 732/732 rejected.
- No Full regression launched; no official-client acceptance claimed.

Reproduction: from repository root, `node docs/evidence/potion-pointer-union-20261116/source2315/verify.mjs` (requires producer Git object and existing LFS evidence blobs). Result is recorded in verify.log. The 736 cases comprise 732 rejection cases plus 4 positive projections.

Remaining work: reconcile and validate the separate CI-source epoch and combined test manifest before independent integration review and release delivery. Do not infer CI-union pass from this product-only slice.
