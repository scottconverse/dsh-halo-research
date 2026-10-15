> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# GauntletGate RE-VERIFICATION — Principal Engineer

**Repo:** halo-stack &middot; **Branch:** feat/halo2-wp2 vs master &middot; **Date:** 2026-08-22
**Method.** Independent re-derivation, not trust of commit messages. For the settings write-path I
extracted the REAL `SETTINGS_WHITELIST`/`computeSettings`/`applySettings` (marker technique) into my
own harness in scratch and drove them against a **copy** of the real, live `~/.dsh/settings.yaml`
(never touched the live file). For the TOCTOU claim I extracted the literal HTTP route body (verbatim
slice between two anchor strings) and ran it with `new Function` against a real scratch file, forcing
a genuine disk mutation between its two reads. For the PowerShell scripts I ran the real scripts
against disposable trees in my scratch dir (never the shared clone), including a real ACL-denied
directory and dual-host runs under both `pwsh 7.6.5` and Windows PowerShell `5.1.26100`. I ran the
project's own `tests/Run-Tests.ps1` and the full 38-mutation `tests/Prove-TestsFailClosed.ps1` myself
(the latter already scratch-copies the repo per mutation, so this was safe to run directly against
the working tree). One early harness result (an apparent M3 regression) turned out to be a bug in my
own test — the live file is CRLF and my first injection used a bare `\n` needle — caught and fixed
before drawing any conclusion; noted here for transparency.

## Summary of REMAINING findings

| Blocker | Critical | Major | Minor | Nit |
|---|---|---|---|---|
| 0 | 0 | 1 (new) | 0 | 0 |

All 5 Criticals and both Blocker-adjacent items in my original deep-dive are confirmed fixed and
load-bearing. Four of six Majors are confirmed fixed and load-bearing; one (M2) is confirmed fixed as
a documentation-honesty issue with its underlying gap now correctly disclosed rather than hidden; one
(M1) is **only partially fixed** — the run-id-critical instance is fixed and proven host-independent,
but a second instance my own original finding cited by exact file:line was missed, still carries the
flawed pattern, and I demonstrated a real undercount from it. All four Minors and the Nit are
confirmed fixed. The suite-level claim (45 static tests / 38 mutations / live==repo) is fully verified
by my own fresh runs, not assumed.

---

## CRITICALS — all 5 confirmed fixed, load-bearing

**C1 (contextWindow/summaryMaxTokens=0).** Re-ran against the REAL live settings.yaml (not just the
test fixture): `contextWindow:'0'` -> `ok:false, "must be at least 4096"`; `summaryMaxTokens:'0'` ->
`ok:false, "must be at least 1024"`. Floors are real (`min`/`max` on every int-kind whitelist entry)
and the refusal math now compares `> 0` explicitly instead of JS truthiness. Load-bearing: enforced at
`applySettings`'s validation stage (a hard `errors.push`), independent of the (also-fixed) `computeSettings`
guards — two independent layers now catch it. Covered by `Test-Settings.mjs` case 7.

**C2 (multi-model contextWindow).** Re-ran against the REAL live file, which genuinely has two
`contextWindow:` keys (131072 and 32768). Edit attempt refuses: `"contextWindow appears 2 times...
will not guess which one you meant"`, and I confirmed **both** original values survive byte-for-byte
in the output — this is not just "refuses," it's "refuses and touches nothing." The `unique:true` flag
drives a real second regex pass (`content.match(new RegExp(spec.re.source,'g'))`) counting all
occurrences before any write. Covered by `Test-Settings.mjs` case 8.

**C3 (run-id / stale-findings collision) — the strongest fix in this batch.** Built a fresh 20-file
tree in scratch, ran the real `Halo-Size.ps1`/`Halo-Plan.ps1`/`Halo-Pending.ps1`. PLAN #1 at
budget=2000 -> `run-b8fbd736caa1` (20 units); wrote a real `findings/unit-000.json`. PLAN #2, same
sizing.json, budget=6000, no `-RunId` -> **`run-cfd7f36eeb79`** (7 units) — a genuinely different
directory, not a collision. `Halo-Pending` on run #2 correctly shows `doneCount:0` for all 7 units
(no cross-contamination is even possible now — the two runs share no directory). Re-ran PLAN #1 again
at budget=2000 -> reproduced the identical `run-b8fbd736caa1` — determinism is not broken by the fix.
This is a structural fix (the collision is now impossible by construction), not a check that happens
to catch it. `Get-RunId` hashes `Budget`+`Safety`; I confirmed `GroupThreshold` (which my original
writeup also named) does *not* actually affect unit packing (`$perUnitContent` at Halo-Plan.ps1:150
depends only on Budget/Safety; `GroupThreshold` only shapes the downstream REDUCE grouping) — so its
omission from the hash is correct, not a gap.

