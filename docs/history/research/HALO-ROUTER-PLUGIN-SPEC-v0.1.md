> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Halo Router for DeepSeek Harness

## Product specification and architecture decision record

**Version:** 0.1-draft  
**Status:** Proposed for independent audit; not approved for implementation  
**Date:** 2026-09-03  
**Primary operator/decider:** Scott Converse  
**Implementation target:** DeepSeek Harness (DSH) `0.1.1-rc.2`, locally inspected upstream HEAD `a040de5`  
**Intended package shape:** one DSH plugin product, with a reusable internal routing library  
**Production-change policy:** development profile first; the working production Halo profile must remain untouched until the acceptance and promotion requirements in this specification are satisfied.

---

## 1. Executive decision

Build **one Halo Router plugin product for DSH**, backed by a provider-neutral routing core assembled from the best parts of three Scott-owned Apache-2.0 lineages:

1. **Current DevHarmonics:** maintained deterministic admission, qualification, benchmark gating, role/tier fit, local-first selection, and explanations.
2. **Codex Factory:** direct provenance for the current selector, stronger execution fingerprint fields, and mature Windows lifecycle, isolation, locking, and evidence contracts.
3. **devharmonics-v1:** workload classification, empirical performance aggregation, counterfactual analysis, provider diversity, cost parity, and explainable adaptive scoring. These features remain **shadow-only** until real verifier evidence justifies narrow promotion.

DSH remains the only orchestrator and the only automatic routing authority. The plugin does not create a second agent loop. OmniRoute remains catalog/authentication/transport infrastructure. LM Studio and native Claude/Codex adapters remain execution paths. The Halo Verified Coder remains the independent acceptance authority.

The plugin must preserve two operator experiences:

- Selecting a named provider/model in the DSH picker is an explicit pin and cannot be overridden.
- Selecting **Halo Auto** delegates route selection to the plugin under the policy described here.

The `Halo Auto` design is provisional until the Phase 0 seam experiment proves the actual picker and `agent/request` behavior on the exact DSH build.

---

## 2. Problem statement

Halo has several useful but disconnected model-selection capabilities: DSH's provider/model registry and picker, current DevHarmonics' deterministic qualification policy, devharmonics-v1's adaptive scoring, Codex Factory's Windows/evidence patterns, OmniRoute's provider catalog, LM Studio's local models, and native Claude/Codex execution. No one component currently has enough context and verified evidence to make an automatic decision safely and explainably.

Writing another complete router would duplicate existing Scott-owned code and create another policy owner. Installing an off-the-shelf router would introduce version incompatibility, omit LM Studio/AMD residency information, and still not use Halo's independent verifier. The missing product is therefore a thin DSH integration with a normalized shared decision core—not a new orchestrator or independent routing service.

---

## 3. Goals

### 3.1 P0 outcomes

1. Give DSH an optional **Halo Auto** mode that selects qualified local or cloud execution routes without overriding explicit operator choices.
2. Bind qualification and performance evidence to an exact execution profile rather than a friendly model name.
3. Prefer qualified local models by default while accounting for role, workload, context, residency, cold-load cost, Windows headroom, and verifier history.
4. Escalate to cloud or specialist routes only under explicit, explainable, bounded conditions.
5. Record every automatic or shadow decision, its counterfactual, and its independently verified outcome in a replay-safe evidence ledger.
6. Expose concise, truthful "why this model" information and router state in Mission Control.
7. Keep production DSH operational and unchanged until the development plugin passes the defined promotion gate.

### 3.2 Success criteria

- Explicit picker selections are never overridden in all negative tests.
- Every decision references an immutable policy version and execution-profile fingerprint.
- A changed quant, model file, runtime, adapter, endpoint, context, reasoning mode, parallel-slot count, chat template, tool-schema version, KV/cache configuration, or relevant load setting makes prior qualification stale.
- Only mechanically verified outcomes update reliability profiles.
- Session replay and compaction remain healthy with at least 1,000 routing decisions in the external ledger and compact references in DSH sessions.
- Shadow recommendations can be compared with the deterministic baseline and actual operator choice for the same workload.
- Automatic promotion occurs only for one explicitly approved workload policy at a time.
- Disabling the plugin restores ordinary DSH selection without migrating or repairing sessions.

---

## 4. Non-goals

The first release will not:

