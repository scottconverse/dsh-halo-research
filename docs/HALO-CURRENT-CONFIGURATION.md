# Current installation: stock DSH + Wigolo + Mission Control

## Codex coding-worker transport repair — September 16

Bounded DeepSeek coding workers now have a separate custom Responses route to the signed-in Ollama server at `http://[::1]:11434/v1`. The one-model catalog avoids the incompatible built-in search path; apps, plugins, memories and nested-agent tools are excluded only from this worker invocation. The original `ollama-deepseek` full profile remains available. Main desktop, DSH, Claude and LM Studio settings were not changed by this repair. Because this installed CLI cannot combine the global desktop settings with the isolated profile reliably, use the installed skill's reproducible launcher rather than copying the old `--profile` command.

The earlier realpath task completed entirely by DeepSeek in 114 seconds with 17 passing tests and a final reply, but used 530,485 tokens including cached replay. The packaged launcher then received a real DeepSeek implementation run and a fresh acceptance run in an isolated worktree. Acceptance found and fixed a resume-session mismatch that could have reported success without proving continuation. A final correctness repair then required a nonempty authoritative `--output-last-message` and rejected mismatched `agent_message` text; the launcher suite passes 17 tests and combined focused discovery passes 34 tests. Require `"success": true` in the receipt, inspect the diff and tests, and continue stopped work with `--resume <SESSION_ID>` and a fresh short brief. This remains a bounded stock-CLI code-worker route, not a proxy or custom loop. Whole-task usage still fell below the 80% DeepSeek/local target because the long root/coordinator conversation and premium coordination dominated. See [worker repair results and usage](HALO-CODEX-WORKER-REPAIR-2026-09-16.md) and [research, evidence and limitations](HALO-CODEX-TRANSPORT-RESEARCH-2026-09-16.md).

## Codex delegation defaults — September 16

Codex now assigns implementation and test work to Ollama Cloud DeepSeek from the start, rather than waiting for low Codex quota. Tuned local models handle bounded file-based drafts and reviews: the brain sends High reasoning by default; the coder sends no reasoning field. Astra coordinates and handles difficult judgment; Sol/Terra/Luna are selective reviewers or escalations while quota permits. Targets of 90%+ cloud/local work, 1–5% Astra, and 6–9% other premium work are goals, not measured savings or hard quota controls. Below 10% main Codex allowance, no new premium workers are launched. See [setup and verification](HALO-DSH-IMPLEMENTATION-2026-09-16-CODEX-DELEGATION.md). DSH routing, Claude's helper, model tuning, and resident instances are unchanged by this setup.

Updated September 16, 2026.

## Desktop launch recovery — September 16

The unified launcher now detects when Mission Control is still running an older build after an offline file update. It compares the running build hash with the installed file and uses the existing process-identity-checked stop/start path to replace only Mission Control. A matching running build is reused; `KeepMissionControl` still prevents automatic replacement. The live stale-build recovery succeeded, followed by a successful desktop launch in Chrome with the same DSH and Wigolo processes retained. See [launch repair](HALO-DSH-IMPLEMENTATION-2026-09-16-LAUNCH-RECOVERY.md).

## Brain reasoning default — September 16

DSH now configures the 35B brain under `lmstudio-brain/halo-brain-35b`, displayed as **LM Studio brain**, with **High** as its reasoning default. Explicit **Off** sends `reasoning_effort: "none"`. The coder remains `lmstudio/halo-coder-q4km`, non-thinking and the startup model. Both routes use the same LM Studio endpoint and resident identifiers; no extra model instance, alias, context or tuning changes are involved. Claude's direct LM Studio requests are unaffected. The saved configuration and Mission Control recognition are installed; no services or models were started or restarted for this change. On the next normal launch, use the brain under its new provider. Existing conversations retain their saved selections: reselect the new brain entry and High if continuing a conversation saved with the old route or explicit Off. See [implementation and verification](HALO-DSH-IMPLEMENTATION-2026-09-16-BRAIN-HIGH.md).

## Context consistency correction — September 16

The approved brain and worker context remains **131,072 tokens**, parallel=1. Mission Control's invalid-profile message now reports the actual role contract, and its manual-load endpoint uses 131,072 when no valid context is supplied (explicit context choices remain supported). The retained legacy `stack/startup/halo-startup.mjs` helper now uses the same context for loads and validation; the desktop launcher still uses `stack/stock-dsh/Start-StockDSH.ps1`. The corrected Mission Control file was installed on disk without launching or restarting services or touching loaded models. A running Mission Control process picks up the correction on its next normal restart. See [offline correction record](HALO-DSH-IMPLEMENTATION-2026-09-16-CONTEXT-CONSISTENCY.md).

## Optional lean coding

