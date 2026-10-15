> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# GauntletGate FULL — Technical Writer deep-dive

**Repo:** halo-stack · **Branch:** `feat/halo2-wp2` vs `master` · **Date:** 2026-08-22
**Scope:** honesty/accuracy of every user-facing and design claim in README.md,
docs/USER-MANUAL.md, docs/design/halo2/SPEC.md, docs/design/halo2/IMPLEMENTATION-PLAN.md,
docs/design/halo2/G1-EVIDENCE.md, skills/large-job/SKILL.md, CHANGELOG.md,
site/index.html, docs/index.html — checked against what the code in this branch
actually does, and, where the stack is live, against the running system.

**Method:** read the full `git diff master..feat/halo2-wp2` (23 files, +2017/-24) and
every file in scope; read the actual preset/coverage/workflow source the docs
describe; inspected the real G1 run artifacts on disk
(`C:\Users\scott\Desktop\Code\runs\run-2e8a18ee1aa9\`); ran `tests\Run-Tests.ps1`
live, three times (once with `-CleanClone`); drove Mission Control live in a
browser at `http://127.0.0.1:3090`. Every claim below states what I ran or read
and quotes what I found — nothing here is inferred without a cited source.

---

## Severity summary

| Blocker | Critical | Major | Minor | Nit |
|---|---|---|---|---|
| 1 | 1 | 3 | 1 | 0 |

---

## BLOCKER

### B1 — "physically cannot [leave the machine]" is not supported by this branch's own evidence; the one real run had nothing to check

**Claim, verbatim, in two shipped files:**
- `skills/large-job/SKILL.md:108` — "under the restricted **`halo-ljp`** preset ... so children **physically cannot delegate to a frontier provider**."
- `dsh/agent-presets/halo-ljp/agent.cordis.yml:5` (the generated preset's own header) — "so an LJP child **physically cannot leave the machine** (E5 / P9)."
- `skills/large-job/map.workflow.js:49` — "under the restricted LJP preset they **physically lack** the external-provider tools."

**What I verified instead:**

1. **The one real ("keystone") run did not exercise this preset at all — and this part IS disclosed.** `docs/design/halo2/G1-EVIDENCE.md:80-82`: "**Run under the standard preset**, not `halo-ljp`. Containment came back clean, but the restricted-preset wall itself is proven by construction + H5, and the Q12 bypass probe (SPEC §9) remains open." Good — that's honest. But the "Measured result" table two sections earlier, `G1-EVIDENCE.md:36`, lists **`Containment (E5/G9) | no breach | containmentBreached: false`** in the exact same tabular, positively-measured format as "Wall clock: 65.7 min" and "Units completed: 5/5" — with nothing at that point in the document signalling that this particular row is categorically different (an absence of evidence, not a measurement). A reader who stops at the table, which is the document's own headline, reads "checked, and clean."

2. **The check itself had nothing to examine, independent of which preset was used — and this is NOT disclosed anywhere.** I read the real run's artifacts directly:
   - `C:\Users\scott\Desktop\Code\runs\run-2e8a18ee1aa9\` contains `manifest.json`, `units/`, `findings/`, `REPORT.md`, `coverage.json` — **there is no `logs/` directory.** `scripts/halo/Halo-Coverage.ps1:106,148`: `$logsDir = Join-Path $RunDir 'logs'` then `if (Test-Path -LiteralPath $logsDir) { ... }` — when the directory doesn't exist, the entire E5 log-scan loop (lines 148-158) never executes. Nothing in `skills/large-job/map.workflow.js` or `Halo-Plan.ps1`/`Halo-Pending.ps1` ever creates `runs/<id>/logs/`.
   - I read `findings/unit-004.json` directly (the real output of a real child): its keys are `status, unit, file, bytes_reviewed, file_size_bytes, summary, purpose, windows_gotchas, risk` — **no `providersUsed` field.** `Halo-Coverage.ps1:135`: `if ($fnd.PSObject.Properties.Name -contains 'providersUsed') { ... }` — absent, so this branch of the check also contributes zero hits. Tracing why: the child prompt built in `map.workflow.js:61-69` tells the child to write `status` + `summary` + "whatever structured findings the brief asks for," and the `findingSchema` SKILL.md instructs the operator to pass (`SKILL.md:114-119`) requires only `status` and `summary`. **Nothing in the pipeline ever asks a child to self-report which providers it used.**
   - So `containmentBreached: false` in the real `coverage.json` (`C:\Users\scott\Desktop\Code\runs\run-2e8a18ee1aa9\coverage.json:10-11`, `"containmentBreached": false, "providerHits": []`) is correct as a mechanical fact — zero hits — but it is not evidence of anything, because the two lists it scans were both structurally empty by construction, not "scanned and found clean."

3. **The mechanism this containment rests on (Cordis tool-row removal) is not the only path off the machine, and this branch does nothing to close the other one.** I read `dsh/agent-presets/halo-ljp/agent.cordis.yml` in full: `tool-bash`/`tool-pwsh` (lines 51-57) remain fully mounted — the preset removes only the three Cordis subagent tool rows (`tool-subagent-codex`/`-claude-code`/`-opencode`, confirmed absent by diffing this file against `halo-standard`'s). No file in this repo defines network or process egress isolation for a child's shell (`grep -ri "sandbox|network|egress|firewall" dsh/` finds only `bash-sandbox`/`pwsh-sandbox`, which the code comments identify as filesystem/approval sandboxing living in the harness, not network policy). The README's own "Reach" section (and `site/index.html:106`) brags that Codex, Claude Code, and OpenCode run "on existing local auth" — i.e., their CLIs are pre-authenticated on this exact machine. A shell-capable child could therefore invoke `codex exec "..."` or `claude -p "..."` directly, bypassing Cordis entirely. The `ExternalMarkers` list that would need to catch this (`Halo-Coverage.ps1:73-76`: `subagent_codex, subagent_claude_code, subagent_opencode, subagent-codex, subagent-claude-code, subagent-opencode-acp`) contains only Cordis provider-id substrings — not the bare binary names (`codex`, `claude`, `opencode`) or any API hostname a raw shell command would use. This is not a hypothetical I constructed: **the G1 run's own REPORT.md says it, in the model's own words.** `C:\Users\scott\Desktop\Code\runs\run-2e8a18ee1aa9\REPORT.md:26` (unit-003, reviewing SKILL.md itself): *"containment rests entirely on the `halo-ljp` preset with only the post-hoc exit-5 tripwire as detection."* And `Halo-Coverage.ps1:66-67` (the script's own comment, written by this branch): *"a provider whose name is not in this list slips past... a hidden hole."*

**Why this is Blocker, not Critical:** the rubric defaults security findings to Critical/Blocker "unless exposure is genuinely theoretical." LJP's entire purpose is to read large, potentially untrusted trees (repo audits, doc corpora) — exactly the class of input where a prompt-injection payload embedded in a reviewed file could instruct a child to shell out. The avenue (mounted shell + pre-authenticated CLIs + no network isolation) is concretely present in this branch's own config, not speculative. The confident, unqualified word **"physically"** appears in the skill instructions that get loaded into every agent session and in the generated preset file itself — the two places an operator or a future engineer would trust most — while the actual backstop's own author-written comments (`Halo-Coverage.ps1:63-72`) and the system's own G1 run output already contradict that confidence.

**Fix:** (1) soften "physically cannot" to what's true — "the preset removes the Cordis subagent tools; shell access to any pre-authenticated CLI is not currently blocked" — in `SKILL.md:108`, `map.workflow.js:49`, and the halo-ljp header comment. (2) Either wire `map.workflow.js` to make `providersUsed` a required field the child must self-report and have COVERAGE write real session logs to `runs/<id>/logs/`, or state plainly in `G1-EVIDENCE.md`'s limits section that the E5 check had zero data on this run. (3) Extend `$script:ExternalMarkers` (or add a second check) to cover bare CLI invocation, or explicitly scope the residual risk in writing and route it to the still-open Q12 probe.

**How to test:** reproduce my artifact read (`Get-Content runs\run-2e8a18ee1aa9\findings\unit-004.json | ConvertFrom-Json | Get-Member` shows no `providersUsed`; `Test-Path runs\run-2e8a18ee1aa9\logs` returns `False`). To test the shell-escape avenue directly: under the `halo-ljp` preset, ask a child to run `pwsh -c "codex --version"` (or any installed, authenticated CLI) and see whether it succeeds and whether `Halo-Coverage.ps1` flags it — my reading of the marker list says it will not.

---

## CRITICAL

### C1 — The design spec and implementation plan this whole diff cites do not exist in this branch

**Task brief asked me to read** `docs/design/halo2/SPEC.md (v2.1)` and
`docs/design/halo2/IMPLEMENTATION-PLAN.md`. Neither exists on `feat/halo2-wp2`.

```
$ git show feat/halo2-wp2:docs/design/halo2/SPEC.md
fatal: path 'docs/design/halo2/SPEC.md' does not exist in 'feat/halo2-wp2'

$ git ls-tree -r feat/halo2-wp2 --name-only -- docs/design/
docs/design/budgeted-emit-dryrun-2026-08-19.md
docs/design/budgeted-emit-pipeline-design.md
docs/design/budgeted-emit-pipeline.html
docs/design/budgeted-emit-pipeline.mermaid
docs/design/budgeted-emit-pipeline.spec.json
docs/design/halo2/G1-EVIDENCE.md
```

Both files exist, fully written (SPEC v2.1, 7 commits' worth of drafting and an
audit-disposition pass), **only on a sibling branch, `spec/halo2-redesign`**,
which branches from `master` independently and was never merged into
`feat/halo2-wp1` or `feat/halo2-wp2` (`git merge-base --is-ancestor
spec/halo2-redesign feat/halo2-wp2` → `NO`). They are also absent from the live
deployed copy at `~\.dsh\` (searched, not found).

**Why this matters more than a missing file:** this diff's own artifacts cite the
missing document by section and code number constantly, and none of those
citations can be checked by anyone reading only this branch:
`G1-EVIDENCE.md:5` ("SPEC v2.1 §7"), `:14` ("SPEC §1, F1–F3"), `:82` ("SPEC §9");
`Halo-Coverage.ps1:8,18,70` ("spec 4.2.8", "E5 in spec 4.2.7", "spec 4.2.7");
`map.workflow.js:8,45,99` ("spec E6", "P5 / F4 / E2b", "spec 4.2.5");
`agent.cordis.yml` comments ("P3/G1", "E5 / P9"); commit messages throughout
(`P6`, `F2`, `F3`, `G5`, `G7`, `G9`, `H5`, `H8`, `Q12`, `T0`, `audit-2`). A new
engineer — or the next stage of this very gate — pulling `feat/halo2-wp2` has no
way to learn what "G1" or "P9" or "F3" mean; they are letters and numbers with
no definition anywhere reachable from the branch.

**Fix:** merge or cherry-pick `docs/design/halo2/SPEC.md` and
`IMPLEMENTATION-PLAN.md` from `spec/halo2-redesign` into this branch (or its
target) before it advances further. This is mechanical — the content already
exists and is not in question — but it is not optional: every acceptance
criterion this stage gate is meant to check against is currently unverifiable
from the artifact under test.

**How to test:** `git show feat/halo2-wp2:docs/design/halo2/SPEC.md` (or the
merged/target branch) should succeed, not error.

---

## MAJOR

### M1 — The live, running deployment does not have the fixes this branch says were found and proven; reproduced 3 times

Ran `pwsh -NoProfile -File tests/Run-Tests.ps1` from the repo root, live, three
separate times (once with `-CleanClone`). Every run fails the same way:

```
FAIL  [V3] live config matches the repository (no undeclared drift)
      live differs from repo (deploy or sync needed): scripts\halo\Halo-Coverage.ps1
...
47 passed, 1 failed, 0 skipped
```

`V3` (`tests/Run-Tests.ps1:816-`) walks every `src=...;dst=...` pair in
`scripts/Deploy-ToLive.ps1` — i.e. it is a comprehensive live-vs-repo drift
check, not a narrow spot check — and today it names exactly one drifted file.
I diffed it directly:

```
$ diff C:\Users\scott\.dsh\scripts\halo\Halo-Coverage.ps1 \
       C:\Users\scott\Desktop\Code\halo-stack\scripts\halo\Halo-Coverage.ps1
```

The **live, deployed** copy (`~\.dsh\scripts\halo\Halo-Coverage.ps1`, file mtime
09:34 today) is missing all three fixes `G1-EVIDENCE.md` narrates as found-and-
fixed during the G1 run:

1. `G1-EVIDENCE.md:64-66` says the E5 marker scan is "now case-insensitive."
   The **live** script still has `[System.StringComparison]::Ordinal` (case
   **sensitive**) at the equivalent of repo line 153 — the repo has
   `OrdinalIgnoreCase`.
2. `G1-EVIDENCE.md`'s "what the gate caught" section (and commit `649210c`)
   describes fixing case-sensitive `Select-Object -Unique` double-counting.
   The **live** script still has the plain case-sensitive
   `$truncatedFiles | Select-Object -Unique`; the repo has the
   `OrdinalIgnoreCase` `HashSet` dedupe (repo lines 197-205).
3. `G1-EVIDENCE.md:45-50` narrates the central story of the run — COVERAGE
   crying wolf (exit 4) on an honestly-named truncated file because it demanded
   a full absolute path, then being fixed to accept "any human form." The
   **live** script is entirely missing the `$namedPath` closure that
   implements that fix (repo lines 186-194) — it still only checks the exact
   string, i.e. it still has the bug the evidence document says is resolved.

**This means:** a new user who opens `SKILL.md` today and follows its own
documented invocation literally — `$H = "$env:USERPROFILE\.dsh\scripts\halo"`
(`SKILL.md:39-40`) — runs the **pre-fix** script, not the one the evidence
document describes. They could reproduce the exact "cries wolf on an honest
report" failure `G1-EVIDENCE.md` presents as solved. Separately: the timestamp
ordering (live copy 09:34; the case-insensitivity commit `65a7eb3`/`c490793`
land later this morning) shows `Deploy-ToLive.ps1` has not been re-run on this
machine since before these fixes landed, even though the task brief describes
the stack as "LIVE right now" and multiple commits since claim live
verification.

**Also relevant to the "43 tests pass... fails closed" framing** given to me:
counted precisely, the static/portable subset of the suite is exactly 43 tests
(lines `[S1]` through `[H12]` in the output), all passing — that specific count
is accurate. But a plain default run of the suite right now is **47 passed, 1
failed**, not a clean sweep, because of the V3 drift above; "43 pass" in
isolation reads as "the suite is green," which it is not at time of audit.

**Minor, unconfirmed addendum (flagging, not asserting):** the claimed 65.7-minute
wall clock (`G1-EVIDENCE.md:34`) doesn't reconcile cleanly with the real run
directory's file timestamps: `manifest.json` (written at PLAN) is stamped
09:39, `REPORT.md` (written at REDUCE) is stamped 11:38 — a ~119-minute span.
A sibling directory, `C:\Users\scott\Desktop\Code\halo-g1\runs\run-2e8a18ee1aa9\`
(same run id, manifest stamped 08:52, only `manifest.json`+`units/`+
`coverage.json`, no `REPORT.md`), suggests at least one earlier, abandoned
attempt at the same run id, which would explain some of the gap as non-
execution overhead. I did not run the job myself and cannot separate genuine
model-generation time from session overhead from these timestamps alone, so I
am not asserting the 65.7-minute figure is wrong — only that I could not
independently reconcile it, and it does not appear self-evident from the
artifacts the way the 5/5-units and 7,988-byte numbers do (both of which I
verified exactly against the real files).

**Fix:** run `scripts\Deploy-ToLive.ps1` before treating any "verified live"
HALO 2.0 claim as current; consider adding a V3-style drift check to whatever
gates a claim of "proven live" going forward, since this is exactly the failure
mode it would have caught.

**How to test:** `pwsh tests\Run-Tests.ps1` from repo root.

---

### M2 — HALO 2.0 is undocumented on every user-facing surface, and the surfaces that already claim a Mission Control tab count are now wrong in three different ways

Grepped `Large-Job`, `LJP`, `halo-ljp`, `large-job`, `Settings` (tab context)
across `README.md`, `docs/USER-MANUAL.md`, `CHANGELOG.md`, `site/index.html`,
`docs/index.html`: **zero matches in all five files.** `CHANGELOG.md`'s newest
entry is `## [0.6.0] - 2026-08-21` (line 6) — dated before every HALO 2.0
commit — and there is no "Unreleased" section. A user reading any of the five
canonical entry points to this project has no way to learn the Large-Job
Protocol, the `halo-ljp` preset, or the Mission Control Settings tab exist.

The Settings tab is real and live — I verified it directly, not just by
reading code. In a live browser session at `http://127.0.0.1:3090`,
`read_page` shows seven tab buttons (`Overview, Models, Sessions, Plugins,
System, Memory, Settings`), and clicking Settings renders a working panel
reading real values off the live `settings.yaml`: *"compact at 96K · retain
64K · summarize 32K into 12K = 2.67:1 ok"* — this is `computeSettings()`
(`mission-control.mjs:2711-2727`) correctly deriving from the live
`thresholdRatio`/`retainRatio` (0.75/0.5, consistent with
`docs/USER-MANUAL.md:298`'s "75% trigger / 50% retain" claim, which is
accurate). So the mechanism works; only its existence is undocumented.

Meanwhile the tab-*count* claims that already exist, pre-dating this branch,
don't even agree with each other, and this branch made all of them wrong at
once by adding an 8th data point without touching any of them:

| Location | Claim |
|---|---|
| `docs/USER-MANUAL.md:60` (mermaid label) | "5-tab console" |
| `docs/USER-MANUAL.md:372-373` | "five-tab operator console (Overview / Models / Sessions / Plugins / System)" (also omits Memory) |
| `docs/USER-MANUAL.md:593` | "six tabs" |
| `README.md:30` | "6-tab operator console (`overview/models/sessions/plugins/system/memory`)" |
| `site/index.html:108,139` / `docs/index.html:108,139` (identical) | "A 6-tab operator console" / "serving six tabs" |
| **Live, verified** | **7 tabs** (adds Settings) |

**Fix:** add a CHANGELOG entry (or an "Unreleased" section) for HALO 2.0;
add a Large-Job Protocol section to `docs/USER-MANUAL.md` (there is precedent —
every other operator-facing capability in the manual gets one) describing what
it is, when to use it, and pointing at the skill; document the Settings tab
next to the other six in the Mission Control section (`USER-MANUAL.md:591-776`);
and reconcile the tab count to 7 everywhere, in one pass, rather than leaving
three different stale numbers in place.

**How to test:** `grep -rli "large-job\|halo-ljp" README.md docs/USER-MANUAL.md
CHANGELOG.md site/index.html docs/index.html` returns nothing; live tab count
confirmed via the browser session above.

---

### M3 — G1-EVIDENCE.md's "Honest limits" section is good-faith but incomplete against its own project's evidence

The task brief asked specifically whether the limits section omits anything
material. It gets real credit for disclosing the wrong-preset issue (see B1
above) — that's genuinely honest. Two things it does not disclose, both
sourced from the run's own output rather than my inference:

1. **The stale-findings-reuse gap.** `C:\Users\scott\Desktop\Code\runs\run-2e8a18ee1aa9\REPORT.md:26`
   (unit-003, reviewing SKILL.md itself): *"the run id is derived from the file
   set... so re-running the same tree under a different brief silently reuses
   findings produced under the old brief. COVERAGE (the only completion gate)
   checks that nothing is hidden and no containment breach occurred, not that
   findings answer the current brief — a stale-but-covered report passes and
   is handed over as done."* This is a real architectural property of
   `Halo-Pending.ps1`'s resume filter (skip any unit with valid findings
   already on disk, regardless of brief) plus `Halo-Coverage.ps1`'s gate (checks
   naming/containment, never brief-relevance). It directly qualifies what "a
   clean COVERAGE run means the job is done" (`SKILL.md:132`) actually
   guarantees. Not mentioned in the limits section.
