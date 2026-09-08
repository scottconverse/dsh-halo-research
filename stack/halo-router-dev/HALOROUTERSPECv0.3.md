# Halo Router for DeepSeek Harness

## Specification revision 0.3 — shadow observation

**Status:** Architecture agreed. Proposed for implementation in a disposable development profile. Grants no production authority.
**Specification revision:** 0.3
**Target plugin release:** 0.1.0
**Date:** 2026-09-03
**Supersedes:** revisions 0.1 and 0.2 (both 2026-09-03)
**Operator/decider:** Scott Converse
**Target:** DSH `0.1.1-rc.2`, locally inspected upstream HEAD `a040de5`
**Shape:** two DSH plugins, one service key, composed by an ordinary `agent.cordis.yml`

---

## 1. What this is

A DSH-native shadow observer that records what an automatic router *would* have chosen, and why, alongside what actually ran. It changes no routes in plugin release 0.1.0.

Throughout: **specification revision 0.3** is this document; **plugin release 0.1.0** is the software it describes. Behavioral statements name the release.

The purpose is to answer one question with real data before building anything that acts: **are the recommendations any good?**

**Why this is not already installable.** No existing implementation was found across three investigations combining exact execution-profile fingerprinting, qualification bound to model + quant + context + reasoning + runtime configuration, role-specific benchmark admission, local residency awareness, and learning restricted to independent verifier results. The absence is structurally plausible — community routers solve API-provider cost and availability, while this solves qualification of mutable local execution profiles — but it is a search result, not a proven negative. Everything that would only matter after that answer — adaptive scoring, promotion rules, automatic authority, a UI — is deferred.

DSH remains the only orchestrator. OmniRoute remains catalog and transport. LM Studio remains the runtime. Halo Verified Coder remains the acceptance authority.

---

## 2. What changed

### From revision 0.1

Revision 0.1 applied release-engineering rigor to a local plugin that cannot yet change anything, which would have delayed the experiment meant to tell us what is worth building.

**Removed:** `@halo/routing-core` shared package · separate profile, qualification, residency, evidence and UI packages · the preset package · dangling-reference handling · retention and pruning design · a formal defer taxonomy · concurrent-registration acceptance machinery · separate observe / deterministic-shadow / adaptive-shadow phases · statistical promotion requirements, confidence intervals and effect sizes · the 13-item release bundle · the adaptive policy provider · automatic promotion of any kind.

**Kept:** Phase 0 first · exact execution-profile fingerprinting · explicit pins always win · verifier-sourced outcomes · capability preservation · append-only records · shadow only · plugin unmount as rollback.

**Added:** subagent observation *conditional on Phase 0* · a fingerprint observability census before hashing · a cold-start rule for unqualified candidates · verified provenance.

### From revision 0.2

Eight points settled in review, all incorporated below: absence claims stated as search results rather than proven negatives (§1) · `dsh-model-router` inspected but never installed into the measurement profile (§8a) · both advisor implementations kept out of 0.1.0 and named by exact coordinate (§8a) · failover reserved for an exact-version-audited `dsh-llm-fallbacks` (§8a) · canonical ledger in plugin storage, host-only projection only for a compact summary (§8, §7) · candidate universe defined from DSH's full provider registry (§6) · LM Studio enriches rather than defines the catalog (§6) · two plugins, one service key, shadow-only, production-isolated (unchanged).

---

## 3. Architecture

```
DSH 0.1.1-rc.2
│
├── stock, unmodified — the pipes
│   ctx.llm · agent/request · agent/request-error · dsh-llm-retry
│   dsh-token-meter · sessions · compaction · ctx.subagents
│   ctx.jobs · ctx.workflows · ctx.storage · sessionProjections
│
├── dsh-halo-routing              Service Definition
│   ├── owns ctx.haloRouting and its vocabulary
│   ├── execution-profile identity and fingerprint
│   ├── LM Studio observation (in-process)
│   ├── policy registration + lifecycle events
│   ├── append-only records over ctx.storage
│   └── agent/request listener — observes, never rewrites
│
└── dsh-halo-policy-deterministic Policy provider
    └── returns a recommendation and its reasons; no authority
```

Composed by an ordinary development `agent.cordis.yml`, the same way `halo-orchestrator` composes its preset today. No preset package.

**Why one service key.** DSH's own seams are one key per capability, not one per module. `ctx.web` covers search *and* fetch — two operations sharing no schema — deliberately, for "one provider-selection policy owner, one abort/error vocabulary, and one product-facing config surface." Four `ctx.halo*` keys would import registration-order, disposal and HMR problems for one feature with one policy owner.

