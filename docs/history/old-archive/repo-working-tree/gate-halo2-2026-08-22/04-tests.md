> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# GauntletGate FULL — Test Engineer deep-dive

**Repo:** `C:\Users\scott\Desktop\Code\halo-stack`  **Branch:** `feat/halo2-wp2` vs `master`
**Scope:** `tests/Run-Tests.ps1` (43 tests), `tests/Prove-TestsFailClosed.ps1` (35 mutations),
`tests/halo/Test-MapTemplate.mjs`, `tests/halo/Test-Settings.mjs`, and the HALO 2.0 code they
claim to guard (`scripts/halo/*.ps1`, `skills/large-job/map.workflow.js`,
`dsh/agent-presets/halo-ljp/*`, `mission-control/mission-control.mjs` settings path).

**Method note (read before the findings):** every claim below is marked as either **LIVE** (I ran
the real, unmutated repo scripts or the real mutation harness and am quoting actual output) or
**STATIC** (file-reading and grep only; I did not execute a live dsh session to confirm it). Nothing
in the shared clone was edited — reproductions that needed a modified file were run from a
scratch copy under my own temp dir
(`...\scratchpad\replan-repro`, `...\scratchpad\h7-mutant`, `...\scratchpad\partial-write-repro`,
`...\scratchpad\probe-breaker-return.mjs`), per the task's own instruction. `git status --porcelain`
on the real repo was clean (only another lane's `02-ux.md`) after all of this.

---

## Severity summary

| Sev | # | Finding |
|---|---|---|
| Critical | 2 | (1) Resume/replan silently corrupts COVERAGE into a false-clean verdict. (2) The E5/P9 containment "wall" is unenforced at runtime and its "backstop" scanner has a real, live blind spot. |
| Major | 2 | (3) H7 is a raw-text substring check (unlike its filtered siblings) — proven live to hide a real deploy regression through a 43/43-green suite. (4) The MAP template's control-flow test is a hand-reconstructed mock of the dsh engine contract, cross-checked against reality by exactly one live run — the same run that (1)/(2) show didn't prove what it's cited for. |
| Minor | 1 | (5) `map.workflow.js` mislabels never-attempted units as "failed" after a breaker trip; unsurfaced today but wrong. |
| Blocker | 0 | — |

The headline author claim under test — **"43 tests pass and all 35 mutations are caught, so the
suite fails closed"** — I verified the arithmetic half of directly and it is true (see Credit
section: I ran the real 35-mutation harness, not just read it, and it really is 35/35). What is
false is the inference drawn from it. "Fails closed" is being used to mean "robust against future
regressions," and Findings 1 and 3 are two regressions/gaps — one already-shipped-and-live, one a
weakness in the guard itself — that the 43-test suite does not catch, proven the same way the
suite proves everything else: by running the real code.

---

## Finding 1 — CRITICAL: replanning a run with a different unit budget silently orphans findings; COVERAGE then reports false-clean completion

**Files:** `scripts/halo/Halo-Plan.ps1` (no cross-check of prior findings against the new pack),
`scripts/halo/Halo-Pending.ps1:57-68` (matches "done" by unit-ID string + `status:"ok"` only),
`scripts/halo/Halo-Coverage.ps1:115-145` (same match, feeds `complete`).

