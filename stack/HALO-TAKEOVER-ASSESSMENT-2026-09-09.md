# Halo DSH + Research Gateway: takeover assessment (read-only)

Date: 2026-09-09, about 13:00 to 13:45 MDT. Author: Claude Fable 5.1 (session code-6c). Owner: Scott Converse.

Scope: Option A only. I read the handoff and its listed documents, ran read-only probes, and changed nothing. No service was started or stopped. No model was loaded or unloaded. No file under `.dsh`, the Gateway runtime, or either Git repository was modified. This file is the only thing I wrote outside my scratchpad.

Coordination: I messaged the running "CivicCast Refactor" Claude session before starting (delivered 2026-09-09 ~13:02 MDT). It replied after this pass finished: read-only checks were fine; it uses Windows Sandbox for several more hours (soaks, then Gate A); NO model loads and nothing CPU-heavy on this box until Scott says CivicCast beta.5 is shipped (midnight MDT deadline); stay clear of vmmemWindowsSandbox / WindowsSandbox* and the elevated helper's kill-orphan-sandbox job; elevated helper queue is shared, use unique job_id values. My checks used no meaningful RAM and no Windows Sandbox. Windows Sandbox was running (vmmemWindowsSandbox, 15.9 GB) with 27.3 GB of 63.8 GB free. Consequence for the plan: item 6 (DSH launch, loads two models) cannot run tonight; items 1 to 5 are light and can.

## 1. What is live, down, or degraded right now

Machine: rebooted 2026-09-08 22:25 to 22:29 MDT (user restart, then two Windows Update restarts; System log ids 1074/6006/6005). Everything below is after that reboot.

| Surface | State | Identity / evidence | Limits |
|---|---|---|---|
| Production DSH cockpit `127.0.0.1:3080` | DOWN (connection refused) | Last launch 2026-09-08 09:39 MDT, `pnpm dlx @deepseek-ai/dsh@0.1.1-rc.2 web`, pids 30512/11268 gone. No logon task starts it; it is started by hand via `Desktop\Halo Cockpit.lnk` -> `stack\Launch-Halo.ps1`. | Down because of the reboot, by design. Not a code defect. |
| Router DEV `127.0.0.1:3085` | DOWN | Manual `Start-RouterDev.ps1`; DEV home exists at `stack\halo-router-dev\home`. | Same: reboot, manual start. |
| Mission Control `127.0.0.1:3090` | DOWN since about 2026-09-03 21:19 MDT | Last `mc-history.jsonl` sample 2026-09-03 21:19 MDT. No reboot between 09-01 and 09-08, so it died or was stopped for another reason. `Launch-Status.ps1` starts node hidden with no log redirect, so no crash log exists. Sep 1 stderr shows an older `EADDRINUSE 3090`. | Cause unknown. Installed `mission-control.mjs` hash 45D40A25... equals canonical source (matches INSTALLATION.md). |
| Halo Research Gateway `127.0.0.1:8765` | UP, but a DIFFERENT instance than the handoff measured (see section 4, item 1) | Started 2026-09-08 22:33 MDT by scheduled task `Halo Research Gateway` (logon trigger, user scott, Interactive, result 0). pid 3952 -> child 14452 (listener). `/health`: ok, 0.3.0, schema 1.5, db 3, connections 0, captcha/proxy disabled, jobs complete 5 / cancelled 1, cache 41. My session's MCP client connected and saw 14 tools. | Running on built-in defaults because no `config.toml` exists in its runtime root. |
| LM Studio server `127.0.0.1:1234` | UP, ZERO models loaded | `lms server status` running; `lms ps --json` = `[]`. Logon task `LMStudioServerAtLogon` intentionally loads nothing. | The tuned pair loads only when `Launch-Halo.ps1` runs. |
| `HALO Memory Snapshot` task | Working | Hourly, result 0, newest snapshot 2026-09-09 12:00. Task points at the SOURCE script in the repo. | `memory.json` is 142 bytes, unchanged since 2026-08-30. |
| Router production deployment | Intact | `node stack/halo-router-production/promote.mjs check` -> `{"pass":true,"files":5}` | Hash check only; not a runtime test. |
| DEV baseline | Stale, not broken | `prepare.mjs --verify` reports 4 changed files (web `cordis.patch.yml`, `package.json`, orchestrator `agent.cordis.yml`, `Run-HaloCockpit.ps1`). All four are the files the Sep 8 promotion wrote. | Baseline predates promotion. |

