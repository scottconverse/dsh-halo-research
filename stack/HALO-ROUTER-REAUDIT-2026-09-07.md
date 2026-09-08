# Halo Router v0.3 — source and compatibility re-audit
Date: 2026-09-07
Verdict: retain the two-plugin shadow architecture; correct the factual baseline and implementation details below before building.
Scope: passive local source inspection, Git status/identity, npm registry metadata, pinned remote source and release notes. No model runs, test execution, installations, upgrades, configuration changes, or production restarts. Only this audit report was added.

## 1. Current identities

| Item | Observed identity |
|---|---|
| Canonical Halo repository | 378d95bc5e15d95424d851da95e6d0ae2ce9fdf7 |
| Initial Halo working tree | One untracked DSH-HALO-PLUGIN-REUSE-RESEARCH-2026-09-03.md |
| Vendored DSH | a040de5b778c6a7efdb866fd383fce63c555a27f, clean |
| Published 0.1.1-rc.2 tag in local Git | b150a551b8d465e31e418e1b2eaf5e79bbb7d28e |
| Distance tag to inspected checkout | 4 commits |
| Local DevHarmonics | ee369b4eca02e22f5279fac5985fe124a79cde78, dirty |
| Remote DevHarmonics HEAD observed | c0b0c82fe8273578de16508856c673009c2dd3e4 |
| Local/remote devharmonics-v1 | 0599ef79b5adf350d5ea8d5040551b27bb1d0987, local clean |
| Remote Codex Factory pinned for this audit | 51a31e01c5a7ae2233c79265521d2e30c3195991 |

The live web profile manifest and canonical stack/web-profile.package.json still reference 0.1.1-rc.2 native packages and three custom Halo packages: model selection, conversation metrics, and host-apiproxy. This is installed configuration evidence, not a fresh running-process version attestation.

## 2. Material factual corrections

### DSH's publication wall has changed

npm now reports @deepseek-ai/dsh latest=0.1.2-rc.1 and alpha=0.1.3-alpha.2. @deepseek-ai/cordis is 4.0.2. dsh-llm-fallbacks remains 0.4.1 and dsh-advisor remains 0.3.1, both declaring the 0.1.2-rc.1 package generation and Cordis 4.0.2.

The spec's claim that their required DSH generation is unpublished is obsolete. They remain mismatched with Halo's existing 0.1.1-rc.2 configuration. Published peer versions establish eligibility for evaluation, not installation compatibility or functional acceptance.

Release 0.1.2-rc.1 also changes relevant product surfaces: subagent model selection, provider-login configuration, model catalog search/filtering, usage/timing display, and remote API migration away from the old APIProxy. The last change matters because Halo carries a custom host-apiproxy package. Do not treat upgrading this customized profile as a routine version bump.

Sources:
- https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-rc.1
- https://registry.npmjs.org/@deepseek-ai%2fdsh/latest
- https://registry.npmjs.org/dsh-llm-fallbacks/latest
- https://registry.npmjs.org/dsh-advisor/latest

### The router repository and npm coordinate do not match

tianji-qingtian/dsh-model-router at 15a5c587c2839c1d459f50045861212f7bd8d9b6 declares name dsh-model-router and version 0.9.4. However, npm view dsh-model-router returns latest 0.6.2; the published version list ends at 0.6.2. Its peer metadata differs materially from the repository.

Therefore the spec must not describe that repository's 0.9.4 as an installable npm coordinate. The source-inspection-only decision remains right, and source references must use the repository plus commit.
- https://github.com/tianji-qingtian/dsh-model-router/blob/15a5c587c2839c1d459f50045861212f7bd8d9b6/package.json
- https://registry.npmjs.org/dsh-model-router

### Source checkout is not the published artifact

The recorded a040de5 checkout is four commits after the dsh-v0.1.1-rc.2 tag. The spec correctly names both but too easily treats them as one target. Phase 0 must run against the exact assembled DEV artifact and record that identity, including Halo overrides. Source claims from a040de5 alone cannot prove the installed package behaves identically.

## 3. DSH seam findings

### Request observation is a waterfall return-value problem

At packages/core/agent/src/runtime-types.ts:244, agent/request receives agent, turn, step and signal; next returns LlmCallConfig. Provider/model are not direct fields of that hook payload.

At packages/core/agent/src/model-selection.ts:39-72, installModelSelection awaits next() and then overlays selected provider/model/reasoning. Observation position therefore matters: a listener can observe a configuration before another listener finishes overriding it.

Implementation correction: preserve the final configuration unchanged and observe at the confirmed point of dispatch. Phase 0 must prove this ordering. Keep requested/resolved/actually-reported identities distinct where a provider or proxy can resolve aliases downstream.

Call next exactly once. Catch only the observer's own errors. A broad catch around await next followed by next again could replay downstream work or hide a legitimate provider failure.

The corresponding 0.1.2-rc.1 source retains this selection pattern.

### Registry reuse is correct, but discovery is not entitlement

packages/llm/llm/src/index.ts provides listProviders(), listModels() and resolveModelInfo(). listModels explicitly says catalog membership is advisory and does not change routing validation. Exact context/reasoning metadata requires resolveModelInfo; listModels returns only basic identity/name/description/modality metadata.