**C4 (stale deploy).** The project's own `V3` test (`Get-FileHash` diff of every `src`/`dst` pair
Deploy-ToLive.ps1 declares) **passes** in my own run — live now hashes equal to repo for every
deployed file, not just Halo-Coverage.ps1. Root cause verified in source: `Deploy-ToLive.ps1`'s config
gate now strips pnpm's own `[WARN]`/deprecated-subdependency/peer-dependency chatter before applying
the `"warn|unmatched|error|not found"` substring check — a structural fix to the gate itself, not a
one-time manual re-sync, so it should hold on future deploys too.

**C5 (prototype-chain keys).** Re-ran with `JSON.parse`-built `__proto__`, `constructor`, `toString`,
`hasOwnProperty`, `valueOf` against the real live file: none throw, all rejected as
`"key not editable"`. A poison key mixed with a legitimate `thresholdRatio` change in one request:
overall `ok:false` as expected. **One nuance worth recording:** `applySettings`'s returned `content`/
`changed` fields still carry the valid sub-edit even when the batch is refused (the function applies
each key independently before checking the aggregate). This is **not a live bug** — I read the only
caller (`mission-control.mjs:3115`, `if (!result.ok) {...; return;}`) and confirmed it sits before the
`fs.writeFileSync` at :3138, so a refused batch never reaches disk regardless. It is a pure-function
contract ("caller writes only when ok," stated in the docstring) correctly honored by its one caller
today, but not enforced by the function itself — worth a NIT-level hardening (return `content: raw`
unchanged when `!ok`) if this function ever gets a second caller, not a finding against the current
behavior.

---

## MAJORS

**M1 — PARTIALLY FIXED. New finding: the second instance I cited is still broken, and I proved it undercounts.**
`Halo-Size.ps1`'s `Get-SizedFiles` (the instance that actually determines run-id-critical file order)
is genuinely fixed: `[Array]::Sort` with `[string]::CompareOrdinal`. I re-ran the **exact original
11-name set** through the exact new comparator, and separately ran the real `Halo-Size.ps1` end-to-end
against a real tree, on both `pwsh 7.6.5` and Windows PowerShell `5.1.26100.9168` — byte-identical
order on both hosts, both ways. This part is solid.

But my original M1 also cited `Halo-Coverage.ps1:218` (now line 285) by exact file:line as a second
instance of the same non-ordinal pattern. **It was not touched.** It still reads, verbatim:
```
truncatedFileCount = (@($truncatedFiles | Sort-Object -Unique -Culture '' -CaseSensitive:$false)).Count
```
Twenty lines above it, in the *same function*, a different piece of code doing dedup over the *same*
`$truncatedFiles` array was correctly fixed to `[System.StringComparer]::OrdinalIgnoreCase` via a
`HashSet` (with its own comment about a live-run-found case-sensitivity bug) — so this one file now
has the right pattern and the wrong pattern side by side, over the same data. I did not just assert
this is theoretically wrong — I demonstrated a real undercount: on `pwsh 7.6.5`, two byte-distinct
paths that are the same visible filename in different Unicode normalization forms (NFC `café.txt` vs
NFD `café.txt`, a real thing multi-platform git checkouts and some editors produce) dedupe to **1**
under the still-broken line and correctly stay **2** under the `OrdinalIgnoreCase` pattern two lines
above. `truncatedFileCount` is a reported metric in `coverage.json`, not a safety gate — the actual
gap-detection loop (`$gapsUnnamed`, lines 262-269) already uses the correct comparer, so no unreviewed
file can hide behind this specific bug. But it is a data-accuracy defect in the coverage-honesty
surface this whole release is built around, it is the literal, unfixed second citation of a finding
the task brief lists as closed ("Eng-M1 ordinal sort... fixed"), and it will silently regress the
moment someone "helpfully" makes the two nearby dedupes consistent by copying the wrong one instead of
the right one — there is no test guarding this line either way.
**Fix:** replace `Halo-Coverage.ps1:285` with the same `OrdinalIgnoreCase`/`HashSet` pattern used at
:265-267 for the same array. **Severity: Major** — real, demonstrated, in the trust-critical reporting
layer, and it's the exact thing the original finding named that the fix pass skipped; not Critical
because no gate is bypassed and no reviewed-file-miss can result from it.

**M2 (G1-EVIDENCE containment overclaim).** Confirmed fixed as a documentation-honesty issue: the
evidence doc now says, verbatim, "**NOT VERIFIED on this run**... that was zero hits over zero
evidence." The underlying gap I originally flagged (no live run has ever exercised a real escape
attempt under the restricted `halo-ljp` preset) still exists — `H15` proves the *scanner* correctly
flags adversarial-looking text in a synthetic findings file, which is a real and valuable test, but it
is not a live agent dispatched under the restricted preset actually trying to get out. That's now
correctly disclosed rather than silently implied clean, which is exactly what my finding asked for.