**Local coding — lean** is available in DSH's new-session preset picker. **Local models** remains the default. Lean retains file tools, PowerShell, LSP, skills and stock compaction, with 13 model-facing tools instead of 91. The observed tool-definition estimate fell from 25,122 to 3,290 tokens. Existing full presets, research/browser services, permissions and 128K model settings remain unchanged. See [setup and measured results](DSH-LEAN-CODING-2026-09-15.md).

## Supported stack

DeepSeek Harness `0.1.6-alpha.1` runs from `C:\Users\scott\.dsh-stock`. Its Cordis overlay registers Wigolo over MCP stdio as the preferred research provider and the reference memory MCP as its persistent knowledge store. DSH's native `web_search` and `web_fetch` tools remain available as a bounded fallback.

Mission Control is part of the supported stock DSH deployment. Its canonical source is in the repository under `stack\stock-dsh\mission-control`; the launch path promotes an exact tested copy into `C:\Users\scott\.dsh-stock\mission-control` and serves it only on `http://127.0.0.1:3090`.

The prior local research daemon, old Gateway on port 8765, and deprecated `halo-research` skill remain retired. They are not active providers or client integrations.

## Launch and stop

- Double-click **DSH + Wigolo** on the desktop. It verifies or repairs the approved LM Studio model loads, starts or reuses DSH and Wigolo, installs the tested Mission Control build, starts or reuses Mission Control, and opens Mission Control plus the authenticated DSH page as two tabs in Google Chrome.
- Repeated launch clicks reuse healthy services instead of starting duplicates.
- Double-click **Stop DSH + Wigolo** to stop Mission Control, DSH, and its exact Wigolo MCP child process tree.
- The stop shortcut leaves LM Studio and the approved models loaded.

Mission Control is the normal operator entry point. DSH itself remains at `http://127.0.0.1:3080`, but its launch authority is private and is handled by the local lifecycle rather than copied into documentation or dashboard output.

## Mission Control features

Mission Control preserves all seven earlier operator areas:

| Area | What it shows or controls |
|---|---|
| Overview | Stack health, routes, current work, daily activity, throughput, alerts, and quick actions |
| Models | Downloaded and resident LM Studio models, exact load details, and guarded load/unload actions |
| Sessions | Workspaces, titles, context pressure, performance, running/stalled state, and stop-one-session |
| Plugins | Full Cordis inventory, phases, overrides, descriptions, and failure/waiting detail |
| System | RAM, GPU pools, disk, versions, configuration validation, and LM Studio logs |
| Memory | Optional memory graph, writers, recovery task, and snapshots |
| Settings | A bounded editor for approved model, compaction, retry, and stream-timeout settings |

The status strip uses current evidence. Missing, failed, or stale sources appear unavailable or degraded rather than as healthy zero values.

Persistent Halo memory is configured through the `reference_memory` MCP. DSH writes durable facts to `C:\Users\scott\.dsh-stock\memory\memory.json`; Mission Control reads that same store and shows the saved entities, observations, writer state, recovery-task definition, and snapshots. The `HALO Memory Snapshot` task runs hourly and at startup, keeps 168 copies, and reports a red Store signal when its saved paths or triggers drift.

## Models and capacity

The approved LM Studio pair is:

| Runtime identifier | Role | Context | Parallel slots | Input |
|---|---|---:|---:|---|
| `halo-coder-q4km` | Default coding and tool use | 131,072 | 1 | Text |
| `halo-brain-35b` | Optional planning, synthesis, and vision | 131,072 | 1 | Text and image |

The launcher removes other resident models and repairs either approved model when its key, context window, or parallel count is wrong. The 35B model remains optional because it has passed planner work, while the coder remains the automatic default.

While DSH and the Mission Control server are running, Mission Control also watches for unexpected LM Studio engine exits. It restores affected approved models that were previously resident, using the same 131,072-token, single-slot load settings. Closing the dashboard tab does not stop this watcher. An intentional Unload is respected; an empty model list alone is not treated as a crash. Recovery is serialized and rate-limited to avoid repeated loading after a persistent engine failure. See [recovery behavior and verification](HALO-DSH-IMPLEMENTATION-2026-09-15-MODEL-RECOVERY.md).

## Research routing

Wigolo is the first provider for ordinary web search, page retrieval, and research. The agent may make one revised Wigolo attempt when the first result contains no usable evidence. It then uses the native DSH web tools after an MCP availability failure, timeout, or continued lack of evidence. It must not loop between providers.

Native `web_fetch` is keyless. Native DeepSeek `web_search` requires `DEEPSEEK_API_KEY`; without that credential, fallback search reports a structured credential error rather than silently choosing another provider.

