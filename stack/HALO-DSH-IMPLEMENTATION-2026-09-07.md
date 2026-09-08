# Halo Router 0.1.0 — DEV implementation and evidence

Date: September 7, 2026, America/Denver. Evidence timestamps after midnight use September 8 UTC.

## Delivery and decision boundary

The DEV-only **shadow** system is running at `http://127.0.0.1:3085`, preset **Halo Router DEV**. Two DSH-native plugins provide one `ctx.haloRouting` seam. DSH, its existing adapters, picker, retries, tools and verifier still own execution. No automatic route changes or runtime control were added. The Research Gateway is excluded from this DEV composition; no Gateway work was performed.

This delivers the engineering portion of Stages 0–7. Stage 7's real-use review remains open: six controlled transport turns are not organic coding outcomes or evidence that recommendations are good. No automatic-routing plan is pre-approved by this work.

Production's 117 tracked baseline files have repeatedly matched their initial hashes. Production's currently observed listener was `127.0.0.1:3000`; older documentation's `3080` is historical, not this DEV URL. No production service, model alias, permission configuration, provider credential or production package was changed. Native subscriptions and the existing inference providers remain shared account/runtime resources.

## What was built

| Location under canonical repository | Responsibility |
|---|---|
| `stack/halo-routing` | DSH service, final-dispatch observer, exact-profile hashing, catalog census, append-only DSH storage and validated outcome contract |
| `stack/halo-policy-deterministic` | Pure local-first advisory selection with known role/tier/context/capability constraints and explicit unknown-state caveats |
| `stack/halo-router-dev` | Isolated DSH home, pinned dependencies, DEV launch/stop, smoke/proof scripts and evidence |
| `stack/halo-verified-coder-dev` | Development copy with a small child-id/round/receipt notification; production verifier and production configuration remain untouched |

The gate-core copy is byte-identical to production. The DEV composite retains the worker prompt, permissions, tools, configured model and gate behavior. Its notification has no acceptance or routing authority. It has not yet been exercised by an organic gated worker unit.

## Phase 0 — seven answers and implementation adjustment

1. **`agent/request` is not reliable final-model observation.** The actual published waterfall test found an observer could see `default` while the eventual route was `explicit`, depending on registration order. Observe the resolved route at stock `llm/stream`; retain `agent/request` only for correlation. No model pair is rewritten.
2. **Pin provenance needs another source.** The observer reads the existing Halo per-session selection record, off the synchronous request path. It labels explicit, delegated, default-or-resumed or unknown. Provider-internal resolution behind an alias remains unobserved. Live local/Claude/Codex explicit selections were retained.
3. **Observation failure defers.** No policy, throwing policy and timed-out async policy return no recommendation. Installed-runtime tests preserve the original stream and exactly one downstream delegation; downstream errors are not swallowed. Recording work is queued after dispatch. Live listener measurements were below the 200 ms budget; this is not a claim of zero whole-process overhead.
4. **No registered policy leaves ordinary DSH untouched.** Observations can still be written. An absent, disposed or broken advisory policy never becomes a missing-model error.
5. **Gated worker selection remains explicit.** Source tracing finds the configured model passed into `ctx.subagents.start`; child identity is available as `run.id`. A DEV-only notification carries the exact child/round alongside the verifier receipt. The observation path and outcome binding are source-wired and contract-tested, but the live worker-to-receipt join remains unproved. Release acceptance therefore claims root observation, not worker qualification. No fabricated fixture run substitutes for real work.
6. **Records survive restart without session envelopes.** The canonical store is a DSH JSON KV unit; session history is not modified by the observer. Actual published Session/SessionStore/persistence tests exercised compaction, JSON restore and remount. Live DEV unmount/restart/remount preserved all six observation IDs, historical response and all 2,747 picker entries.
7. **Host projections are derived, not storage.** The installed host-only projection experiment confirmed it stays off the client surface and has no independent durable write path. A host projection is unnecessary for this file-read release: the small status export and canonical ledger suffice. No projection references were inserted into sessions.

Evidence: `stack/halo-router-dev/evidence/phase0-{waterfall,observer,storage,continuity}.json` and `restart-{before,unmounted,remounted}.json`.

## Candidate universe and fingerprint census

The live DEV picker and reconciliation contain **2,747 provider/model pairs**: LM Studio 32, Claude CLI 3, Codex CLI 7, OmniRoute 2,705. Five LLM providers are registered; DeepSeek has no advertised models. Native subagent providers are inventoried separately rather than invented as interchangeable picker routes. Catalog membership does not establish authentication, entitlement or live inference success.

All candidate routes remain visible in the census. The exact existing OmniRoute `connect account` marker is classified catalog-only, with its source identified as a catalog label rather than a live account probe. Policy may reject such entries from a recommendation; it never removes them from the picker. Unknown qualification, entitlement, tier, context and availability remain caveats rather than silent evidence of failure.

