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

**Worker (headless, coder, Code Mode) — one-line task, no `<` or `>`:**

```powershell
$env:LMSTUDIO_API_KEY='x'; $env:DSH_PERMISSION_MODE='danger-full-access'; $env:DSH_TOOLS_MODE='code'
$env:DSH_HOME='C:\Users\scott\Desktop\Code\dsh-halo-research\stack\dsh-home-worker'
pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --profile headless "Carry out the build specified in AGENTS.md in this directory, exactly as written."
```

Worker session logs land under `stack\dsh-home-worker\sessions\` (not `~\.dsh`).

**Gated build (the standard path for real work):**

```powershell
.\Gate-Build.ps1 -Workspace <dir> -TestScript <verifier outside the workspace> -Task "<one line>"
```

The verifier is any script/exe taking the workspace path and exiting 0 only on
pass (repo tests + acceptance checks the worker cannot rewrite). The gate
refuses a verifier that lives inside the workspace, feeds exact failures back
via `GATE-FEEDBACK.md`, re-runs the worker up to `-MaxRounds`, and fails closed.

## Rules baked in (why)

- **Model prose is never evidence** — all four §12.12 cells falsely claimed success.
- **32K, not 64K** — 64K was slower with no correctness gain and disables working compaction.
- **`contextWindow` matches the loaded context, always** — the §18.1 death-at-window class; runtime-verified 2026-08-25.
- **Never `npx`** — `pnpm dlx` only. **Never kill by image name** — recorded PID trees only.
- **Root-leak guard** — POSIX-style model paths land at `C:\` under full access (§21.16).
- Apps-under-test that call an LLM use the coder endpoint, never the agent's slot (§12.11).
