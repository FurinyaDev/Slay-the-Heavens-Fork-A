# PR #860 build-UI predecessor evidence

**Hold #860.** The broader `assertIntegratedCurrent` assertion still fails at `scripts/cinematic-ui-layout.mjs`. Synchronizing #860 would also automatically queue Full CI.

The [exact two-file patch](860-build-ui-predecessor.patch) comes from `ea0f024130b33400f8657ec0b0e092e0506002e4` atop #860 head `5424fe7da66171c26138b6cc07a06c0ec9d8f833`. Patch SHA-256: `8ae14d7c07f062d29b82aa3bb00e9707df8c230d9d9057b0b7b0513360d7a430`. It restores the exact #840 build-UI bytes through four authenticated #854 inverse fragments and preserves the existing #840 continuation, approved archives, and production bytes.

Independent verification passed `assertIntegrationSuccessorsCurrent` and `assertReleaseBootstrapCiCurrent`, including LF/CRLF and rejection of stale #840, drifted, missing, or mixed-ending rereads. Four of five nearby tests passed. The remaining failure is the broader integration receipt above.

This commit stores evidence only. The patch is unapplied on this branch and #860 is unchanged. No tests were rerun or workflows dispatched to publish this evidence.
