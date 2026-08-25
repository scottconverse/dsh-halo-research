# Halo v1 — the standing stack (spec v2.5 §19.1)

Two models resident on LM Studio `:1234`, one harness, one external gate.

| Piece | Value |
|---|---|
| Cockpit / planner | `unsloth/qwen3.8-27b` @ 32,768 — Standard tool mode. When it builds, it uses the forced-cadence brief (§12.10). |
| Implementation worker | `unsloth/qwen3-coder-30b-a3b-instruct` @ 32,768 — **Code Mode** (`DSH_TOOLS_MODE=code`), pinned via its own DSH home `stack\dsh-home-worker\` (a `--patch` cannot pin the model: `agent-default-model` reads the settings user layer live — proven the hard way, see the note in that settings file). |
| Gate (T-29) | `Gate-Build.ps1` — external verifier-and-repair loop. Only test evidence completes a task (§21.15). Fail-closed. |
| Provider config | `~\.dsh\settings.yaml` — both models declared with `contextWindow: 32768`, kept equal to the loaded context (§18.1). |

## Launch

**The operator surface is point-and-click — the "Halo Cockpit" desktop
shortcut.** Double-click it: it ensures both models are resident at 32 K,
starts `dsh web` hidden if port 3080 isn't already serving (reaping only a
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
