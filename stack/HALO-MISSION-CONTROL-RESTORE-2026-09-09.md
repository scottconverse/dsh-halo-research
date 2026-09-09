# Mission Control restore, 2026-09-09

Time: 2026-09-09 14:42 to 14:46 MDT. Author: Claude Fable 5.1 (session code-6c). Authorized by Scott ("go on Mission Control"). Coordinated with the CivicCast Refactor session before starting (one light node process, no model loads, no Sandbox contact).

## State before

Mission Control (`127.0.0.1:3090`) had been down since about 2026-09-03 21:19 MDT (last `mc-history.jsonl` sample). No reboot happened between Sep 1 and Sep 8, so it died or was stopped for an unknown reason. The canonical launcher `Launch-Status.ps1` starts node hidden without stdout/stderr capture, so no crash log existed. Installed `mission-control.mjs` hash `45D40A25...` equalled the canonical source and the Sep 1 install receipt (`install-20260901-200659-415-7a6201a6.json`, SHA-256 `7C35A43E...`). Port 3090 was free. LM Studio was still running (5 processes, server on 1234), so Mission Control's `lms` polling would not wake anything.

## What was done

1. Started the installed copy with captured output:
   `node C:\Users\scott\.dsh\mission-control\mission-control.mjs`, working directory `C:\Users\scott\.dsh\mission-control`, hidden, pid **11188**.
   Logs: `C:\Users\scott\.dsh\mission-control\mission-control-20260909-144201-claude.stdout.log` and `...stderr.log` (same folder and naming style as the Sep 1 launcher logs). After the walkthrough: stdout = `Mission Control on http://127.0.0.1:3090`, stderr = empty.
2. Ran the canonical launcher `Launch-Status.ps1 -NoBrowser` under Windows PowerShell 5.1 (as the desktop shortcut does). It recognized the running installed build and did not start a duplicate: `Started False, Healthy True, Sha256 45D40A25...`. One listener on 3090 (pid 11188).
3. Ran the canonical live acceptance `Test-HaloMissionControlLive.ps1` (PowerShell 7) with the expected source hash, receipt hash, installed copy and receipt. It passed 38 checks (paths, receipt identity and contract suites, HTTP `/`, no-store, one per-boot action token, runtime build identity, a fresh authenticated `POST /api/validate-config` with no warnings, identity unchanged after validation) and then stopped at check 39, **"Cockpit connection: DSH :3080 is reachable"**. The cockpit is down by design tonight, so the remaining checks (LM Studio, lms CLI, session source, model/route parity, plugin cache, memory writer, snapshots, RAM/GPU/disk, history, settings) were not reached by the script. I spot-checked the data-backed ones by hand (below).
4. Walked every tab in the in-app browser: Overview, Models, Sessions, Plugins, System, Memory, Settings. Browser console: no messages, no errors. I did not click "Start cockpit", "Load Brain/Worker", "Load", "Unload", or "Validate config".

## Display versus underlying data

| Display | Underlying truth | Verdict |
|---|---|---|
| Cockpit (:3080) down; "COCKPIT DOWN" banner; STREAM "events WebSocket disconnected" | No listener on 3080 | honest |
| LM Studio API (:1234) up; lms CLI up | 1234 listening; `lms ps --json` works | honest |
| "no local model resident"; Resident Brain/Worker empty; RESIDENT POOL shows `local-coder` idle on **NvideaBlackwell** | `lms ps --json` returns exactly one entry, `gemma-4-12b-it-qat` as `local-coder`, deviceIdentifier `455bfb4f...` = peer NvideaBlackwell | honest, peer origin labeled |
| Configured route `lmstudio/halo/qwen3.6-35b-a3b` "not resident; next request can load a separate model instance" | Route in `settings.yaml`; nothing loaded | honest |
| Models tab: 15 addressable entries, 183.1 GiB in 13 files on this device; all "on disk"; LM Link peers 21 entries | Not independently recounted | plausible, UNVERIFIED |
| Windows pool 42.5-42.9 GiB free of 63.8; machine total 128 | OS: 43.0 free of 63.8 | matches |
| GPU carveout 3% of 64.2 GiB, dedicated 2 GiB, shared 0.8 GiB | No local models loaded | plausible, UNVERIFIED |
| Knowledge graph: 1 entity `HALO-MEMORY-PROBE-20260830`, 0 relations, file updated 2026-08-30 14:48 | `memory.json` (142 bytes) holds exactly that one entity | matches |
| Snapshots: 168 retained, latest 2026-09-09 14:00, next 15:00, on schedule; task Ready, last result 0 | Task last run 20:00:01Z result 0; `memory-20260909-140002.json` present | matches |
| DSH memory writer "status unavailable: DSH port unavailable" | DSH down | honest |
| Plugins tab: "dsh down — no inventory"; API `plugins: null` | DSH down; no source | honest |
| Sessions: "0 session files updated today", source "disk scan (dsh down)", all idle | No DSH turns today | honest |
| Config validation "ok · 2026-09-09 14:43" | Produced by the live test's own `POST /api/validate-config` at 14:43; before that the API showed the Sep 1 validation with freshness "stale" | honest |
| Settings: 32768 default context, compaction 0.8 / 0.16 / 8192, route `halo/qwen3.6-35b-a3b`, brain and worker parallel 1, reasoning off | Consistent with the Sep 8 production record | consistent, sources named |
| Disk C: 614.3 GB free of 2046.2 | Not independently checked | UNVERIFIED |