Git:
- DSH `C:\Users\scott\Desktop\Code\dsh-halo-research`: master, HEAD 6eecbb92, no remote. Untracked: `DSH-HALO-PLUGIN-REUSE-RESEARCH-2026-09-03.md`, `HALO-DSH-AND-RESEARCH-GATEWAY-HANDOFF-2026-09-08.md`.
- Gateway `C:\Users\scott\Desktop\Code\halo-research-gateway`: main = origin/main = 562a64a4 (fresh `ls-remote`, fetch dry-run empty). Tag `v0.3.0` is an annotated tag object dc81bf3e that points at 562a64a4 locally and remotely. No mismatch. Untracked: `docs\INSTALL-AND-LAUNCH-2026-09-08.md`, `docs\HALO-DSH-AND-RESEARCH-GATEWAY-HANDOFF-2026-09-08.md`.

## 2. What I can finish alone, and what only Scott decides

I can do alone once authorized (all coordinated with the CivicCast session first):
1. Put the recorded `config.toml` (SHA-256 D3D772F6...) into the real runtime root and restart the Gateway with its own `Stop-HaloResearch.ps1` / `Start-HaloResearch.ps1`. Re-run the MCP smoke. This restores the Mission Control local target the running instance lacks.
2. Start Mission Control with `Halo Status.lnk` / `Launch-Status.ps1`, then check every displayed number against `lms ps --json`, the memory file, and the plugin list. Add stdout/stderr capture so the next silent death leaves evidence.
3. Fix the records: the two stale "Gateway 0.2.0" rows, the DEV README / HUMAN-RELEASE "production is not promoted" lines, and the install doc's wrong backup path. Add dated precedence notes. Commit the Gateway docs (`INSTALL-AND-LAUNCH`, the handoff) in one scoped commit.
4. Refresh the DEV production baseline after review, so `prepare.mjs --verify` is green again.
5. Remove or refresh the dead installed copy of `Snapshot-HaloMemory.ps1` (655 bytes) that nothing uses.
6. Start production DSH via `Launch-Halo.ps1` and walk the Router panel and picker. This loads about two 30B-class models, so it waits for a memory window agreed with the CivicCast session.

Only Scott decides:
- A. Which Gateway runtime root is canonical. My pick: the real `C:\Users\scott\AppData\Local\HaloResearchGateway` (the one the logon task uses). Leave the Codex-store copy untouched as evidence.
- B. Whether DSH cockpit and Mission Control should auto-start at logon. My pick: keep manual for now; model preloading at logon would collide with CivicCast memory work.
- C. Whether the DSH repository gets a GitHub remote. No pick; not needed for the work above.

## 2a. Status update, 2026-09-09 13:35 MDT

Scott chose decision A = real runtime root, and decision B = keep manual starts. Item 1 is DONE: the recorded `config.toml` (SHA-256 D3D772F6...) now sits in `C:\Users\scott\AppData\Local\HaloResearchGateway\config.toml`; the Gateway was stopped and started with its own scripts; new pid 40744 (listener child 35636); `/health` ok 0.3.0 on the same database; MCP smoke passed (14 tools, live fetch); `local_fetch target=mission_control` now returns `UPSTREAM_UNAVAILABLE` (target known, Mission Control down) instead of an unknown-target error. Details: `HALO-GATEWAY-RUNTIME-ROOT-REPAIR-2026-09-09.md` in this folder. The Codex-store copy was not touched.

14:46 MDT: item 2 is DONE. Mission Control restarted from the installed copy with log capture (pid 11188), canonical launcher recognized it, seven tabs walked with a clean console, displays matched the underlying data, live acceptance passed 38 checks and stopped at the cockpit check because DSH is down. One low display defect found (hyphenated workspace names shown as nested paths in the dsh-down fallback). Details: `HALO-MISSION-CONTROL-RESTORE-2026-09-09.md`.

## 3. Prioritized plan (after "go")