1. Replace or fork DSH's agent loop.
2. Port the DevHarmonics orchestrator, ledger, UI, ACP runtime, or one-shot `RuntimeAdapter` into DSH.
3. Make OmniRoute an automatic policy owner.
4. Replace LM Studio, Claude Code, Codex, Gemini, OpenRouter, or other runtimes.
5. Modify the Halo Verified Coder's pass/fail authority.
6. Change sandbox, filesystem, network, model, agent, or tool permissions. Routing selects an execution route; it does not narrow the capability Scott assigned to that route.
7. Learn from a model's self-reported success.
8. Train a learned router or embedding classifier in v0.1.
9. Automatically promote all adaptive scoring or all workload classes at once.

---

## 5. Verified facts, assumptions, and required proofs

### 5.1 Verified from inspected source

- DSH core exposes `ctx.llm`, provider/model discovery, model metadata, `agent/request`, `agent/request-error`, `llm/stream`, token metering, session continuity, and per-subagent provider/model selection.
- DSH core performs no general automatic model selection.
- `agent/request` is documented as able to supply a **missing** provider/model pair.
- Current DevHarmonics contains deterministic selection and qualification but deliberately excludes an adaptive optimizer.
- Codex Factory is the direct source named in current DevHarmonics' selector header; Codex Factory itself distilled selected earlier DevHarmonics primitives.
- devharmonics-v1 contains real adaptive routing code and tests, but no preserved corpus proves that it beat explicit deterministic selection in real accepted work.
- Current DevHarmonics' HTTP/LM Studio candidate fingerprint is too weak for Halo because important runtime/configuration changes are absent and `runtimeVersion` may remain `unknown`.
- Detailed routing events have previously caused DSH session-load problems in another plugin lineage; detailed analytics therefore must not be assumed safe in the session log.

### 5.2 Assumptions requiring Phase 0 proof

- Whether an `agent/request` plugin can replace a provider/model pair that the picker already supplied.
- Whether `{prepend: true}` changes authority or only listener order.
- Whether DSH can expose a plugin-provided `Halo Auto` picker entry without a core patch.
- Whether an automatic route change correctly rematerializes provider defaults while preserving operator-explicit settings.
- Whether `agent/request-error` may perform a bounded cross-provider retry without corrupting the durable turn or duplicating tool effects.
- Whether compact router-reference events survive replay and compaction on the exact installed build.

No production implementation decision may treat these assumptions as established before the Phase 0 receipt exists.

---

## 6. User stories

### Operator

- As Scott, I want to select a specific model and know that no automatic router will override me.
- As Scott, I want to select `Halo Auto` when I want DSH to choose among qualified local and cloud routes.
- As Scott, I want Mission Control to explain what was selected, why, what alternatives were considered, and whether the decision was automatic, shadow-only, or manually pinned.
- As Scott, I want to disable or roll back the router without losing sessions or changing the production model catalog.

### Local planner/worker

- As a local model, I want routes selected using my proven role capability, exact runtime configuration, context needs, and residency cost rather than my display name alone.
- As a local worker, I want successful work counted only when the independent verifier accepts it.

### Cloud/specialist route

- As a cloud or subscription model, I want to be selected when an explicit policy says my additional capability is worth the cost, latency, privacy trade-off, or local failure condition.

### Auditor

- As an auditor, I want every decision reproducible from versioned inputs and linked to immutable verifier evidence.

---

## 7. Architecture decision record

### ADR-001: DSH plugin with shared routing core

**Status:** Proposed  
**Decision:** Implement a DSH plugin adapter plus a reusable provider-neutral routing-core package.

#### Options considered

| Option | Assessment | Disposition |
|---|---|---|
| Patch DSH core | Highest upgrade and maintenance cost; risks production | Reject unless Phase 0 proves no supported picker/plugin seam exists |
| Standalone fourth router | Lacks DSH session/role/verifier context and duplicates policy | Reject |
| OmniRoute as policy owner | Strong transport/catalog; insufficient harness context | Reject as policy owner; retain as transport |
| Port full devharmonics-v1 `ModelRouter` | Tightly coupled to its schemas, runtime, ledger, and orchestration | Reject |
| DSH plugin plus normalized shared core | Uses the correct control-plane context and permits reuse by DevHarmonics | **Selected** |

#### Consequences

- One installable DSH product may contain multiple internal modules.
- DevHarmonics and DSH can consume the same pure policy functions without sharing orchestration.
- DSH compatibility must be explicitly version-gated.
- The plugin must provide a stable schema boundary between DSH runtime objects and routing-core objects.

