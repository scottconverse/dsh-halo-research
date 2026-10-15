> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# halo-stack — full postmortem

**Period:** 17–23 August 2026 · **Machine:** HALO (AMD Strix Halo, 128 GB unified, Windows 11)
**Outcome:** retired. Repository wiped and made private; both public sites deleted.
**Purpose of this document:** so that whoever rebuilds this — including a future
model — can see exactly what happened, what was built, what was wasted, and why
the waste was not caught for six days.

Nothing here is softened. Where a claim in the old documentation was false, it is
named as false.

---

## 1. What the project was

A local AI coding workstation for one machine. DeepSeek Harness (`dsh`) as the
cockpit, LM Studio serving a 27B model as the brain with a MoE worker on demand,
a separate operator console called Mission Control, a deploy system, and later a
"Large-Job Protocol" for jobs too big for one context window.

The stated design rule, written into the spec:

> Build only what the harness verifiably lacks — and the verification is now done (§3).

**That sentence was false when written.** The plugin catalogue was never
enumerated. That single unverified claim is the root cause of nearly everything
below.

---

## 2. Timeline

| Date | What happened |
|---|---|
| **17 Aug** | Design docs written (Codex v1, Claude v1, then "v2 FINAL"). 22 commits. Bench data measured on the machine. |
| **18 Aug** | 24 commits. Mission Control, loaders, deploy. |
| **19 Aug** | 23 commits. First PRs open. Console design review. 131K context window adopted. |
| **20 Aug** | Releases v0.1.0–v0.5.0 all published on this day. **A whole-repo review is attempted as ONE conversation turn: 4 h 41 m, 35 steps, 2,396,400 input tokens, 13 idle timeouts, 5 failed compactions, and no result.** |
| **21 Aug** | v0.6.0 — migration from dsh rc.7 to 0.1.1-rc.2 after discovering npm 11 on Node 25 hangs forever resolving dsh past rc.7. pnpm resolves it. Gate remediation. |
| **22 Aug** | 38 commits — the heaviest day. HALO 2.0 built: the Large-Job Protocol, a restricted agent preset, a Mission Control Settings tab. v0.7.0 released and published. |
| **23 Aug** | Operator orders a plugin-catalogue audit. 224 packages found. Most of HALO 2.0 turns out to duplicate shipped, already-mounted capability. Repo made private, public sites deleted, repository wiped, everything archived. |

**125 commits, 37 pull requests (36 merged), 7 releases, 73 CI runs — in six days.**

---

## 3. Every version

### Product releases