**What I expected:** the SKILL.md flow (`skills/large-job/SKILL.md:63-72`) explicitly frames
PLAN as safe to re-run on resume ("the run id is derived from the file set, so re-running the
same tree resumes the same run") and Halo-Plan.ps1's own docstring calls it "pure... same
sizing.json and the same budget always produce byte-identical units." I expected findings from an
earlier pass to either (a) still correctly describe the unit they're filed under after a re-plan,
or (b) be invalidated/flagged if the re-plan changed what that unit ID means.

**What I actually observed (LIVE, real unmutated scripts, no source edits):**

```
RUN ID: run-cd66933889e5
FIRST PLAN unitCount: 3          # UnitBudgetTokens=2000 -> one file per unit
units\unit-000.json -> only f00.txt

findings\unit-000.json written: {"status":"ok","summary":"reviewed f00.txt ONLY..."}
BEFORE replan -- total=3 doneCount=1 pendingCount=2 pendingUnits=unit-001,unit-002   # correct

# Re-plan the SAME run (same sizing.json -> same file-set-derived runId) with a
# LARGER UnitBudgetTokens=9000 -- exactly what an operator does after raising a
# model's context window in the NEW MC Settings tab this same release ships.
SECOND PLAN unitCount: 1         # all 3 files now pack into ONE unit-000
units\unit-000.json now contains: f00.txt, f01.txt, f02.txt (2574 tokens)
findings dir untouched by Plan -- findings\unit-000.json still says "reviewed f00.txt ONLY"

AFTER replan -- total=1 doneCount=1 pendingCount=0      # <-- WRONG: f01/f02 never reviewed

EXIT CODE (Halo-Coverage.ps1): 0
{
  "unitsTotal": 1, "unitsSucceeded": 1, "unitsNotAttempted": 0,
  "gapHidden": false, "gapsUnnamed": [], "complete": true
}
```

Full transcript reproduced with the real `Halo-Size.ps1` / `Halo-Plan.ps1` / `Halo-Pending.ps1` /
`Halo-Coverage.ps1` against a 3-file, 3000-bytes-each fixture in
`...\scratchpad\replan-repro`. `Halo-Coverage.ps1` — the "mechanical, never-trust-the-model" gate
this entire feature exists to provide — signs off on a run that reviewed 1 of 3 files (33%
coverage) as `complete: true`, exit 0, zero gaps.

**Cause:** `Halo-Plan.ps1`'s `RunId` is a hash of the **source file set only**
(`Get-RunId`, lines 72-82: `path|bytes` pairs) — deliberately, so re-running the same tree
resumes the same run. But nothing else about a unit is content-addressed. `findings/<unit-id>.json`
is matched to `units/<unit-id>.json` purely by the **positional string** `unit-000`, `unit-001`,
etc. When `Halo-Plan.ps1` is invoked a second time against the same `RunsRoot`/`RunId` with a
different `-UnitBudgetTokens` (or a different live model context window feeding a different
`sizing.json`), the deterministic packer produces a **different files-to-unit-ID mapping**, and
the stale-unit cleanup (lines 164-171) deletes the old `units/*.json` — but it **never touches
`findingsDir`**. Grepped both consumers to confirm there is no cross-check at all:
`grep -n "unitBudget\|perUnitContent\|capBytes" scripts/halo/Halo-Pending.ps1
scripts/halo/Halo-Coverage.ps1` → zero hits. Neither script has any way to know the findings on
disk were produced against a *different* packing of the same files.

**Why this is realistic, not contrived:** nothing in the shipped system stops it. `SKILL.md`'s own
worked example hardcodes `-UnitBudgetTokens 24000` as a literal rather than "read it back out of
the existing `manifest.json` and reuse it exactly," and this same release ships a live
**Mission Control Settings tab (G5/G7)** whose entire purpose is to let the operator change model
context/token settings between sessions — the natural trigger for a differently-sized re-plan of
a job that's still mid-flight after a crash or a `STOP`.

**Fix:** bind findings to unit content, not position — e.g. have `Halo-Plan.ps1` write a short
hash of each unit's `(path,byteCap)` list into `units/<id>.json`, and have `Halo-Pending.ps1` /
`Halo-Coverage.ps1` treat a `findings/<id>.json` as valid only if it carries (or can be checked
against) the same hash; alternatively, refuse to re-plan into an existing `RunsRoot/RunId` whose
`findings/` is non-empty unless the *exact same* `unitBudget`/`safetyFactor` used to produce those
findings is supplied, hard-failing otherwise.

**Test to add:** an H-series case that runs `Halo-Plan.ps1` twice against the same fixture and
`RunsRoot` with two different `-UnitBudgetTokens` values, seeds a findings file under the
resulting name collision, and asserts `Halo-Pending.ps1`/`Halo-Coverage.ps1` do **not** treat the
second plan's unit as done. None of H1/H2/H3/H6/H13 do this — each calls Plan exactly once.

---

## Finding 2 — CRITICAL: the E5/P9 containment "wall" is not enforced by anything at runtime, and the "backstop" scanner has a real, live gap that isn't the 3 named providers

This directly attacks the panel's named claim: *"Containment (E5/P9): the restricted halo-ljp
preset is the WALL; the COVERAGE log-check is a backstop."* Both halves have a hole, and put
together they mean the claim is currently **untested, not just under-tested**.

**2a. Nothing selects `halo-ljp` at runtime (STATIC, but exhaustive).**
`dsh/settings.yaml:58-59` sets the *global default* preset:
```
agent-presets:
  default: halo-standard
```
halo-standard is the **unrestricted** preset (it mounts `tool-subagent-codex`,
`-claude-code`, `-opencode` — see `dsh/agent-presets/halo-standard/agent.cordis.yml:213-233`).
I grepped the entire repository for any mechanism that ever switches a session to `halo-ljp`:
```
grep -rniE "--preset|AGENT_PRESET|agentPreset|halo-ljp" *.ps1 *.mjs *.md *.yaml *.yml
```
Every hit is either the preset's own files, `Build-LjpPreset.ps1` (the generator), the tests, or
**prose** — `skills/large-job/SKILL.md:106-109` ("Run the whole LJP under the restricted
`halo-ljp` preset...") and `workspace/AGENTS.md:45-50` ("...runs one fresh local child per unit
under the restricted `halo-ljp` preset..."). Mission Control has zero references to `halo-ljp`
(`grep -n halo-ljp mission-control/mission-control.mjs` → no hits); there is no CLI flag, no MC
control, no launcher argument, no per-profile override (`agent-presets:` exists in exactly one
place outside the preset files themselves: `dsh/settings.yaml`, one global default). The
restriction that is supposed to be "the WALL" is, in the shipped system, **a sentence in a prompt
file that a model is asked to voluntarily comply with**, sitting behind a default that is the
opposite of restricted. That is precisely the class of soft, skippable safeguard the rest of
HALO 2.0 was built to replace with mechanical enforcement — except here, for the one piece
closest to an actual security boundary, the enforcement is missing.

**2b. `docs/design/halo2/G1-EVIDENCE.md` says so itself.** The keystone live-run evidence the
author cites (*"G1 keystone GREEN... containmentBreached: false... COVERAGE exit 0"*) is honest
about this in its own "Honest limits" section (lines 80-82, quoting under 15 words per the
copyright rule):

> "**Run under the standard preset**, not `halo-ljp`... the restricted-preset wall itself is
> proven by construction + H5, and the Q12 bypass probe (SPEC §9) remains open."

`containmentBreached: false` on that run proves the child *chose* not to call an external
provider — not that it was structurally *prevented* from doing so. G1 is offered as evidence the
whole redesign works; it is not evidence the containment claim holds, and the author's own
document says as much. No test anywhere — static or live — closes the gap the doc names as open.

**2c. The "backstop" (`Halo-Coverage.ps1`'s E5 log-scan) has a real, already-shipped blind spot.**
`Halo-Coverage.ps1:73-76` defines the full list of egress markers it looks for:
```
$script:ExternalMarkers = @(
    'subagent_codex', 'subagent_claude_code', 'subagent_opencode',
    'subagent-codex', 'subagent-claude-code', 'subagent-opencode-acp'
)
```
`dsh/cordis.patch.yml:66-73` registers a **live, host-scoped MCP server** — not a session/preset
row, so `Build-LjpPreset.ps1` (which only strips `tool-subagent-*` blocks from
`agent.cordis.yml`) never touches it:
```
- id: mcp-exa
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: exa
    transport: streamable-http
    url: !!js "`https://mcp.exa.ai/mcp$..."
```
and the halo-ljp preset's own comment (`dsh/agent-presets/halo-ljp/agent.cordis.yml:~253`,
identical text in halo-standard at line 286) documents that this is deliberate: *"the `web`
service and its search provider stay in the host composition; only the model-facing tool is
per-session... Web reach comes from the Exa MCP row instead (mcp__exa__* tools)."* And
`workspace/AGENTS.md:19-22` tells every session, unconditionally, to *"use your `mcp__exa__`
tools (search + fetch)."* Neither `$script:ExternalMarkers` nor the H5 test's toolName regex
contains "exa" or "mcp" anywhere. A "contained" LJP child — reading an **untrusted corpus**, which
is the feature's whole use case, and the exact class of risk this repo already has a real incident
about (issue #35, the AGENTS.md prompt-injection landing on the 5070ti box, cited repeatedly in
`tests/Run-Tests.ps1`) — has live internet search/fetch reach that neither the wall nor the
backstop accounts for.

**What I did not verify (being explicit per the evidence bar):** I did not start a live dsh
session under `halo-ljp` and confirm an `mcp__exa__*` tool call actually succeeds and goes
unflagged — that is a live-system integration/security test, not a static-repo test-coverage
review, and I want to be careful not to claim I ran something I didn't. Everything in 2a-2c above
is read directly from the shipped files quoted; I'm confident in the gap, not in a specific
exploited outcome.

**Fix:** (i) make preset selection for a run mechanical, not prose — e.g. `Halo-Pending.ps1` /
the workflow call refuses to proceed unless `dsh --dump-config` (or an MC-exposed equivalent)
reports the active preset is `halo-ljp`; (ii) extend `$script:ExternalMarkers` (and the H5/H4
tests) to cover the MCP/web surface, or explicitly document — and TEST — that Exa access is an
accepted exception with its own scoped risk statement, rather than a silent one; (iii) get one
live G1-equivalent run recorded **under `halo-ljp`**, closing the gap the author's own doc flags
as open (Q12 / SPEC §9).

**Test to add:** an H-series case that starts a real (or Node-mocked, matching the
Test-MapTemplate.mjs technique) dsh child under `halo-ljp` and asserts an attempted
`mcp__exa__search` call is either physically unavailable or is caught by COVERAGE — today neither
is true by construction.

---

## Finding 3 — MAJOR: H7 is a raw-text substring check; proven live to let a real deploy regression through a 43/43-green suite

**File:** `tests/Run-Tests.ps1:617-629` (H7).

```powershell
Test-Case 'H7' '...' {
    $dep = Get-Text 'scripts\Deploy-ToLive.ps1'
    $need = @('scripts\halo\Halo-Size.ps1', ... 'Build-LjpPreset.ps1')
    $missing = @($need | Where-Object { $dep -notmatch [regex]::Escape($_) })
    ...
}
```
`Get-Text` (line 46) reads the **raw file**, and H7's match has **no comment filter** — unlike its
siblings in the same file: `S1` (line 59: `Where-Object { $_ -notmatch '^\s*(//|/\*|\*)' }`), `S2`
(lines 96-99: skips `#`/`//` lines explicitly), and `MIG1` (lines 374: same). Those three were
each hardened this way *because* an earlier version matched a comment and gave a false pass — the
suite's own history (S1's docstring literally says "Comment lines describe the OLD defect; only
executable imports count"). H7 was never given the same treatment.

**Live proof (mutation applied to a scratch copy only, never the working tree):**
`...\scratchpad\h7-mutant` — I commented out the real `$map` staging entry for
`scripts\halo\Halo-Size.ps1` in `Deploy-ToLive.ps1`:
```
-    @{ src = "scripts\halo\Halo-Size.ps1";     dst = "$U\.dsh\scripts\halo\Halo-Size.ps1" }
+    # TEMP disabled while debugging -- @{ src = "scripts\halo\Halo-Size.ps1"; ... }
```
This is a **real regression**: a deploy run against this file would no longer copy
`Halo-Size.ps1` to the live tree, silently breaking step 1 (SIZE) of the entire Large-Job Protocol
on any freshly-deployed machine — exactly the class of defect `tests/Run-Tests.ps1`'s own
preamble says it exists to catch ("worked on the machine where it was written... discoverable in
seconds by a check nobody ran"). I then ran the **real, unmodified** `Run-Tests.ps1 -Static`
against that mutant:
```
  PASS  [H7] the deploy stages every LJP artifact (scripts, skill, restricted preset) and regenerates halo-ljp
  43 passed, 0 failed, 0 skipped
```
The literal string `scripts\halo\Halo-Size.ps1` is still present in the file (inside the comment),
so H7's substring search finds it and reports PASS — while the functional `$map` array no longer
stages the file. The exact "43 tests pass" figure the author cites holds **with a real deploy
regression already inside it**.

I additionally reasoned (STATIC, not executed against this mutant) that `CC1`
(`tests/Run-Tests.ps1:853-884`, the clean-clone dry-run gate WT-2 hardened) would very likely also
miss this specific class: it only asserts the dry-run deploy exits 0
(`if ($LASTEXITCODE -ne 0) { return ... }`); it never diffs the dry-run's "files that WOULD be
written" list against an expected file set, so a silently-shortened `$map` array still exits 0.

**Why this matters beyond H7 itself:** H7's `$need` list is 9 file paths (`tests/Run-Tests.ps1:619-624`),
each checked the same way — every one of them shares this blind spot, not just the one I mutated.

**Fix:** filter comments the same way S1/S2/MIG1 do, or better, assert against the **parsed
`$map` array itself** (source it, or regex-extract the hashtable literals) rather than raw
substring presence — and pair it with a CC1 assertion that the dry-run's actual "would write"
list contains every HALO 2.0 path, not just that the dry run exits 0.

**Test to add:** the mutation above, added as a 36th case in `Prove-TestsFailClosed.ps1` with `id
= 'H7b'`, `from`/`to` exactly as shown — it should currently be reported `MISSED`.

---

## Finding 4 — MAJOR: the MAP template's control-flow test is a hand-built mock of the dsh engine contract, cross-checked against reality by exactly one live run — and that run (Finding 2) didn't exercise the restricted preset either

**File:** `tests/halo/Test-MapTemplate.mjs:12-27`.

```js
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
run = new AsyncFunction('args', 'agent', 'pipeline', 'parallel', 'phase', 'log', body);
```

This reconstructs, by hand, dsh's own private calling convention for a `workflow` tool's script
body — the exact parameter names and order the real dsh worker is assumed to bind. Nothing in this
repository pins that contract against dsh's actual source (a `node_modules` type or a documented
schema); it is inferred and then asserted against itself. The **only** evidence that this
reconstruction matches reality is the single G1 run (`docs/design/halo2/G1-EVIDENCE.md`) — and
Finding 2 already shows that same run did not use the restricted preset, so at most it validates
the `args`/`agent`/`phase`/`log` wiring, not the composition this feature is meant to run under in
production. This repo's own commit history (`MIG1`/`MIG2`, the rc.7 → 0.1.1-rc.2 migration) is a
concrete precedent for the dsh CLI contract changing across versions without warning; nothing
would catch a silent shift in the **workflow-script wrapper contract** specifically — the mock
would stay green (it only tests itself) while a real run diverged.

This is not a defect in `map.workflow.js` today — the mocked test is well-built internally (cases
1-4 genuinely drive the control flow: happy path, record-and-continue, breaker, status:"failed" —
see the next finding for one thing it still misses inside its own scope) — it's a coverage-
architecture gap: **one artifact (G1) is being asked to stand in for both "the template's logic is
right" and "the mock's assumed contract matches the real engine," and it can only speak to the
former with confidence.**

**Fix / test to add:** at minimum, record in `G1-EVIDENCE.md` (or a new evidence file) a
side-by-side of the *actual* arguments dsh bound during the G1 run (loggable via one `log(typeof
args, typeof agent, ...)` call) against what `Test-MapTemplate.mjs` assumes, so a future dsh
version bump has something concrete to diff against instead of re-deriving trust from a single
unattended run.

---

## Finding 5 — MINOR: `map.workflow.js` mislabels never-attempted units as "failed" once the breaker trips; H8 doesn't check it

**File:** `skills/large-job/map.workflow.js:117-124`.
```js
return {
  ...
  unitsDone: done.length,
  unitsFailed: units.length - done.length,   // <-- counts SKIPPED units as "failed"
  ...
};
```

**LIVE probe** (`...\scratchpad\probe-breaker-return.mjs`, running the real, unmutated
`map.workflow.js` through the identical `AsyncFunction` wrapper `Test-MapTemplate.mjs` uses),
6 units, every child fails:
```
mapCalls actually made: 3 / 6 units in args.units
returned object: {
  "halted": true, "unitsTotal": 6, "unitsDone": 0, "unitsFailed": 6, "reduceRan": true
}
```
Only 3 of 6 children were ever invoked before the breaker (`BREAKER_CONSECUTIVE = 3`) stopped the
loop (line 38); the other 3 units were never attempted at all, yet `unitsFailed` reports 6 — it
computes `units.length - done.length`, conflating "attempted and failed" with "never attempted
because we stopped early." `tests/halo/Test-MapTemplate.mjs`'s breaker case (lines 75-89) checks
`halted`, `unitsDone`, and that `mapCalls < 6` — it never asserts on `unitsFailed`, so this is
invisible to the suite in either direction (a fix or a further regression here would both pass).

**Why only Minor, not higher:** `grep -rn "unitsFailed\|unitsDone\|reduceRan" mission-control/mission-control.mjs`
returns nothing — this return value is not surfaced anywhere in Mission Control today, and the
actual completion gate (`Halo-Coverage.ps1`) computes `notAttempted` vs `failed` correctly and
independently from disk (verified in Finding 1's repro and the partial-write test below), so
nothing safety-relevant depends on this field yet. It is dead-but-wrong telemetry: whichever
session/log consumes this workflow call's return value directly (per `SKILL.md`'s own flow, that's
the orchestrating agent, before it even gets to run COVERAGE) will see a falsely alarming "6/6
failed" instead of "3 failed, 3 never attempted."

**Fix:** `unitsFailed: units.length - done.length - (units.length - i)` at the break point, or
simpler, track a real `failed` counter incremented only on an actual child response, and report
`unitsNotAttempted: units.length - done.length - failed` separately, mirroring how
`Halo-Coverage.ps1` already distinguishes the two states from disk.

**Test to add:** in `Test-MapTemplate.mjs`'s breaker case, add
`check('breaker.failedCount', res.unitsFailed === 3, ...)` (or whatever the fixed semantics should
be) — it will fail today, cleanly demonstrating the gap.

---

## What actually holds up (credit where due)

- **The 35/35 mutation claim is true — I ran the real harness, not just read it.** Full output in
  `...\scratchpad\prove-run.txt`; every one of the 35 historical defects, reintroduced into a
  scratch copy, was caught by its named test:
  `all 35 mutations caught by their own test - the suite fails closed`. `git status --porcelain`
  on the real repo was clean afterward — the robocopy-scratch-copy technique
  (`Prove-TestsFailClosed.ps1:213-230`, hardened at TE6 against a `Copy-Item -Exclude` footgun)
  genuinely does not touch the working tree; I used the identical technique myself for Finding 3
  and confirmed the same.
- **`Halo-Coverage.ps1` / `Halo-Pending.ps1` fail closed correctly on a genuinely truncated
  (mid-crash-style) findings file — LIVE-tested, not assumed.** I wrote a findings JSON cut off
  mid-string (`{"status":"ok","summary":"the model was mid-sen`) and ran the real scripts
  (`...\scratchpad\partial-write-repro`): `Halo-Pending.ps1` correctly re-queued the unit as
  pending (the `catch { $done = $false }` at `Halo-Pending.ps1:66` earns its keep), and
  `Halo-Coverage.ps1` correctly returned exit 4 with `"gapHidden": true,
  "gapsUnnamed": ["unit failed, unnamed in report: unit-000"]`. The prompt for this review
  specifically asked about "COVERAGE on a partially-written findings file" as a possible gap — I
  tested it directly and it is **not** a gap; it's correctly defensive. Listing this here so it
  isn't silently dropped from the record.
- **`Test-Settings.mjs`'s extraction technique is load-bearing, not decorative.** It pulls
  `SETTINGS_WHITELIST`/`computeSettings`/`applySettings` out of `mission-control.mjs` between
  `/*__SETTINGS_FN_START__*/.../*__SETTINGS_FN_END__*/` markers and evaluates them directly. I
  checked the live HTTP handler (`mission-control.mjs:2976-3001`,
  `POST /api/action/apply-settings`) and confirmed it calls the exact same top-level
  `applySettings(raw, changes, SETTINGS_WHITELIST)` — same file, same scope, not a parallel copy.
  A change to the real settings-write logic cannot drift from what H10 tests without also breaking
  H10.
- **`Build-LjpPreset.ps1 -Check` (behind H5) is a real generator-diff test**, not a decoy: it
  re-derives halo-ljp from the *current* halo-standard and byte-compares, with a belt-and-suspenders
  scan for any surviving `toolName:` line, and its own "expected removals" assertion
  (`$expectedRemovals = 3`) fails loudly if halo-standard's subagent section ever changes shape
  out from under it. This is good, hermetic design.
- **H1, H2, H3, H4, H6, H11, H13 are genuinely hermetic and behavioral**: each builds a real
  fixture under `$env:TEMP`, invokes the real `.ps1` script, and asserts on the real JSON it
  produced — not on source text. This is a materially stronger style than the H7/H9 substring
  checks, and it's the majority of the new H-series.
- **The suite's self-documentation of prior "toothless test" incidents (TE1, TE4, TE5, TE6, PE-M1,
  PE-M3, and this review's own WT-1/WT-2) is real and the fixes described check out** on reading —
  this team has already closed several instances of exactly the pattern I was asked to hunt for. My
  findings above are what's left standing after that hardening, not a sign it didn't happen.

---

## Survey: does each H-test assert behavior, or that text exists?

| Test | Mechanism | Verdict |
|---|---|---|
| H1 | Real fixture + real `Halo-Size.ps1` invocation, asserts on parsed JSON verdicts | Behavioral |
| H2 | Real fixture + real `Halo-Plan.ps1`, asserts on unit/group counts and file shape | Behavioral |
| H3 | Real fixture + real `Halo-Coverage.ps1`, asserts on exit code across two REPORT.md states | Behavioral |
| H4 | Real fixture + real `Halo-Coverage.ps1`, asserts exit 5 on a planted log marker | Behavioral |
| H5 | Regex over `agent.cordis.yml` (comment-safe, see Finding 2) **plus** a real `-Check` generator diff | Behavioral (the diff is the load-bearing half) |
| H6 | Real fixture + real `Halo-Pending.ps1`, asserts done/pending counts | Behavioral |
| H7 | Raw substring search over `Deploy-ToLive.ps1` text, **no comment filter** | **Cosmetic — see Finding 3** |
| H8 | Real `map.workflow.js` body run through a mocked dsh wrapper (`Test-MapTemplate.mjs`) | Behavioral against the mock; mock's fidelity itself untested — see Finding 4. Misses `unitsFailed` correctness — see Finding 5 |
| H9 | Regex existence-checks over `mission-control.mjs` text | Cosmetic on its own, but backed by H10's real execution of the same functions — low risk |
| H10 | Extracts and *executes* the real `applySettings`/`computeSettings` | Behavioral, and confirmed load-bearing (see Credit) |
| H11 | Static regex (encoding) + real `Halo-Coverage.ps1` invocation for the exit-2 behavior | Mixed, both halves sound |
| H12 | Regex over `cordis.patch.yml` inserted ids, plus a conditional live check against installed profile bundles | Behavioral within what it checks |
| H13 | Real fixture + real `Halo-Coverage.ps1`, asserts exit 0 vs exit 4 across two REPORT.md phrasings | Behavioral |
| H14 | Regex existence-checks over `mission-control.mjs` text (three anchored patterns) | Static; narrower than H9/H10 pairing — no live-executed counterpart exists for the MC hero-state logic today. Not re-litigated here since WT-1 already covers this surface. |

---

## Not covered at all

- **Concurrency / locking around `runs/<id>/`.** By design a single MAP call is sequential
  (`map.workflow.js:45-51`, "MAP -- sequential by construction"), which correctly avoids
  in-process races. But nothing stops two *separate* sessions (an operator double-launching the
  same job, or a retry firing while the first attempt is still writing) from calling
  `Halo-Plan.ps1`/`Halo-Coverage.ps1` against the same `RunDir` at once — there is no lock file or
  equivalent. I did not attempt to force an actual race (nondeterministic and out of proportion to
  the other findings here); flagging it as a real, untested gap rather than a proven defect.
- **The real dsh engine's workflow-tool contract.** See Finding 4 — the only test harness for this
  (`Test-MapTemplate.mjs`) is a self-consistent mock, not a live cross-check.
- **Resume after a crash mid-run.** Not merely untested — see Finding 1: it is actively broken
  under a realistic, undocumented-as-dangerous sequence (re-plan with a different budget).
- **COVERAGE on a partially-written findings file.** Tested directly (see Credit section above) —
  this one holds up. Included here only to close the loop on the question as asked.

---

## Reproduction index (all under my own scratch dir, nothing in the shared repo)

- `...\scratchpad\replan-repro\` — Finding 1, full real-script transcript.
- `...\scratchpad\h7-mutant\` — Finding 3, the one-line decoy mutation + full `Run-Tests.ps1 -Static` output.
- `...\scratchpad\partial-write-repro\` — Credit section, truncated-JSON fail-closed proof.
- `...\scratchpad\probe-breaker-return.mjs` — Finding 5, real `map.workflow.js` breaker-path probe.
- `...\scratchpad\prove-run.txt` — full, unedited output of the real `tests\Prove-TestsFailClosed.ps1` (35/35 caught).