The candidate reconciliation remains necessary. A catalog entry is not proof of authentication, quota, entitlement, or successful execution. Native subagent routes may require the subagent registry as well as ctx.llm.

### Worker seam is available in source; receipt join is not yet present

stack/halo-verified-coder/index.mjs:115 and :133 explicitly supply provider lmstudio and configured model. It creates a staging parent, composes the parent's preset, then starts the child. The stock in-process driver resolves child agent options from the parent and request.

stack/halo-verified-coder/gate-core.mjs:219 creates an audit record with ID, repository, paths and rounds. Round results and final verdicts are written, but this record has no child-session ID, model identity, execution fingerprint, or router observation ID.

This supports the existing worker-first Phase 0. It does not establish impossibility: event correlation may work, or the development-only optional integration may be small. Neither outcome was live-tested here.

### Plugin storage and optional projection design are sound

packages/storage/storage/src/backend.ts exposes KV units, with atomic durable individual writes, overwrite/upsert semantics, and caller-owned write ordering. It is not an append log. The plugin needs serialized append/dedup semantics over that interface.

packages/session/session-projection/README.md confirms projections fold committed events, host-only state is available through stateOf, and persisted checkpoints depend on the cache composition. They do not replace canonical storage.

If the optional compact summary needs a custom session event, mark it ignorable as DSH requires for unknown-event tolerance. The source states unknown required events can prevent session loading. Keep the already-planned plugin-removal/session-reopen test; no new subsystem is needed.

## 4. Reuse provenance

Current DevHarmonics fleet.mjs and qualify.mjs are unchanged from the pinned local HEAD. The broader working tree has many changed source and test files, not only documentation. Extraction must remain commit-pinned.

Remote HEAD has advanced, but remote fleet.mjs matches the pinned local fleet.mjs after newline normalization. The substantive fingerprint defect therefore remains: runtimeVersion is hardcoded unknown for local HTTP candidates; the fingerprint contains candidateId, runtimeVersion, digest, tier and harness. LM Studio discovery does not supply the missing quant/context/load identity.

Current selectCandidate is real reusable deterministic code. It requires current qualifications and benchmark qualification for designated roles, scores unpaid candidates ahead of paid candidates, then considers tier fit and stable tie-breaks. It is not a drop-in Halo policy: unknown qualification must remain non-gating in shadow, and paid must not substitute for local/remote identity across arbitrary cloud and subscription routes.

Codex Factory source is scripts/factory-fleet.mjs, not scripts/fleet.mjs. At the pinned remote commit, its fingerprint and deterministic selector exist. Current DevHarmonics cites this lineage, and both selectors use the same unpaid/tier score expression. Reuse one adapted policy; do not combine these as two independent competing optimizers.
- https://github.com/scottconverse/codex-factory/blob/51a31e01c5a7ae2233c79265521d2e30c3195991/scripts/factory-fleet.mjs
- https://github.com/scottconverse/DevHarmonics/blob/c0b0c82fe8273578de16508856c673009c2dd3e4/scripts/fleet.mjs

devharmonics-v1/src/model-fingerprint.ts does hash twelve fields, including pricing. That supports the recorded lineage but also shows why more hashed fields is not automatically better: a pricing change should not invalidate execution correctness qualification. Preserve policy/cost metadata separately from execution identity.

This audit does not reassert that nobody else has built the capability. It did not repeat the entire ecosystem search.

## 5. Interpretation corrections retained

- A task verifier receipt records that task's outcome. It must not automatically qualify or disqualify a model for an entire role. Role qualification requires a defined basis; otherwise retain unknown.
- A verified outcome belongs to the actual execution. It cannot establish counterfactual success for an unrun recommendation.
- A 200 ms timeout cannot preempt CPU-bound synchronous JavaScript in the same event loop. Make the observer small and bounded, queue work, avoid synchronous expensive policy execution, and measure observer overhead separately from provider time. Do not promise a timer can interrupt blocking code.
- Policy exceptions should fail open, but genuine downstream DSH/provider exceptions must retain their ordinary meaning.

## 6. Recommendation

Retain v0.3's two plugins, one service, complete candidate universe, exact-profile evidence and shadow-only scope. No additional platform is justified by this audit.

Before implementation, correct the package publication/coordinate facts, identify the precise DEV artifact, and incorporate the waterfall/receipt/storage details into the existing Phase 0. A short comparison against the published 0.1.2 generation may reduce future maintenance, but the custom APIProxy/picker/metrics profile must be accounted for before selecting it. No production upgrade is implied.

The existing Stage 0-7 plan is still a reasonable approach. Source inspection has reduced some unknowns; live request ordering, explicit/default attribution, worker receipt joining, timing and session continuity remain Phase 0 evidence, not accomplished results.

The 8-14 elapsed agent-hour estimate remains conditional on Phase 0. It is not a verified schedule.

## 7. Audit boundary

Performed: passive source reads; exact Git identities/status; current npm metadata; pinned GitHub source comparisons; published release notes.
Not performed: model generation, live route calls, plugin installation, upgrade, test suite execution, service restart, production config edit, commit or push.
Artifacts: identical audit copies in the canonical Halo stack and Scott's Research folder. Existing specification and implementation remain unchanged.

