# Halo stack guide

## Codex coding-worker transport repair — September 16

Bounded DeepSeek coding workers now have a separate custom Responses route to the signed-in Ollama server at `http://[::1]:11434/v1`. The one-model catalog avoids the incompatible built-in search path; apps, plugins, memories and nested-agent tools are excluded only from this worker invocation. The original `ollama-deepseek` full profile remains available. Main desktop, DSH, Claude and LM Studio settings were not changed by this repair. Because this installed CLI cannot combine the global desktop settings with the isolated profile reliably, use the installed skill's reproducible launcher rather than copying the old `--profile` command.

The earlier realpath task completed entirely by DeepSeek in 114 seconds with 17 passing tests and a final reply, but used 530,485 tokens including cached replay. The packaged launcher then received a real DeepSeek implementation run and a fresh acceptance run in an isolated worktree. Acceptance found and fixed a resume-session mismatch that could have reported success without proving continuation. A final correctness repair then required a nonempty authoritative `--output-last-message` and rejected mismatched `agent_message` text; the launcher suite passes 17 tests and combined focused discovery passes 34 tests. Require `"success": true` in the receipt, inspect the diff and tests, and continue stopped work with `--resume <SESSION_ID>` and a fresh short brief. This remains a bounded stock-CLI code-worker route, not a proxy or custom loop. Whole-task usage still fell below the 80% DeepSeek/local target because the long root/coordinator conversation and premium coordination dominated. See [worker repair results and usage](HALO-CODEX-WORKER-REPAIR-2026-09-16.md) and [research, evidence and limitations](HALO-CODEX-TRANSPORT-RESEARCH-2026-09-16.md).

## Codex delegation defaults — September 16

Codex now assigns implementation and test work to Ollama Cloud DeepSeek from the start, rather than waiting for low Codex quota. Tuned local models handle bounded file-based drafts and reviews: the brain sends High reasoning by default; the coder sends no reasoning field. Astra coordinates and handles difficult judgment; Sol/Terra/Luna are selective reviewers or escalations while quota permits. Targets of 90%+ cloud/local work, 1–5% Astra, and 6–9% other premium work are goals, not measured savings or hard quota controls. Below 10% main Codex allowance, no new premium workers are launched. See [setup and verification](HALO-DSH-IMPLEMENTATION-2026-09-16-CODEX-DELEGATION.md). DSH routing, Claude's helper, model tuning, and resident instances are unchanged by this setup.

Updated September 16, 2026.

## Approved model context

The approved brain and worker use **131,072 tokens**, parallel=1. Mission Control's missing-context fallback and profile warning now agree with that setting. Explicit manual context choices remain available. The retained legacy startup helper was also aligned, but the desktop shortcut continues to use the stock PowerShell launcher. The September 16 correction was installed on disk without starting DSH or restarting services; a running Mission Control process uses it after its next normal restart. No model reload is required just for this code correction.

## Focused coding sessions

In DSH, click **New session**, open the **Local models** preset selector, and choose **Local coding — lean**. Choose the workspace and model normally. This keeps file editing/search, PowerShell, LSP, skills and compaction while sending a much smaller tool catalog to the model. Start a session with **Local models** when you want the full research, browser, persistent memory, history and delegation capabilities. The default and existing sessions have not changed. See [the lean preset guide and results](DSH-LEAN-CODING-2026-09-15.md).

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

If Mission Control's file was updated while its old process stayed open, the launcher now replaces that verified old process automatically. You do not need to stop the whole stack just to clear a build-identity mismatch. DSH, Wigolo and the models remain running during that Mission Control replacement.

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
- Each is loaded with a 131,072-token context and one parallel slot.

The launcher corrects extra models and wrong approved-model load settings. Mission Control can manage model residency, but it does not silently change the approved pair or claim that an unqualified model is healthy.

If LM Studio records an unexpected engine exit while DSH is running, Mission Control automatically reloads affected approved models that were resident before the failure. The dashboard tab may be closed; its background server performs the recovery. Intentional Unload commands are respected. Use the normal Load control to bring an intentionally unloaded model back. The desktop start shortcut continues to restore the complete approved pair as before.