### ADR-002: Explicit `Halo Auto` authority

**Status:** Proposed, contingent on Phase 0  
**Decision:** A named model selection is an immutable operator pin. Only `Halo Auto` delegates selection.

If DSH cannot support this through documented plugin/settings/picker surfaces, the reviewer must choose between:

1. a minimal upstream-compatible picker extension;
2. an explicit session command that clears the exact model and enables auto mode; or
3. no automatic routing, leaving the plugin in recommendation-only mode.

A silent override of named picker choices is prohibited.

### ADR-003: External evidence ledger

**Status:** Proposed  
**Decision:** Store complete decision, counterfactual, resource, and verifier records outside the DSH session log. Append only a compact versioned reference to the session after compatibility testing.

### ADR-004: Deterministic authority; adaptive shadow

**Status:** Proposed  
**Decision:** Hard admission gates and deterministic local-first policy control v0.1. Adaptive scoring may recommend but cannot act until a narrow policy is independently approved.

---

## 8. Logical architecture

```text
DSH operator picker
├── Named provider/model
│   └── Explicit pin: DSH executes it; Halo Router observes only
└── Halo Auto
    └── @halo/dsh-router
        ├── DSH adapter
        │   ├── agent/request
        │   ├── agent/request-error
        │   ├── ctx.llm metadata/discovery
        │   ├── token/context projection
        │   └── compact session references
        ├── @halo/routing-core
        │   ├── execution-profile identity
        │   ├── hard admission and qualification
        │   ├── deterministic local-first policy
        │   ├── resource/residency policy
        │   ├── bounded escalation/failover
        │   └── adaptive shadow recommender
        ├── routing evidence ledger
        └── Mission Control projection

Execution/runtime layer
├── LM Studio local models
├── Halo native Claude/Codex picker adapters
├── DSH stock subagent Claude/Codex providers
├── OmniRoute/API providers
└── other DSH-registered providers

Independent authorities and sidecars
└── Halo Verified Coder: acceptance truth
```

---

## 9. Authority order

From strongest to weakest:

1. Explicit operator picker selection or session pin.
2. Required capability and operator policy constraints.
3. Current execution-profile qualification and verifier eligibility.
4. DSH Halo Router deterministic policy.
5. Qualified local-first preference.
6. Resource/residency/cold-load decision.
7. Bounded cloud or specialist escalation.
8. Provider transport fallback after classified failure.
9. Adaptive shadow recommendation, which has no authority in v0.1.
10. OmniRoute strategy, which must not override an exact route deliberately chosen above it.

The Halo Verified Coder is not below this hierarchy. It is an independent acceptance authority whose result becomes evidence after execution.

---

## 10. Package and module boundaries

### 10.1 `@halo/routing-core`

Pure or infrastructure-neutral modules:

- schemas and versioning
- stable canonical serialization and hashing
- execution-profile fingerprint
- workload classification
- qualification and staleness evaluation
- deterministic candidate filtering and ranking
- counterfactual construction
- performance aggregation
- adaptive shadow scoring
- promotion evaluation
- human-readable explanation generation

It must not import DSH, LM Studio CLI code, OmniRoute clients, Mission Control, or DevHarmonics' ledger/runtime classes.

### 10.2 `@halo/dsh-router`

- DSH lifecycle and compatibility checks
- picker/auto-mode integration
- DSH runtime-to-core normalization
- `agent/request` and `agent/request-error` hooks
- provider metadata resolution
- compact session references
- bounded retry/failover state
- settings validation
- Mission Control projection endpoint or existing plugin surface

### 10.3 Halo resource observer

May be an internal module or helper process, but remains owned by the plugin product:

- LM Studio loaded-model state
- exact alias/model file and load configuration
- slot/context/runtime information
- resident/cold state
- measured load/unload duration
- Windows available physical memory and commit pressure
- AMD dedicated/shared GPU-memory observations where reliable
- prefix-cache survival indicator if measurable
- stale-sample and unavailable-sensor signaling

Unavailable telemetry must produce `unknown`, never zero and never a fabricated healthy state.

### 10.4 Routing evidence store

Use a versioned SQLite database or append-only JSONL plus derived SQLite projection. The source of truth must be recoverable and auditable. The store must not be the DSH session log.

---

## 11. Core schemas