2. **The vacuous-containment-check finding is not surfaced as its own limit**
   distinct from "wrong preset" — see B1. The limits section says the wall is
   "proven by construction + H5" and that the bypass probe "remains open," which
   is correctly hedged about the *preset*, but never states that the *log-scan
   mechanism itself* had zero data to examine on this run, which is true
   regardless of which preset was used.

**Fix:** add both points to `G1-EVIDENCE.md`'s "Honest limits" section verbatim
— the source material already exists in the run's own `REPORT.md`.

---

## MINOR

### N1 — Public site pages understate the current state (low harm, but stale)

`site/index.html:201` and `docs/index.html:201` (byte-identical pages) both
read: *"Large jobs that did succeed succeeded because a frontier-model
assistant decomposed them by hand; unattended, a whole-repo review ran 4 h 41 m
and produced nothing... the autonomy work that removes the frontier-model
operator from the loop is still in progress, not shipped."* This was accurate
when written (v0.6.0, 2026-08-21) and neither file is touched by this diff.
Given `G1-EVIDENCE.md`'s "keystone GREEN" claim, this sentence is now stale —
it undersells rather than oversells, which is the far less harmful direction,
but the project's own precedent (CHANGELOG `[0.6.0]`: *"Corrected: Public
site/README claims that the measurements do not support... were removed or
qualified"*) treats public-surface currency as part of shipping a release, and
this diff doesn't touch either page despite landing a headline capability.

