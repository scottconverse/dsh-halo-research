> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Stage 3 joint design review — VERDICT: APPROVE WITH AMENDMENTS

**Reviewer:** Claude (Opus 5), 2026-08-27
**Reviewed:** `HALO-STAGE-3-DSH-NATIVE-GATE-DESIGN-v1.0.md`
SHA-256 `CFC5F6AE8908B09AE2E3A952CD985D4C96B956B3C77E8CC1C0D587565653BC13`
(confirmed identical in the Research folder and the canonical stack folder).
**Status:** this is a co-review before implementation, per the agreed contract.
Two amendments are blocking. Neither touches the five invariants.

---

## 1. Design-only claim: verified

- Live `settings.yaml` hash is still `ad034219aa2445558ff1818d19e2aeadd221b15ced6a41e212e008250fd266c9`,
  unchanged from Stage 2.
- `lms ps --json` returns `[]`.
- The LM Studio log shows **no model load after 14:57** — Stage 2's. Nothing
  was loaded for this design pass.

## 2. The design's load-bearing source claims — I checked them myself

The whole case for modifying DSH core rests on a handful of source citations.
A wrong one would mean unnecessary scope, so I read them rather than accept them.

**Revision matches.** `_upstream/deepseek-harness` HEAD is
`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`, `package.json` version
`0.1.1-rc.2` — exactly as the design states.

**No per-delegation narrower sandbox: CONFIRMED.**
`packages/subagent/subagent/src/child-agent.ts` defines
`DelegatedPolicyOverrides` with exactly two fields, and

```ts
export function captureDelegatedPolicyOverrides(parent: Agent): DelegatedPolicyOverrides {
  return {
    sandboxMode: parent.ctx.get('sandboxPolicy')?.overrideOf(parent.session),
    approvalPolicy: parent.ctx.get('approval') === undefined ? undefined : 'never',
  }
}
```

There is no parameter by which a caller could request a narrower child mode.
The function's own doc comment ("Call synchronously before the child start's
first await") independently supports the race argument. The extension is
genuinely required; this is not invented scope.

**Monotonic guard: CONFIRMED.** In `packages/core/tools/src/index.ts` the
scheduler computes

```ts
const denialReason = decision.kind === 'allow' ? this.guardReason(exec) : decision.reason
```

after the `tools/pre-execute` waterfall resolves. A guard denial therefore
survives a listener that returned `allow`. `update_goal complete` can be denied
monotonically, as the design claims.

**Effective-mode resolution: CONFIRMED and consequential.**
`packages/sandbox/sandbox-policy/src/index.ts:138` resolves

```ts
mode: request.mode ?? (session === undefined ? undefined : this.overrideOf(session)) ?? this.defaultMode
```

This confirms the design's "same or narrower than the parent's *effective*
policy" wording is the right wording — and see finding C1 for why it must be
implemented literally.

## 3. What this design gets right, recorded so it is not lost

- **It refused to build to the letter of the contract.** The agreed wording
  described a post-result guard. Codex established from source that a
  `tools/post-execute` listener cannot un-happen filesystem writes a
  full-access worker already made, and said so instead of shipping a gate that
  would have looked correct and contained nothing. That is the single most
  valuable thing in the document.
- Invariant 2 is honoured mechanically: protected authority lives outside the
  worker-writable root, and §9.3 builds the verification worktree from
  gate-owned baseline bytes — the worker's copies are never authoritative.
- §9.4 explicitly distinguishes gate-owned promotion rollback from the
  prohibited "restore tests from hashes", and explains why. Correct.
- Verifier crash, timeout, command-not-found, malformed verdict, and
  exit/verdict disagreement are all FAIL. Empty suite is FAIL.
- It refuses to reuse `verify-generic.ps1` as the authority and names the exact
  reason — `cmd /c` command strings and text `RESULT:` parsing — with test #14
  dedicated to the PowerShell information-stream capture failure that produced
  empty feedback files for an entire day on 08-25. The seam that burned us has
  its own test.