**Why LM Studio observation starts inside the service.** It becomes its own provider package when a second runtime or observation source creates a real boundary. Not before.

---

## 4. Authority order

1. Explicit operator picker selection or session pin — absolute.
2. Required capability and operator policy constraints.
3. Current execution-profile qualification.
4. Deterministic policy recommendation.
5. **In release 0.1.0, nothing below rank 1 can act.** The recorder observes; the policy provider recommends; DSH selects exactly as it does today.

---

## 5. The seam: `ctx.haloRouting`

```ts
registerPolicy(policy: RoutingPolicy): Disposable   // effect-scoped, disposed with the fiber
listPolicies(): PolicyInfo[]
observe(observation: RouteObservation): Promise<void>
recommend(workload: Workload): Promise<Recommendation | null>
recordOutcome(outcome: Outcome): Promise<void>
```

Asynchronous by signature. Persistence and any LM Studio census read are I/O, and synchronous signatures would either force blocking I/O inside `agent/request` or hide failures behind fire-and-forget. A synchronous fast path for `recommend()` is permitted later if profiling asks for it; persistence stays queued and failure-isolated either way.

Events: `halo-routing/policy-added`, `halo-routing/policy-removed`, `halo-routing/observation`, `halo-routing/recommendation`. Consumers re-read rather than assume load order — Cordis mounts concurrently, and configuration order does not prove registration order.

**Two rules the service must not get wrong:**

- **Never throw from the `agent/request` listener.** A waterfall listener that throws ends the turn — plugin failure ends the current turn, not the loop. The listener always `return next()`, on every path, including when observation fails. Wrap the whole body.
- **`recordOutcome()` accepts quality evidence only with a verifier receipt.** The outcome must carry a valid, independently produced verifier receipt identity linked to an existing `observationId`. A model's self-report may be stored as narrative telemetry, never as success evidence. Writing this into the service rather than the caller stops a later implementation from passing arbitrary model output in merely because the method exists.
- **Fail open.** `if (!policies.length) return next()`. No policy, all disposed, or every candidate rejected means ordinary DSH selection, silently. In release 0.1.0 this is nearly moot since nothing acts; it is one line now so it is already correct when something does.

---

## 6. Execution profile

The identity qualification and evidence bind to. A friendly model name is not an execution profile: the same name at Q4_K_S versus Q4_K_M, 8K versus 32K, `parallel=1` versus `4`, or reasoning on versus off is a different qualified thing.

Three lineages hash this, and each generation dropped fields: devharmonics-v1 twelve, codex-factory eight, current DevHarmonics five — and the current LM Studio lane hardcodes `runtimeVersion: "unknown"` at `fleet.mjs:134` and `:150` with no digest, collapsing the hash to roughly `candidateId + tier + harness`. Restoring this is a correctness fix to an admission gate DevHarmonics already relies on, independent of DSH routing.

**Candidate universe.** Candidates come from DSH's complete provider/model registry via `ctx.llm`, not from LM Studio, currently resident models, or the tuned pair. LM Studio observation *enriches* local candidates with runtime facts; existing DSH adapters remain responsible for Claude, Codex, and every other non-LM-Studio execution path. A candidate with no LM Studio enrichment is still a candidate.

Candidate fields, subject to the census in step 2:

```
providerId · endpointIdentity · transport
modelId · modelFile · modelDigest · quantization
runtimeName · runtimeVersion · adapterName · adapterVersion
contextWindow · reasoningMode · parallelSlots
promptTemplate · toolProtocol · toolSchemaVersion
kvCacheType · flashAttention · speculativeMode
loadConfigDigest · harnessVersion · fixtureVersion
```

`unknown` is a real value, distinct from absent: a later-known runtime version must invalidate an earlier qualification. But a field that is *permanently* unknown is noise — the census decides which fields ship in 0.1.0.

---

## 7. Phase 0 — seam and authority spike

Disposable plugin, development profile, no production changes. Answer, with a receipt:

1. What does `agent/request` receive when the operator has selected a named model, versus a resolved default? Is the pair populated?
2. Can a listener distinguish an explicit pin from a resolved default?
3. Can a plugin observe without affecting the route? Acceptance: a deliberately throwing policy provider leaves the turn intact.
4. What reaches the listener when no policy is registered?
5. **Trace the gated-worker path.** How is the `subagent_coder` model actually selected — `halo-verified-coder` config, `SubagentStartRequest.agentOptions`, the continuable descriptor — and does a child agent's own `agent/request` fire with the pair already populated by the parent? This is the same authority question with a different caller, and the answer may differ.
6. Can a compact record reference survive restart, replay and compaction?
7. **Can a host-only `sessionProjections` unit provide the compact, replay-safe per-session routing summary while the canonical append-only observations stay in plugin storage?** Not whether projections can replace the ledger — the published contract says they cannot.

