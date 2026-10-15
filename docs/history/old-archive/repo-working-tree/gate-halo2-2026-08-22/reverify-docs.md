> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# GauntletGate RE-VERIFICATION — Technical Writer

**Repo:** halo-stack · **Branch:** `feat/halo2-wp2` (HEAD `d631d30`) vs `master` · **Date:** 2026-08-22
**Method:** re-read my original deep-dive (`03-docs.md`); re-ran every reproduction I could
without touching the shared clone destructively; ran the live suite twice
(`pwsh tests\Run-Tests.ps1`); ran the full mutation-proof suite once
(`pwsh tests\Prove-TestsFailClosed.ps1`, which self-copies to a scratch dir — never mutates
the working tree); re-ran the CURRENT `Halo-Coverage.ps1` against the real G1 run directory
with a redirected `-OutFile` (never overwrote the real `coverage.json`); hash-compared the
live deployed `Halo-Coverage.ps1` against the repo copy directly; drove the live Mission
Control at `127.0.0.1:3090` and read the real DOM via `javascript_tool`, not just the source.
Everything below states what I ran/read and quotes what I found.

---

## Severity summary (what REMAINS: new findings + still-open old ones)

| Blocker | Critical | Major | Minor | Nit |
|---|---|---|---|---|
| 0 | 1 | 4 | 2 | 0 |

Critical: N-1. Major: N-2, N-3, N-4, and the still-open M3-point-1 (stale-findings-reuse
across a different brief; see "STILL OPEN" below). Minor: N-5, N-6.

---

## CRITICAL — new, introduced by this remediation

### N-1 — SPEC.md still says a child "physically cannot" leave the machine, three bullets from its own rebuttal

`docs/design/halo2/SPEC.md:253` (§4.2.7, brought onto this branch in the SAME commit,
`0f11af8`, that claims to have removed this exact phrase everywhere):

> "**Restricted preset:** LJP children run under an agent preset that omits the external
> subagent providers ... from the child's composition. **The child physically cannot call
> them.**"

Three bullets later, same file, same section, `SPEC.md:256`:

> "**Open until probed (Q12):** whether a child can *re-enable* an omitted provider at
> runtime ... is unproven. ... until it passes, P9 is a claim, not a wall."

This is the exact Blocker language, verbatim, self-contradicted a few lines down in the same
subsection — and it landed in the branch's newly-mandatory canonical design reference (H16
now fails the suite if this file is absent, giving it official standing). A broad sweep
confirms it is the *only* unscoped survivor: `SKILL.md:108`, `map.workflow.js:51`, and
`agent.cordis.yml:5`/`Build-LjpPreset.ps1:90` all now use the correctly scoped "cannot reach
... *through the harness's own subagent tools*" language and add an explicit "what this does
NOT do" caveat. SPEC.md was not brought into that pass.

**Fix:** `SPEC.md:253` → "The child cannot call them through the harness — a shell can still
reach an already-authenticated CLI directly; see Q12."

**How to test:** `grep -in physically docs/design/halo2/SPEC.md` (currently 1 hit, line 253).

---

## MAJOR

### N-2 — G1-EVIDENCE.md's claim about what the FIXED tool reports is empirically false when re-run against its own cited artifacts

`docs/design/halo2/G1-EVIDENCE.md:85-87`:

> "(Fixed after this run: COVERAGE now also scans the findings files, knows whether it read
> anything at all, and reports `containmentVerdict: unverified-no-evidence` instead of
> implying clean.)"