The implementation may refine field names, but it may not remove an identity-bearing field without a schema-version change and migration review.

### 11.1 Execution profile

```ts
interface ExecutionProfile {
  schemaVersion: string;
  providerId: string;
  endpointIdentity: string;
  transport: string;
  modelId: string;
  modelDisplayName?: string;
  modelFile?: string;
  modelDigest?: string;
  quantization?: string;
  runtimeName: string;
  runtimeVersion: string | "unknown";
  adapterName: string;
  adapterVersion: string;
  contextWindow: number;
  reasoningMode: string;
  parallelSlots: number;
  promptTemplate?: string;
  toolProtocol: string;
  toolSchemaVersion: string;
  inputModalities: string[];
  outputModalities: string[];
  capabilities: string[];
  flashAttention?: boolean | "unknown";
  kvCacheType?: string | "unknown";
  speculativeMode?: string | "unknown";
  loadConfigDigest: string;
  harnessVersion: string;
  qualificationFixtureVersion: string;
}
```

The fingerprint is the SHA-256 of a stable canonical representation of this profile. `unknown` is a real value: a later known runtime version must invalidate an earlier qualification.

### 11.2 Workload

```ts
interface Workload {
  workloadId: string;
  role: "planner" | "worker" | "reviewer" | "researcher" | "general";
  taskKind: string;
  riskClass: string;
  scopeClass: string;
  requiredCapabilities: string[];
  requiredModalities: string[];
  permissionScope: string;
  expectedContextClass: string;
  expectedOutputClass: string;
  privacyLocality: string;
  deadlineClass?: string;
}
```

### 11.3 Routing decision

```ts
interface RoutingDecision {
  decisionId: string;
  timestamp: string;
  mode: "manual" | "deterministic" | "shadow" | "failover";
  policyVersion: string;
  workload: Workload;
  selectedProfile?: string;
  deterministicBaseline?: string;
  shadowRecommendation?: string;
  eligibleProfiles: string[];
  rejectedProfiles: Array<{ profile: string; reasons: string[] }>;
  factors: Array<{ name: string; value: unknown; effect: string }>;
  confidence?: { level: string; basis: string };
  counterfactualId?: string;
}
```

### 11.4 Outcome

```ts
interface VerifiedOutcome {
  decisionId: string;
  executionProfile: string;
  verifierReceiptId: string;
  verdict: "pass" | "fail" | "infrastructure_error" | "cancelled";
  firstAttemptPass: boolean;
  attempts: number;
  elapsedMs: number;
  loadMs?: number;
  prefillMs?: number;
  decodeMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  monetaryCost?: number;
  failureClass?: string;
  evidenceDigest: string;
}
```

No outcome may enter the performance profile without a valid independent receipt and evidence digest.

---

## 12. Deterministic routing policy

The deterministic policy is a policy ladder, not a single opaque additive score.

1. Respect explicit operator selection.
2. Remove candidates lacking required provider availability, entitlement, modality, tool behavior, context, permissions, or data locality.
3. Remove candidates without current role-specific qualification for their exact execution fingerprint when the role is qualification-gated.
4. Apply explicit workload/role policy.
5. Prefer qualified local routes when they meet the capability and quality floor.
6. Compare resident route cost against switch/load cost and Windows headroom.
7. Apply bounded provider/cloud escalation conditions.
8. Use deterministic tie-breaking and emit all factors.

Free/local preference must not overwhelm a hard quality, capability, context, or verifier requirement. The current DevHarmonics `+1000` local preference is source material, not an automatically accepted coefficient.

---

## 13. Adaptive shadow policy

The shadow recommender may use:

- first-attempt verified success
- eventual verified success
- time-to-green
- infrastructure failure rate
- severe verifier failure rate
- latency by workload/context/output class
- monetary cost
- residency and load cost
- provider independence for review
- quota/cooldown health

It must output a recommendation and explanation without modifying the live route.

### 13.1 Promotion rule

The number `20` is an observation floor, not a sufficient decision rule. Promotion of one policy requires:

- at least 20 comparable verified units per candidate in the relevant workload slice;
- unchanged execution-profile fingerprints during the evaluation window;
- representative difficulty/risk strata rather than only easy units;
- no increase in severe verifier failures;
- a material improvement in the stated objective, with uncertainty reported;
- explicit operator approval naming the workload slice and rollback threshold;
- a reversible configuration flag;
- continued shadow measurement after promotion.