Retrieved pages are untrusted evidence. Agents must retain exact source URLs and state missing evidence or tool failures plainly.

## Permissions and security

DSH uses its `danger-full-access` permission preset, matching the intended local Windows capability. Mission Control listens only on loopback. Every dashboard mutation requires a random per-launch Mission Control token and an exact loopback origin or referrer.

DSH's launch token, authentication cookie, API keys, and credential documents stay outside browser APIs, history, receipts, and logs. Secrets belong only in the ignored local `.env` file or DSH credential store.

## Active paths

- Canonical deployment: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh`
- DSH home: `C:\Users\scott\.dsh-stock`
- DSH MCP overlay: `C:\Users\scott\.dsh-stock\cordis.patch.yml`
- DSH local preset: `C:\Users\scott\.dsh-stock\.agent-presets\local\agent.cordis.yml`
- Wigolo checkout: `C:\Users\scott\Desktop\Code\wigolo`
- Canonical Mission Control: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh\mission-control`
- Installed Mission Control: `C:\Users\scott\.dsh-stock\mission-control`
- Persistent memory: `C:\Users\scott\.dsh-stock\memory\memory.json`
- Recovery snapshots: `C:\Users\scott\.dsh-stock\memory\snapshots`
- Unified launcher: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh\Launch-StockDSH.ps1`

## Release evidence status

The v0.3.0 release passed 123 focused contract checks and 216 required-memory live acceptance checks. A DSH session wrote a real memory entity, a fresh session retrieved it, Mission Control rendered it, and the scheduled task produced a hash-matching recovery copy.

- Mission Control source and installed SHA-256: `079729CF086E6C557EB79300BC076D4BD563D6B9D439BF9F416BC73B1D430437`
- Install receipt: `C:\Users\scott\.dsh-stock\mission-control\backups\install-20260914-135354-758-13e11178.json`
- Receipt SHA-256: `6A7B91F29E0C2141DDBF8456DD05ED57D72CF002C5E2458F012B71E8BC11F7B4`
- Live acceptance evidence: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh\mission-control\live-acceptance-stock-dsh-v0.3.0.json`

At acceptance, DSH `0.1.5-rc.2`, LM Studio, and Mission Control were listening on ports 3080, 1234, and 3090. Wigolo and `reference_memory` were active DSH MCP children. Both approved models were resident at 32,768 context with one parallel slot. The store held one real entity with two observations, and the recovery snapshot matched it byte for byte.

Published from commit `342d0a5ac782c731bdef16324c9a3f51ebb18281` as tag `stock-dsh-v0.3.0`: https://github.com/scottconverse/dsh-halo-research/releases/tag/stock-dsh-v0.3.0

## Bundled Reddit research skill — September 14, 2026

The supported local DSH preset now loads `reddit-search` from the versioned folder `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh\skills`. It takes priority over a shared user copy of the same skill. The live preset is `%USERPROFILE%\.dsh-stock\.agent-presets\local\agent.cordis.yml`.

For Reddit/subreddit research the agent is directed to load this skill; other web research continues through Wigolo and the existing native fallback. The skill uses Reddit RSS plus optional local Redlib at `http://127.0.0.1:18080`. Python 3.10+ runs its standard-library parser; PowerShell 7 runs the optional Redlib lifecycle scripts. Redlib is installed separately under `%LOCALAPPDATA%\RedditSearch\Redlib`. DSH start/stop shortcuts do not start or stop it.

The repo contains the skill instructions, parser, native Windows Redlib setup/start/test/stop scripts, reference notes, and captured-response regression tests. All 12 parser tests pass. The running DSH `skills/list` endpoint lists `reddit-search` as model-invocable, and the local preset's skill provider and loader are active. This verifies installation/discovery, not a new autonomous DSH research run.

To restore, copy the tracked local preset to the live preset path above. It reads the skill directly from the repo. If the repo moves, update `customSkillDirs`. The matching deployables are preserved under `Current Halo Configuration\stock-dsh`.

## Windows tuning — September 15, 2026

Both approved models are resident at 131,072 context, one slot each, with a 2,048 logical batch. The coder now uses a 2,048 microbatch and Q8_0 key/value conversation cache. The 35B retains a 1,024 microbatch and F16 cache. Both retain 12 CPU threads, Flash Attention and GPU offload, using installed Vulkan runtime 2.38.0. The launcher, DSH capacity settings, aliases, and Mission Control agree on 128K.

Both aliases explicitly set Min-P to 0.05, which runtime inspection established was already the effective default. Coder sampling remains temperature 0.7, top-p 0.8, top-k 20, repetition penalty 1.05. The 35B retains temperature 0.7, top-p 0.8, top-k 20, presence penalty 1.5 and repetition penalty 1.0. The coder remains the default, and the 35B defaults to Off with High available.