**Question 5 sets release 0.1.0's scope.** If consulting `ctx.haloRouting` from the worker path is a small optional call, include worker recommendations. If it needs invasive change, record that the gated worker stays explicitly configured and defer worker routing. Either way, state exactly what release 0.1.0 covers. A thirty-minute scope answer, not an architecture program.

Stop and amend this document if the seam does not behave as assumed. Everything below is downstream of Phase 0.

---

## 8. Steps

### Step 1 — Phase 0

Above. Reconcile findings into specification revision 0.3 before implementing the two target plugins beyond the disposable spike.

### Step 2 — Fingerprint, in two halves

**2a. Observability census.** For each candidate field, establish where the value actually comes from: LM Studio REST, `lms` CLI, `model.yaml`, engine log, DSH `resolveModelInfo()`, or unavailable. Record the read cost and refresh semantics. **Fields that prove unreadable are dropped from 0.1.0, not shipped as permanent `unknown`.**

This is the half that can fail. A hash test passes whether or not the observer can read the value.

**2b. Hash and mutation tests.** Stable canonical serialization; SHA-256. Every shipped field, changed, produces a different fingerprint. Restarting LM Studio and reloading the same alias with unchanged configuration produces an **identical** fingerprint — the inverse test matters as much as the forward one, or the gate churns and gets disabled.

Run mutation tests against **synthesized profile objects**. Nothing in this step touches production load settings.

### Step 3 — Observe and record

Mount `dsh-halo-routing`. It records, per turn:

- actual provider/model selected, and whether explicit or default
- exact execution fingerprint
- role and workload signals available from DSH
- timing and token data already available from `dsh-token-meter`
- verifier receipt later, when one exists

**Observe root turns in all cases. Observe subagent turns only if Phase 0 question 5 proves the seam exposes them with a stable parent/child correlation** — otherwise record the limitation and keep the gated worker explicitly configured.

This matters because verifier receipts come from gated worker runs: if the recorder only sees root-conversation turns, step 5 reviews recommendations with no outcomes attached, and the review falls back to judging plausibility rather than results. That fallback is legitimate at this scale — you reading an explanation and saying "yes, that is what I would have picked" is real evidence — but decide knowingly which one you are relying on. This specification must not require a mechanism Phase 0 exists to discover.

Every record carries `observationId`, `sessionId`, `turnId`, parent/child identifier where available, timestamp, a monotonic sequence number, and the actual execution-profile fingerprint — without these a later verifier receipt cannot be reliably joined to the route it belongs to. Recommendation records additionally carry `recommendationId`, policy provider id, policy provider version, and a policy configuration digest, so "why did it recommend this?" stays answerable after the policy changes.

**A repeated `observationId` is a no-op.** HMR remount, a replayed turn, or a retry can re-record the same observation; the store deduplicates rather than accumulating.

**No prompt content in records.** Workload classification records labels — role, task kind, risk class, context class — never prompt text or tool arguments. The store is a plugin-owned file outside the session log's handling, and it must not become a second transcript.

**The canonical ledger is plugin storage, not a session projection.** `ctx.sessionProjections` drives units *over committed session events* and computes "read models of already-logged session state" — it has no independent durable write path, so using it as the ledger would mean putting full records into the session log first, which is the coupling this design exists to avoid. It also warns that every tail page carries every client-visible key, "acceptable while values are UI-scale whole states."

Records are therefore append-only over `ctx.storage`. **Verify what `ctx.storage` actually guarantees before relying on it** — if it is a key-value abstraction rather than an append log, the plugin implements append-only semantics over it and says so, rather than claiming a property the seam does not provide. A compact reference may go in the session as a projection unit, and that reference is replay- and compaction-tested even though retention and dangling-reference machinery are deferred; the historical session-unload failure justifies that one small test.

If a projection unit is used, it should be **host-only**, not client-visible — the same plane `dsh-token-meter` sits on, and for the same documented reason: a unit whose empty value is indistinguishable from a real one belongs on the host plane. Host-only also keeps it out of the tail page.

Host-only changes who can read a projection and what it costs to carry. It does **not** change what a projection is: still a fold over committed session events, still not an independent durable write path. The division is therefore:

