# Current installation: stock DSH + Wigolo + Mission Control

Updated September 15, 2026.

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