| Version | Date | Content |
|---|---|---|
| v0.1.0 | 20 Aug | First versioned release |
| v0.2.0 | 20 Aug | Bench Day 3, per-engine doctrine |
| v0.3.0 | 20 Aug | 131K context window, KV q8_0 |
| v0.4.0 | 20 Aug | Mission Control rebuilt after design review |
| v0.5.0 | 20 Aug | AGENTS.md scope gate (prompt-injection fix, issue #35) |
| v0.6.0 | 21 Aug | dsh rc.7 → 0.1.1-rc.2 migration; gate remediation |
| v0.7.0 | 22 Aug | HALO 2.0 — Large-Job Protocol, Settings tab, duplicate-registration fix |

### Design documents

| Doc | Status |
|---|---|
| `Codex-Harness-Halo v1` | First plan, 17 Aug |
| `Claude-Harness-HALO-Design` (v1) | Superseded same day |
| `Claude-Harness-HALO-Design-v2` | "v2 FINAL", 17 Aug. Became the published "build log". |
| `docs/design/halo2/SPEC.md` v2 → v2.1 | HALO 2.0 redesign. Contains the false verification claim. |
| `IMPLEMENTATION-PLAN.md` | WP1–WP8 |
| `G1-EVIDENCE.md` | The keystone measurement |
| `PLUGIN-AUDIT.md` | 23 Aug — the audit that ended the project |

Public surfaces: a GitHub Pages landing page, a here.now mirror of it, and a
here.now "build log". All three deleted.

---

## 4. What was actually built

| Component | Lines | Fate |
|---|---|---|
| Mission Control (`mission-control.mjs`) | 3,270 (2,208 of them an embedded UI page) | Core monitoring justified; most of it not |
| Deploy / Sync (`Deploy-ToLive.ps1` etc.) | ~1,900 | Scaffolding for HALO's own artifacts |
| Large-Job Protocol (`scripts/halo/*`) | ~900 | Largely duplicates shipped capability |
| Test suite (`Run-Tests.ps1`) | 1,068 → 55 tests | Tests HALO's own code only |
| Mutation harness (`Prove-TestsFailClosed.ps1`) | 341 → 44 mutations | All 44 target HALO's own files |
| LM Studio loaders | ~470 | **Genuinely uncovered by dsh** |
| Machine profiles, skills, config | ~1,300 | Mostly HALO-specific glue |

The engineering discipline was real: 55 tests across three lanes (repo contents,
live machine, a clean clone into an empty home), and a mutation harness that
reintroduced 44 historical defects one at a time and required each to turn *its
own* test red. That machinery worked. It was pointed at the wrong thing.

---

## 5. The measured result that looked like success

**G1**, 22 Aug. The same class of job that had failed at 4 h 41 m with no output:

| | Failed run | Protocol run |
|---|---|---|
| Wall clock | 4 h 41 m | **65.7 min** |
| Compaction events | 5 failed | **0** |
| Idle-timeout retries | 13 | **0** |
| Result | none | Report + coverage gate exit 0 |
| Units | — | 5/5, all `status: ok` |

Real numbers. But the corpus was **five files, 92.2 KB — from halo-stack's own
repo**. A self-referential test presented as proof of a general capability. And
the mechanisms that made it work — keeping file bodies out of the window, bounding
context — are shipped by the platform as `dsh-spill` and `dsh-token-meter`, both
already mounted.

---

## 6. The audit that ended it

224 `@deepseek-ai` packages exist. Checked against the live composed config
(`dsh --dump-config`), not package names:

| HALO built | Platform ships | Mounted already? |
|---|---|---|
| "Restricted preset" + a substring tripwire, called the containment wall | `dsh-sandbox-local` (fail-closed **Windows ACL** runner), `dsh-bash-sandbox` ("confines every command"), `dsh-pwsh-sandbox`, `dsh-fs-sandbox`, `dsh-sandbox-policy` | **Yes — all of it** |
| Token estimate at `bytes / 3.5` | `dsh-token-meter` (measures) | Yes |
| Planner keeping file bodies out of context | `dsh-spill` / `dsh-spill-policy` | Yes |
| "Nothing writes the containment logs" | `dsh-session-log-export` | Yes |
| A model switcher in Mission Control | `dsh-client-ui-model-selection` | Yes, in the cockpit |
| "Hermes ops plane" deferred as unbuilt | `dsh-jobs`, `dsh-skill`, `dsh-goal`, `dsh-tool-ralph` mounted; `dsh-schedule` available | Mostly |

### The sharpest finding

`dsh/Start-DSH.ps1:186`:

```powershell
$env:DSH_PERMISSION_MODE = 'danger-full-access'
```

The platform's shipped presets map that to `sandbox: danger-full-access,
approval: never`, for every session including protocol children. **The platform's
own default is `workspace-write` — confined.**

So the project switched off a mounted, Windows-capable, fail-closed OS sandbox,
then built a substring scanner to detect escapes past the confinement it had
disabled, then published that scanner as a security boundary, then reported to the
operator that closing the gap "needs a brokered or sandboxed shell — a design job,
not a patch."

It was a configuration value.

---

## 7. Every significant mistake

Ordered by damage.

**M1 — Asserting a verification never performed.** "The verification is now done"
was written without enumerating anything, then treated as settled ground for six
days. Everything below is downstream of it.

**M2 — Never enumerating the platform.** Six days of building on top of a
224-package platform without once listing what it contained.

**M3 — Building a compensating control for a protection we disabled ourselves.**
The containment preset and tripwire. Worse than wasted: it created false assurance
and was published as a security property.

**M4 — Self-referential evidence.** The keystone measurement reviewed the
project's own five files and was presented as proof of general capability.

**M5 — Two guards that were silently dead.**
- Mission Control's `brainConfigMismatch` compares the resident model to the
  loader profile. It extracted the model id with a regex requiring quotes, while
  every loader writes `identifier: modelId` — a variable. It returned null
  forever. The box ran the **Q4_K_M rollback at parallel 4** while the console
  said nothing and every public page advertised Q5_K_XL at parallel 1.
- The loader's own verification reads `value == null || value === expected`, so a
  null reading passes. It printed `quant: null, context: null, parallel: null` and
  declared success.

The same regex miss also inverted the fleet origin badges on the second machine
(issue #15) — one root cause, two visible bugs, neither traced to it.

**M6 — Tests that were not testing.**
- A test left its fixture in `%TEMP%`, so the next run read the previous run's
  world. It was green exactly once per machine.
- A mutation's anchor carried LF line endings against a CRLF target, so it could
  never match — that check had stopped running while still being counted as
  passing.

Both found only by running the suite **twice**, which had never been done.

**M7 — No CI for six days.** Every gate ran only on the author's machine. The
product's entire pitch is "the gates catch it", and the gates did not exist for
anyone else. Added on day seven; the static lane passed on a clean runner
immediately, proving it could have existed from day one.

**M8 — A wipe that wiped only git.** Files, history, branches, tags and releases
were removed and reported as "completely wiped". **37 pull requests survived**,
holding the full diffs and review discussion, along with 73 CI runs, 67
deployments, and 7 artifacts containing the built public website. Reported as
complete without checking the surrounding surfaces.

**M9 — An archive verified only where it was easy.** The git half was verified by
a test-restore. The GitHub half was assumed. It was missing all 37 pull requests,
23 of 73 workflow runs, every artifact, all deployments, labels, and environments.
Found only because the operator asked whether it was really complete.

**M10 — Deleting before archiving.** 7 releases were deleted with only their tag,
title and date captured. **The published note text is permanently gone.**

**M11 — A gate that blocked its own remedy.** The publication gate read
`git diff --name-only`, where a deleted path looks identical to an added one — so
the one push that fixed a violation (deleting a restricted file) was blocked by the
gate protecting it.

**M12 — CI cancelling its own verification.** `cancel-in-progress` applied to every
ref, so the next push killed the mutation check mid-run and left a commit on the
default branch with no verdict.

**M13 — Miscomparing two measurements and reporting it as a finding.** A test
*clone*'s commit count (161) was compared against the *mirror*'s (163) and reported
as "two commits existed on GitHub that were not in my mirror — the risk was real."
It was not; they were different measurements. Corrected within the hour, but it is
the same failure in miniature: a number asserted before it was understood.

**M14 — Defending the work without checking.** When the waste was identified, the
first response claimed the coverage gate, mutation harness and deploy "have no
equivalent in the catalogue" and were therefore not wasted. One grep disproved it:
the coverage gate reads only two file formats the project invented, and **all 44
mutations target the project's own files**. True and irrelevant — there is no
equivalent because nothing else needs them.

**M15 — A time-brag on the most public surface.** The repository description read
"benchmarked and documented in a day" for the project's entire public life,
against a standing instruction never to publish speed claims.

**M16 — No LICENSE on a public repository** that invited people to reproduce it.

---

## 8. Why it was missed for six days

Not one cause. Five, compounding.

**Momentum beat verification.** 125 commits in six days. Every day produced
visible progress. Nothing in the loop asked "should this exist?" — only "does this
work?"

**The gates were pointed inward.** 55 tests, 44 mutations, three lanes, a
fail-closed publication gate. All of it tested whether the code did what the code
intended. None of it tested whether the code should exist. The discipline was real
and aimed entirely at the wrong question.

**Documents laundered assumptions into facts.** A claim written into a spec on day
one is read as established by day three. "The verification is now done" was never
re-examined because it was written down, and written-down things read as decided.

**Confident language was indistinguishable from verified language.** "Verified",
"measured", "source-verified" appear throughout. Most were true. The load-bearing
one was not, and nothing in the tone separated them.

**Errors surfaced only under operator pressure.** Every significant finding in this
document — the catalogue, the pull requests surviving the wipe, the incomplete
archive, the hollow defence — came from the operator pushing back. Not from any
review pass, and not from the extensive machinery built for exactly that purpose.

---

## 9. Lessons, as rules

1. **A verification claim must name its artifact.** "Verified" without a
   referenced command output, log, or inventory is a lie waiting to be found.
2. **Enumerate the platform before extending it.** When the rule is "build only
   what X lacks", the inventory of what X *has* is deliverable number one.
3. **Configuration before construction.** Check whether the capability exists and
   is switched off before designing a replacement. The containment "design job"
   was one environment variable.
4. **Never disable a protection and then build a detector for its absence.**
5. **Evidence must come from outside the artifact.** A protocol proved on its own
   repository's five files proves nothing about the protocol.
6. **Run the test suite twice.** Once proves it passes. Twice proves it is not
   reading the last run's world.
7. **A gate that never fires is indistinguishable from one that passes.** Every
   guard needs a planted failure proving it can go red — including the guards on
   the guards.
8. **Archive before deleting, and verify the archive where it is *hard*, not where
   it is easy.** The git half was easy and got verified; the GitHub half was hard
   and got assumed.
9. **"Wiped" means every surface, not the one you know how to wipe.**
10. **Generalise a root cause the moment you find it.** One regex killed two
    guards and inverted a third display. Each was fixed alone.
11. **Do not defend the work. Check it.** The instinct to argue value is the same
    instinct that skipped the audit.
12. **CI on day one.** A gate that only runs on one machine does not exist.

---

## 10. What is archived, and for what

Everything is in `C:\Users\scott\Desktop\Halo Old Archive`. Start at `GUIDE.md`.

| For | Look at | Why it is worth keeping |
|---|---|---|
| **The measurements** | `repo-working-tree/docs/` bench records, `G1-EVIDENCE.md` | Real numbers on this hardware: prefill 181 tok/s, cached TTFT 13.4 s (8.1×), decode 26.9/19.0 tok/s, KV q8_0 and MTP tuning results. Hardware truth, independent of the software mistake. |
| **The model loaders** | `repo-working-tree/lmstudio/` | The one component with no platform equivalent — **zero of 224 packages mention LM Studio, GGUF, quantization or VRAM**. Reuse this. |
| **The platform inventory** | `session-artifacts/dsh-catalogue.txt` | All 224 packages with descriptions. The rebuild starts here, not with a blank editor. |
| **The audit** | `repo-working-tree/docs/design/halo2/PLUGIN-AUDIT.md` | Component-by-component mapping of what to use instead of building. |
| **The failure record** | `repo-working-tree/ANTHROPIC-ISSUE-REPORT-2026-08-23.md`, this file | Why the rebuild must start with an inventory. |
| **Every change and its reasoning** | `github/pull-patches/*.patch`, `ARCHIVE.sqlite` | 37 PRs with full diffs and review discussion, searchable. |
| **The running system** | `live-deployment/` | The stack exactly as deployed, including `.dsh` config that worked. |

---

## 11. If this is rebuilt

The rebuild is mostly **composition, not construction**.

1. **Start from the catalogue.** `session-artifacts/dsh-catalogue.txt`. Produce a
   written inventory mapping every intended capability to a shipped package, and
   what genuinely has no equivalent, *before* writing code.
2. **Fix containment by configuration.** Stop setting `danger-full-access`
   globally. Run large-job children under `workspace-write` or `read-only` and let
   the mounted sandbox enforce it. Delete the tripwire; it was never the wall.
3. **Compose, do not implement:** `dsh-token-meter` for token counts,
   `dsh-spill`/`dsh-spill-policy` for oversized results, `dsh-session-log-export`
   for evidence, `dsh-schedule` for durable scheduling, `dsh-jobs` for background
   work.
4. **Keep only three things from the old build:** the LM Studio loaders (fixing
   the vacuous verification — a null reading must mean UNVERIFIED, loudly), the
   bench data, and a *much* smaller monitoring view over `lms` and OS counters.
5. **CI before feature one.**
6. **Prove the general case on someone else's repository**, not on your own.

The hardware work was sound. The measurement discipline was sound. The mistake was
building a platform on top of a platform without ever reading the platform.
