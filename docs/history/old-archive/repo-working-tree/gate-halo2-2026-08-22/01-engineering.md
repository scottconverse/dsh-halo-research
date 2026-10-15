> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# GauntletGate FULL — Principal Engineer deep-dive

**Repo:** halo-stack &middot; **Branch:** feat/halo2-wp2 vs master &middot; **Date:** 2026-08-22
**Scope:** architecture, correctness, security, performance, dependencies. Priority 1: the Mission
Control settings write path (`mission-control/mission-control.mjs`). Priority 2: `scripts/halo/*.ps1`
on hostile input.

**Method.** Every finding below that claims a defect was reproduced, not just read. Where I ran code,
the exact command and output are included. `applySettings`/`computeSettings` were exercised by
extracting them verbatim from the real `mission-control/mission-control.mjs` (the same
marker-based technique `tests/halo/Test-Settings.mjs` itself uses) and running them against a
**copy** of the real, live `C:\Users\scott\.dsh\settings.yaml` — the pure functions never touch a
file path, so this is zero-risk to the live system and uses real production data instead of a
simplified fixture. The `scripts/halo/*.ps1` findings were produced by running the real scripts
against disposable trees under my scratchpad. I did **not** send any POST that would have written to
the live `settings.yaml`, and I did not modify anything under `C:\Users\scott\.dsh\` — see "What I
could not assess" for the resulting gaps.

---

## Summary

| Blocker | Critical | Major | Minor | Nit |
|---|---|---|---|---|
| 0 | 5 | 6 | 4 | 1 |

No Blocker: `shell:true` is genuinely gone (verified, see "What works"), and every state-changing
POST is gated. But two of the Criticals mean the coverage/settings guarantees this release is built
around can be silently defeated under realistic, non-adversarial conditions, and a third means the
branch under review and the code that is actually live right now are different files.

---

## CRITICAL

### C1 — `contextWindow: 0` and `summaryMaxTokens: 0` pass every check and would wedge the harness

**File:** `mission-control/mission-control.mjs:2699-2766` (`SETTINGS_WHITELIST`, `computeSettings`,
`applySettings`), reached from `POST /api/action/apply-settings` at `mission-control.mjs:2976-3001`.

**Expected:** the brief for this route is explicit — "a change that would re-arm a known failure is
refused before it is written" (Settings tab copy, `mission-control.mjs:1194-1197`) — and the design
doc frames G5 as a value-sanity gate, not just a syntax gate.

**Observed** (extracted the real functions, ran them against a copy of the real
`~/.dsh/settings.yaml`):

```
=== TEST B: contextWindow="0" ===
ok= true changed= [ 'contextWindow -> 0' ] errors= [] refusals= []
post-apply computeSettings.values.window = 0
math= {"compactAt":null,"retain":null,"toSummarize":null,"summaryRatio":null} refusals= []

=== TEST C: summaryMaxTokens="0" ===
ok= true changed= [ 'summaryMaxTokens -> 0' ] errors= [] refusals= []
post-apply computeSettings.values.summaryMaxTokens = 0
math= {"compactAt":98304,"retain":65536,"toSummarize":32768,"summaryRatio":null} refusals= []
```

**Cause.** `applySettings` (`mission-control.mjs:2748-2766`) validates `kind:'int'` fields with only
`/^\d+$/.test(v)` (`mission-control.mjs:225`) — "0" matches, there is no lower bound. The three
refusal checks in `computeSettings` (`mission-control.mjs:2712-2745`) are all guarded by JS
truthiness on the derived values:

```js
const compactAt = (window && thresholdRatio != null) ? Math.round(window * thresholdRatio) : null;
...
const summaryRatio = (toSummarize != null && summaryMaxTokens) ? Number(...) : null;
if (summaryRatio != null && summaryRatio > 4) refusals.push(...)   // skipped when summaryRatio is null
```

`window && ...` and `... && summaryMaxTokens` both treat `0` as "not applicable" rather than
"dangerous," so setting either field to 0 makes the guard that is supposed to catch it evaluate to
`null` and silently pass. Writing `contextWindow: 0` to the live daily-brain model
(`llm-pi-ai.providers.lmstudio.models[0]`, currently 131072) makes "room left in the context window"
zero for every future request — the model this whole redesign is built around goes fully unusable
until someone notices and hand-edits the file. Writing `maxTokens: 0` under `compaction-basic:`
(currently 12288) tells the summarizer to fold 32,768 tokens into a 0-token budget — reproducing,
via the Settings UI itself, the exact "compacts forever" failure this release exists to fix
(`~/.dsh/settings.yaml:61-79`, the file's own historical account of that failure).

**Fix.** Add an explicit lower bound to `applySettings`'s int-kind check (e.g. `Number(v) >= <sane
floor>`, not just `/^\d+$/`), and/or change the refusal-check guards from JS truthiness (`window &&`,
`&& summaryMaxTokens`) to explicit `!= null` / `> 0` comparisons so a real zero is evaluated, not
skipped.

**Test.** Add to `tests/halo/Test-Settings.mjs`: `applySettings(SAMPLE, {contextWindow:'0'}, ...)`
and `applySettings(SAMPLE, {summaryMaxTokens:'0'}, ...)` must both return `ok:false`. Neither
current test case uses 0 for any int field.

---

### C2 — the `contextWindow` regex silently edits only the first of two models that exist in the live file today

**File:** `mission-control.mjs:2699-2711` (`SETTINGS_WHITELIST.contextWindow.re`), read side
`mission-control.mjs:2712-2721`.

**Expected:** the Settings tab shows one row, "Context window (tokens)" (`mission-control.mjs:1329`
in the diff), implying one authoritative value.

**Observed:** the live `~/.dsh/settings.yaml` has **two** `contextWindow:` keys right now — line 36
(`qwen/qwen3.8-27b`, the daily-brain model, 131072) and line 54 (`qwen3-coder-30b-a3b-instruct`, the
on-demand worker, 32768). The regex `/(contextWindow:[ \t]*)(\d+)/` has no scoping and
`String.replace` with a non-global regex touches only the first match:

```
before: has 131072? true  has 32768? true
applySettings ok= true changed= [ 'contextWindow -> 999' ]
after:  still has 131072? false  still has 32768? true  now has 999? true
  LINE: "          contextWindow: 999"
  LINE: "          contextWindow: 32768"
