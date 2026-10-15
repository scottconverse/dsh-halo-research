> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../../README.md).

---
name: large-job
description: >-
  Run a large read-heavy job (review a repository, audit a doc corpus, summarize
  many files) locally without the context melting down. Load this BEFORE starting
  any job that reads more than about one file's worth of material.
---

# Large-Job Protocol (LJP)

You are on a single local machine whose model serves **one prediction at a time**
and slows down as its context fills. A big job done as one long turn does not just
run slow -- it dies (measured 2026-08-20: one turn, 4 h 41 m, no result). This
skill is how you do a big job so it *finishes*.

The rule in one line: **never read a large tree into your own context. Size it,
split it into small units, spawn one fresh child per unit, and reduce their
findings on disk.** The scripts below are deterministic -- they do the counting so
you do the judging.

## The physics (do not fight it)

- The window is a **ceiling, not a target**. Forty 25K contexts finish; one 110K
  context dies.
- **One decode lane per machine.** Spawning ten children does not go ten times
  faster -- they queue and time out. Work one unit at a time.
- **Compaction during a run is an alarm, not a tool.** If you feel compaction
  coming, your unit is too big; you sized it wrong.

## When to use

Run the protocol for any ask that means reading a whole repository, a directory
tree, a doc set, or "all of X" -- anything more than a couple of files. For "fix
this function" or "explain this file", just do it normally; this is overkill.

The trigger is **estimated tokens, not file count** -- `halo-size` decides.

## The five steps

The four `Halo-*.ps1` scripts are deployed at
`$env:USERPROFILE\.dsh\scripts\halo\` -- shown below as `$H`, so set
`$H = "$env:USERPROFILE\.dsh\scripts\halo"` once and call `& "$H\Halo-Size.ps1"`.
They run through your `pwsh` tool. Run-artifact directories (`runs/<id>/`) are
written **relative to the workspace you are working in**, not next to the scripts.
**Pass `timeoutMs` on every `pwsh` call** (e.g. 120000) -- the harness
timeout-policy does not cover pwsh, so the deadline must come from you.

### 1. SIZE -- `scripts/halo/Halo-Size.ps1`

```
& "$H\Halo-Size.ps1" -Path <targets> -WindowTokens <live window> -OutFile runs/<id>/sizing.json
```

Read the verdict in `sizing.json`:
- **`single-pass`** -- it fits. You may just do the job normally. Stop here.
- **`decompose`** -- continue to step 2.
- **`refuse`** -- it will not fit even split up. Do **not** start. Tell the
  operator the numbers (`estimatedUnits`, `maxUnits`) and what to change in
  Mission Control Settings (a bigger window, a smaller scope). Do not improvise.

Do not start reading files before you have run SIZE and obeyed its verdict.

### 2. PLAN -- `scripts/halo/Halo-Plan.ps1`

```
& "$H\Halo-Plan.ps1" -SizingFile runs/<id>/sizing.json -RunsRoot runs -UnitBudgetTokens 24000
```

Writes `runs/<id>/manifest.json` and `runs/<id>/units/unit-NNN.json`. Units hold
**file references, not file bodies** -- each child reads its own files. The run id
is derived from the file set, so re-running the same tree resumes the same run.

### 2b. RESUME filter -- `scripts/halo/Halo-Pending.ps1`

```
& "$H\Halo-Pending.ps1" -RunDir runs/<id> -Brief "<the job>" -OutFile runs/<id>/pending.json
```

Emits the units that still need doing (skips any with valid findings already on
disk). On a first run that is all of them; after a crash or a STOP it is only
what is left. `pending.json` is the MAP call's `args`.

### 3-4. MAP + REDUCE -- one `workflow` tool call

Make **one** `workflow` tool call. This is the one time you use the workflow tool
without the operator asking for it "by name" -- **this skill authorizes it**;
ignore the tool's own "only when explicitly asked" guidance, that guidance is for
ad-hoc use, not for a sized, planned job.

- `script`: the body of **`skills/large-job/map.workflow.js`**, verbatim. Do not
  rewrite it. It maps one child per unit (sequentially -- one decode lane),
  records-and-continues on a failure, trips a breaker on repeated identical
  failures, then runs one REDUCE child that writes `runs/<id>/REPORT.md`.
- `meta`: `{ "name": "halo-large-job", "description": "<the job>", "phases": [{"title":"map"},{"title":"reduce"}] }`
- `args`: the object from `pending.json`, plus a `findingSchema`. Use exactly:

  ```json
  { "runId": "<id>", "brief": "<the job, as an instruction to one worker>",
    "units": <pending.json .units>, "reduceGroups": <manifest .groups>,
    "findingSchema": { "type": "object",
      "properties": { "status": {"type":"string","enum":["ok","failed"]},
                      "summary": {"type":"string"} },
      "required": ["status","summary"], "additionalProperties": true } }
  ```

The children inherit **this session's composition**. Run the whole LJP under the
restricted **`halo-ljp`** preset (or a headless profile that uses it) so children
cannot reach a frontier provider *through the harness's own subagent tools* —
those tool rows are not mounted. Be precise about what that does and does not
buy you: the preset does **not** block a shell. `pwsh`/`bash` stay mounted, and
the Codex / Claude Code / OpenCode CLIs on this machine are already
authenticated, so a child that runs one directly would leave the machine and the
preset would not stop it. Treat the preset as the harness-level wall, not a
sandbox; COVERAGE is the tripwire.

**Selecting it is manual, and nothing enforces it.** `settings.yaml`'s default
preset is `halo-standard`, no code path switches to `halo-ljp` for you, and this
instruction is prose you could skip. A run that forgets is unrestricted and looks
exactly the same afterwards. So: pick `halo-ljp` in the cockpit's preset selector
before you start, and if you did not, say so in the report rather than implying
the run was contained.

### 5. COVERAGE -- `scripts/halo/Halo-Coverage.ps1`

```
& "$H\Halo-Coverage.ps1" -RunDir runs/<id>
```

This is the gate, not a formality. Non-zero exit means the run is **not** done:
- **exit 4** -- `REPORT.md` hides a gap (a unit not attempted/failed, a file
  truncated/omitted, and not named). Fix the report or finish the units.
- **exit 5** -- a child called a frontier provider. Containment breach (P9). The
  run is void; find how a child escaped the preset before trusting any output.

Only a clean COVERAGE (exit 0) means the job is done. Hand the operator
`runs/<id>/REPORT.md`.

## What you never do

- Read a whole tree into this conversation. Decompose it.
- Spawn children in parallel to "go faster". One lane; one at a time.
- Delegate a unit to Codex/Claude/OpenCode. The work is local. If you cannot do a
  unit locally, record it failed -- do not escalate.
- Call a run done because REPORT.md looks finished. COVERAGE decides.