I re-ran the CURRENT `scripts\halo\Halo-Coverage.ps1` against the real
`C:\Users\scott\Desktop\Code\runs\run-2e8a18ee1aa9\` (redirected `-OutFile` to my scratchpad
so the real evidence file was not touched). Observed:

```
"containmentBreached": false,
"containmentScanned": true,
"containmentSources": 5,
"containmentVerdict": "no-hits-in-scanned-output",
```

Not `unverified-no-evidence`. Cause: the fix (correctly) now scans `findings/*.json` raw text
(`Halo-Coverage.ps1:205-219`), and this run's 5 findings files exist and have real text, so
`scanSources=5` and `containmentScanned=true`. The suite's own H15 test proves the same thing
in miniature (part 1: "with no logs/ at all it must still have READ something (the
findings)"). `unverified-no-evidence` is therefore reachable only when a run has *zero*
findings files at all (e.g., every unit failed before writing) — not the scenario this run,
or almost any completed run, is actually in.

This doesn't flip the page's bottom-line "NOT VERIFIED" verdict — that holds independently
because the run used the standard preset, not `halo-ljp` (correctly disclosed two bullets
up) — but the specific mechanism claim is wrong, and it materially overstates how weak
`containmentScanned:true` actually is: it will be `true` for virtually every completed run,
scanning only raw findings-summary text for six-plus fixed substrings, which is a much
weaker signal than "we verified containment" reads as.

**Fix:** either correct the parenthetical to state what the tool actually reports for this
run's artifacts (`no-hits-in-scanned-output`, not `unverified-no-evidence`), or add a line
making explicit that `no-hits-in-scanned-output` is still a weak, textual, non-exhaustive
signal, not verification.

**How to test:** `& scripts\halo\Halo-Coverage.ps1 -RunDir C:\Users\scott\Desktop\Code\runs\run-2e8a18ee1aa9 -OutFile <scratch>\out.json` and read `containmentVerdict`.

### N-3 — Live regression: the Settings tab's own "fixed" follow-up path renders with the backslash silently eaten, contradicting this commit's own "verified live" claim

Commit `9e9ccd8` ("GauntletGate UX sweep ... **verified in the browser**") claims: "UX-8 the
success message now names the actual follow-up path, `scripts\Sync-FromLive.ps1`, and
mentions the timestamped backup." I drove the live Mission Control at `127.0.0.1:3090`,
clicked the Settings tab, and read the actual DOM node via `javascript_tool`
(`el.outerHTML`), not the extracted text:

```
"<code>scriptsSync-FromLive.ps1</code>"
```

The backslash is gone — not a text-extraction artifact, the live DOM literally reads
`scriptsSync-FromLive.ps1`, which is not a runnable path. Same bug in the post-Apply success
message (`mission-control.mjs:1404`, identical pattern). Root cause: `mission-control.mjs:1326`
writes `<code>scripts\\Sync-FromLive.ps1</code>` inside the outer `PAGE` template literal
(`mission-control.mjs:1012`). Node's own template-literal parse turns `\\` into one
backslash before the string ever reaches the browser; the browser then parses that single
backslash as inline `<script>` *source*, where `\S` is not a recognized JS string escape and
the ECMAScript NonEscapeCharacter rule silently drops the backslash. Net: two backslashes in
source survives one unescape layer, not the two it actually passes through. `git blame`
confirms this exact commit introduced the bug — the pre-fix text ("commit with
Sync-FromLive.", no path, no backslash) was correct; the fix that added the specific path is
what broke it. No test asserts on this string (`grep -rn Sync-FromLive tests/` finds nothing
checking the rendered form), which is how "verified live" missed it.

**Fix:** four backslashes in source (`scripts\\\\Sync-FromLive.ps1`) so two survive Node's
template-literal unescape (→ `\\`) and the browser's own string-literal unescape then
correctly collapses that to one (`\`).

**How to test:** load `127.0.0.1:3090` → Settings tab → inspect the `<code>` node's
`outerHTML`, or `document.querySelector('#settings-body').innerHTML` after `loadSettings()`.

### N-4 — Public claim overstates the scope of the one measured run: "the same whole-repo review" was a 5-file, 92.2 KB sample, not the repo

`site/index.html:201` / `docs/index.html:201` (byte-identical, both edited in the final
commit `d631d30`, whose stated purpose was fixing the *previous* staleness):

> "...the same whole-repo review, decomposed into small units by deterministic scripts and
> run unattended on the local model, finished in about 66 minutes..."

The G1 run's own evidence file says otherwise. `G1-EVIDENCE.md`'s own table: "Target | **5
real files, 92.2 KB** (README, USER-MANUAL, SKILL.md, two protocol scripts)." The run's own
`REPORT.md:3` confirms: "Reduced from `findings/unit-000.json` through `unit-004.json` (5
units...)" against files under a curated `halo-g1/src/` sample. The *original* 4h41m failure
this is compared against was genuinely whole-repo scale — `SPEC.md:94`: "2,396,400 input
tokens on that single turn" (≈ 90x the ~26,969 estimated tokens of the G1 sample,
`G1-EVIDENCE.md:22`). "The same ... review" asserts a scope equivalence the evidence does not
support. The sentence's own trailing hedge ("one run on one corpus, not a reliability claim")
softens but does not correct the specific false "whole-repo"/"same" framing — a reader could
easily take "one corpus" to mean "the repo," not "a hand-picked 5-file slice of it."
Notably, `docs/USER-MANUAL.md:836-837`'s parallel passage avoids this exact trap ("the job
that produced nothing in 4 h 41 m now completes ... in ~66 minutes ... records the full
result, including its limits") — the more careful phrasing existed in this same commit
batch but wasn't used on the public page.

**Fix:** replace "the same whole-repo review" with something scope-accurate, e.g. "a
92 KB, 5-file sample of the same kind of job."

**How to test:** compare `G1-EVIDENCE.md`'s Target row and `REPORT.md:3` against the claimed
"whole-repo" framing on both public pages.

---

## MINOR

### N-5 — IMPLEMENTATION-PLAN.md names a preset path that was never shipped

`docs/design/halo2/IMPLEMENTATION-PLAN.md:58`: "**Files:**
`dsh/agent-presets/halo-ljp-child/agent.cordis.yml`". The actual, only, shipped directory is
`dsh/agent-presets/halo-ljp/` (confirmed on disk; matches SKILL.md, the generated preset
header, `Build-LjpPreset.ps1`, and every test). Stale from an earlier planning name, never
reconciled when the plan doc was merged onto this branch.

### N-6 — USER-MANUAL's own Mission Control size figure went stale within this same remediation wave

`docs/USER-MANUAL.md:371,531`: "3,124 lines." Actual current file:
`wc -l mission-control/mission-control.mjs` → **3,209**. The figure was correct when written
(commit `e586357`, docs-M2) but three later commits in this same batch (`d2e4097`, `9e9ccd8`,
`9c27a71`) kept editing `mission-control.mjs` without anyone updating the line count —
the exact class of staleness this remediation wave was fixing elsewhere.

---

## Confirmed FIXED (re-verified directly, not taken on faith)

- **B1 operational surfaces** — `SKILL.md:106-115`, `map.workflow.js:46-54`,
  `agent.cordis.yml:1-14`/`Build-LjpPreset.ps1:86-99` all correctly scoped now ("through the
  harness's own subagent tools," explicit "what this does NOT do," shell/authenticated-CLI
  risk named). Load-bearing: the preset header text lives in the *generator*, and H5
  regenerates + diffs it at test time, so it cannot drift silently.
- **COVERAGE containment fix is real and load-bearing.** Ran `Prove-TestsFailClosed.ps1`
  myself (self-copies to scratch, never touches the working tree) — all **38/38** mutations
  CAUGHT, including `H15 "the containment scan goes back to logs-only ... calls that clean
  (gauntlet B1)"`. Also confirmed live: H15's own 3-part assertion (scan findings even with
  no logs/; CLI-invocation escape → exit 5; mere prose mention → exit 0) passes.
- **docs-C1** — SPEC.md, IMPLEMENTATION-PLAN.md, G1-EVIDENCE.md all present; H16 guards their
  existence; ran the suite, H16 passes.
- **M1 (stale live deploy), C4** — confirmed by direct hash comparison: live
  `~\.dsh\scripts\halo\Halo-Coverage.ps1` and the repo copy are byte-identical
  (`9A1162AF...` both sides, same mtime). V3 (comprehensive live-vs-repo hash walk) passes.
  The `warn`-matches-pnpm-chatter root cause fix is present in both `Deploy-ToLive.ps1:186-193`
  and `Sync-FromLive.ps1:53-62`. (Did not personally re-run `Deploy-ToLive.ps1` — see below.)
- **"45 pass, 38 mutations caught"** — both recounted exactly. Static tier is exactly 45
  `PASS` lines (S1 through H12) in a live run; full suite is 49 passed/1 failed twice in a
  row, but the 1 failure alternates between `[V4]` and `[MC1]` — both are port/process
  contention on a machine that also runs the real live services, not a code defect (same
  class of flakiness I flagged unresolved in my original audit).
- **M2 (tab count / doc coverage)** — confirmed 7 tabs live (`127.0.0.1:3090`, both
  `get_page_text` and a live click into Settings); all six doc surfaces (README,
  USER-MANUAL x3, both public pages) now consistently say 7. New USER-MANUAL Settings and
  Large-Jobs sections read accurately and are honestly hedged (explicitly: "harness-level
  wall, not a sandbox... do not treat a miss as proof"). CHANGELOG Unreleased entry is
  accurate and appropriately hedged.
- **M3 point 2** (vacuous-check-not-its-own-limit) — now explicit and distinct in
  `G1-EVIDENCE.md`'s Honest Limits ("Containment was NOT tested by this run — the check had
  no data. This is the single most important limit on this page.").
- **N1 (original)** — the stale understating sentence is gone from both public pages
  (superseded by the N-4 finding above, a new problem in its replacement).
- **B2** — `site/index.html` and `docs/index.html` are still byte-identical (`diff` = no
  output).

## STILL OPEN (from my original review, not addressed)

- **[MAJOR] M3 point 1 — stale-findings-reuse across a *different brief*.** C3 fixed only the
  budget-changes-reuse-the-directory case: `Halo-Plan.ps1`'s `Get-RunId` (lines 76-96) now
  hashes `files + budget + safety`, **not the brief**. `Halo-Pending.ps1:71` still marks a
  unit "done" solely from `findings/<unit>.json` having `status:"ok"` — it never compares
  the brief that produced those findings to the current one. So re-running the *same*
  `runs/<id>` (same files, same budget) under a materially different brief still silently
  reuses old findings, exactly as the original `REPORT.md:26` (unit-003) finding described.
  Not mentioned anywhere in `G1-EVIDENCE.md`'s Honest Limits section (checked; absent). The
  task's claim list frames C3 as closing this, but the commit's own wording ("re-planning
  under a different **budget**") already scopes it away from the brief case — this is a
  distinct, still-open gap, not a re-opened one.

## Could not fully assess

- Did not personally re-run `Deploy-ToLive.ps1` (would touch the live services at :3080/:3090
  without being asked); relied on the direct hash-match + V3 pass as strong indirect proof a
  successful deploy already happened post-fix.
- Did not root-cause the live-tier flakiness (`[V4]`/`[MC1]`, alternating); same open item as
  my original audit.
- Out of lane: did not re-verify C1/C2/C5/QA-F1/F3/F4/F5/Eng-minor code paths beyond a light
  spot-check (their logic read correctly and H9/H10 pass); left the depth pass to
  Engineering/QA/Tests roles.