- Two-round cap, seal-before-retry, `SPLIT_REQUIRED` on repeated identical
  failure, and no automatic third round.
- §12.3 states plainly that it cannot semantically censor assistant prose.
  §5.2 states the threat model without overclaim. Both correct.
- Mutation testing is mandatory: a check that has never rejected a seeded
  defect is not accepted. That is the "ship a gate, not a promise" rule.
- The reasoning `off/on` question is locked as a pre-Stage-5 release gate.

## 4. BLOCKING AMENDMENT 1 — the distribution gap

**The design never says how the patched DSH core reaches the running cockpit.**

`C:\Users\scott\.dsh\profiles\web\package.json` pins published packages —
`@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`,
`@deepseek-ai/dsh-subagent-claude-code`, `@deepseek-ai/dsh-subagent-codex`, all
`0.1.1-rc.2` — and `Launch-Halo.ps1` starts the service with
`pnpm dlx @deepseek-ai/dsh@0.1.1-rc.2 web`. The files the design proposes to
change (`packages/subagent/subagent/src/types.ts`, `child-agent.ts`,
`subagent-in-process-driver/src/index.ts`) ship *inside those published
bundles*, not from the local source checkout.

§7.1 correctly forbids hand-patching the installed profile. §16 step 2 says
"implement and unit-test the extension". §17 mentions restoring "the previous
installed package lock/profile if changed". §18 question 1 asks whether to
carry a patch or go upstream. But no step connects them: there is no build,
packaging, or installation path from the local source change to the live
cockpit, and no statement of what happens at the next DSH version bump.

**Required before build step 2:**
1. Name the exact mechanism (pnpm patch / a locally built and pinned bundle /
   a vendored package path) and show it survives a cockpit restart.
2. State the re-apply cost on every DSH upgrade, in plain terms, and where the
   patch is stored so a future agent finds it.
3. Add the patched-core hash to the recovery manifest and to §17 rollback.

This is not hypothetical bookkeeping. A silently-forked core that nobody
records is how a stack becomes unmaintainable, and the last DSH version
migration on this box was itself a substantial job.

## 5. BLOCKING AMENDMENT 2 — no size estimate

Standing rule 6 requires sizing every batch in hours out loud before launching,
and refusing oversized assignments. This design specifies 11 build steps, a
core patch with its own upstream-quality tests, 25 acceptance tests, and a
mutation battery across 11 check families. It states no estimate anywhere.

**Required before build step 2:** an hours estimate per build step, and an
explicit statement of which steps must run while the box is free. Steps 1-9 are
zero-inference and can run any time; steps 10-11 need the box.

## 6. Two implementation traps (not blocking, but pin tests for them)

**C1 — `overrideOf()` can legitimately be `undefined`.**
`permission-presets/src/index.ts` has two paths that behave differently:
`pinInitialPermission()` writes `sandbox/mode` unconditionally for a genuinely
fresh session, but `apply()` writes it only
`if (spec.sandbox !== (effectiveSandboxMode(events) ?? this.ctx.shell.sandboxMode))`
— i.e. it *skips* the write when the preset already equals the shell default.
So two sessions with the identical `danger-full-access` posture can present as
"override set" or "override absent" depending on how they were created.

The narrowing check must therefore compute `override ?? defaultMode`, exactly
as §6.2 point 3 says. Add a test where the parent's override is `undefined` and
its full access comes from the deployment default: a naive implementation could
read `undefined` as "no constraint to be narrower than" and permit anything.

**C2 — post-promotion verification failure is under-specified.**
§9.4 step 5 rolls back "if promotion fails"; step 6 re-runs the verifier
against the real target before issuing `PASS_PROMOTED`. It is not stated
whether a step-6 failure counts as "promotion fails". Make it explicit: a
failed post-promotion verification MUST land in
`PROMOTION_FAILED_ROLLED_BACK`, never `PASS_PROMOTED` over a red target.

## 7. Scope decision for Scott — the one real choice here

An observation that changes the cost calculation:

