> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# GauntletGate RE-VERIFICATION — Test Engineer

**Repo:** `C:\Users\scott\Desktop\Code\halo-stack`  **Branch:** `feat/halo2-wp2` vs `master`
**Baseline:** my earlier deep-dive, `gate-halo2-2026-08-22\04-tests.md` (5 findings: 2 Critical,
2 Major, 1 Minor), committed at `0f11af8`. **Remediation audited:** `0f11af8` through `d631d30`
(`git diff 0f11af8^..HEAD`), i.e. everything the author claims fixed.

**Method note:** every claim below is **LIVE** (I ran the real scripts/tests, or my own mutant,
and quote actual output) or explicitly marked **STATIC**. All mutations were applied with the
robocopy-to-scratch technique (`Prove-TestsFailClosed.ps1`'s own TE6-hardened method) into my own
temp dir — nothing in the shared clone was touched. `git status --porcelain` confirmed clean
(only a peer lane's new file) throughout and at the end.

---

## Numbers, independently re-run (not taken from the author's report)

- `tests\Run-Tests.ps1` (no flags, live services up): **50 passed, 0 failed, 0 skipped** — 45
  static + 5 live (`V1`-`V5`). `-Static` alone: **45 passed, 0 failed** — matches the "45 tests
  pass" claim exactly.
- `tests\Prove-TestsFailClosed.ps1`: **38 historical defects reintroduced, 38 CAUGHT, 0 missed**
  — matches "all 38 mutations caught" exactly. Full transcripts:
  `%TEMP%\reverify-run-tests-full.txt`, `%TEMP%\reverify-prove-mutations.txt`.

---

## Severity summary — what REMAINS after this round

| Sev | # | Finding |
|---|---|---|
| Critical | 1 | Containment: the wall is still not mechanically selected at runtime (2a), the Exa/MCP blind spot is still unaddressed (2c), **and** the new CLI-invocation markers added for B1 are evaded by ordinary (non-adversarial) phrasing — proved live against the real, unmutated script. |
| Major | 2 | (a) The C3 run-id fix has **zero regression coverage** — proved by mutation that reverting it silently passes all 45 tests and reproduces the original false-clean completion end to end. (b) Finding 4 (Test-MapTemplate.mjs mock fidelity) is unchanged and still open. |
| Minor | 1 | The new OK:/FAILED: soft-failure marker fails **open** (counts as success) when a child ignores the instruction and returns non-conforming text. Not safety-critical (COVERAGE is independent), but untested. |
| Blocker | 0 | — |

---

## Part 1 — my 5 original findings, re-verified one at a time

### Finding 1 (was CRITICAL) — replan/run-id false-clean completion: **CODE FIXED, but UNTESTED (see NEW-2)**

Re-ran my exact original repro (3 files, PLAN at UnitBudgetTokens=2000, findings written for
unit-000 only, re-PLAN at UnitBudgetTokens=9000, same RunsRoot, no `-RunId` passed) against the
**current, unmutated** scripts:

```
RUN ID 1: run-8d9ec9ed5f38   (budget=2000, unitCount=3)
RUN ID 2: run-a26f3d18f7f2   (budget=9000, unitCount=1)
SAME DIRECTORY AS RUN 1? False
(no findings dir in run 2 -- clean separate run)
COVERAGE exit 4, unitsNotAttempted:1, gapHidden:true, gapsUnnamed:["REPORT.md is missing"]
```

`Get-RunId` (`Halo-Plan.ps1:76-96`) now hashes `budget=...;safety=...` ahead of the file list, so
a different packing gets a different run id and directory — confirmed live, no stale-findings
collision, no false-clean verdict. **The bug is genuinely fixed today.** But see **NEW-2** below:
nothing stops it from silently coming back.

### Finding 2 (was CRITICAL) — containment wall/backstop: **PARTIALLY FIXED**

**2b, FIXED and tested.** The "physically cannot leave the machine" language is gone from
SKILL.md/map.workflow.js/the preset header (grepped, zero hits). `Halo-Coverage.ps1` now scans
`findings/` (not just the never-created `logs/`), reports `containmentScanned`/
`containmentVerdict`, and `docs/design/halo2/G1-EVIDENCE.md:36,80-87` honestly says
**"NOT VERIFIED on this run."** Ran `H15` live: clean run → exit 0 with `containmentScanned:true`;
a findings file containing `"ran codex exec to summarise the file"` → **exit 5**; prose merely
*discussing* the providers → exit 0, no false alarm. All three pass exactly as claimed.

**2a, STILL OPEN — unaddressed.** Nothing mechanically selects `halo-ljp` at runtime.
`dsh/settings.yaml:58-59` still reads `agent-presets: default: halo-standard` (unrestricted).
`grep -rniE "halo-ljp" **/*.ps1 **/*.mjs **/*.yaml` outside the preset's own files, the generator,
and the tests → zero runtime selection hits. `mission-control.mjs` has zero `halo-ljp`/`AGENT_PRESET`
references. SKILL.md's own instruction is still prose ("Run the whole LJP under the restricted
`halo-ljp` preset (or a headless profile that uses it)") and G1-EVIDENCE.md:88 itself says the run
was "under the standard preset, not `halo-ljp`." The author never claimed this was fixed — it
isn't, and the doc is honest about that. I am re-flagging it as still Critical because it is the
single mechanism the whole containment story depends on, and by default it is off.

**2c, STILL OPEN — unaddressed.** `$script:ExternalMarkers` + `$script:ExternalCliMarkers`
(`Halo-Coverage.ps1:73-89`) still contain nothing for `exa`/`mcp`. `dsh/cordis.patch.yml`'s
host-scoped Exa MCP row is untouched by `Build-LjpPreset.ps1` (session-scoped strip only), and
`workspace/AGENTS.md` still tells every session to use `mcp__exa__` tools. No new marker, no new
test.

**NEW evidence (see NEW-1 below): even the markers that WERE added are evadable by ordinary
phrasing, live-proven against the current code.**

### Finding 3 (was MAJOR) — H7 raw-substring deploy check: **FIXED, independently re-verified**

Re-applied my exact original mutation to a **fresh scratch copy of my own** (not the author's
harness): commented out the `Halo-Size.ps1` staging entry in `Deploy-ToLive.ps1` the identical way
(`# TEMP disabled while debugging -- @{ src = "scripts\halo\Halo-Size.ps1"; ... }`). Ran the real,
unmodified `Run-Tests.ps1 -Static` against my own mutant:

```
FAIL  [H7] the deploy stages every LJP artifact ... -- deploy does not STAGE
      (as a live $map src entry, not a comment): scripts\halo\Halo-Size.ps1
44 passed, 1 failed, 0 skipped
```

Exactly one test fails, exactly the right one, nothing cascades. H7 (`Run-Tests.ps1:617-639`) now
strips comment lines before matching and requires a real `src = "<path>"` token, not raw substring
presence. This is also now mutation `H7` #2 in `Prove-TestsFailClosed.ps1:203-206` (my own
suggested "Test to add," verbatim) and I confirmed it CAUGHT there too, independently, not just by
reading the harness's own report.

### Finding 4 (was MAJOR) — MAP template mock fidelity: **STILL OPEN, unchanged**

`tests/halo/Test-MapTemplate.mjs:12-23`'s `AsyncFunction('args','agent','pipeline','parallel',
'phase','log', body)` wrapper is byte-identical to what I read before. It is still cross-checked
against the real dsh worker contract by exactly one live run (G1) — and that run was, per 2a
above, under the **unrestricted** preset, not the composition an LJP run actually ships under. Not
in the author's claimed-fixed list; nothing to re-verify beyond confirming it wasn't touched.

### Finding 5 (was MINOR) — unitsFailed over-counting skipped units: **FIXED, independently re-verified**

Wrote my own probe (not the author's `Test-MapTemplate.mjs`) against the real, unmutated
`map.workflow.js`, 6 units, every attempted child hard-fails:

```json
{"unitsTotal":6,"unitsAttempted":3,"unitsDone":0,"unitsFailed":3,"unitsNotAttempted":3,"halted":true}
```

`unitsFailed` now equals `attempted - done.length` (was `units.length - done.length`); a new
`unitsNotAttempted` field reports the breaker-skipped units separately. Correct, and now pinned by
`Test-MapTemplate.mjs` case 6 (`skip.failedIsAttempted`, `skip.notAttempted`), which I also ran
directly (`node tests/halo/Test-MapTemplate.mjs` → exit 0).

---

## Part 2 — adversarial pass on the new/reworked tests, and NEW findings

### NEW-1 (CRITICAL) — the new CLI-invocation containment markers are evaded by ordinary phrasing

`Halo-Coverage.ps1:86-89`'s `$script:ExternalCliMarkers` is a literal, case-insensitive
**substring** list (`'codex exec'`, `'codex --'`, `'codex -p'`, `'claude -p'`, `'claude --print'`,
`'claude --dangerously'`, `'opencode run'`, `'opencode acp'`, `'npx codex'`, `'npx @openai/codex'`).
Against the **real, unmutated** script I wrote three findings files describing real CLI escapes in
unremarkable narration (not adversarial obfuscation — just how a model plausibly reports its own
actions):

```
unit-000: "used the local codex.exe binary in exec mode ... codex.exe exec review.py"
unit-001: "piped the file to claude in print mode (the --print flag) to cross-check phrasing"
unit-002: "ran opencode in its run mode (opencode's run subcommand) against the file"
```

```json
"containmentBreached": false, "containmentScanned": true, "containmentSources": 3,
"containmentVerdict": "no-hits-in-scanned-output", "providerHits": [], "complete": true
```
Exit 0, all three. None of the 6 CLI markers matched — `.exe` breaks `'codex exec'`/`'codex -p'`;
splitting the flag mention from the tool name breaks `'claude --print'`; naming a subcommand
descriptively rather than typing it breaks `'opencode run'`. `containmentVerdict:
"no-hits-in-scanned-output"` reads exactly as clean — the same "confident voice over a blind spot"
problem B1 was written to eliminate, one layer deeper, on a check that (per 2a) is frequently the
**only** layer in play. `H15` (`Run-Tests.ps1:705-739`) covers exactly one hit-shape and one
clear-miss-shape; no near-miss case exists anywhere in the suite. Reproduction:
`%TEMP%\halo-containment-evasion` / `...\scratchpad\containment-evasion-repro.ps1`.
**Fix:** match tool name + nearby invocation-shaped tokens with a real pattern (not a literal
substring list), normalize path suffixes, and add H15 cases for exactly the three shapes above.

### NEW-2 (MAJOR) — the C3 run-id fix has zero regression coverage; reverting it is invisible to the suite

Neither `Run-Tests.ps1` (grepped for `UnitBudgetTokens`/`Get-RunId` across all H-tests: every
call re-plans into a **fresh** `RunsRoot`, never the same one twice with different budgets) nor
`Prove-TestsFailClosed.ps1` (38 entries, none named for C3/replan) exercises this fix. Proved it
with a mutation of my own: in a fresh scratch copy, removed just the two `Append` calls that mix
budget/safety into `Get-RunId`'s hash (`Halo-Plan.ps1:86-90`), reverting to file-set-only hashing
— the exact pre-fix behavior, nothing else touched:

```
Run-Tests.ps1 -Static against the mutant: 45 passed, 0 failed, 0 skipped
```

Then re-ran the full replan sequence against that same mutant's scripts:

```
RUN ID 1: run-8ed48d6af382 (budget=2000)
RUN ID 2: run-8ed48d6af382 (budget=9000)   <- SAME id, SAME directory
STALE FINDINGS PRESENT: unit-000.json {"summary":"reviewed unit-000 ONLY under budget=2000 packing"}
COVERAGE (real, unmutated Halo-Coverage.ps1): unitsSucceeded:1, unitsTotal:1,
  gapHidden:false, complete:true, EXIT 0