Automatic global promotion is prohibited.

---

## 14. Local/cloud escalation and failover

### 14.1 Escalation may occur only on classified conditions

Examples:

- required capability unavailable locally;
- exact local candidates unqualified for the role;
- repeated independent verifier failure attributable to model capability rather than bad instructions/tests;
- context requirement exceeds qualified local route;
- local runtime unavailable or unhealthy;
- operator-selected policy explicitly requests a cloud specialist.

### 14.2 Conditions that do not alone justify escalation

- a model claims it is stuck;
- one unverified bad answer;
- a failed test caused by an invalid brief or broken fixture;
- telemetry is missing;
- cloud is presumed smarter without relevant qualification.

### 14.3 Return to local

Cloud escalation is bounded to the affected unit or turn unless the operator pins it. The router must not pretend another model shares hidden state. Any cross-model continuation must use the durable DSH conversation, explicit artifacts, and a concise transfer record.

### 14.4 Error failover

`agent/request-error` failover must:

- run only after ordinary same-route retry policy is exhausted;
- classify permanent vs transient failures;
- prevent retrying non-idempotent tool side effects;
- cap route switches and elapsed time;
- preserve the original failure evidence;
- stop honestly when the bounded chain is exhausted.

---

## 15. Mission Control requirements

Mission Control must show:

- routing mode: manual, deterministic auto, shadow, or failover;
- current explicit pin or `Halo Auto` status;
- actual provider/model/execution fingerprint;
- qualification state and reason for staleness;
- selected route and plain-language factors;
- deterministic baseline vs shadow recommendation;
- resident models and telemetry freshness;
- latest independent verdict and receipt link;
- policy/schema/plugin/DSH versions;
- recent route changes and failure classifications;
- a visible indication when data is unknown or stale.

It must never present a shadow recommendation as an executed route or a model's self-report as a verified result.

---

## 16. Configuration requirements

Configuration must be versioned and validated before plugin activation. At minimum:

```yaml
haloRouter:
  enabled: true
  mode: shadow            # observe | shadow | deterministic
  policyVersion: halo-router-policy-v1
  autoSelectionId: halo-auto
  explicitPinsWin: true
  evidenceStore: <path>
  verifierReceipts: <path-or-adapter>
  maxRouteSwitchesPerTurn: 1
  maxFailoverElapsedSeconds: 120
  requireCurrentQualificationFor:
    - worker
    - reviewer
  resourceTelemetry:
    maxAgeSeconds: 10
  adaptive:
    authority: none
```

Unsafe or unknown settings must fail closed to ordinary DSH/manual selection, not prevent DSH from starting.

---

## 17. Compatibility and upgrade contract

- Pin the exact DSH package/version/commit used for development.
- Refuse automatic mode when the installed DSH compatibility signature is unknown; recommendation-only mode may remain available if read surfaces are compatible.
- Test plugin disable/remove against existing sessions.
- Do not patch the pnpm store or production DSH package as the normal installation method.
- Re-run the Phase 0 seam contract on every DSH upgrade affecting picker, agent loop, request waterfalls, session events, compaction, or provider metadata.
- Record exact source commits for current DevHarmonics, devharmonics-v1, and Codex Factory before extracting code.

---

## 18. Security and capability boundary

This plugin is a routing policy, not an assistant-authored security policy.

- It must preserve the access, sandbox, tools, filesystem scope, and network capabilities Scott assigned to the selected DSH agent/model.
- It may filter a candidate when the **task** requires a capability the candidate cannot provide.
- It may honor an explicit operator policy such as local-only, cloud-allowed, or provider pinning.
- It may not silently downgrade full-machine access to workspace-only, remove tools, impose a new approval gate, or substitute a read-only route.
- Credentials remain with their existing runtime/provider stores; the evidence ledger records credential identifiers or entitlement state, never secrets.
- Browser, OAuth, CAPTCHA, proxy, purchasing, messaging, and posting policies are outside this router specification.

---

## 19. Implementation phases and gates

### Phase 0 — DSH seam and authority spike

Disposable development profile; no production changes.

Acceptance:

- [ ] Capture `agent/request` input for named picker selection, default selection, and an intentionally unset/auto selection.
- [ ] Prove whether a plugin can add `Halo Auto` without a core patch.
- [ ] Prove explicit pin cannot be overridden.
- [ ] Prove automatic route rematerializes correct provider defaults.
- [ ] Prove bounded cross-provider error recovery or document why it is unsafe.
- [ ] Prove compact decision reference survives restart, replay, and compaction.
- [ ] Produce a timestamped receipt with exact DSH commit and plugin experiment code.