DSH compacts at 80% and retains 55% verbatim, with an 8K maximum summary. The provider stream idle timeout is ten minutes. These existing settings were retained. Actual DSH tool steps reused the prompt cache successfully; no cache workaround was needed.

Both selected models completed a fresh DSH coding task and passed all eight supplied event cases with tests unchanged, independently rerun successfully. Mission Control reports no profile mismatch or settings refusals. The large-input comparison failed full-answer correctness for both models at approximately 44–47K tokens: 128K capacity is not a guarantee of long-context reasoning accuracy.

Read [the five-investigation report](HALO-DSH-IMPLEMENTATION-2026-09-15-FIVE-INVESTIGATIONS.md) for comparisons, selected settings, evidence limits and rollback paths. The [initial 128K record](HALO-DSH-IMPLEMENTATION-2026-09-15-128K-TUNING.md) and its 133 contract checks describe the earlier deployment, not a newly repeated check suite. Earlier release evidence remains historical.


## September 15: stock alpha capabilities

DSH is now `0.1.6-alpha.1`. The default local preset adds workspace-scoped history search, TypeScript/JavaScript and Python LSP navigation, stock Chrome DevTools MCP interaction, and persistent PowerShell tools. The stock right sidebar offers **New terminal**, defaulting to PowerShell 7. Existing tools and all seven Mission Control areas remain.

For native Codex delegation, start a session in **Local + Codex (opt-in)**. This uses a genuine Luna Codex worker and consumes Codex usage. Ordinary **Local models** retains Codex disabled. Common settings in the two full-copy presets should be kept synchronized.

The optional Google provider uses the TownReporter AI Studio key in DSH's credential store. **Gemini 3.6 Flash** completed a real DSH response; the project showed Free tier. Local coder remains the automatic default. No Antigravity agent bridge or Claude provider was installed.

Read `HALO-DSH-IMPLEMENTATION-2026-09-15-ALPHA-UPGRADE.md` for the exact packages, validation and limits.


## September 15: optional SuperGrok

The existing web profile includes pinned `MirDie/dsh-xai` with an alpha compatibility patch. Owner-approved device login and a real `xai-oauth / grok-4.6` DSH response succeeded. Use **Settings > xAI Grok** for account controls and the model picker for Grok. Local coder stays the default. No XAI_API_KEY fallback was configured. Credentials stay outside Git and recovery copies. See `HALO-DSH-IMPLEMENTATION-2026-09-15-SUPERGROK.md` for recovery and verification limits.


## Activity speed attribution

Mission Control's Activity card separates running now (active session models and providers) from the latest completed session, which is identified by title and its last-used model/provider beside its historical decode rate. It reads DSH's recorded last-used selection, not the default or a queued model. The speed remains a session aggregate; sessions that switched models can include multiple models. Missing attribution displays unknown.

## September 15: Ollama Cloud and Codex quota routing

DSH now offers **Ollama Cloud > DeepSeek V4.1 Flash (Ollama Cloud)** through the stock provider and the signed-in Ollama daemon on port 11434. The existing local default is unchanged. Codex Desktop has the same DeepSeek model added beside its native models; Terra remains its default. The saved `ollama-deepseek` worker profile passed file editing and test execution through Ollama's stock desktop router.

The September 16 delegation update supersedes the initial quota-first rule: DeepSeek and local helpers are the default from the start. Sol/Terra/Luna are selective checks or escalations at 10% remaining or more; below 10%, no new premium workers start. Persistent agent instructions use live quota readings, not token totals. This is agent routing guidance, not a background quota service. A desktop restart/picker check remains for Scott's next convenient restart. See `HALO-DSH-IMPLEMENTATION-2026-09-15-OLLAMA.md` for evidence and recovery.

## Cloud model compatibility repair (September 15, 2026)

Direct DeepSeek API models are hidden because this installation has no DeepSeek API key; Ollama Cloud DeepSeek stays available. The Google chat picker excludes the two Deep Research agents that require a different API. Gemini defaults to explicit High thinking; Gemini 3.8 offers Low/Medium/High rather than unsupported Minimal. The SuperGrok plugin now correctly treats its 4.20 non-reasoning model as non-reasoning. See [changes, real DSH checks, and recovery](HALO-DSH-IMPLEMENTATION-2026-09-15-CLOUD-REPAIR.md).

## Local default on fresh launch

A fresh desktop start restores `lmstudio / halo-coder-q4km` as the default for new sessions. Both approved local models remain loaded. DSH normally saves model-picker changes as the next-session default; those choices may persist during the running instance, but the next fresh launch restores the deployment default. Existing conversations retain their own selected model. Clicking Start while DSH is already running reuses it without resetting the model.

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
