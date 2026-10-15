> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# HALO 2.0 GauntletGate RE-VERIFICATION — QA Engineer

**Method:** every command below ran against the repo's CURRENT scripts
(`feat/halo2-wp2`, HEAD `d631d30`), targeting scratch run dirs under
`...\5fb7f768.../scratchpad\qa2\hostile2\` only. I did not write into
`~/.dsh` or the repo working tree from the test matrix. I DID run the real
`scripts\Deploy-ToLive.ps1` once, deliberately (see F2 below), because
"deploy exit 0, live == repo" is a claim under this gate and the only honest
way to check it is to run it — its own transactional design (stage / validate
/ backup / apply / validate) makes that safe, and it succeeded end-to-end.

---

## My 6 original findings: all 6 confirmed fixed, re-tested fresh, load-bearing

**F1 (was CRITICAL) — status-less findings silently graded "ok".** FIXED.
`Halo-Coverage.ps1:173` now defaults `$status = 'missing-status'` and only
overwrites it when the key is present (line 176); `$status -eq 'ok'` gates
success (line 187). Re-repro: findings file `{"summary":"reviewed it, looks
fine"}` (no status) now produces `unitsSucceeded:0, unitsFailed:1,
gapHidden:true, complete:false, exit=4` — previously `unitsSucceeded:1,
complete:true, exit=0`. `Halo-Pending.ps1` already required explicit
`status=='ok'`; re-tested, still correct (`doneCount:0`). Both gates now
agree on "missing status = not done" — the disagreement I flagged is gone.

**F2 (was CRITICAL) — live deploy was stale, shipping pre-hardening code.**
FIXED, and I verified it by actually running the deploy, not just diffing.
`pwsh tests/Run-Tests.ps1` → `[V3] PASS`. Direct diff,
`scripts\halo\*.ps1` / `skills\large-job\*` / `mission-control\mission-control.mjs`
repo vs `~\.dsh\...` → byte-identical on all of them. Then I ran
`scripts\Deploy-ToLive.ps1` for real: full transactional pipeline (stage →
pre-validate → staged-compose-validate → backup → apply → live-compose-validate
→ audit) completed, **exit 0**, no rollback triggered, machine marker written,
audit rows all PASS. Confirms the C4 root-cause fix (`Deploy-ToLive.ps1:186-194`
filters `[WARN]`/"deprecated subdependencies"/"peer dependencies" pnpm chatter
before pattern-matching `warn|unmatched|error|not found`) is real: it fired
against the actual `pnpm dlx` output on this box and did not false-positive.
Re-ran `V3` after the deploy — still PASS, everything still byte-identical.

**F3 (was MAJOR) — manifest unit with missing plan file vanished silently.**
FIXED. `Halo-Coverage.ps1:156-161` now adds the id to `$missingUnitFiles`;
lines 259 and 283-284 surface it as `unitsMissingPlan`/`missingPlanUnits` AND
force it into `gapsUnnamed` unless the report names the literal unit id.
Re-repro: manifest lists unit-000/unit-001, `units\unit-001.json` deleted,
both findings say `status:"ok"`, REPORT.md exists but never says "unit-001" →
`unitsMissingPlan:1, missingPlanUnits:["unit-001"], gapHidden:true,
complete:false, exit=4`. Added "unit-001 has no plan file" to REPORT.md, reran
→ `gapHidden:false, complete:true, exit=0`. Exactly the claimed behavior, and
it is the mechanical gate enforcing it, not a doc promise.

**F4 (was MAJOR) — malformed/truncated JSON crashed with undocumented exit 1.**
FIXED in all 3 places I originally found it, re-confirmed with fresh
truncated files: `Halo-Plan.ps1` (truncated `sizing.json`) → exit 2.
`Halo-Pending.ps1` (truncated `manifest.json`) → exit 2. `Halo-Coverage.ps1`
(truncated `manifest.json`) → exit 2. Pushed further this pass: truncated
**unit** file (`units\unit-000.json`) now also caught in both
`Halo-Coverage.ps1:144-150` and `Halo-Pending.ps1:81-87` → exit 2 in both,
where before only the manifest/sizing level was even guarded. `Halo-Size.ps1`
takes no JSON input at all (only `-Path` file/dir args) — confirmed by
reading the whole script; "malformed JSON in Size" is not applicable, not a
gap.

**F5 (was MAJOR) — SIZE `refuse` was advisory only; PLAN ignored it.** FIXED.
`Halo-Plan.ps1:146-149` checks `$sizing.verdict -eq 'refuse'` and refuses
unless `-Force`. Re-repro with the exact numbers from my original finding (70
x 1000-byte files, `-WindowTokens 10000 -UnitBudgetTokens 200 -MaxUnits 60`):
SIZE → `verdict=refuse, exit=3`. PLAN (no `-Force`) → **exit 3, no
`manifest.json` written**. PLAN `-Force` → exit 0, manifest written,
unitCount=70. Deliberate-override contract works exactly as documented, and
is a real block, not a warning.

**M1 (was Minor) — SIZE's "no readable files" message conflated empty vs.
all-excluded.** FIXED (commit `d631d30`, same-day). `Halo-Size.ps1:153-161`
now branches on `$script:SkippedByPolicy`. Re-repro: empty dir → `"the path
exists but contains no files."`; a dir containing only `.git`/`node_modules`
content → `"but 2 file(s) were EXCLUDED by the skip list ... point SIZE at
the source directory, or the skip list needs adjusting."` Messages
confirmed different; both still exit 2.

---

## Pushed further (this pass's FOCUS): hostile-input matrix, fresh cases

| Case | Result |
|---|---|
| Unicode (CJK+emoji, `\uXXXX` escapes) + CRLF line endings in findings | Parses correctly, `status:"ok"` recognized, `complete:true`. Verified the on-disk bytes directly (`od -c`) to rule out corruption — file holds standard JSON `\uXXXX` escapes; a console-codepage artifact in MY test harness's own `Write-Host` echo (not the product) briefly looked like mangling — ruled out by the byte-level check. |
| Findings valid JSON but NOT an object: `[1,2,3]`, `"ok"`, `42`, `true`, `null`, `{}` | All 6 variants: COVERAGE → no crash, `unitsFailed:1` (never succeeded); PENDING → no crash, `doneCount:0`. Fails safe in every shape via the `PSObject.Properties.Name -contains` guard (false for non-objects) or the surrounding try/catch (for `null`, where `$null.PSObject` throws and is caught → `'unreadable'`). |
| REPORT.md with a real UTF-8 BOM (`EF BB BF` confirmed byte-for-byte) | Parses correctly, gap-naming works, `complete:true` when the failed unit is actually named. No regression from the remediation's report-matching changes. |
| Concurrent COVERAGE on one run dir | 8 real concurrent `pwsh` processes (via `Start-Job`, not just PS threads) against the same `coverage.json`. All 8 exit 0, final file parses, `complete:true`. `[System.IO.File]::WriteAllText` is still not transactional, so this is not a proof against a genuine same-tick race, but 8 real OS processes produced no corruption. |
| Run dir on a very long path (419 chars under pwsh 7, 400 chars under `powershell.exe` 5.1) | Both exit cleanly (0), no MAX_PATH failure in either PowerShell version. |
| `status` value with different casing: `ok`/`OK`/`Ok`/`oK`/`" ok"`/`"ok "` | `ok`/`OK`/`Ok`/`oK` all count as done in BOTH Coverage and Pending (PowerShell `-eq` is case-insensitive by default) — **the two gates agree**, so this is not the "two gates disagree" class of bug F1 was. Leading/trailing whitespace (`" ok"`, `"ok "`) is NOT forgiven in either gate — both correctly treat it as not-done. Judgment: Nit, not a defect — worth knowing, not worth blocking on. |
| `map.workflow.js`'s own OK:/FAILED: marker convention, probed with unmarked freeform prose (`"Sure, here's my summary..."`, no prefix) | Counted as done by MAP's own breaker/return-stats (`unitsDone:3/3`). This is a **pre-existing** gap (present before this remediation wave too — `res` was always a string, and the pre-fix code only ever checked `res===null`), **not introduced by M5**, and **not covered by any claim in this gate's list**. It does not affect the actual pass/fail verdict: COVERAGE reads `findings/<unit>.json`'s real `status` field independently and is unaffected by what MAP's return text said. Severity: Nit, informational only. |

---

## Full suite + mutation harness (re-run fresh, not trusted from the claim)

- `pwsh tests\Run-Tests.ps1` → **50 passed, 0 failed, 0 skipped** (45 static +
  5 live). "45 tests pass" in the author's summary is the static-only count
  and is accurate — matches my own count of the `-- static --` section
  line-for-line.
- `pwsh tests\Prove-TestsFailClosed.ps1` → **all 38 mutations caught**,
  confirmed by re-running it myself just now, not by reading the log.
- Spot-checked adjacent claims outside my primary lane, since the brief asks
  every panelist to check every claim: B1 (containment overclaim) — grepped
  the whole repo for "physically cannot leave"; it now appears ONLY inside
  the archived original-finding file (`gate-halo2-2026-08-22/03-docs.md`),
  nowhere live; the generated preset header now reads "cannot reach a
  frontier provider THROUGH THE HARNESS" with an explicit "what this does
  NOT do" section naming the shell-escape gap. G1-EVIDENCE.md's containment
  row literally says "NOT VERIFIED on this run" plus the reasoning. C1/C2/C5
  (Mission Control settings validation) — read `mission-control.mjs:2780-2884`
  directly: explicit `min`/`max` floors, `unique:true` + multi-match refusal,
  `Object.prototype.hasOwnProperty.call` guards in both read and write paths;
  ran `tests/halo/Test-Settings.mjs` myself (passed) and confirmed its C5 case
  uses `JSON.parse('{"__proto__":"x",...}')` exactly as claimed (the shape
  that creates a real own property, vs. an object literal which would not).
  docs-C1 — `docs/design/halo2/SPEC.md` and `IMPLEMENTATION-PLAN.md` exist on
  this branch; H16 test exists and passed in the full run above.

---

## Severity counts for what REMAINS

Blocker: 0. Critical: 0. Major: 0. Minor: 0. Nit: 2 (both informational,
neither exploitable, neither claimed-and-unfixed — see table above: MAP's
unenforced OK:/FAILED: marker on freeform text, and case-insensitive status
matching). No regressions found anywhere I tested.

## Confirmed fixed (this pass, with fresh repro)
F1, F2, F3, F4, F5, M1 — all load-bearing, all re-tested against the current
code, not assumed from the diff.

## Still open
None from my original findings.

## New
Two Nits only (table above); no Minor-or-higher new findings.

## Could not assess
Nanosecond-level true-simultaneous write races on `coverage.json` (only
tested with 8 real concurrent OS processes, which is strong but not a formal
proof). The live dsh workflow engine's behavior under a real >64-unit MAP run
against LM Studio (expensive/long-running, out of scope for adversarial
static-script testing, same caveat as my original pass). Mission Control's
UI/browser-facing behavior and the docs-M2/docs-N1/tests-F3 specifics beyond
what I spot-checked above — those are other panelists' primary lanes; I did
not re-walk the browser myself this pass.
