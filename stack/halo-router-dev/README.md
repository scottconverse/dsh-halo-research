# Halo Router DEV — 0.1.0

Status: development-only shadow implementation, September 7, 2026 (America/Denver).
It records what DSH ran and what a deterministic policy recommends. It never changes a model selection. Production is not promoted or reconfigured.

## Open and use

Open **http://127.0.0.1:3085** and choose the **Halo Router DEV** preset. The existing opening/session model picker remains intact. The default is the existing `lmstudio / halo/qwen3.6-35b-a3b` planner. Choosing a model changes DEV's selection through ordinary DSH, not through the router. No model is preloaded by this launcher; existing LM Studio behavior handles inference.

Use a development repository or worktree for your real task. DEV is **not a filesystem sandbox**: models retain the normal full-access capability. Its DSH sessions, gate runs, memory, and native-adapter conversation state have separate DEV paths. Native Claude/Codex still use the signed-in user's account stores. LM Studio and OmniRoute are shared existing providers, not copied runtimes.

The six sessions named `HALO ROUTER DEV — ... integration check` are deliberately tiny transport tests. They are not autonomous coding tests or qualification evidence.

## Start and stop

In PowerShell:

```powershell
Set-Location 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-dev'
.\Start-RouterDev.ps1
```

The launcher uses the pinned local DSH package and checks the reserved port. It does not replace production packages. Close an active DEV turn normally before stopping:

```powershell
.\Stop-RouterDev.ps1
```

Stop verifies the recorded process path, creation time, profile and port before terminating only DEV. It does not stop LM Studio, production DSH, Ollama, or other projects. There is no automatic reboot/startup registration.

## Read recommendations

```powershell
node .\read-records.mjs 3
```

This prints the last three dispatches, measurements and complete referenced policy evaluations. Machine-readable files:

- `home\halo-routing\records.json`: readable export, updated within about five seconds after queued work finishes.
- `home\halo-routing\candidate-reconciliation.json`: all discoverable provider/model routes, native provider capabilities, unavailable metadata and catalog-only classifications.
- `home\halo-routing\status.json`: freshness, queue drops, observer/policy/storage errors and listener time.
- `home\storages\halo_routing.json`: authoritative DSH JSON storage unit. Do not manually edit while DEV runs.

Recommendations use an `evaluationId` to share identical large candidate evaluations. The reader resolves these references; raw JSON consumers must do likewise. Old prototype records remain preserved. A missing observation/measurement is not a success; check status counters. Record schemas carry version 1. This is a small append-only experiment, not a long-running retention product.

## Roll back only the router

```powershell
.\Stop-RouterDev.ps1
node .\configure-dev.mjs --disable-router
.\Start-RouterDev.ps1
```

DEV then runs without either observation/policy plugin. Existing sessions and records are retained. To remount:

```powershell
.\Stop-RouterDev.ps1
node .\configure-dev.mjs
.\Start-RouterDev.ps1
```

Never restore all of `.dsh` or replace newer sessions from this development snapshot. To abandon the experiment, stop DEV; no production rollback is required. Do not delete the DEV home until its sessions/evidence have been saved.

## Verification and rebuilding

```powershell
node .\prepare.mjs --verify
node .\configure-dev.mjs --check
Set-Location ..\..
node --test test/*.test.mjs stack/halo-routing/test/*.test.mjs stack/halo-policy-deterministic/test/*.test.mjs
```

The existing installed DEV copy is ready; do not rerun installation just to use it. On a fresh DEV reconstruction, `prepare.mjs` takes a new production baseline and copies the existing production profile, `pnpm install --ignore-scripts` installs the exact DEV root dependency, and `configure-dev.mjs` redirects DEV-owned state. The copied `home\profiles\web` dependencies must also be installed with pnpm. This depends on the installed Halo custom packages/file coordinates; it is not a portable stock-DSH installer. The recovery copy preserves the deployed DEV configuration, not provider passwords.

## Boundaries

- No actual routing, failover, escalation, load/unload, scoring promotion, UI extension, or Research Gateway dependency.
- No tool/model/permission restrictions added by the router.
- All qualification remains `unknown`. A transport response is not qualification.
- Only independently validated gate outcomes can enter outcome records. A post-terminal profile snapshot is required; it is **not** proof that configuration was unchanged throughout inference.
- The optional DEV-only verified-coder receipt bridge is source-wired, but no new organic gated worker run has proved that join. Root observation is live-proven. Worker qualification and adaptive learning are not claimed.
- Raw prompt, output and tool argument content are not stored in the routing ledger. Controlled smoke evidence intentionally includes its published test prompt and response. Normal DSH session storage still follows ordinary DSH behavior.

See [implementation and evidence](../HALO-DSH-IMPLEMENTATION-2026-09-07.md) for measured results, Phase 0 decisions and limitations.