**Verdict integrity does not depend on the sandbox narrowing.** §9.3 builds the
verification worktree from gate-owned baseline bytes and never copies the
worker's protected files or its verifier copy. A worker that rewrites every
test in staging cannot move the verdict, at any sandbox mode. What the
narrowing adds is preventing *collateral edits to the real target* — which the
dispatch baseline and promotion compare-and-swap would otherwise **detect and
fail closed on**, rather than prevent.

Against the agreed threat model — accidental, mistaken, goal-seeking, not
malicious — detect-and-fail-closed covers most of the value.

**Option A — build as designed.** Core patch first, then the gate. True
containment: the worker is denied out-of-root writes. Cost: a DSH core fork to
maintain and re-apply on every upgrade, plus amendment 1's machinery, before
any gate value lands.

**Option B — phase it.** Build the gate first *without* the core patch:
staging worktree, gate-owned baselines, verifier, evidence, CAS promotion, goal
guard, and the full fake-worker battery. Acceptance test 9 changes from
"denied and FAIL" to "detected and FAIL". Then add the core patch as phase 2
hardening, with amendment 1 resolved properly instead of under time pressure.

**My recommendation: B.** It puts the fail-closed verdict machinery — the thing
ten days of evidence say is missing — in front of the operator sooner, keeps a
DSH core fork off the critical path, and leaves phase 2 as a clean, separately
reviewable change. The residual risk under B is a wandering worker touching the
real repo, which the gate detects and refuses to promote over.

If you choose A, the design is sound as written once amendments 1 and 2 land.

## 8. §19 checklist

| Item | Verdict |
|:--|:--|
| Post-result wrapping not mistaken for containment | **PASS** — §1 and evidence finding 2; the strongest part of the design |
| Per-child sandbox override race-free, cannot widen | **PASS with C1** — §6.2 point 3 is correct; pin the undefined-override test |
| Protected authority never in worker-writable root | **PASS** — §9.1/§9.3 |
| Dirty-target preservation and promotion CAS | **PASS** — §9.4 `STALE_TARGET` preserves user work |
| Verifier crash/timeout/capture failure fail-closed | **PASS** — §9.3, §10, tests 13-14 |
| Failure evidence sealed before retry | **PASS** — §11 |
| Two failures force split, no invisible third round | **PASS** — §11, test 23 |
| Goal completion guarded, honest-red still reportable | **PASS** — §12.2/§12.3 |
| Crash recovery cannot manufacture PASS | **PASS** — §8, test 18 |
| Every major check mutation-tested red | **PASS** — §14.5 |
| No old conductor or worker home reactivated | **PASS** — §1, §5 invariant 5, and both scripts now carry LEGACY headers |
| Reasoning `off/on` mandatory pre-Stage 5 | **PASS** — §3.1 release rule |
| *(added)* Patched core reaches the live cockpit | **FAIL** — amendment 1 |
| *(added)* Build sized in hours before launch | **FAIL** — amendment 2 |

## 9. Verdict

**APPROVE WITH AMENDMENTS.** The architecture is sound, the invariants are
honoured mechanically rather than by prose, and the source claims I could check
are all true. Two amendments block the start of build step 2: the distribution
path for the core change, and an hours estimate. Two implementation traps (C1,
C2) need pinned tests but not a redesign.

Scott's call on section 7 (A or B) determines the build order. Once that and
the two amendments are settled, implementation may begin, and I will audit each
build step's evidence drop by the same method: raw artifacts first, report
second.


## Verification ledger

VERIFIED: The in-process child has no per-delegation narrower sandbox parameter | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent\src\child-agent.ts:199
VERIFIED: Effective sandbox mode resolves as request mode, then session override, then deployment default | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\sandbox\sandbox-policy\src\index.ts:138
VERIFIED: The design document under review is the hashed 501-line v1.0 | C:\Users\scott\Desktop\Halo Stack Research\HALO-STAGE-3-DSH-NATIVE-GATE-DESIGN-v1.0.md:1
UNVERIFIED: my section 7 claim that the gate could point the worker at staging - I never read how the child's cwd is set. This is the error that produced the wrong Option B recommendation; see the addendum.