```

**Cause.** Nothing in the whitelist entry scopes the match to a specific model id; it depends purely
on file order, which the file's own second model entry already breaks the single-value assumption
for. `tests/halo/Test-Settings.mjs`'s `SAMPLE` fixture (`tests/halo/Test-Settings.mjs:30-47`) has
only **one** model, so this ambiguity has never been exercised by the suite — the "43 tests pass"
claim is true and orthogonal to this bug.

**Fix.** Either scope the regex to the specific model id the UI intends to edit (e.g. anchor on the
model's `- id:` line first), or make the Settings UI enumerate all `contextWindow` occurrences and
let the operator pick, or refuse to edit `contextWindow` at all when more than one occurrence exists.
Silently editing "a" contextWindow when there are two is the dangerous option to leave as default.

**Test.** Extend `Test-Settings.mjs`'s `SAMPLE` to two models (matching the real file's shape) and
assert editing `contextWindow` either targets the correct model explicitly or is rejected — not that
it silently succeeds against whichever occurs first.

---

### C3 — re-planning the same tree under a different budget silently certifies unreviewed files as reviewed

**File:** `scripts/halo/Halo-Plan.ps1:72-82` (`Get-RunId`), `scripts/halo/Halo-Pending.ps1:351-362`.

**Expected:** "The run id is derived deterministically from the file set... so a re-plan of the same
tree lands the same `runs/<id>/`" (`Halo-Plan.ps1:15-16`) is the stated basis for resume (E4), and
COVERAGE's whole reason to exist is "never treat a miss as proof" (`Halo-Coverage.ps1:70`).

**Observed** (ran the real scripts against a 20-file disposable tree):

```
--- PLAN #1, budget=2000 ---
runId : run-7c615be68635   unitCount : 20
unit-000.json under budget=2000 contains: file-1.txt

# a real child completes unit-000 -> findings/unit-000.json {"status":"ok", ...}

--- PLAN #2, SAME sizing.json, budget=6000 (no -RunId given) ---
runId : run-7c615be68635   unitCount : 4      <- SAME run id
unit-000.json under budget=6000 NOW contains: file-1.txt, file-10.txt, file-11.txt, file-12.txt, file-13.txt

