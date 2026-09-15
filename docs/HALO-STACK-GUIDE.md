# Halo stack guide

Updated September 15, 2026.

## What this stack is

Halo is the local DeepSeek Harness deployment for this Windows workstation. Stock DSH runs the agent, LM Studio supplies the approved local models, Wigolo supplies primary web research over MCP, `reference_memory` keeps durable knowledge across sessions, and Mission Control supplies the operator dashboard.

| Service | Address | Owner |
|---|---|---|
| LM Studio API | `127.0.0.1:1234` | LM Studio |
| DSH | `127.0.0.1:3080` | Stock DSH launcher |
| Mission Control | `127.0.0.1:3090` | Stock DSH launcher |
| Wigolo | stdio child, no separate port | DSH Cordis MCP client |

## Start it

Double-click **DSH + Wigolo** on the desktop.

The launcher checks LM Studio, converges it to the two approved 128K single-slot models, starts or reuses DSH and its Wigolo child, promotes the tested Mission Control build, and opens Mission Control plus the authenticated DSH page as two tabs in Google Chrome. A second click reuses healthy processes.

Mission Control is ready when its Overview page loads at `http://127.0.0.1:3090` and its status strip begins resolving live evidence. Brief amber states during initial collection are normal; a persistent amber or red light should explain which source is missing, stale, or unhealthy.

## Stop it

Double-click **Stop DSH + Wigolo** on the desktop.

This stops Mission Control, DSH, and the exact Wigolo MCP child tree. It does not close LM Studio or unload the approved models. That keeps the expensive model loads ready for the next launch.

## Use Mission Control

- **Overview** is the first place to check whether DSH, models, plugins, streaming, storage, context, disk, and configuration are healthy.
- **Models** shows the downloaded catalog beside exact resident instances. Load and unload actions require confirmation and are verified after execution.
- **Sessions** shows current and recent work by workspace. A session marked stalled has stopped making durable progress even if an upstream state still claims it is working.
- **Plugins** shows every current Cordis entry. A retained older inventory is labeled stale and cannot make the Harness light green.
- **System** shows machine resources, versions, validation results, and recent LM Studio output. A missing GPU or disk query is unknown, not zero.
- **Memory** shows the persistent knowledge graph, its active DSH writer, the exact recovery-task definition, and retained snapshots. Click an entity to read its saved observations.
- **Settings** edits only a fixed safe subset of model, compaction, retry, and stream-timeout values. It validates and backs up both affected configuration documents as one change.

## Search behavior

Ask normally for web research. The local agent instructions prefer Wigolo for search and retrieval without requiring a special command. Wigolo gets one revised attempt after an empty result. DSH's native web tools are the bounded fallback for failure, timeout, or no usable evidence.

If native DeepSeek search is reached without a `DEEPSEEK_API_KEY`, DSH reports the missing credential. Native page fetching remains keyless.

## Approved models

- `halo-coder-q4km` is the default coding and tool-using model.
- `halo-brain-35b` is available for planning, synthesis, and vision.
- Each is loaded with a 32,768-token context and one parallel slot.

The launcher corrects extra models and wrong approved-model load settings. Mission Control can manage model residency, but it does not silently change the approved pair or claim that an unqualified model is healthy.

## Settings and restart behavior

Mission Control shows the exact files behind each editable value. Some DSH settings apply only after a DSH restart. Use the desktop stop and start shortcuts after an accepted change when the Settings result says a restart is required.

The editor refuses unknown keys, invalid ratios, unsafe context math, excessive summary compression, and stream idle timeouts below the machine's ten-minute floor. Configuration changes are staged, validated, and backed up before replacement.

## If something is wrong

1. Read the explanation attached to the affected status light.
2. Check **Plugins** when Wigolo or another tool is missing.
3. Check **Models** when a route is absent, duplicated, or loaded with the wrong envelope.
4. Check **Sessions** when work appears stuck; stop only the exact session you intend to cancel.
5. Check **System** for current validation and LM Studio output.
6. Use the desktop stop shortcut, then the start shortcut, when DSH authentication or a restart-required setting changed.

Do not treat a green web page alone as proof of full health. The live acceptance process also compares Mission Control to DSH, LM Studio, Windows resource data, the exact installed build, and the installation receipt.

