# Direct donor selector provenance

Status: direct pinned reuse for DEV-only Halo shadow policy 0.2.0 on 2026-09-07.

## Pinned sources

| Source | Commit | Vendored selector blob | Original selector test blob | License blob |
|---|---|---|---|---|
| DevHarmonics | `ee369b4eca02e22f5279fac5985fe124a79cde78` | `scripts/fleet.mjs` `1326858137d24c41e53b9e84e76abd92d7300d75` | `test/fleet.test.mjs` `6f89636b4e64d34a6dd70918245fe6be263306e7` | `97ad1c8e34f92c09c03fa83c6f9a7a9a94d0c124` |
| Codex Factory | `51a31e01c5a7ae2233c79265521d2e30c3195991` | `scripts/factory-fleet.mjs` `3328c1c469d7b06735af50e3f40e7a2657e9230b` | `test/factory-fleet.test.mjs` `ac4df9059ad671b87f9c81aa3a787e22cf6eee76` | `261eeb9e9f8b2b4b0d119366dda99c6fd7d35c64` |

All six files under `vendor/` are byte-exact Git blobs from those commits. Neither pinned tree contains a `NOTICE` file. Both Apache-2.0 license files are retained. The vendored modules depend only on Node built-ins; their complete dependency closure for selector loading is present.

DevHarmonics is the maintained donor called by Halo. Its full `fleet.mjs` is imported and its exported `selectCandidate`, `candidateFingerprint`, `inferLocalTier`, `TIER_RANK`, and `QUALIFICATION_HARNESSES` execute directly. Codex Factory is retained as the upstream lineage and its original tests remain executable.

## Thin adapter boundary

`donor-adapter.mjs` contains only:

- DSH-to-donor field projection;
- the exact pinned DSH runtime fallback;
- public visibility copies of the donor-private `currentQualification` and `tierFit` helper bodies.

The policy obtains the ranked accepted list by repeatedly calling the donor `selectCandidate` with already-selected ids added to `excludedCandidateIds`. It does not reproduce the donor score or implement another optimizer. Halo-only proven failures are translated into donor exclusions; the selected candidate and selected factors come from the donor.

The execution profile is bound as `digest`. This deliberately restores the exact-profile invalidation that the current DevHarmonics LM Studio discovery path cannot provide on its own. The Factory lineage hashes more individual fields; Halo hashes those observable execution fields first and supplies the resulting digest to the maintained donor fingerprint.

`test/factory-lineage-equivalence.test.mjs` runs both pinned selectors over their common candidate contract. It proves the same local-first, tier, explicit-exclusion, structured-write benchmark, and latest-exact-failure decisions. It deliberately asserts that the two fingerprint bytes differ: Factory includes adapter, capabilities, and reasoning fields directly, while current DevHarmonics expects Halo's execution-profile digest to carry that identity. Selection equivalence is proven for the shared contract; universal equivalence between the two historical modules is not claimed.

## Changed behavior

The current task explicitly supersedes HALOROUTERSPECv0.3 section 8's earlier shadow cold-start allowance. An unknown legacy qualification state is no longer eligible. With no exact current PASS, the policy returns `recommendedCandidateId: null` and explains that no currently qualified candidate exists.

This stricter admission remains shadow-only. DSH owns the route, explicit/default choice, picker, retries, tools, permissions, sandbox, context and runtime state. `apply()` only registers an authority-free advisory policy.
