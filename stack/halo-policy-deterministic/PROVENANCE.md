# Deterministic policy provenance

Status: extracted and deliberately adapted for Halo Router 0.1.0 shadow use on 2026-09-07. This file records source-present provenance; tests and live integration evidence are separate claims.

## Pinned sources

| Source | Exact identity | Relevant source | License |
|---|---|---|---|
| DevHarmonics | commit `ee369b4eca02e22f5279fac5985fe124a79cde78`; `scripts/fleet.mjs` blob `1326858137d24c41e53b9e84e76abd92d7300d75` | [`scripts/fleet.mjs`](https://github.com/scottconverse/DevHarmonics/blob/ee369b4eca02e22f5279fac5985fe124a79cde78/scripts/fleet.mjs): `TIER_RANK`/`tierFit` lines 45 and 69-71; exact-current qualification lines 179-209; selector, qualification/benchmark gates, score and selected factors lines 212-256 | Apache-2.0 at the pinned commit |
| Codex Factory | commit `51a31e01c5a7ae2233c79265521d2e30c3195991` | [`scripts/factory-fleet.mjs`](https://github.com/scottconverse/codex-factory/blob/51a31e01c5a7ae2233c79265521d2e30c3195991/scripts/factory-fleet.mjs): `candidateFingerprint`, `currentQualification`, `tierFit`, and `selectCandidate` | Apache-2.0 at the pinned commit |

DevHarmonics was read with `git show` from the pinned commit, not from its dirty working tree. Codex Factory was read from the commit-pinned GitHub source because there is no local checkout under `Desktop\Code`.

Governing Halo documents:

- `C:\Users\scott\Downloads\HALOROUTERSPECv0.3.md`, especially authority order (§4), deterministic recommendation and cold start (§8 Step 4), no-authority scope (§9), and pin/license requirements (§10).
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-ROUTER-REAUDIT-2026-09-07.md`, especially reuse provenance (§4) and retained interpretation corrections (§5).
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-dev\evidence\phase0-waterfall.json`, which proves listener order is not invariant, downstream delegation remains exactly once, observer failure is isolated, and downstream failure keeps its ordinary meaning. This policy never enters that waterfall.

## Extracted ideas

- deterministic tier sufficiency and tightest-fit ordering;
- explicit qualification states tied to the candidate snapshot;
- local-first recommendation after hard constraints;
- stable candidate identity as the final tie-break;
- plain-language recommendation factors.

## Required adaptations

This is one adapted policy lineage, not two competing optimizers.

- Candidate discovery, runtime probing, fingerprint creation, qualification storage, and verifier receipt joins remain outside this package. It accepts already-assembled data only.
- DevHarmonics and Codex Factory require a current passing qualification. Halo shadow mode instead rejects `fail` but keeps `unknown` eligible with a visible caveat. This must not be reused for automatic routing.
- The sources use `paid` as a proxy for local-versus-metered preference. Halo models `locality` and `billing` separately. Only explicit `locality: "local"` receives the local-first preference; billing never implies locality. Subscription billing remains its own non-ranking state with unknown marginal cost.
- The sources return factors only for the winner. Halo returns accepted/rejected reasoning for every candidate.
- The sources use discovery order before candidate ID as a tie-break. Halo uses candidate ID so equivalent candidate sets produce identical output regardless of registry order.
- Unknown tier or context is non-gating. A candidate is rejected only when a supplied known value proves a requirement is not met.
- Catalog membership is not entitlement. Catalog-only and known-unavailable candidates reject; unknown entitlement remains an explicit shadow caveat.

## Authority boundary

The package is a pure filter/ranker/explainer over supplied objects. It reads no clock, randomness, environment, filesystem, network, provider, CLI, model, or mutable global state. It does not persist, discover candidates, load or unload models, change residency, select an actual route, rewrite an explicit/default choice, retry, fail over, alter tools or permissions, change sandbox/context, or record outcomes. `apply()` only registers the policy with `ctx.haloRouting`; DSH remains the route authority.

## Attribution handling

The package is marked `Apache-2.0`, and this file preserves the source repositories, exact commits, paths, adaptations, and prominent notice that the extracted behavior was changed. Any distribution must retain the Apache-2.0 license terms and applicable source notices.