Stop and amend this architecture if the seam does not behave as assumed.

### Phase 1 — Shared schemas and execution fingerprint

- Pin source SHAs and provenance.
- Implement stable schemas, canonicalization, fingerprinting, qualification staleness, and fixtures.
- Add LM Studio/runtime normalization.

Acceptance includes mutation tests for every fingerprint-bearing field.

### Phase 2 — Observe-only plugin

- Install only in the development DSH profile.
- Inventory actual routes, metadata, pins, and resource state.
- Write external ledger records and Mission Control projections.
- Make no recommendations and no route changes.

### Phase 3 — Deterministic shadow

- Run current deterministic policy beside actual manual decisions.
- Record counterfactuals and verifier-linked outcomes.
- Do not change the selected route.

### Phase 4 — Adaptive shadow

- Add v1-derived aggregation and recommendations.
- Compare adaptive recommendation, deterministic baseline, actual route, and verified result.
- Keep authority at `none`.

### Phase 5 — Narrow deterministic auto pilot

- Operator approves one workload slice.
- Enable `Halo Auto` only for that slice.
- Retain manual pin and immediate disable/rollback.
- Continue shadow evaluation for all other slices.

### Phase 6 — Production promotion

Requires independent audit, operator walkthrough, recovery proof, and a versioned release. Production remains unchanged before this gate.

---

## 20. Test and acceptance matrix

### Unit and schema

- Stable canonical hashes across process restart and key order.
- Every profile-bearing field invalidates qualification when changed.
- Unknown values do not collapse to absent values.
- Deterministic tie-breaking.
- Hard gates cannot be outweighed by preference scores.
- Performance profiles reject unverified outcomes.

### DSH integration

- Named picker pin wins.
- `Halo Auto` route executes the selected exact provider/model.
- Provider defaults and reasoning modes match the selected profile.
- Manual switch during a session takes effect immediately.
- Disable/uninstall leaves sessions loadable.
- Compaction before and after route changes remains valid.
- Tool calls are neither duplicated nor lost during failover.

### Resource/residency

- Resident vs cold states are correctly distinguished.
- Missing LM Studio or telemetry returns unknown/unavailable.
- Load-time measurement is tied to the correct model/profile.
- Windows headroom threshold is policy data, not a hardcoded universal constant.
- Another heavy workload cannot be mistaken for model memory.

### Evidence and verifier

- Self-reported success produces no positive profile observation.
- Valid verifier receipt updates the correct execution fingerprint and workload slice.
- Forged, stale, mismatched, or duplicate receipt is rejected.
- Crash/timeout is not converted into pass.
- Counterfactual records remain immutable.

### Recovery

- Corrupt ledger tail recovery.
- Missing ledger starts in safe observe/manual mode.
- Roll back plugin version and policy independently.
- Restore development profile from documented backup.
- Production profile remains unchanged until promotion.

### Scale

- 1,000 decisions without session replay or Mission Control degradation.
- Bounded ledger growth and documented retention/compaction.
- Concurrent subagents do not race the same policy/evidence record.

---

## 21. Evidence bundle required for release

The formal bundle must contain:

- source repository URLs and exact commit SHAs;
- extracted-file provenance and license notices;
- DSH version/commit and compatibility signature;
- plugin/core package versions and hashes;
- configuration and policy versions;
- deterministic test output;
- seam-spike receipts;
- profile mutation matrix;
- replay/compaction evidence;
- verifier-linkage evidence;
- shadow evaluation dataset and analysis;
- operator acceptance record;
- install, disable, uninstall, rollback, and recovery instructions;
- known limitations and deferred workload classes.

Claims must distinguish source-present, unit-tested, integration-tested, live-model-tested, verifier-proven, operator-accepted, and production-promoted.

---

## 22. Risks and mitigations