## Findings

- **MC-1 (display defect, low).** Sessions tab in the "disk scan (dsh down)" fallback renders hyphenated folder names as nested paths: `halo-research-gateway` shows as `...\Code\halo\research\gateway`, `dsh-halo-research` as `...\Code\dsh\halo\research`, `native-cli` as `native\cli`. The session-directory name encodes path separators as hyphens, and the decoder cannot tell them from real hyphens. Only the workspace column is affected; only while DSH is down. Fix candidate: resolve the real cwd from the session file instead of decoding the directory name, or mark the column "approximate (decoded from folder name)".
- **MC-2 (evidence gap, low).** The canonical launcher captures no stdout/stderr, so a silent death leaves nothing. This restore used a captured launch; a small launcher change would make that the default.
- **MC-3 (acceptance limit).** Full live acceptance cannot pass while the cockpit is down; it stops at check 39 of about 100. Re-run it after the DSH cockpit is launched (blocked tonight by the CivicCast memory freeze).

## Not done / limits

- Cause of the Sep 3 stop is still unknown; the new logs will catch the next one.
- Nothing was committed to Git. Nothing was changed under `.dsh` except the two new log files.
- The Codex-store Gateway folder, DSH, DEV, LM Studio, Windows Sandbox were not touched.

## Verification ledger

VERIFIED: Launch-Status.ps1 requires installed hash == canonical and reuses a running build without starting a duplicate | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Launch-Status.ps1:47
VERIFIED: Launch-Status.ps1 starts node hidden with no output redirection | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Launch-Status.ps1:90
VERIFIED: INSTALLATION.md records source SHA 45D40A25... and receipt SHA 7C35A43E... | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\INSTALLATION.md:11
VERIFIED: install receipt records Installed 45D40A25... to the installed path | C:\Users\scott\.dsh\mission-control\backups\install-20260901-200659-415-7a6201a6.json:11
VERIFIED: live test throws on the first failed check | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Test-HaloMissionControlLive.ps1:40
VERIFIED: live test's only POST is /api/validate-config | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Test-HaloMissionControlLive.ps1:132
VERIFIED: "Cockpit connection" is check 39, the first DSH-dependent check | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Test-HaloMissionControlLive.ps1:329
VERIFIED: Mission Control listens on 3090 and reads memory.json, mc-history.jsonl and the snapshot folder | C:\Users\scott\.dsh\mission-control\mission-control.mjs:17
VERIFIED: Mission Control inventories models via lms ps --json | C:\Users\scott\.dsh\mission-control\mission-control.mjs:553
VERIFIED: memory.json holds one validation entity | C:\Users\scott\.dsh\memory\memory.json:1
MEASURED: /api/status JSON saved to the session scratchpad (mc_status.json) and compared field by field with lms ps --json, memory.json, snapshot listing, port checks and OS RAM (this session)
MEASURED: canonical launcher output Started False / Healthy True; live test output failed at "Cockpit connection"; browser page text of all seven tabs; console empty (this session)
UNVERIFIED: Models tab file counts and sizes (183.1 GiB / 13 files) - not checked
UNVERIFIED: GPU carveout and disk figures - not checked
UNVERIFIED: why Mission Control stopped on 2026-09-03 - not checked
UNVERIFIED: live acceptance checks 40 onward - not reached while the cockpit is down