| Layer | Holds |
|---|---|
| Plugin storage | Canonical append-only observation, recommendation and outcome records |
| Host-only projection | At most a compact current per-session routing summary |
| Session log | Only the minimum event or reference needed to derive that summary — never the analytics ledger |
| Browser / tail page | Nothing in 0.1.0; the UI is deferred | Full analytics never enter the session log — that is the failure that made sessions unloadable in another plugin lineage.

Changes nothing.

### Step 4 — Deterministic recommendation

Mount `dsh-halo-policy-deterministic`, porting the maintained deterministic logic: qualification and benchmark gating, role and tier fit, local-first preference, LM Studio state.

LM Studio state may appear in a shadow recommendation and its explanation. No model load, unload, residency change, or route switch is authorized in release 0.1.0.

For each observed route, record: actual selection · recommended selection · accepted candidates · rejected candidates with reasons · a plain-language "why this model."

**Cold start.** No qualification records exist yet — the harnesses have never run against the current pair. Treat *unqualified* as *unknown and non-gating* while in shadow, and say so in the explanation: "would pick X; X has never been qualified for this role." An honest recommendation with a caveat is more useful than silence, and it tells you whether wiring up qualification is worth doing at all. The alternative — run the harnesses once against the resident pair — is also acceptable, and more expensive.

**This rule is shadow-only and must not survive into any future automatic mode.** Treating unqualified as non-gating is safe when nothing acts on the recommendation; it is exactly wrong once something does.

Still changes nothing.

### Step 5 — Read the records

After a reasonable number of real tasks — not a statistical threshold — decide:

- are the recommendations useful?
- does gated-worker routing matter now?
- is v1 adaptive scoring worth porting?
- should any narrow automatic behavior be designed?

There is no promotion machinery until something is proposed for promotion.

---

## 8a. Reuse ledger — evaluate later, do not install now

None of these are dependencies of release 0.1.0. Recorded so the work is not reinvented, and so nobody re-litigates a rejection.

| Candidate | npm coordinate | Version | DSH peer generation | Role and standing |
|---|---|---|---|---|
| Reference implementation | `dsh-model-router` (`tianji-qingtian`) | 0.9.4 | `0.1.1-rc.2` ‖ `0.1.2-rc.1` | Demonstrates `agent/request`, `agent/pre-step` and `sessionProjections` on this exact build. **Inspect the committed JavaScript** for hook shapes, projection registration and lifecycle. **Do not run it in the Phase 0 measurement profile** — it classifies turns, can make an extra classifier call, can reject a step and answer itself, and writes synthetic envelopes into the session log, so it would contaminate what Phase 0 measures. A separate throwaway profile with routing disabled is acceptable. Reduces Phase 0 coding; does not replace the Halo observer. |
| Advisory review (A) | `dsh-advisor` (`omdsh-dev`) | 0.3.1 | `^0.1.2-rc.1` — **blocked** | The more developed of the two: asynchronous per session, stepped and agentic sessions, `nit`/`concern`/`blocker` severities, `inject` for minor advice and `steer` for material concerns, bounded backlog and cooldown, settings UI. Advisory only; cannot verify claims. |
| Advisory review (B) | `@slhssb/dsh-advisor` | 0.2.0 | `^0.1.0-rc.6` | The simpler implementation: watches tool results, reviews before the next model step, injects an advisory message, fails open, lightweight fake-based smoke validation only. |
| Future failover owner | `dsh-llm-fallbacks` (`omdsh-dev`) | 0.4.1 | `^0.1.2-rc.1`, cordis `^4.0.2` — **blocked** | When cross-provider recovery is introduced, this is the preferred owner rather than reimplementing cooldown, quota, retry exhaustion or fallback walks. |

**On both advisors.** Neither belongs in 0.1.0. They differ enough in design that "evaluate `dsh-advisor` later" is ambiguous — any future document names the exact npm coordinate, repository, version, commit and intended role. And neither is the verifier: both are advisory and **fail open** on timeout or reviewer error, which is correct for advice and disqualifying for an acceptance gate. Halo Verified Coder remains the only acceptance authority.

**On failover.** Do not preselect either the latest release or an older line. At implementation time, audit and pin an exact version tested against Halo's DSH build.

**One unblock trigger, not several.** `omdsh-dev` publishes both `dsh-advisor@0.3.1` and `dsh-llm-fallbacks@0.4.1`, and both peer `^0.1.2-rc.1` against `@deepseek-ai/dsh` still published at `0.1.1-rc.2` — they are built against DSH master, not the published release. If DSH ships `0.1.2`, both unblock at once. Revisit this ledger on that event rather than polling the candidates individually.