| Risk | Mitigation |
|---|---|
| DSH hook cannot own an already selected route | Explicit `Halo Auto`; Phase 0 before implementation |
| DSH upgrade breaks private assumptions | Exact compatibility gate and rerun seam contract |
| Qualification survives a material tuning change | Complete execution-profile fingerprint and mutation tests |
| Adaptive score encodes arbitrary weights | Shadow-only; policy ladder for hard decisions; narrow promotion |
| Session becomes unloadable from analytics events | External ledger and compact tested references |
| Router learns from false completion | Independent verifier receipt required |
| Local preference hides quality failures | Hard capability/qualification/verifier gates precede preference |
| Failover repeats side effects | Idempotency boundary and bounded turn-level recovery |
| Resource telemetry is stale or misleading | Timestamps, unknown state, and no fabricated defaults |
| Plugin silently narrows autonomy | Explicit capability-preservation requirement and negative tests |
| Shared library becomes another monolith | Fresh normalized schemas; pure modules; no orchestrator/ledger imports |

---

## 23. Open questions for the reviewer

### Blocking before implementation

1. Does the exact DSH hook contract support an explicit auto-selection mode without modifying core?
2. What is the smallest replay-safe session reference schema?
3. Which existing DSH/Mission Control plugin surface should host the operator UI?
4. What exact verifier receipt API and identity binding should the router consume?
5. Which current DevHarmonics working-tree state and commit are authoritative for extraction?

### Blocking before automatic promotion

6. Which workload slice is the first auto-mode candidate?
7. What effect size and severe-failure threshold justify promotion?
8. Which cloud routes are eligible, and how are subscription entitlement and quota represented?
9. What Windows headroom/residency policy should be configuration rather than learned data?

### Non-blocking

10. Should DevHarmonics consume `@halo/routing-core` immediately or after the DSH pilot?
11. Should the evidence source of truth be append-only JSONL with SQLite projection or SQLite with an exportable immutable event table?
12. Should a future learned classifier replace or supplement rule-based workload classification?

---

## 24. Reviewer audit checklist

The independent reviewer should explicitly answer:

- [ ] Is a plugin still the correct integration boundary?
- [ ] Is `Halo Auto` compatible with the exact DSH picker and request lifecycle?
- [ ] Are any DSH core modifications actually necessary?
- [ ] Does the authority order contain an ambiguity or conflicting policy owner?
- [ ] Is the shared-core boundary genuinely independent of both DSH and DevHarmonics orchestration?
- [ ] Is every material LM Studio configuration variable included in the fingerprint?
- [ ] Can detailed evidence remain external without harming recovery or Mission Control?
- [ ] Are failover semantics safe around tool side effects?
- [ ] Is the adaptive promotion contract statistically and operationally adequate?
- [ ] Does any requirement unnecessarily narrow Scott's authorized model/agent capabilities?
- [ ] Are verifier, OmniRoute, LM Studio, and DSH responsibilities correctly separated?
- [ ] Are any reused dependencies or source fragments mislicensed or insufficiently attributed?
- [ ] Which statements remain hypotheses rather than source- or runtime-proven facts?

---

## 25. Source inventory for audit

### Local repositories

- `C:\Users\scott\Desktop\Code\dsh-halo-research`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness`
- `C:\Users\scott\Desktop\Code\DevHarmonics`
- `C:\Users\scott\Desktop\Code\devharmonics-v1`

Codex Factory was inspected from its public repository; confirm whether a local checkout exists before implementation.

### Primary repository URLs

- DSH: https://github.com/deepseek-ai/deepseek-harness
- Current DevHarmonics: https://github.com/scottconverse/DevHarmonics
- devharmonics-v1: https://github.com/scottconverse/devharmonics-v1
- Codex Factory: https://github.com/scottconverse/codex-factory
- OmniRoute: https://github.com/diegosouzapw/OmniRoute

### Research inputs

- `C:\Users\scott\Downloads\DSHHaloReuseAuditrev3.md`
- `C:\Users\scott\Desktop\Halo Stack Research\DSHHaloReuseAudit20260903rev2.md`
- `C:\Users\scott\Desktop\Halo Stack Research\DSH-Strix-Halo-Spec-v3.5.md`

Before implementation, add exact SHAs, dirty/clean status, and hashes for every source file selected for extraction.

---

## 26. Approval states

- **Proposed:** this document is awaiting independent audit.
- **Audited:** reviewer findings have been reconciled in a new version.
- **Approved for development:** Scott explicitly authorizes work in a separate DSH development profile.
- **Approved for pilot:** Phase 0–4 evidence is accepted and one narrow auto policy is named.
- **Approved for production:** operator walkthrough, recovery proof, independent audit, and release bundle are accepted.

This draft grants no implementation or production authority by itself.
