> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../../../README.md).

# G1 — "the job that failed, completed" (measured evidence)

**Date:** 2026-08-22 · **Run id:** `run-2e8a18ee1aa9` · **Verdict: PASS**

G1 is the keystone gate of HALO 2.0 (SPEC v2.1 §7): the whole point of the
redesign is that a large reading job which previously died now finishes on the
local brain, unattended. This file records what was actually measured, not a
claim that it works.

## The failure being answered

On 2026-08-20 a whole-repo review was attempted as ONE conversation turn:
**4 h 41 m, 35 steps, 2,396,400 input tokens on a single turn, 13 identical idle
timeouts, 5 failed compactions — and no result** (SPEC §1, F1–F3).

## The run

| | |
|---|---|
| Lane | **headless, unattended** (`dsh --profile headless "<task>"`) — no browser, no human in the loop |
| Target | 5 real files, 92.2 KB (README, USER-MANUAL, SKILL.md, two protocol scripts) |
| SIZE verdict | `decompose` (26,969 est. tokens vs a 15,000-token window) |
| PLAN | 5 units, 1 reduce group, one file recorded truncated |
| Execution | ONE `workflow` tool call: 5 sequential local children + 1 REDUCE child |
| Model | Qwen3.8-27B Q5 on LM Studio (local, no cloud) |

## Measured result

| G1 criterion (SPEC §7) | Required | Measured |
|---|---|---|
| Report + coverage produced | yes | **`REPORT.md` 7,988 bytes + `coverage.json`** |
| Compaction events | **zero** | **0** |
| Idle-timeout retries | **zero** | **0** |
| Wall clock | < 2 h | **65.7 min** |
| Units completed | all attempted | **5/5, every one `status: ok`** |
| Containment (E5/G9) | no breach | **NOT VERIFIED on this run — see below.** `coverage.json` said `containmentBreached: false`, but that was **zero hits over zero evidence**: the run created no `runs/<id>/logs/`, and no child was ever asked to self-report `providersUsed`, so the check read nothing. It is not a measurement and is not counted as one. |
| Mechanical coverage | exit 0 | **exit 0, `complete: true`** |

The 4 h 41 m monolith that produced nothing became a **65.7-minute decomposed run
that produced a real report** — with zero compaction and zero retries, because no
child's context ever approached the threshold (P3, bounded by construction).

## What the gate caught (and why that matters)

COVERAGE first returned **exit 4 (hidden gap)** — and it was *wrong*. The report
had honestly declared `Truncated files: USER-MANUAL.md ... only the first 11,900
of 61,390 bytes reviewed`, but the gate demanded the full absolute path. That was
fixed (a path counts as named in any human form) and re-run to exit 0. A gate that
cries wolf on an honest report trains the operator to ignore it — so the false
alarm was treated as a defect in the gate, not tolerated.

## The run reviewed its own tooling, and found real bugs

The brief asked each child for purpose / Windows gotcha / risk. Two of the five
units happened to be HALO's own scripts, and the local model found **four genuine
defects that were then fixed**:

1. `Get-Content -Raw` without `-Encoding` decodes BOM-less UTF-8 as the ANSI code
   page on PowerShell 5.1 → non-ASCII findings mangle.
2. `Write-Error …; exit 2` is unreachable under `$ErrorActionPreference='Stop'`
   → the documented exit contract was broken (died 1, not 2).
3. `Select-Object -Unique` is case-sensitive on a case-insensitive filesystem →
   the same file in two casings double-counted.
4. The E5 containment tripwire was a **case-sensitive** substring denylist —
   "false confidence, not real containment". Now case-insensitive, and documented
   as a backstop rather than the guarantee (the restricted preset is the wall).

Finding #4 independently reproduces the external auditor's **Q12** concern. That
is the strongest single signal in this evidence: the local stack, running
unattended, produced a review good enough to catch a weakness a frontier auditor
had also flagged.

## Honest limits of this evidence

- **One run, one 5-unit corpus.** It proves the mechanism end-to-end; it is not a
  statistical claim about reliability at larger scale.
- **Parent-context ceiling not instrumented.** SPEC §7 also asks for parent
  context < 25K; the ~4-tool-call shape makes that near-certain by construction,
  but it was not measured directly here.
- **Containment was NOT tested by this run — the check had no data.** This is the
  single most important limit on this page. `containmentBreached: false` came from
  scanning two sources that were both structurally empty: `runs/<id>/logs/` was
  never created by anything in the pipeline, and the finding schema never asked a
  child to report `providersUsed`. Zero hits over zero evidence is not a clean
  result. (After this run COVERAGE was changed to say so: re-run against **this
  run's own artifacts** it reports `containmentVerdict: unverified-no-evidence`,
  which is the honest description of what happened. An intermediate version also
  scanned the findings *prose* — that was wrong and was reverted: the LJP exists
  to review code, so a child legitimately writes "probes with Invoke-WebRequest"
  or "registers an Exa MCP row", and both produced a false breach that voided the
  run. **A description of an escape is not an escape.** Evidence is now restricted
  to things that record behaviour: a child session log, or an explicit structured
  `providersUsed` self-report. Nothing writes session logs today, so on a normal
  run there is no evidence and the verdict says exactly that.)
- **Run under the standard preset**, not `halo-ljp`, so the restricted wall itself
  was never exercised end-to-end. It is argued by construction + H5 only.
- **The preset is not a sandbox.** It removes the harness's external-provider
  subagent tool rows, but `pwsh`/`bash` stay mounted and the Codex / Claude Code /
  OpenCode CLIs on this machine are already authenticated — a child that shells out
  to one would leave the machine and neither the preset nor (before the fix above)
  the tripwire would have noticed. Closing that path is the still-open Q12 probe.
- **G2 (breaker) and G4 (reasoning share) are proven separately** — G2 by the
  template unit test (H8), G4 still open pending the reasoning-control
  measurement.
- **The MAP template is verified against a reconstructed contract, not the real
  engine.** `tests/halo/Test-MapTemplate.mjs` rebuilds dsh's calling convention
  (an `AsyncFunction` with `args`/`agent`/`phase`/`log`) and drives it with mocks.
  That is what makes the control flow testable at all, but it means the template
  has been cross-checked against the *actual* engine exactly once — this run — and
  that run was under the standard preset, not the composition an LJP job is meant
  to ship under. If dsh changes its calling convention, the mock will keep
  passing.
- **Resume binds the file set, the packing parameters and the brief — not the
  world.** Two runs whose *files changed on disk* between planning and resuming
  are not detected; the run id is computed from the file set at plan time.

## Reproduce

Run the scripts **from the repo**, not from `~/.dsh`. The deployed copy is only as
fresh as the last successful `Deploy-ToLive.ps1`, and this gate found it silently
behind the repo — reproducing against it can validate code that is not the code
under review. (Run the deploy first if you want to exercise the deployed path.)

```powershell
$H = "<this repo>\scripts\halo"
& "$H\Halo-Size.ps1"    -Path <target> -WindowTokens 15000 -UnitBudgetTokens 4000 -OutFile sizing.json
& "$H\Halo-Plan.ps1"    -SizingFile sizing.json -RunsRoot runs -UnitBudgetTokens 4000
& "$H\Halo-Pending.ps1" -RunDir runs\<id> -Brief "<the job>" -OutFile pending.json
# one headless task that makes ONE workflow call with map.workflow.js + pending.json
& "$H\Halo-Coverage.ps1" -RunDir runs\<id>   # exit 0 = complete
```