The watcher does not reopen a deliberately closed LM Studio application, and it does not restart a failed DSH conversation. After the models recover, retry the failed conversation in DSH. Recovery failures are visible in the Models page and Mission Control log, with limited retries instead of an endless load loop.

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

For the 35B, choose **Qwen3.6 35B-A3B - planner and vision** under **LM Studio brain** (`lmstudio-brain`). **High is now the default**, following the September 16 paired log-audit comparison (6/6 correct with High, 2/6 with Off). **Off** remains a deliberate fast option and sends `reasoning_effort: "none"`. The coder still starts by default under `lmstudio` without thinking. Both routes share the same LM Studio server; Claude's direct requests are unaffected. Existing conversations keep their saved choices, so reselect the new brain entry and High when continuing an old brain conversation. The configuration is installed for the next normal launch; this change did not start or restart services or load models. Existing context, temperature and penalty settings remain; Min-P remains 0.05.

Compaction starts at 80%, retains 55% of context verbatim, and allows an 8K summary. The ten-minute provider idle timeout remains. Continuing DSH conversations successfully reused prompt caches, but switching to unrelated prompts can still involve slow processing. Having room for 128K does not guarantee accurate answers across that entire input; the 44–47K evaluation exposed errors in both models.

The desktop launcher and Mission Control model-load buttons preserve 128K. Selected settings passed fresh coding workflows through DSH. Current evidence and rollback instructions are in HALO-DSH-IMPLEMENTATION-2026-09-15-FIVE-INVESTIGATIONS.md. Historical session readings are not rewritten.


## September 15: stock alpha capabilities

DSH is now `0.1.6-alpha.1`. The default local preset adds workspace-scoped history search, TypeScript/JavaScript and Python LSP navigation, stock Chrome DevTools MCP interaction, and persistent PowerShell tools. The stock right sidebar offers **New terminal**, defaulting to PowerShell 7. Existing tools and all seven Mission Control areas remain.

For native Codex delegation, start a session in **Local + Codex (opt-in)**. This uses a genuine Luna Codex worker and consumes Codex usage. Ordinary **Local models** retains Codex disabled. Common settings in the two full-copy presets should be kept synchronized.

The optional Google provider uses the TownReporter AI Studio key in DSH's credential store. **Gemini 3.6 Flash** completed a real DSH response; the project showed Free tier. Local coder remains the automatic default. No Antigravity agent bridge or Claude provider was installed.

Read `HALO-DSH-IMPLEMENTATION-2026-09-15-ALPHA-UPGRADE.md` for the exact packages, validation and limits.


## September 15: optional SuperGrok

The existing web profile includes pinned `MirDie/dsh-xai` with an alpha compatibility patch. Owner-approved device login and a real `xai-oauth / grok-4.6` DSH response succeeded. Use **Settings > xAI Grok** for account controls and the model picker for Grok. Local coder stays the default. No XAI_API_KEY fallback was configured. Credentials stay outside Git and recovery copies. See `HALO-DSH-IMPLEMENTATION-2026-09-15-SUPERGROK.md` for recovery and verification limits.


## Activity speed attribution

Mission Control's Activity card separates running now (active session models and providers) from the latest completed session, which is identified by title and its last-used model/provider beside its historical decode rate. It reads DSH's recorded last-used selection, not the default or a queued model. The speed remains a session aggregate; sessions that switched models can include multiple models. Missing attribution displays unknown.

## Ollama Cloud (September 15, 2026)

Keep Ollama running and signed in. In DSH choose **Ollama Cloud > DeepSeek V4.1 Flash (Ollama Cloud)**. Local models remain available; cloud use does not load GPU weights. In Codex, the stock Ollama desktop integration supplies the cloud model alongside native models after the desktop reloads its catalog. The native Terra default is retained.