```
The exact original Critical bug, fully restored, and the full 45-test suite does not notice.
Reproduction: `...\scratchpad\c3-mutant-reverify\`, `...\scratchpad\reverify-replan\repro-mutant.ps1`.
**Fix:** add an H-series test that PLANs one fixture twice into the same `RunsRoot` with two
different `-UnitBudgetTokens`, asserts the run ids differ, and asserts the second run's
`findings/` starts empty; add the matching entry to `Prove-TestsFailClosed.ps1`.

### NEW-3 (MINOR) — the OK:/FAILED: soft-failure marker fails open on non-conforming text

`map.workflow.js`'s new soft-failure detection (`/^\s*FAILED\b/i.test(text)`) only recognizes an
explicit `FAILED:` prefix; there is no matching check for `OK:`. Probed the real, unmutated
template with an agent that ignores the instruction entirely:

```js
return 'I looked at the file and made some notes about it.';   // neither marker
// -> {"unitsAttempted":3,"unitsDone":3,"unitsFailed":0,"halted":false}
```

A non-conforming response is silently counted as **success**. Not safety-critical: `Halo-Coverage.ps1`
grades completion from the findings JSON's own `status` field on disk, independent of this marker
(confirmed by re-reading the QA-F1 fix), and `mission-control.mjs` still surfaces none of
`unitsFailed`/`unitsDone`/`unitsAttempted` (grepped, zero hits) — so nothing downstream trusts this
telemetry blindly. But it is a fail-open default in code added this round, and every case in
`Test-MapTemplate.mjs` (1-6) uses text that is either cleanly `'OK: ...'` or cleanly `'FAILED: ...'`
— none probes a non-conforming response. **Fix:** treat a response matching neither marker as
ambiguous and feed it to the failure streak (fail closed), or at minimum add a test asserting
today's fail-open behavior is deliberate.

---

## Reproduction index (own scratch dir; shared clone untouched — `git status --porcelain` clean throughout)

- `...\scratchpad\reverify-replan\repro.ps1` — Finding 1 re-verification against real code.
- `...\scratchpad\h7-mutant-reverify\` — Finding 3 re-verification, my own mutant + `Run-Tests.ps1 -Static` output.
- `...\scratchpad\c3-mutant-reverify\` — NEW-2, the Get-RunId revert mutant.
- `...\scratchpad\reverify-replan\repro-mutant.ps1` — NEW-2, false-clean completion reproduced end to end against the mutant.
- `...\scratchpad\containment-evasion-repro.ps1` — NEW-1, three live marker-evasion findings files.
- `...\scratchpad\probe-breaker-return-reverify.mjs` — Finding 5 + NEW-3, independent probes against real `map.workflow.js`.
- `%TEMP%\reverify-run-tests-full.txt`, `%TEMP%\reverify-prove-mutations.txt` — full unedited output of both real harnesses.

## Could not assess

Did not independently re-verify the C4 deploy-staleness claim (deploy exit 0, live artifacts
hash-equal to repo) beyond the real suite's own live `V3` PASS ("live config matches the
repository — no undeclared drift"); did not run a live `Deploy-ToLive.ps1` against the running
`C:\Users\scott\.dsh\` deployment myself — that touches live services outside the scratch-copy
discipline this review otherwise held to, and is Engineering/QA's lane, not mine. Also did not
start a real dsh session under `halo-ljp` to confirm `mcp__exa__*` reachability end-to-end (same
caveat as my original review) — NEW-1 and 2a/2c are demonstrated via direct script/static
evidence, not a live dsh session.