---

## 9. Out of scope for release 0.1.0

Automatic route changes of any kind · adaptive/empirical scoring · promotion rules · a UI or Mission Control panel · retention and pruning · a shared library · a preset package · residency-driven switching decisions · cross-provider failover · any change to sandbox, filesystem, network, tool or model permissions.

**Capability preservation is a hard rule, not a deferral.** This plugin observes routing. It must never narrow the access Scott assigned to a route, remove tools, impose an approval gate, or substitute a read-only path.

---

## 10. Provenance — pin before extracting

Specification revision 0.1 listed several DevHarmonics findings as "verified from inspected source" without recording where they were read from. Establish reproducible provenance before porting any logic.

| Source | Reproducible extraction state |
|---|---|
| DSH upstream | Clean at `a040de5b778c6a7efdb866fd383fce63c555a27f` |
| `DevHarmonics` | HEAD `ee369b4eca02e22f5279fac5985fe124a79cde78`. `scripts/fleet.mjs` and `scripts/qualify.mjs` are content-identical to HEAD. `docs/ARCHITECTURE.md`, `docs/SPEC.md` and `docs/USER_MANUAL.md` contain uncommitted content. |
| `devharmonics-v1` | Clean at `0599ef79b5adf350d5ea8d5040551b27bb1d0987`. Extract cited source from that commit. |
| `codex-factory` | No local checkout found under `Desktop\Code`. Pin a remote commit before extraction. |

**Do not mutate the source repositories.** Extract content-clean source from pinned commits. If an uncommitted document is intentionally used, snapshot it, hash it, identify its ownership, and label it as working-tree source.

**The caveat points at the documentation, not the code.** The source findings — the fingerprint field comparison, `selectCandidate`'s scoring expression, `resources.ts` not being wired to routing — rest on content matching committed HEAD in both repos. What carries uncommitted changes is `ARCHITECTURE.md`, `SPEC.md` and `USER_MANUAL.md`, and those are precisely the files the "current DevHarmonics deliberately retired the adaptive optimizer" narrative is built on. Re-read those three against their published versions before that narrative decides whether v1's adaptive layer is revived.

All three Halo lineages are Apache-2.0; DSH is MIT. Record license notices for any extracted fragment.

---

## 11. Evidence record

Enough for another agent to reproduce and audit, and no more:

1. exact DSH and source commits, with dirty/clean status
2. Phase 0 findings and receipt
3. fingerprint observability census
4. fingerprint mutation-test results, both directions
5. plugin test output
6. a sample shadow record
7. disable/unmount instructions and known limitations

Claims distinguish: source-present · unit-tested · integration-tested · live-model-tested · verifier-linked · operator-accepted.

---

## 12. Rollback

Unmount the plugins. Sessions must remain loadable with the plugins absent — that is a test, not an assumption. The production Halo profile is not touched at any point in release 0.1.0.

---

## 13. Open questions

**Blocking Phase 0 write-up:** all six Phase 0 questions, especially the gated-worker path.

**Blocking step 4:** which verifier receipt identity binds an outcome to a decision.

**Non-blocking:** whether `unqualified = non-gating` or a one-time harness run is the better cold start; whether the record store is JSONL with a SQLite projection or SQLite with an exportable event table; whether DevHarmonics ever consumes anything built here.

---

## 14. Approval states

**Proposed** → **Approved for development** (Scott authorizes a separate DSH development profile) → **Phase 0 reconciled** (v0.3) → **Shadow running** → **Reviewed** (step 5).

Nothing beyond shadow is authorized by this document.

---

## 15. Review status

Architecture, scope, package shape and implementation sequence are agreed. Eight review points from revision 0.2 are incorporated in §1, §6, §7, §8 and §8a.

Open for this review round:

1. Is §8a's rejection reasoning sufficient, or does any parked candidate deserve re-examination?
2. Is the four-layer storage division in §8 correct against DSH's published projection contract?
3. Does §6's candidate-universe rule survive contact with an implementer who starts from LM Studio because that is where the interesting fields are?
4. Are the seven Phase 0 questions the right seven, and is any of them unanswerable as posed?
5. Does anything in §9's out-of-scope list belong in 0.1.0 after all, or vice versa?

Unresolved by design, and owned by Phase 0: whether `agent/request` can distinguish an explicit pin from a resolved default; how the gated worker's model is actually selected; which execution-profile fields are observable; whether a host-only projection is the right home for the compact summary.