The Codex `ollama-deepseek` worker profile defaults to DeepSeek execution, with bounded local helpers and Astra coordination. Sol/Terra/Luna are selective checks or escalations at 10% remaining or more; below 10%, no new premium workers start. Agents operate the worker; no terminal operation is required from Scott. Ollama's router is in Codex's request path for native as well as cloud models; keep it running or use Ollama Apps > ChatGPT (Desktop) > Off to restore the prior connection. See `HALO-DSH-IMPLEMENTATION-2026-09-15-OLLAMA.md` for exact files, checks, and limitations.

## Cloud model compatibility repair (September 15, 2026)

Direct DeepSeek API models are hidden because this installation has no DeepSeek API key; Ollama Cloud DeepSeek stays available. The Google chat picker excludes the two Deep Research agents that require a different API. Gemini defaults to explicit High thinking; Gemini 3.8 offers Low/Medium/High rather than unsupported Minimal. The SuperGrok plugin now correctly treats its 4.20 non-reasoning model as non-reasoning. See [changes, real DSH checks, and recovery](HALO-DSH-IMPLEMENTATION-2026-09-15-CLOUD-REPAIR.md).

## Local default on fresh launch

A fresh desktop start restores `lmstudio / halo-coder-q4km` as the default for new sessions. Both approved local models remain loaded. DSH normally saves model-picker changes as the next-session default; those choices may persist during the running instance, but the next fresh launch restores the deployment default. Existing conversations retain their own selected model. Clicking Start while DSH is already running reuses it without resetting the model.

## Recovery after restarting the controlling agent app

If the browser stays open but says `session/prompt failed: Failed to fetch`, check whether DSH (3080) and Mission Control (3090) are actually listening before changing model settings. On September 15 both servers disappeared after Codex was restarted, while LM Studio stayed up. The previous servers had been launched from Codex; the logs contained neither a normal stop nor an application crash report. Coupled process lifetime is the suspected cause, not a proven crash diagnosis.

For agent-operated recovery, launch the existing `Start-StockDSH.ps1 -NoOpen` through Windows `Win32_Process.Create` with `Win32_ProcessStartup.ShowWindow = 0`, using the installed PowerShell executable and deployment working directory. That lets Windows start the existing stack outside the invoking Codex command's process tree. Do not call the long-lived launch scripts as ordinary Codex child processes and assume Node `detached` or PowerShell `Start-Process` proves independence from the agent host. This is an operating procedure, not a new service or startup task. The ordinary desktop shortcut remains the user-facing launcher.

Verify both services, reconnect the existing browser's terminal recovery if needed, and verify a completed local-model reply. Preserve any unsent text. Do not restart Codex or the computer to test survival without Scott's authorization.

Recovery verification: the original Chrome tab successfully submitted `ANYONE HOME?`; `halo-coder-q4km` returned a completed reply in 1m 02s. Mission Control showed all eight watched signals nominal and both approved models resident. Surviving a further Codex restart was not tested.

## Desktop tool-load update, 2026-09-27

Native DSH Desktop's Local models preset now starts with 27 observed tools
(previous full catalog: 92). Wigolo, Chrome, reference memory MCP, delegation,
and persistent terminals are optional instead of default-loaded. PowerShell,
background jobs, file tools, LSP, history, planning/goals, skills, and basic web
tools remain. Wigolo is callable through the desktop-optional-tools skill and
its existing CLI; no computer-use package was installed. Stock fetch works;
stock search currently fails because its DeepSeek API key is absent. Wigolo CLI
and the seven-test coding fixture passed in a fresh Desktop chat. Web DSH and
model loading were untouched. See [Desktop implementation and evidence](HALO-DSH-IMPLEMENTATION-2026-09-27-DESKTOP-SMALL-CATALOG.md).

## Native Desktop picker correction, 2026-09-27

Native DSH Desktop now starts on **Qwen3.8 27B Q4_K_M, Halo tuned**, with
Xhigh effort; startup does not load or unload models. Existing conversations
retain their selections. This supersedes older native-Desktop default notes;
Web DSH's configuration is unchanged.