**M3 (summaryMaxTokens regex anchor).** Confirmed fixed for the realistic threat model. Re-ran with a
CRLF-correct injection (my first attempt silently no-op'd against the live file's CRLF line endings —
own bug, caught before drawing a conclusion) of a genuinely nested `maxTokens:` key at 4-space indent
ahead of the real one: read and write both correctly skip past it to the real 2-space key; the nested
decoy is untouched. A residual exists exactly where the fix's own comment scopes it to still exist — a
second key at the *identical* 2-space indent, inside the same block, ahead of the real one — but that
requires a duplicate key in one YAML mapping, which is itself invalid/undefined-behavior YAML, a much
narrower and less realistic prerequisite than the nested-key case the finding was actually about. Not
an overclaim; the fix does what its comment says.

**M4 (unreadable paths silently dropped).** Confirmed fixed with a real repro, not a mock: built a
directory with a genuine ACL deny (`ListDirectory,Traverse,ReadData` denied via `Set-Acl`) — a plain
file-level read-deny is *not* enough to trigger this, since `Get-ChildItem` only needs directory-list
rights to enumerate metadata, so I had to deny at the directory level to get a real
`UnauthorizedAccessException`. `sizing.json` now reports `unreadableCount:1` and names the exact path;
previously this would have been `0`/`[]` with the file silently absent and zero trace.

**M5/F5 (breaker dead code / miscounted failures).** Confirmed fixed and load-bearing. The child prompt
now requires an `"OK:"`/`"FAILED:"` prefix; the breaker reads it (`softFailed` via regex on the
returned string). The test mocks now return real **strings** (`'FAILED: could not do it'`), matching
the template's own documented contract, not objects — this directly fixes the test/production mismatch
I flagged. I independently ran the full 38-mutation suite (below) and the mutation that disables the
marker (`softFailed = false`) is caught by its own test, confirming this isn't just a green test but a
green test that actually depends on the fix.

**M6 (single overwritten backup).** Confirmed fixed with a real artifact check, not just a source read:
drove the real, extracted HTTP route against a scratch file and inspected the resulting directory —
both `settings.yaml.mc-bak` and a timestamped `settings.yaml.mc-bak-2026-08-22T19-43-46-013Z` were
actually created on disk by a successful apply. A refused apply (my TOCTOU case B) correctly created
**no** backup at all, since the write path returns before reaching the backup code — also correct.

---

## MINORS / NIT — all confirmed fixed

- **TOCTOU** — the strongest verification in this pass: extracted the literal route body (verbatim
  slice from the real source, not a paraphrase) and ran it via `new Function` against a real scratch
  file, deterministically injecting a genuine disk write between the route's two `fs.readFileSync`
  calls (rather than hoping to win a real race window). Result: `409`, and the file on disk retained
  the **external writer's** bytes, not the pending edit — the exact claim, proven with real I/O.
- **No upper bound on int fields** — confirmed: every int-kind whitelist entry now states both `min`
  and `max` (verified directly in `SETTINGS_WHITELIST`).
- **start-cockpit PATH poisoning** — confirmed: now routed through `safeSpawn`, matching every sibling
  action; grepped the whole file, no more bare `spawn()` calls.
- **Crash-path info exposure** — confirmed: outer catch now logs the real error via `console.error`
  server-side and returns a generic `"internal error - see the Mission Control console output"` to the
  caller.
- **Nit (duplicated regex)** — confirmed: `computeSettings` reads through `SETTINGS_WHITELIST` now;
  one definition per value, verified by diffing its computed output against an independent manual
  parse of the live file (all 7 values + derived ratio matched exactly: 131072/0.75/0.5/12288/
  1200000/1/medium, 2.67:1 — also matches the commit message's own quoted numbers).

---

## Suite-level claim: independently re-run, not assumed

- `node tests/halo/Test-Settings.mjs` -> **PASS** (all cases, including the new C1/C2/C5/M3 cases).
- `pwsh tests/Run-Tests.ps1 -Static` -> **45 passed, 0 failed** (matches every commit's claim exactly).
- `pwsh tests/Run-Tests.ps1` (adds the 5 live checks against this machine's actually-running services)
  -> **50 passed, 0 failed**, including `[V3] live config matches the repository (no undeclared
  drift)` — direct, hash-based confirmation of C4 against the real live `~/.dsh/` right now.
- `pwsh tests/Prove-TestsFailClosed.ps1` (all 38 mutations; this script scratch-copies the whole repo
  per mutation via robocopy, so running it directly against the working tree is safe by the tool's own
  design) -> **all 38 mutations caught, 0 missed**, run fresh by me just now.

The "45 tests pass, all 38 mutations caught, deploy exit 0, live == repo" claim is fully substantiated
by evidence I generated myself, not by re-reading the commit message.

## What I could not / did not assess

- Did not run `Deploy-ToLive.ps1` myself (that would write to the real `~/.dsh/`); relied on the `V3`
  hash-comparison test instead, which is a stronger and more general check than my original manual
  diff was.
- Did not dispatch a real agent under `halo-ljp` to attempt a live escape (M2's residual ask) — out of
  scope for a static re-verification pass and would require live model time.
- QA-F5 (SIZE refuse binding on PLAN, exit 3/-Force) and the UX-1..9 / docs items are outside my
  assigned focus (Mission Control write-path + halo scripts); I did not independently re-verify them
  beyond what the shared test suite already demonstrates passing.