LM Studio can proxy LM Link, so it is not globally labeled local. Only a matching `lms ps --json` instance with `deviceIdentifier: null` establishes physical locality for that alias. The local daily coder was already resident, Q4_K_M, 32K, one slot. No model loads/unloads or quant/config changes were issued by this work.

Fingerprints include provider/model/execution class, available actual local quant/context/slots/load configuration, separately declared context, effective reasoning request and tool-schema digest. Requested settings do not replace measured settings. A selected global runtime package is not assumed to be the loaded instance's runtime. The full census is `evidence/PROFILE-CENSUS.md`.

**Limits:** the live API enrichment does not yet bind a physical model-file digest, exact active template, per-instance runtime package, provider-resolved cloud alias target or complete adapter build identity. These are explicitly missing/unobserved, not a claim of universal exactness. Endpoint/adapter fields supported by the profile contract are not all populated by the live census. This fingerprint is useful for the observable configuration, but insufficient to certify model binaries or silently promote qualifications. A post-terminal snapshot also cannot prove no mid-request configuration change occurred.

## Tests and live results

- **37 focused tests passed:** policy, candidate census, fingerprint mutations, non-interference, outcome validation, verifier crash and immutable/deduplicated records.
- **Actual installed DSH seam checks passed:** waterfall/pin ordering, stream identity, downstream exactly-once, JSON ledger restart/dedup, host projection behavior and session replay/compaction/remount.
- **Three final-code live smokes passed:** `lmstudio / halo/qwen3-coder-30b-a3b-q4km`, `claude-cli / sonnet`, `codex-cli / gpt-5.6-terra`. Each returned the prescribed `HALO-ROUTER-OK`, retained its explicit pin and emitted observation/recommendation/measurement records. Three earlier smokes are retained as prototype evidence, not relabeled final-code.
- **Rollback/restart passed:** DEV absent-router and remounted-router starts could read the prior session and full picker; observation IDs unchanged. Production hashes unchanged.

Final-code smoke filenames end in `1788831212244`, `1788831230181`, and `1788831244569`. These are controlled tests, deliberately constrained and fully recorded. They do not prove unsteered app building, role qualification, model superiority, automatic routing effectiveness, or native provider token accounting when the provider omits usage. Missing usage remains null.

## Corrections caught during implementation

- Moved final-model observation away from the order-sensitive request waterfall.
- Removed dispatch-fingerprint fallback from the public outcome API. Outcomes now require a matching post-terminal record and independently validated receipt.
- Kept declared context distinct from active local context.
- Did not infer local origin from the LM Studio provider name.
- Prevented policy results from overwriting canonical recommendation fields.
- Shared large identical candidate evaluations by content ID and rewrote the readable export only when the ledger changes. Earlier large records are preserved; no retention/pruning system was added.
- Fixed the DEV stop script's PowerShell PID/UTC ownership checks and proved stop/remount on the actual host.
- Restored DEV's fresh-session default to the production-configured 35B planner after native smoke tests changed DEV's stock default selection.

## Source provenance

- Canonical Halo baseline: `378d95bc5e15d95424d851da95e6d0ae2ce9fdf7`.
- Installed DEV runtime: DSH `0.1.1-rc.2`, Cordis `4.0.2`; installed packages are the runtime authority, not newer source assumptions.
- Inspected DSH source: `a040de5b778c6a7efdb866fd383fce63c555a27f`; published tag `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`.
- Current DevHarmonics selector source: local `ee369b4eca02e22f5279fac5985fe124a79cde78`; compared source-equivalent remote `c0b0c82fe8273578de16508856c673009c2dd3e4`. Unrelated dirty donor docs were not copied.
- Codex Factory: `51a31e01c5a7ae2233c79265521d2e30c3195991`.
- devharmonics-v1: `0599ef79b5adf350d5ea8d5040551b27bb1d0987`; adaptive scoring is not mounted or promoted.

Policy-specific provenance and deliberate simplifications live in `stack/halo-policy-deterministic/PROVENANCE.md`. No donor repositories were modified.

## Seven-item handoff bundle

1. Approved v0.3 spec, preserved unchanged as `halo-router-dev/HALOROUTERSPECv0.3.md` (including its historical editorial defects).
2. This implementation/Phase 0 reconciliation.
3. DEV README with launch, reading and rollback instructions.
4. Candidate and fingerprint census with pinned policy provenance.
5. Focused-test, seam and controlled live evidence.
6. DEV code/config recovery copy and SHA-256 manifest.
7. Production baseline verification and operator-review boundary below.

## What remains — no new roadmap

Use DEV for ordinary work, inspect its recommendations and decide whether they are sensible. All candidates start unqualified; task outcomes alone do not grant blanket role qualification. No new planner/reviewer fixtures or benchmark platform was created. There are **zero organic verifier-linked outcomes** in this experiment so far. If the optional worker linkage cannot be demonstrated cleanly in real use, keep the review plausibility-only and explicitly scoped to root turns.

Implementation/test time is agent work. Useful organic observations and Scott's decision depend on calendar time spent doing real work; they are not hidden inside an agent-hour estimate. Nothing routes automatically until a later, explicit decision based on those records.