**Fix:** when HALO 2.0 is ready to be described publicly, update this
paragraph in both files (they are kept identical on purpose — update both).

---

## Credit — what checks out

- The `halo-ljp` preset genuinely strips exactly the three claimed rows
  (`tool-subagent-codex`/`-claude-code`/`-opencode`) and nothing else, verified
  by diffing it directly against `halo-standard`; `Build-LjpPreset.ps1` +
  `H5`/`H7` regenerate and test it at deploy time so it cannot drift from its
  source — and today it doesn't (V3 flagged only `Halo-Coverage.ps1`).
- `Halo-Coverage.ps1`'s own code comments (repo version) are unusually honest
  about the marker-scan's limits ("never treat a miss as proof of
  containment") — better self-awareness than most of the surrounding
  marketing language credits it for.
- The Settings tab (G5/G7) is real, live, wired to `/api/settings` and
  `/api/action/apply-settings`, and the numbers it renders live match the
  manual's separately-stated 75%/50% compaction figures.
- `workspace/AGENTS.md`'s large-job pointer (line 44-49) accurately describes
  the skill and is confirmed deployed at the real workspace root
  (`C:\Users\scott\Desktop\Code\AGENTS.md`); the skill itself is confirmed
  deployed at `~\.dsh\skills\large-job\`.
- The 43-test static count and the "35 mutations caught" framing for that
  static subset are numerically real (I counted the passing static tests
  directly); the G1 run's structural numbers I could verify against real
  artifacts — 5/5 units `status: ok`, `REPORT.md` exactly 7,988 bytes,
  `complete: true`, `gapHidden: false` — all check out exactly.
- The `dsh/cordis.patch.yml` fix for the duplicate `subagent-codex`/
  `subagent-claude-code` registration (a latent bug present since the repo's
  very first commit, `ae27bcb`, 2026-08-17, that silently broke every
  `--profile <name>` boot including headless) is a real, well-diagnosed,
  well-disclosed fix — the code comment explaining it is a model of honest
  incident documentation.

## Could not assess

- Could not confirm the 65.7-minute wall-clock figure from artifacts alone
  (see M1 addendum) — did not run G1 myself.
- Did not attempt to actually exploit the shell-escape containment gap (B1) —
  no CLI-invocation test was run against a live `halo-ljp` child; the finding
  rests on static reading of the preset, the marker list, and the absence of
  network isolation in this repo's config, not a demonstrated breach.
- Did not root-cause the one transient `[MC1]` test failure I observed under
  `tests\Run-Tests.ps1 -CleanClone` ("Mission Control exited during boot
  (code 1)"); it did not reproduce on a subsequent default run, so I'm noting
  it rather than scoring it — possibly resource/port contention from the
  adjacent `CC1` clean-clone dry-run deploy, not independently confirmed.
- Did not review `docs/design/halo2/SPEC.md`/`IMPLEMENTATION-PLAN.md` content
  itself (C1) — they are absent from the branch under audit, so there was
  nothing in-scope to read; I read them only indirectly, through what other
  files in this branch cite from them.
- Out of my lane: I did not independently re-audit the walkthrough lane's
  WT-1/WT-2 fixes (told to me as already fixed/verified) beyond confirming the
  H14 test that guards WT-1 passes in the live suite.