The five approved Ollama clouds are DeepSeek V4.1 Flash, GLM-5.3, Kimi K3,
MiniMax M3, and GLM-5.3 Flash. Gemini/Grok are removed from Desktop's picker.
Q5 weights were deleted (21.1 GB); the duplicate raw LM Studio Q4 picker route
is hidden while its shared GGUF remains. Claude Opus 5.5 replaces the old Opus
entry. Model effort controls use checked model/CLI metadata; MiniMax M3 stays
at provider-default thinking because this route advertises no verified levels.
Stock fetch works; stock search still requires its missing provider credential.

See [Desktop picker, effort evidence and recovery](HALO-DSH-IMPLEMENTATION-2026-09-27-DESKTOP-PICKER.md).

## Native Desktop Q4 final tuning — September 27, 2026

Native DSH Desktop now starts on the Halo Qwen3.8 27B Q4 alias with **Medium** effort and a **16,384-token output allowance**. Off explicitly sends `none`. The Q4 alias explicitly disables mmap and memory lock; context stays 131072, one lane, f16 KV, flash attention and MTP depth 4. The 0.2 vs 0.5 comparison showed identical paired answers and no meaningful decode gain; saved and loaded probability both remain **0.5**. A Desktop-only plugin applies Qwen27 Off/thinking sampling through the stock pi-ai payload hook. Live native Desktop probes completed: Off produced no reasoning blocks; Medium produced reasoning and the expected answer. Web DSH configuration and Windows settings were not changed.

See [configuration, exact verification, MTP results and recovery](HALO-DSH-IMPLEMENTATION-2026-09-27-Q4-TUNING.md). The plugin uses an internal DSH adapter seam and needs re-verification after Desktop upgrades. These findings supersede earlier Q4 Xhigh/8K startup notes; the shared model alias retains its own Xhigh default for other clients that omit effort.


## Integrated update: 2026-10-02

Both Web and Desktop Halo DSH now run official **0.2.0-rc.2**. The existing defaults, curated model routes, lean tools, compaction settings, and sampling policy remain in place. Active settings now live in each `profiles/<host>/cordis.patch.yml`; legacy `settings.yaml` was imported and renamed. Halo presets are registered declarations inside those profile patches, rather than automatically discovered folders. See `HALO-DSH-UPDATE-2026-10-02.md` for deployment paths, verified results, launch behavior, and rollback. Both hosts passed a real cloud-only request; no local model residency changed.


## Mission Control after the DSH 0.2 update

Use `http://127.0.0.1:3090` for Web Mission Control. Its Settings tab reads the Web `cordis.patch.yml`, not retired `settings.yaml`. The context percentage estimates the next provider prompt; it may exceed 100% and is not cumulative usage or a same-boundary measurement. Live engine decode, recently measured steps and historical session rates retain separate labels. Configuration validation becomes stale when the Web profile or installed DSH version changes. Source-only dashboard updates require restarting Mission Control, not DSH or LM Studio. See [the October 2 repair record](HALO-MISSION-CONTROL-020-REPAIR-2026-10-02.md).

### 2026-10-07 output-budget audit repair

The hidden pi-ai character-estimate output clamp is disabled for the Web child
with HALO_DSH_DISABLE_ESTIMATED_OUTPUT_CLAMP=1. The version-pinned, backed-up
repair is enforced by output-budget-patch.mjs before supported detached launch.
The 35B main route is now 24,576 output / 65,536 context / High reasoning.
All four registered compaction policies explicitly set headroomTokens: 4096;
the installed DSH 0.2 default of 65,536 previously invalidated the 64K budget.
The effective 24K-reserving pressure threshold is 36,864; retention is 22,528;
summary max remains 8,192. Seven focused output/compaction checks passed.
Web restarted with sessions preserved; only 35B remains loaded.

Audit details and remaining findings: HALO-DSH-AUDIT-2026-10-07.md. The launcher
still reloads both resident roles and delegation still targets the unloaded 27B.
Four of 149 Mission Control contract checks retain obsolete assumptions.
No complete news pipeline or live full-summary compaction was claimed.
