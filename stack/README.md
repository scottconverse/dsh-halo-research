# Halo — the standing DSH stack

## Current operation — 2026-09-03

Use `Launch-Halo.ps1` (or the Halo Cockpit desktop shortcut) with LM Studio
running. The installed `halo-orchestrator` preset supports native shell/file
tools and the configured Codex, Claude, generic subagent, workflow, and Ralph
lanes. `subagent_coder` is an optional staged verification/promotion workflow;
it does not impose a root tool lock or narrow the worker's native permissions.
The local Halo Research Gateway 0.2.0 supplies research-only tools at `:8765`.
The installed `halo-research-state` plugin preserves real Gateway evidence
through automatic DSH compaction, enforces explicit research budgets, and
checks requested final-answer citation and coverage contracts.

The mandatory `Gate-Build.ps1` route and model/residency descriptions below
are retained historical notes, **not current operating instructions**.
Current sources:

- [Current configuration](HALO-CURRENT-CONFIGURATION.md)
- [Operator guide](HALO-STACK-GUIDE.md)
- [Native-access repair and audit](HALO-NATIVE-ACCESS-REPAIR-2026-09-01.md)
- [Optional verified-coder workflow](halo-verified-coder/README.md)
- [Verified research workflow](HALO-DSH-IMPLEMENTATION-2026-09-03.md)
- [Research-state plugin](halo-research-state/README.md)

## Historical configuration (superseded)

Two tuned model lanes on LM Studio `:1234`, with only the active local model
resident at a time, one harness, and one external gate.

| Piece | Value |
|---|---|
| Cockpit / planner | `unsloth/qwen3.8-27b` @ 32,768 — Standard tool mode. When it builds, it uses the forced-cadence brief (§12.10). |
| Implementation worker | `unsloth/qwen3-coder-30b-a3b-instruct` @ 32,768 — foreground one-shot child using the Halo Orchestrator's Standard-derived tool composition. The separate gate worker home retains its historical Code Mode configuration. |
| Gate (T-29) | `Gate-Build.ps1` — external verifier-and-repair loop. Only test evidence completes a task (§21.15). Fail-closed. |
| Provider config | `~\.dsh\settings.yaml` — both models declared with `contextWindow: 32768`, kept equal to the loaded context (§18.1). |

## Launch

**The operator surface is point-and-click — the "Halo Cockpit" desktop
shortcut.** Double-click it: LM Studio JIT-loads the selected model on the
first request and evicts the previous JIT model when the lane changes. The
launcher starts `dsh web` hidden if port 3080 isn't already serving (reaping only a
dead DSH orphan first, ownership-checked), and opens the browser at the
cockpit. If it can't come up in 150 s it says so in a dialog. Scripts:
`Launch-Halo.ps1` (the launcher) and `Install-Shortcut.ps1` (recreates the
shortcut if it's ever deleted). **The operator never needs a terminal;
CLI/headless below is for agent lanes only.**

**Cockpit by hand (agents / diagnostics — same thing the shortcut does):**

```powershell
$env:LMSTUDIO_API_KEY='x'; $env:DSH_PERMISSION_MODE='danger-full-access'
pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" web
```

The cockpit carries a **standing build-routing rule** in its system prompt
(deployed at `~\.dsh\profiles\web\cordis.patch.yml`; canonical copy
`stack\web-cockpit.patch.yml`): asked for anything beyond a quick edit, it
invokes `Gate-Build.ps1` itself and relays the gate verdict, instead of
building in-session — so "just ask in chat" routes long work to the gated
lanes automatically. Exception marker `HALO-CADENCE-BRIEF` tells a
gate-launched 27B it IS the builder. Seam verified before wiring: no live
settings override in the plugin source, plus a runtime persona sentinel
(HALO-ROUTE-42) and a composed-config check.

**Build (THE build path — there is no other):**

```powershell
.\Gate-Build.ps1 -Workspace <dir> -TestScript <verifier outside the workspace> -Task "<one line, no < >>"
```

Two lanes, both gated: `-Lane worker` (default — Coder-30B, Code Mode) for
implementation; `-Lane cockpit` (27B, native mode) for builds that need the
stronger model — the gate stamps the forced-cadence brief
(`stack\cadence-brief.md`, derived from the 15/15 recipe) into the workspace
`AGENTS.md` automatically on the cockpit lane. Both lanes proven on the
seeded-bug check: worker 0.6 min, cockpit 3.3 min, each PASS by test evidence
with model identity confirmed from the LM Studio server log.

The verifier is any script/exe taking the workspace path and exiting 0 only on
pass (repo tests + acceptance checks the worker cannot rewrite). The gate
refuses a verifier that lives inside the workspace, feeds exact failures back
via `GATE-FEEDBACK.md`, re-runs the worker up to `-MaxRounds`, and fails closed.
Worker session logs land under `stack\dsh-home-worker\sessions\` (not `~\.dsh`).

**The records rule — no gate-log, no done.** A build is complete only when its
workspace holds a `gate-log.txt` whose final verdict is PASS. Check it
mechanically:

```powershell
.\Check-Done.ps1 -Workspace <dir>
```

No gate-log means not done — whoever ran it, whatever any model or person
claims. This is §21.15 applied to the process, and it is the enforcement
layer: launches can be bypassed on an all-access box; the definition of
"complete" cannot.

**Diagnostics (UNGATED — never a build):**

```powershell
.\Probe-Worker.ps1 -Task "<one line>"
```

Same lane (worker home, Code Mode, coder), no verifier, no repair loop. Every
probe workspace is stamped `UNGATED PROBE - NOT EVIDENCE` and by the records
rule can never count as complete. Use for debugging and config checks only.

## Rules baked in (why)

- **Model prose is never evidence** — all four §12.12 cells falsely claimed success.
- **32K, not 64K** — 64K was slower with no correctness gain and disables working compaction.
- **`contextWindow` matches the loaded context, always** — the §18.1 death-at-window class; runtime-verified 2026-08-25.
- **Never `npx`** — `pnpm dlx` only. **Never kill by image name** — recorded PID trees only.
- **Root-leak guard** — POSIX-style model paths land at `C:\` under full access (§21.16).
- Apps-under-test that call an LLM use the coder endpoint, never the agent's slot (§12.11).

## Web research

Use the local `mcp__halo_research__*` tools exposed by Halo Research Gateway
0.2.0. They cover discovery, retrieval, crawling, documents, GitHub evidence,
transcripts, communities, Reddit, and bounded multi-source research. The
Gateway is research-only; sending email, posting to GitHub, purchasing, or
other consequential actions are not part of this product surface.

For long DSH turns, `halo-research-state` reconstructs an authoritative ledger
from successful Gateway envelopes. It retains actual URLs, returned source
parts, exact continuation cursors, warnings, and bounded excerpts after
compaction. A model summary cannot prove a read or complete coverage. Explicit
call/time budgets are denied when exhausted, and a requested word/citation/
coverage contract is checked before the final answer is allowed to complete.

Anonymous providers still have finite quotas. The bounded live workflow passed
on 2026-09-03, but authenticated, imported-profile, paid-provider, and broad
provider acceptance require their own evidence. The bundled DeepSeek-keyed web
tool remains disabled without a key.