## Files and recovery

The canonical source is `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh`. The live DSH home is `C:\Users\scott\.dsh-stock`. Mission Control is installed transactionally under that live home and records an install receipt for the exact promoted bytes.

The readable recovery snapshot is `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration`. Its manifest must be regenerated from the final release files after implementation and validation finish.

Persistent memory lives at `C:\Users\scott\.dsh-stock\memory\memory.json`. The `HALO Memory Snapshot` task writes recovery copies hourly and at startup to `C:\Users\scott\.dsh-stock\memory\snapshots` and keeps 168. If the real store is missing, the snapshot script performs an honest no-op and Mission Control reports the missing store.

## Bundled Reddit research skill — September 14, 2026

The supported local DSH preset now loads `reddit-search` from the versioned folder `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh\skills`. It takes priority over a shared user copy of the same skill. The live preset is `%USERPROFILE%\.dsh-stock\.agent-presets\local\agent.cordis.yml`.

For Reddit/subreddit research the agent is directed to load this skill; other web research continues through Wigolo and the existing native fallback. The skill uses Reddit RSS plus optional local Redlib at `http://127.0.0.1:18080`. Python 3.10+ runs its standard-library parser; PowerShell 7 runs the optional Redlib lifecycle scripts. Redlib is installed separately under `%LOCALAPPDATA%\RedditSearch\Redlib`. DSH start/stop shortcuts do not start or stop it.

The repo contains the skill instructions, parser, native Windows Redlib setup/start/test/stop scripts, reference notes, and captured-response regression tests. All 12 parser tests pass. The running DSH `skills/list` endpoint lists `reddit-search` as model-invocable, and the local preset's skill provider and loader are active. This verifies installation/discovery, not a new autonomous DSH research run.

To restore, copy the tracked local preset to the live preset path above. It reads the skill directly from the repo. If the repo moves, update `customSkillDirs`. The matching deployables are preserved under `Current Halo Configuration\stock-dsh`.

## Current local model tuning

Both existing models load at 128K. In DSH, leave the coder selected for normal coding; it now uses Q8 conversation cache and microbatch 2,048. The 35B planner/vision model retains F16 cache and microbatch 1,024. Both use 12 CPU threads and logical batch 2,048. No new model or research interface is required.

For the 35B, choose Off for direct answers or High to enable thinking. Off remains the routine default: the coding comparison finished faster and more reliably within its output budget. High remains available when you want it. Existing temperature and penalty settings remain; Min-P is now explicitly 0.05 to preserve the runtime value already in use.

Compaction starts at 80%, retains 55% of context verbatim, and allows an 8K summary. The ten-minute provider idle timeout remains. Continuing DSH conversations successfully reused prompt caches, but switching to unrelated prompts can still involve slow processing. Having room for 128K does not guarantee accurate answers across that entire input; the 44–47K evaluation exposed errors in both models.

The desktop launcher and Mission Control model-load buttons preserve 128K. Selected settings passed fresh coding workflows through DSH. Current evidence and rollback instructions are in HALO-DSH-IMPLEMENTATION-2026-09-15-FIVE-INVESTIGATIONS.md. Historical session readings are not rewritten.


## September 15: stock alpha capabilities

DSH is now `0.1.6-alpha.1`. The default local preset adds workspace-scoped history search, TypeScript/JavaScript and Python LSP navigation, stock Chrome DevTools MCP interaction, and persistent PowerShell tools. The stock right sidebar offers **New terminal**, defaulting to PowerShell 7. Existing tools and all seven Mission Control areas remain.

For native Codex delegation, start a session in **Local + Codex (opt-in)**. This uses a genuine Luna Codex worker and consumes Codex usage. Ordinary **Local models** retains Codex disabled. Common settings in the two full-copy presets should be kept synchronized.

The optional Google provider uses the TownReporter AI Studio key in DSH's credential store. **Gemini 3.6 Flash** completed a real DSH response; the project showed Free tier. Local coder remains the automatic default. No Antigravity agent bridge or Claude provider was installed.

Read `HALO-DSH-IMPLEMENTATION-2026-09-15-ALPHA-UPGRADE.md` for the exact packages, validation and limits.