--- Halo-Pending.ps1 verdict on unit-000 ---
doneCount=1 pendingCount=3
is unit-000 in the PENDING list? -> False
```

`unit-000` now covers five files, but is reported **done** on the strength of a findings file that
was written when `unit-000` meant one file. `file-10.txt` through `file-13.txt` are never queued for
any child, and nothing anywhere records that.

**Cause.** `Get-RunId` (`Halo-Plan.ps1:72-82`) hashes only `path` and `bytes` per file — it excludes
`UnitBudgetTokens`, `SafetyFactor`, and `GroupThreshold`, all of which determine the packing. Two
plans of the identical tree under different knobs collide on the same run id and the same
`runs/<id>/` directory. `Halo-Pending.ps1` (`Halo-Pending.ps1:351-362`) and
`Halo-Coverage.ps1:115-145` both key completion purely by **filename**
(`findings/<unitId>.json` existing with `status:"ok"`) — neither checks that the findings file was
produced for the *current* content of that unit id. The stale-file cleanup in
`Halo-Plan.ps1:167-171` only removes `units/*.json` on a re-plan; it does not, and cannot, touch
`findings/` (a real finding from a real child is not something PLAN should ever delete) — but that
means a re-plan has no way to invalidate a findings file whose meaning just changed under it.

This is not a contrived race: it requires nothing more than an operator (or a differently-configured
session, since `UnitBudgetTokens` has no persisted "this run was planned at N" record anywhere
outward-visible) re-running PLAN on a partially-completed run with a different budget — exactly the
kind of "let me widen this a bit and continue" move the tool invites once `Halo-Pending.ps1` is sold
as a resume filter.

**Fix.** Fold the packing parameters into `Get-RunId`'s hash (or into a separate "plan generation"
id stamped into both `manifest.json` and each unit file), and have `Halo-Pending.ps1` /
`Halo-Coverage.ps1` reject — not silently accept — a findings file whose generation doesn't match
the current manifest's. At minimum, PLAN should refuse to overwrite `units/` under a run id that
already has a non-empty `findings/` unless the new packing is byte-identical to the old one.

**Test.** None of `H1`-`H14` in `tests/Run-Tests.ps1` re-plans the same run id with a different
`UnitBudgetTokens` against a partially-completed `findings/` directory (the closest, the grouping
test at `tests/Run-Tests.ps1:521-522`, plans the *same* budget into two *different* `RunsRoot`s,
which is a different and much weaker property). Add a case that plants a `findings/unit-000.json`,
re-plans with a different budget, and asserts `Halo-Pending.ps1` still lists the now-different
unit-000 as pending.

---

### C4 — the live deployed `Halo-Coverage.ps1` is not the file in this diff; the fixes this diff claims were never redeployed

**File:** `C:\Users\scott\.dsh\scripts\halo\Halo-Coverage.ps1` vs
`scripts/halo/Halo-Coverage.ps1` (this branch).

**Observed** — the test suite itself catches this, right now, on this branch:

```
PASS  [V3 setup checks apply]
FAIL  [V3] live config matches the repository (no undeclared drift)
      live differs from repo (deploy or sync needed): scripts\halo\Halo-Coverage.ps1
=== summary ===
  47 passed, 1 failed, 0 skipped
```

Direct diff of repo vs. live confirms exactly which fixes are missing from the live copy:

```
153c142
<             if ($text.IndexOf($m, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
---
>             if ($text.IndexOf($m, [System.StringComparison]::Ordinal) -ge 0) {
...
197,205c171,172
<     $seenTrunc = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
...
>     foreach ($p in ($truncatedFiles | Select-Object -Unique)) { ... }
218c185
<     truncatedFileCount = (@($truncatedFiles | Sort-Object -Unique -Culture '' -CaseSensitive:$false)).Count
---
>     truncatedFileCount = (@($truncatedFiles | Select-Object -Unique)).Count
```

**Why it matters.** These are precisely the four bugs G1-EVIDENCE.md (line 52-66) says the 2026-08-22
run "found... and then fixed": the case-sensitive containment scan (a differently-cased provider id
walks through the tripwire live, right now), the case-sensitive `-Unique` dedupe, and the narrower
gap-naming check that produced the false exit-4 alarm. `Halo-Size.ps1`, `Halo-Plan.ps1`, and
`Halo-Pending.ps1` **are** in sync with live (verified: `diff` clean on all three); only
`Halo-Coverage.ps1` has drifted. And `docs/design/halo2/G1-EVIDENCE.md:90` documents the reproduce
path as `$env:USERPROFILE\.dsh\scripts\halo` — the deployed path, matching `SKILL.md:40-42`'s own
documented convention — so reproducing G1 today, exactly as instructed, silently exercises the
pre-fix script.

**Cause.** `Deploy-ToLive.ps1` was not re-run after the Coverage.ps1 fixes were committed.

**Fix.** Run `Deploy-ToLive.ps1`, then re-run `V3`. This is mechanically simple, but it means the
"G1 keystone GREEN" evidence and any live containment check performed since these fixes landed
needs to be understood as evidence about the *old* Coverage.ps1, not the one under review in this
diff — the fixed version has not yet been proven live at all.

---

### C5 — `Object.prototype`-inherited key names in `changes` bypass the whitelist guard and crash — a regression of an already-fixed bug in the same file

**File:** `mission-control.mjs:2748-2766` (`applySettings`), whitelist guard at
`mission-control.mjs:2757` (`const spec = whitelist[key]; if (!spec) {...}`).

**Expected:** any key not in `SETTINGS_WHITELIST` is rejected with `"key not editable from Mission
Control"`. This exact class of bug was already found and fixed in the sibling generic action
dispatcher, three lines away in the same route family:

```js
// mission-control.mjs:3006-3009
// Own properties only: `ACTIONS[a]` walked the prototype chain, so
// /api/action/constructor and /api/action/hasOwnProperty resolved to
// functions and returned 200 (QA3). Restrict to declared actions.
if (Object.prototype.hasOwnProperty.call(ACTIONS, a) && typeof ACTIONS[a] === 'function') {
```

**Observed** — extracted the real functions and drove them with `JSON.parse`, exactly what
`readBody()` (`mission-control.mjs:998-1005`) does to a real request body:

```
=== __proto__ via REAL JSON.parse (exactly what readBody() does) ===
Object.keys(changes): ["__proto__"]
Object.getPrototypeOf(changes) === Object.prototype ? true      <- prototype itself NOT corrupted
own hasOwnProperty("__proto__"): true                            <- but it IS a real own key
applySettings: THROWN -> TypeError: Cannot read properties of undefined (reading 'test')

=== nested-object payload (max mischief attempt) ===
THROWN -> TypeError: Cannot read properties of undefined (reading 'test')
Did this pollute Object.prototype for a brand-new unrelated object? freshObj.polluted = undefined  <- no

=== poison key + a legitimate change in the SAME request (either order) ===
THROWN (whole call aborted, contextWindow change never applied either)
```

Also reproduced for `constructor`, `toString`, `hasOwnProperty` (all throw the same way).
`SETTINGS_WHITELIST['__proto__'] === Object.prototype` is `true` — the guard's `if (!spec)` sees a
truthy value (the inherited prototype object itself, which has no `.re`/`.kind`) and lets it through,
then crashes on `spec.re.test(...)`.

**What this is not:** I want to be precise about severity here — this is **not** actual
`Object.prototype` pollution. `changes.__proto__` is JSON.parse's own literal-named data property
(it shadows the accessor for reads), never a write to the real prototype slot, and `spec` always
comes from the hardcoded `SETTINGS_WHITELIST`, never from attacker data, so there is no path to
forge a fake spec with a controllable `.re`. `freshObj.polluted` above confirms no cross-request
corruption occurs. The route's outer `catch (e) { res.writeHead(500); res.end(String(e)); }`
(`mission-control.mjs:3015`) catches this cleanly — no process crash.

**Why it's still Critical, not just a curiosity:** the exact same lookup pattern
(`whitelist[key]`/`ACTIONS[a]` on a plain object with an attacker-controlled key) was already
identified as dangerous enough to fix (QA3) in this file, with a comment explaining exactly why —
and the brand-new `apply-settings` route, added in this same diff, reintroduces the unsafe pattern
fifty lines away. It also has a real, if modest, availability/integrity consequence: any batch of
edits that happens to include one of ~7 poisoned key names (an operator scripting a bulk
`changes` payload, or copy-pasting `Object.keys()` of something else) silently loses **every**
change in that request, with a generic 500 and no indication which key caused it.

**Fix.** `Object.prototype.hasOwnProperty.call(whitelist, key)` (the exact fix already used for
`ACTIONS`), or build `SETTINGS_WHITELIST` with `Object.create(null)`, or use a `Map`.

**Test.** `tests/halo/Test-Settings.mjs` has no case with `__proto__`/`constructor`/`toString`/
`hasOwnProperty` as a key — add one asserting `applySettings` returns `ok:false` with a clean
"not editable" error rather than throwing.

---

## MAJOR

### M1 — `-Culture ''` is not ordinal (contrary to the docstring), and demonstrably diverges between PowerShell 5.1 and 7 on this machine

**File:** `scripts/halo/Halo-Size.ps1:107-113` (`Get-SizedFiles`'s final `Sort-Object`),
`scripts/halo/Halo-Coverage.ps1:218`. Docstring claim: `Halo-Size.ps1:47-48` — "Deterministic: files
are sized in a **stable ordinal-sorted order**."

**Observed.** `-Culture ''` is invariant culture, not ordinal
(`[System.Globalization.CultureInfo]::InvariantCulture.Name -eq '' ` → `True`), and I ran the
identical sort on the identical machine under both PowerShell hosts actually installed here:

```
=== pwsh 7.6.5 ===
ORDER=a.txt,A.txt,file_1.txt,file-1.txt,FILE.txt,file.txt,fileA.txt,filea.txt,G1_notes.md,G1-EVIDENCE.md,z.txt

=== Windows PowerShell 5.1.26100.9168 ===
ORDER=a.txt,A.txt,FILE.txt,file.txt,file_1.txt,file-1.txt,fileA.txt,filea.txt,G1_notes.md,G1-EVIDENCE.md,z.txt
```

Same 11 filenames, same `-Culture ''` argument, same machine — different order (`file_1.txt` /
`file-1.txt` swap position relative to `FILE.txt` / `file.txt`).

**Why it matters.** `Halo-Plan.ps1:72-82`'s `Get-RunId` hashes the files **in the order SIZE
produced them.** If that order is not stable across the PowerShell host that happens to run it, the
run id for an *unchanged* tree can differ — silently defeating the "same tree → same run id →
resumable" claim that is the stated basis for E4, independent of and in addition to C3 above.
`skills/large-job/SKILL.md:43` pins the documented flow to "your `pwsh` tool," which narrows the
practical exposure — but every one of these scripts' own `.NOTES` explicitly claims "PowerShell 5.1
compatible" (a portability promise the code does not keep for *determinism*, only for *syntax*), and
this same codebase already invokes `powershell.exe` directly elsewhere in this diff's own file
(`mission-control.mjs:991`, `start-cockpit`), so mixed-runtime invocation is not a hypothetical
pattern here — it's how this project already runs some of its own subprocesses.

**Fix.** Use `[System.StringComparer]::Ordinal` (or `OrdinalIgnoreCase`, matching the dedupe
comparer already used two lines above at `Halo-Size.ps1:108`) instead of `-Culture ''`. This also
makes the docstring's "ordinal-sorted" claim actually true.

**Test.** A determinism test that sorts a fixture with a hyphen/underscore pair (or runs
`Halo-Size.ps1` under both `pwsh` and `powershell.exe` and diffs `sizing.json`) — none of `H1`/`H2`
currently cross-checks sort output between hosts.

---

### M2 — G1's live evidence never exercised the `halo-ljp` containment wall

**File:** `docs/design/halo2/G1-EVIDENCE.md:80-82`.

The evidence file is honest about this — I am restating it because the brief's list of claims to
attack names "Containment (E5/P9): the restricted `halo-ljp` preset is the WALL... the COVERAGE
log-check is a backstop," and the one live, unattended run cited as proof ran under
**`halo-standard`**, which still mounts the external-provider subagent tools:

> "Run under the standard preset, not `halo-ljp`. Containment came back clean, but the
> restricted-preset wall itself is proven by construction + H5, and the Q12 bypass probe (SPEC §9)
> remains open."

`H5` (`tests/Run-Tests.ps1`) verifies the **shape** of `halo-ljp/agent.cordis.yml` (the three
external `tool-subagent` rows are absent, and it matches what `Build-LjpPreset.ps1` regenerates from
`halo-standard`) — a real, valuable, and passing check. But no live run has yet demonstrated a child
running under the restricted preset attempting, and failing, to reach an external provider. Given
this is the single mechanism the whole design calls "the wall" (with COVERAGE explicitly downgraded
to "backstop, not guarantee" in this same diff's own comments,
`scripts/halo/Halo-Coverage.ps1:63-72`), the wall itself has zero live evidence behind it yet — only
static construction and a unit test of its shape.

**Fix.** Not a code fix — a test-plan gap. Run G1 (or a smaller adversarial variant) under
`halo-ljp` with a child *deliberately instructed* to try reaching `subagent_codex`, and confirm both
that the call is unavailable (proving the wall) and that COVERAGE would have caught it if it weren't
(proving the backstop).

---

### M3 — `summaryMaxTokens`'s regex has no indentation anchor; a future nested `maxTokens` key silently hijacks both read and write

**File:** `mission-control.mjs:2699-2711` (`SETTINGS_WHITELIST.summaryMaxTokens.re`),
`mission-control.mjs:2712-2721` (`computeSettings`'s parallel regex).

I want to be precise here because my first hypothesis (a plain **comment** mentioning "maxTokens:"
would hijack the match) turned out to be **wrong**, and I'm reporting the corrected, verified version:

**Comments are safe — verified:**

```
injected comment present in hijacked copy? true   ("# tuning note: we tried maxTokens: 8192 ...")
apply summaryMaxTokens=55000 -> ok=true
  LINE: "  # tuning note: we tried maxTokens: 8192 before landing on the value below"   <- untouched
  LINE: "  maxTokens: 55000"                                                             <- correct line edited
```

This works because `[ \t]*` (between the `\n` and `maxTokens:`) matches only spaces/tabs, not `#` —
a comment can never satisfy "maxTokens: is the first token on the line," so the lazy match correctly
skips past it to the real key. **Credit due: this is a smarter regex than it looks at first glance.**

**A structural nested key is not safe:**

```
=== nested maxTokens key added ahead of the real one (not a comment -- a real YAML key) ===
summaryMaxTokens BEFORE nested key added: 12288
summaryMaxTokens the UI would DISPLAY once that key exists (should be 12288, is it?): 4096
apply summaryMaxTokens=55000 -> ok=true
  LINE: "      maxTokens: 55000"   <- the NEW nested key, now wrong
  LINE: "  maxTokens: 12288"       <- the REAL summarizer cap, untouched, still 12288
```

Any future key literally named `maxTokens` placed anywhere inside the `compaction-basic:` block
before line 88 — at any indentation, e.g. a per-model override — silently becomes both what
`GET /api/settings` displays and what the "Apply" button edits, while the real summarizer cap goes
untouched. Both `computeSettings` and `applySettings` are fooled identically (same lazy pattern), so
there is no self-inconsistency to notice — the UI would confidently show and let the operator edit
the wrong number. This is the same root cause as C2 (unanchored, order-dependent regex matching)
applied to a currently-hypothetical-but-plausible future edit rather than today's file.

**Fix.** Anchor the match to the exact `compaction-basic:` block boundary (e.g. stop the lazy match
at the next unindented top-level key, not just at the next literal `maxTokens:`), or key off column
position (`^  maxTokens:` at the block's own indent level) instead of "first occurrence anywhere
after."

---

### M4 — SIZE's directory walk silently drops anything `Get-ChildItem` errors on, with zero record

**File:** `scripts/halo/Halo-Size.ps1:97` — `Get-ChildItem -LiteralPath $root -Recurse -File -Force
-ErrorAction SilentlyContinue`.

**Tested:** built a tree with a self-referential junction (`hostile\sub\loopback` →
`hostile`, its own grandparent) and ran `Halo-Size.ps1` against it under a bounded timeout.

```
job completed within 25s. State: Completed
"files": [ empty.txt (0 bytes), normal.txt (12 bytes), sub\unicode-content.txt (16 bytes) ]
```

**Good news, verified, not a bug:** it does **not** hang or infinite-loop — `Get-ChildItem -Recurse`
does not descend into the reparse point by default. I want to be clear I tested this rather than
assumed it, since the opposite (a hang) was my working hypothesis going in.

**The actual gap:** the junction (and by the same mechanism, any permission-denied directory, any
path that trips `PathTooLongException` under a PS 5.1 host without long-path support, any locked
file) is excluded from `sizing.json`'s `files` array with **no warning, no error record, and no
trace anywhere** that it was ever seen — `-ErrorAction SilentlyContinue` swallows the per-item error
entirely. This directly contradicts the pipeline's own design promise
(`Halo-Plan.ps1:12-13`: "Nothing is silently dropped: any file that cannot fit whole is included
truncated, with the reason recorded") — that promise is honored for files PLAN decides not to
include whole, but not for files SIZE never enumerated in the first place. An operator pointing this
at a tree with restricted-ACL subdirectories or (plausible in a real monorepo) a junction to shared
code would get a `sizing.json` that looks complete and is not, with no gap for COVERAGE to ever
name because COVERAGE only knows about units PLAN created from what SIZE reported.

**Fix.** Replace `-ErrorAction SilentlyContinue` with `-ErrorAction SilentlyContinue -ErrorVariable
+walkErrors` (or equivalent) and surface the count/paths of anything skipped into `sizing.json` (a
new `skipped: [...]` array), so COVERAGE has something to check against.

---

### M5 — the MAP breaker's content-based failure detection is very likely dead code in production; the unit test's mock doesn't match the template's own documented contract

**File:** `skills/large-job/map.workflow.js:78-92`, comment at `map.workflow.js:71-77`; test at
`tests/halo/Test-MapTemplate.mjs:91-101` (case 4).

**The template's own comment** explains why no `schema` is passed to `agent()`: "a normal text
return resolves to null... Track completion by the return being non-null." The prompt built three
lines later instructs the real child to "return a plain-text summary of at most 1000 characters"
(`map.workflow.js:68`). Put together, this says the real, production value of `res` for a
well-behaved child is a **string**.

**The breaker's own failure check**, immediately below, is:

```js
const failed = (res === null) || (res && res.status && res.status !== 'ok');
```

If `res` is a plain string, `res.status` is `undefined` for every child, always — the second half of
this condition can never be true in production; `failed` reduces to `res === null`. That means the
breaker (`BREAKER_CONSECUTIVE`/`BREAKER_TOTAL`, `map.workflow.js:38-39`) can only ever be tripped by
a **hard** agent-call failure (timeout, error, no return), never by a child that runs to completion,
returns its plain-text confirmation as instructed, but wrote `status:"failed"` into its own
`findings/<unit>.json` — a model that is genuinely struggling with every unit in a "soft" way would
run the entire MAP phase to completion with zero early stop, which is exactly the "pushed 6 times
into a doomed job, never cancelled" failure pattern this whole redesign exists to avoid.

**And the test that should catch this doesn't**, because its mock doesn't match the template's own
documented contract:

```js
// Test-MapTemplate.mjs:92-97, case 4: "status:'failed' object counts as a failure"
if (opts.label === 'map:unit-000') return { status: 'failed', summary: 'could not' };
```

The mock hands back a **structured object**, which is precisely the shape the template's own comment
says `agent()` will not produce when no `schema` is given. The test passes ("map.workflow.js: all
template control-flow checks passed," and `H8` is green in `tests/Run-Tests.ps1`), but it is
verifying a code path that, per the template's own reasoning about its own design, real children
reachable through this exact prompt cannot exercise.

**Honesty about confidence:** I could not inspect dsh's `agent()` tool implementation directly (it's
an external harness dependency, not in this repository), so I cannot rule out that the real engine
does something to a plain-text return that makes `.status` meaningful anyway (e.g. attempts a JSON
parse regardless of schema). The template's own comment is the strongest evidence I have, and it
points at `res` being a bare string. I'm flagging this at Major with that caveat rather than Critical
specifically because I could not get ground truth from the engine itself — see "What I could not
assess."

**Fix.** If `res` is confirmed to be a plain string in production, either have the child also emit a
short structured status token the template can check (without re-triggering the schema-coercion
problem the comment describes), or have MAP re-read `findings/<unit>.json` itself after each child
(cheap, local, no model call) to drive the breaker off the same source of truth COVERAGE eventually
uses, instead of off the free-text return value.

**Test.** Fix `Test-MapTemplate.mjs`'s mock to return a bare string with an embedded
`status:"failed"`-equivalent (matching what the real prompt asks for), and confirm the breaker's
actual behavior against that shape.

---

### M6 — `.mc-bak` is a single, unconditionally overwritten backup slot

**File:** `mission-control.mjs:2993-2995`:

```js
fs.copyFileSync(SETTINGS_FILE, SETTINGS_FILE + '.mc-bak');
fs.writeFileSync(SETTINGS_FILE, result.content, 'utf8');
```

Every successful apply overwrites `.mc-bak` with whatever was current *just before this apply* — not
the original config. Two successive applies (the second a plausible fat-finger that still passes
validation, e.g. a technically-in-range but wrong ratio) leave the operator able to recover only the
state *after* the first edit via `.mc-bak`, not the pristine pre-any-edit config, even though the
UI's only stated safety net for a bad apply is this file. (The real original is still recoverable
from git via `Sync-FromLive`'s counterpart, so this is not unrecoverable in an absolute sense — just
not recoverable through the one mechanism the code itself provides.)

**Fix.** Timestamp the backup (`settings.yaml.mc-bak.<ISO8601>`) or keep a short rolling history
instead of one slot.

---

## MINOR

- **TOCTOU, narrow.** Between `fs.readFileSync(SETTINGS_FILE)` (`mission-control.mjs:2983`) and the
  write (`mission-control.mjs:2994-2995`) there is no `await`, so two concurrent HTTP requests to
  this Node process cannot interleave mid-sequence (verified by reading the code path for any yield
  point — there is none). The real exposure is an *external* writer (a human hand-editing the file,
  or `dsh` itself hot-reloading and rewriting it) landing in that sub-millisecond window; genuine but
  much narrower than a "two browser tabs" race would suggest, and not directly demonstrated live
  (see "What I could not assess").
- **No upper bound on `int`-kind fields.** `/^\d+$/` accepts arbitrarily long digit strings for
  `contextWindow`, `summaryMaxTokens`, `streamIdleTimeoutMs`, `maxRetries` — e.g. a 40-digit
  `contextWindow` (`mission-control.mjs:225`). In my test this particular value happened to still get
  refused, but only as a side effect of the *unrelated* summary-ratio check ballooning past 4:1, not
  from any deliberate bound on the field itself — a window enlarged to, say, 500,000 (not
  astronomically large) would clear that same incidental trip and sail through.
- **`start-cockpit` bypasses the file's own PATH-poisoning hardening.** Every other `ACTIONS` entry
  (`load-q5`, `load-worker`, `unload-worker`, `unload-all`) goes through `safeSpawn`/`resolveExe`,
  which explicitly resolves a fixed location "so a poisoned PATH cannot redirect us"
  (`mission-control.mjs:27-43`). `start-cockpit` (`mission-control.mjs:991`) calls
  `spawn('powershell.exe', [...])` directly, letting Windows resolve the bare name via ambient PATH.
  `shell:true` is not set here either way (so no shell-injection), and `System32` is not
  user-writable, so exploitability is low — but it's an inconsistently-applied version of the exact
  threat model this file spends real effort hardening against everywhere else.
- **Crash-path info exposure.** The outer `catch (e) { res.writeHead(500); res.end(String(e)); }`
  (`mission-control.mjs:3015`) returns a raw `TypeError` message to the caller on the C5 crash path.
  Bounded (no stack trace, no secrets in the message I observed), but a generic "internal error"
  would be cleaner.

## NIT

- `computeSettings`'s and `SETTINGS_WHITELIST.summaryMaxTokens`'s regexes are structurally
  duplicated (same lazy pattern defined twice, `mission-control.mjs:2716` and `:2705`) — a future fix
  to one (e.g. for M3) is easy to apply to only one copy and leave read/write inconsistent with each
  other for the first time. Worth factoring into one shared pattern.

---

## What works (verified, not assumed)

- **`shell:true` is genuinely gone.** Grepped the whole file: zero occurrences outside comments
  describing the old bug and the fix. `resolveExe`/`safeSpawn`/`safeExecFile`
  (`mission-control.mjs:27-55`) consistently pass argv arrays with `shell:false`. `SEC1` in
  `tests/Run-Tests.ps1` passes and matches what I read.
- **Every state-changing POST is gated**, including the new `apply-settings` route
  (`mission-control.mjs:2977`), on the same `actionAuthorized` token+Origin check used everywhere
  else. `SEC2` passes and matches what I read.
- **The `/api/action/*` generic dispatcher's own prototype-chain bug (QA3) is correctly fixed**
  (`mission-control.mjs:3006-3009`, `Object.prototype.hasOwnProperty.call`) — this is the exact
  pattern C5 needs applied to `SETTINGS_WHITELIST` too.
- **The refusal checks that do fire, fire correctly.** `retainRatio >= thresholdRatio` (F3) and
  `summaryRatio > 4` (treadmill) both refused as designed in every non-zero case I tried, matching
  `Test-Settings.mjs`'s own assertions.
- **The gap-honesty "named in any form" fix in `Halo-Coverage.ps1` (`:186-194`) is real and correct**
  in the repo copy — I traced the `$namedPath` closure and it does what the comment says. (It just
  isn't live yet — see C4.)
- **The junction-loop concern I went in expecting was wrong** — `Get-ChildItem -Recurse` does not
  follow reparse points and does not hang (M4 above is about silent omission, not a hang).
- **`Build-LjpPreset.ps1` fails closed on its own assumptions** — it counts the rows it removes and
  hard-errors (exit 2) if the count doesn't match what it expects, rather than silently producing a
  wrong preset if `halo-standard`'s shape changes underneath it. Well-designed self-check.
- **The `dsh/cordis.patch.yml` duplicate-registration fix** (removing the redundant
  `subagent-codex`/`subagent-claude-code` inserts that broke the headless lane) is well-diagnosed,
  well-commented, and matches the stated live verification (both profiles compose 1/1/1).

## What I could not assess

- **No live HTTP POST against the running `:3090` `apply-settings` endpoint.** All settings-path
  findings (C1, C2, C5, M3, M6, the TOCTOU minor) were proven by extracting and running the real,
  unmodified production functions against a copy of the real data — I deliberately avoided sending a
  request that would actually mutate the live `~/.dsh/settings.yaml`. Route wiring (token
  requirement, status codes, the outer catch) was verified by reading the source, not by an
  end-to-end request. I believe this gives equivalent confidence in the *logic* while carrying zero
  live-system risk, but I did not observe the live HTTP response bytes for these cases.
- **True concurrent-request TOCTOU was reasoned from the code (no `await` between read and write),
  not reproduced with an actual two-socket race against the live server.**
- **PowerShell-5.1 execution of the full LJP pipeline end-to-end.** I proved the `-Culture ''`
  ordering divergence (M1) in isolation under both hosts; I did not run a complete SIZE→PLAN→MAP→
  COVERAGE cycle under Windows PowerShell 5.1.
- **dsh's `agent()` tool internals** (M5) — not part of this repository; I could not confirm from
  source what shape a schema-less text return actually takes at the workflow-engine level.
- **`tests/Prove-TestsFailClosed.ps1`'s full mutation matrix** was not executed (I ran
  `tests/Run-Tests.ps1` directly — 47 passed/1 failed, see C4 — and `tests/halo/Test-Settings.mjs`
  directly — passes cleanly, consistent with C1/C2/C5 being genuinely outside its coverage rather
  than something a passing mutation score would have caught). I did not separately run the
  35-mutation suite itself.
- **`dsh/agent-presets/halo-ljp/agent.cordis.yml` and `dsh/agent-presets/halo-standard/agent.cordis.yml`**
  were read for the `maxResultChars: 2000` addition and cross-checked against `Build-LjpPreset.ps1`'s
  strip logic, but not exhaustively diffed line-by-line beyond that.
- **Performance and dependencies**: no new external dependencies are introduced by this diff
  (Mission Control stays "zero deps, single file"; the halo scripts are pure PowerShell). I have no
  performance finding beyond the correctness issues above — the sequential-MAP design is a
  deliberate, working choice (consistent with G1's measured 65.7 min / 0 compaction / 0 retries), not
  a defect.