1. Gateway identity repair (item 1 above). Small, safe, no models.
2. Mission Control restore with logging (item 2).
3. Records reconciliation and Gateway docs commit (items 3, 4, 5).
4. Production DSH launch and UI walkthrough (item 6), only in an agreed memory window.
5. Then Gateway research acceptance: GitHub authenticated research and one real research login with an account Scott picks.

## 4. Contradictions between source, deployed state, and the records

1. **Two Gateway runtime roots.** The Sep 8 install and acceptance ran from inside the OpenAI Codex MSIX container. Its writes to `%LOCALAPPDATA%\HaloResearchGateway` were redirected to `C:\Users\scott\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\HaloResearchGateway`. That folder holds `config.toml` (SHA-256 D3D772F6..., same as the handoff), `backups\2026-09-08-install\config.toml`, `run\gateway.json` (pid 3804, 2026-09-08 11:33 MDT), and a 44.8 MB `gateway.db` with jobs complete 6 / failed 5 / cancelled 1 (exactly the handoff's numbers). The logon task runs outside any container, so it started the Gateway from the real `C:\Users\scott\AppData\Local\HaloResearchGateway`, which has NO `config.toml`, no top-level `backups`, an empty `logs`, and a 1.85 MB `gateway.db` with jobs complete 5 / cancelled 1. `__main__.py` falls back to `GatewayConfig.load(None)` when the file is absent. Comparing defaults to the recorded config, the only difference is the missing `[local_targets.mission_control]` block. The handoff's config path, backup path, and "config hash unchanged" statements describe the Codex-store copy, not the running instance.
2. **Handoff §2 "Gateway startup task: NOT verified."** Now verified: the logon task ran at 2026-09-08 22:33 MDT with result 0 after a real reboot, and the Gateway came up. This is the positive evidence the install doc said was missing.
3. **`HALO-CURRENT-CONFIGURATION.md`** line 5 says Gateway 0.3.0; lines 281 and 636 still say 0.2.0. Its "CURRENT" sections say Router 0.3.0 is up at 3080 and Mission Control is on 3090; both are down today.
4. **`halo-router-dev\README.md` lines 6-7 and `HALO-ROUTER-HUMAN-RELEASE-2026-09-08.md` line 3** say "Production is not promoted"; `HALO-ROUTER-PRODUCTION-2026-09-08.md` says it is. Same day, never reconciled.
5. **`docs\INSTALL-AND-LAUNCH-2026-09-08.md` lines 42-43** put the config backup at `<runtime>\backups\2026-09-08-install\`; `operations.md` and `config.py` put backups under `state\backups`. No script creates a top-level `backups` folder (agent digest; unverified by me).
6. **Installed `Snapshot-HaloMemory.ps1`** (655 bytes) differs from source (1300 bytes). Harmless: the task runs the source path.
7. **Job counts in `/health`** omit `failed` because `_job_counts` (service.py:1578) returns only states that exist in the DB. Not a bug; explains why "5 failed" vanished.
8. **My own memory note** said the Claude app virtualizes `%LOCALAPPDATA%`. In this session my shell saw the real path (parent chain: pwsh <- claude.exe in Roaming <- MSIX Claude.exe), and no Claude package copy of the Gateway folder exists. The virtualized writer this time was Codex.

## Verification ledger

Files I read myself in this session, one claim per line:

VERIFIED: handoff snapshot was taken ~21:33 MDT Sep 8 and did not start/stop anything | C:\Users\scott\Desktop\Halo Stack Research\HALO-DSH-AND-RESEARCH-GATEWAY-HANDOFF-2026-09-08.md:19
VERIFIED: handoff lists config at runtime root config.toml, backups at runtime root backups, and the Sep 8 backup path | C:\Users\scott\Desktop\Halo Stack Research\HALO-DSH-AND-RESEARCH-GATEWAY-HANDOFF-2026-09-08.md:111
VERIFIED: handoff recorded config SHA-256 D3D772F6... | C:\Users\scott\Desktop\Halo Stack Research\HALO-DSH-AND-RESEARCH-GATEWAY-HANDOFF-2026-09-08.md:277
VERIFIED: handoff says Gateway startup task state was NOT verified | C:\Users\scott\Desktop\Halo Stack Research\HALO-DSH-AND-RESEARCH-GATEWAY-HANDOFF-2026-09-08.md:30
VERIFIED: handoff reported jobs 6 complete / 5 failed / 1 cancelled | C:\Users\scott\Desktop\Halo Stack Research\HALO-DSH-AND-RESEARCH-GATEWAY-HANDOFF-2026-09-08.md:29
VERIFIED: records folder must be kept current when the stack changes | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\AGENTS.md:3
VERIFIED: Gateway repo scope is research-only, fourteen tools, localhost MCP | C:\Users\scott\Desktop\Code\halo-research-gateway\AGENTS.md:3
VERIFIED: Mission Control installed candidate SHA-256 is 45D40A25... and Launch-Status.ps1 is the launch path | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\INSTALLATION.md:11
VERIFIED: Launch-Status.ps1 starts node hidden with no stdout/stderr redirection and health at 127.0.0.1:3090/api/status | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Launch-Status.ps1:5
VERIFIED: source Snapshot-HaloMemory.ps1 uses staged copy + Move-Item (the 1300-byte version) | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Snapshot-HaloMemory.ps1:1
VERIFIED: installed Snapshot-HaloMemory.ps1 is the older plain Copy-Item version (655 bytes) | C:\Users\scott\.dsh\mission-control\Snapshot-HaloMemory.ps1:1
VERIFIED: Launch-Halo.ps1 is the desktop-shortcut cockpit launcher, idempotent, preloads the tuned pair on fresh start | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1:2
VERIFIED: Run-HaloCockpit.ps1 supervises pnpm dlx @deepseek-ai/dsh@0.1.1-rc.2 web with one restart | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Run-HaloCockpit.ps1:1
VERIFIED: promote.mjs check only reads and hashes (no writes) | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-production\promote.mjs:73
VERIFIED: promote.mjs rollback skips the web cordis.patch.yml to preserve the Gateway connection | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-production\promote.mjs:68
VERIFIED: prepare.mjs --verify only reads the baseline and hashes files | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-dev\prepare.mjs:13
VERIFIED: Start-HaloResearch.ps1 never sets HALO_RESEARCH_CONFIG and starts python -m halo_research_gateway | C:\Users\scott\Desktop\Code\halo-research-gateway\scripts\Start-HaloResearch.ps1:29
VERIFIED: installer runtime root is $env:LOCALAPPDATA\HaloResearchGateway and config.toml is copied only if absent | C:\Users\scott\Desktop\Code\halo-research-gateway\scripts\Install-HaloResearch.ps1:11
VERIFIED: __main__.py falls back to GatewayConfig.load(None) when config.toml is absent | C:\Users\scott\Desktop\Code\halo-research-gateway\src\halo_research_gateway\__main__.py:17
VERIFIED: config ROOT = user_data_path("HaloResearchGateway") | C:\Users\scott\Desktop\Code\halo-research-gateway\src\halo_research_gateway\config.py:13
VERIFIED: _job_counts returns only job states present in the DB (so "failed" disappears when zero) | C:\Users\scott\Desktop\Code\halo-research-gateway\src\halo_research_gateway\service.py:1578
VERIFIED: Codex-store config.toml sets [local_targets.mission_control] on 127.0.0.1:3090 | C:\Users\scott\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\HaloResearchGateway\config.toml:72
VERIFIED: Codex-store run\gateway.json records pid 3804 started 2026-09-08T17:33:24Z | C:\Users\scott\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\HaloResearchGateway\run\gateway.json:3
VERIFIED: real-root run\gateway.json records pid 3952 started 2026-09-09T04:33:27Z | C:\Users\scott\AppData\Local\HaloResearchGateway\run\gateway.json:3
VERIFIED: last cockpit launch 2026-09-08 09:39 MDT, pid 30512, supervisor 11268, dsh 0.1.1-rc.2 | C:\Users\scott\.dsh\logs\halo-cockpit.pid.json:2
VERIFIED: launcher loaded halo/qwen3.6-35b-a3b and found halo/qwen3-coder-30b-a3b-q4km resident on Sep 8 | C:\Users\scott\.dsh\logs\halo-startup-2026-09-08T15-39-51-111Z.log:8
VERIFIED: the 09:38 cockpit start died on ECONNREFUSED 127.0.0.1:8765 from mcp-halo-research | C:\Users\scott\.dsh\logs\halo-cockpit-20260908-093852.stderr.log:7
VERIFIED: Mission Control Sep 1 stderr shows EADDRINUSE 127.0.0.1:3090 | C:\Users\scott\.dsh\mission-control\mission-control.stderr.log:5
VERIFIED: production web composition has mcp-halo-research at http://127.0.0.1:8765/mcp with failOnStartupError: false | C:\Users\scott\.dsh\profiles\web\cordis.patch.yml:42

Measured by command in this session (no file to cite; command named):
MEASURED: 3080, 3085, 3090 refuse connections; 8765 answers; /health ok 0.3.0 schema 1.5 db 3 jobs complete 5 cancelled 1 (Invoke-WebRequest)
MEASURED: LastBootUpTime 2026-09-08 22:29:24; System log 1074/6006/6005 at 22:25-22:29 (Get-CimInstance, Get-WinEvent)
MEASURED: task "Halo Research Gateway" logon trigger, user scott, last run 2026-09-08 22:33:18, result 0 (Get-ScheduledTask)
MEASURED: lms ps --json = [] ; lms server status = running on 1234
MEASURED: git DSH master HEAD 6eecbb92 no remote; Gateway main = origin/main = 562a64a4; tag v0.3.0 annotated dc81bf3e -> 562a64a4 (git status/log/remote/ls-remote/cat-file)
MEASURED: promote.mjs check pass 5 files; prepare.mjs --verify 4 changed files
MEASURED: SHA-256 of Codex-store config, its backup, and the records copy all equal D3D772F6... (Get-FileHash)
MEASURED: read-only SQLite: Codex-store db jobs cancelled 1 / complete 6 / failed 5, cache 7; real db cancelled 1 / complete 5, cache 41 (scratchpad gw_compare.py)
MEASURED: running defaults vs recorded config differ only in local_targets.mission_control (scratchpad gw_compare.py)
MEASURED: WSL ls/find of the real runtime root: no config.toml, no top-level backups, empty logs
MEASURED: pid 3804 is now svchost.exe (reused); pids 30512/11268 not running; 3952 -> 14452 python (Get-CimInstance Win32_Process)
MEASURED: 27.3 GB of 63.8 GB free; vmmemWindowsSandbox 15.9 GB (Get-Process)

Read only by Sonnet subagents, not by me:
UNVERIFIED: HALO-CURRENT-CONFIGURATION.md lines 281 and 636 still say Gateway 0.2.0 while line 5 says 0.3.0 - not checked
UNVERIFIED: halo-router-dev\README.md:6-7 and HALO-ROUTER-HUMAN-RELEASE-2026-09-08.md:3 say production is not promoted - not checked
UNVERIFIED: HALO-ROUTER-PRODUCTION-2026-09-08.md, HALO-GATEWAY-RECONNECTED-2026-09-08.md, audit-lite recheck, DIRECT-REUSE, PROVENANCE.md, PROVIDER-PROMOTION, DSH-IMPLEMENTATION-2026-09-03, halo-research-state README, HALOROUTERSPECv0.3.md contents - not checked
UNVERIFIED: docs\INSTALL-AND-LAUNCH-2026-09-08.md:42-43 backup path claim and "no script creates a top-level backups folder" - not checked
UNVERIFIED: Gateway README.md, RESEARCH-ONLY-SCOPE.md, USER-MANUAL.md, operations.md, host-integration.md, implementation-status.md, RELEASE-NOTES-v0.3.0.md, DSH evidence docs, security.md, quality-gate.md, integrations\dsh\README.md, scripts\HaloLifecycle.ps1 contents - not checked
UNVERIFIED: actual GPU/VGM split - not checked
UNVERIFIED: Mission Control UI and displayed data - not checked
UNVERIFIED: any Gateway tool call beyond the MCP tool list - not checked
UNVERIFIED: DEV router runtime behavior - not checked
UNVERIFIED: records-folder MANIFEST-SHA256.txt against live files (only header and the config row read) - not checked
UNVERIFIED: why Mission Control stopped on 2026-09-03 - not checked
