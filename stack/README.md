# Halo v1 — the standing stack (spec v2.5 §19.1)

Two models resident on LM Studio `:1234`, one harness, one external gate.

| Piece | Value |
|---|---|
| Cockpit / planner | `unsloth/qwen3.8-27b` @ 32,768 — Standard tool mode. When it builds, it uses the forced-cadence brief (§12.10). |
| Implementation worker | `unsloth/qwen3-coder-30b-a3b-instruct` @ 32,768 — **Code Mode** (`DSH_TOOLS_MODE=code`), pinned via its own DSH home `stack\dsh-home-worker\` (a `--patch` cannot pin the model: `agent-default-model` reads the settings user layer live — proven the hard way, see the note in that settings file). |
| Gate (T-29) | `Gate-Build.ps1` — external verifier-and-repair loop. Only test evidence completes a task (§21.15). Fail-closed. |
| Provider config | `~\.dsh\settings.yaml` — both models declared with `contextWindow: 32768`, kept equal to the loaded context (§18.1). |

## Launch

**Cockpit (interactive web UI, 27B, Standard):**

```powershell
$env:LMSTUDIO_API_KEY='x'; $env:DSH_PERMISSION_MODE='danger-full-access'
pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" web
```

**Build (THE worker path — there is no other):**

```powershell
.\Gate-Build.ps1 -Workspace <dir> -TestScript <verifier outside the workspace> -Task "<one line, no < >>"
```

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
