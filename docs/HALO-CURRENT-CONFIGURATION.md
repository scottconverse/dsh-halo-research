## October 9, 2026: current Web deployment after upgrade and audit

DSH Web now runs **0.2.1-alpha.2**, the newest upstream GitHub release checked today. This is a prerelease; npm's ordinary latest tag still selected 0.2.0-rc.2 at the upgrade. Active stock packages and profile module resolution were aligned with alpha.2 rather than leaving old profile-local packages in use.

The approved Web default is **Qwen 35B Q6 through LM Studio**, serving identifier `halo/qwen3.6-35b-a3b-q6`, **65,536 context / 24,576 maximum output / parallel 1 / reasoning Off**. Fresh provider headers and actual LM Studio residency confirmed these values. Explicit effort choices remain available. The earlier generic 128K brain/worker notes below do not describe this Web route.

Double-click **Start DSH Web**. If LM Studio has no resident model, the launcher loads the exact saved local selection. If that selection is already resident, it reuses it. A different resident model causes a clear mismatch error; it does not add or unload a model or silently adopt the other selection. Cloud selections bypass local loading. **Stop DSH + Wigolo** stops the owned Web/Mission Control processes while preserving LM Studio residency. The real Chrome launch path passed after this upgrade.

Wigolo's CLI fallback worked in an actual model session after native search lacked credentials. Reddit subreddit RSS routing was repaired and verified in a resumed session using only r/Longmont results. **Redlib belongs to the reddit-search skill** as optional full-post/comment enrichment. The surviving pinned Redlib installation at `C:\Users\scott\TownReporterTools\Redlib` passed its live usable gate on loopback 18080 (HTTP 200, 25 posts); RSS success and Redlib usability are separate checks of the same skill workflow. The automatic Web search hook returns RSS discovery; it does not itself perform Redlib enrichment.

Mission Control passed 215 live acceptance checks, including installed build/receipt identity, configuration, model residency, memory writer/store, snapshots and the restored hourly/startup memory snapshot task. Its slow cold-start timeout was repaired. The missing memory MCP dependency now uses the pinned deployment-local package. Host memory health does not imply that memory tools are exposed by the lean session catalog.

Web regression gates passed 61 tests with one optional live article test skipped; the Mission Control runner passed 149 tests and the two new slow-start tests passed separately. Live tests covered file/PowerShell tools, skill loading, LSP, web fetch, research fallbacks, persisted-session resume and cancellation. Browser automation returned ERR_BLOCKED_BY_CLIENT, so visual UI acceptance remains unconfirmed. A complete news pipeline and automatic full compaction were not exercised. See [upgrade audit and evidence](HALO-DSH-IMPLEMENTATION-2026-10-09-WEB-ALPHA2.md). Earlier dated sections below are historical snapshots and may describe superseded settings.

## October 9, 2026: Web shortcut startup error repaired

The restored Start DSH Web shortcut reached the launcher but failed because LM Studio had no resident model. The selected route was web-fast/halo/qwen3.6-35b-a3b-q6. Loaded only that model at context 65536, parallel 1, and verified the exact Launch-StockDSH.ps1 path opened Chrome with DSH and Mission Control. Mission Control returned HTTP 200; DSH listened on 3080; loaded-model inventory contained only the selected 35B Q6 model.

Fixed Start-StockDSH.ps1 to retain validation stderr and launcher-model-route.mjs to print concise errors instead of stack traces. All 13 focused route tests pass. The empty-model failure path was exercised without unloading the working model. Startup still validates the selected route; it does not automatically load/unload models or switch to another resident model. Git history confirms the old fixed-pair autoload behavior was removed in eb4e5578. No upstream version or model defaults changed. This check verifies startup, not a full reporting pipeline.

# Current installation: stock DSH + Wigolo + Mission Control

## Ollama restored; reasoning defaults Off — October 9, 2026

Ollama 0.40.2 is installed and its surviving sign-in works. Cloud requests completed for DeepSeek V4.1 Flash, GLM 5.3, Kimi K3, MiniMax M3 and GLM 5.3 Flash. Both DSH profiles use the restored loopback Ollama endpoint. No local model is loaded.

New-session reasoning defaults to Off in Desktop and Web. The Ollama provider fallback is also Off. DeepSeek still offers Off, Low, High and Max; explicit session selections are preserved. The selected model, output limits and context sizes are unchanged. Four live/canonical/recovery YAML profiles passed semantic comparison: only the intended reasoning defaults changed. Web preset recovery mirrors passed their sync check. Apps were not restarted and no new DSH session was run for this settings-only change.

## Windows recovery — October 9, 2026

Desktop and Web are restored and were tested one at a time. The existing classic LM Studio 0.4.21 in Program Files is in use; no installer ran and Bionic remains excluded. Original Node/PowerShell paths were restored. Desktop's offline-Ollama catalog crash and duplicate preset registrations were repaired, preserving its tuned 27B route. Mission Control now launches through the executable its stop script checks. Wigolo's native SQLite dependency was rebuilt for the restored Node runtime. Both DSH apps and all models are stopped/unloaded after testing.

Desktop passed actual model/file and PowerShell tests at 128K context/24K output. Web passed model/PowerShell/HTTP retrieval at 64K context/24K output, High reasoning. All 36 old session files matched their saved hashes. These are bounded app recovery tests, not a completed news pipeline or full compaction test. Ollama/cloud routes remain unverified and currently unavailable. See [recovery details and evidence](HALO-DSH-IMPLEMENTATION-2026-10-09-WINDOWS-RECOVERY.md).

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


## Web Mission Control compatibility — October 2, 2026

Mission Control reads the installed DSH package version and the active Web profile at `C:\Users\scott\.dsh-stock\profiles\web\cordis.patch.yml`. Settings changes target exact provider/model rows in the live and repository profiles, preserve differing default selections, and use staged checks, backups, compare-and-swap and rollback. Context occupancy is labeled as an estimated next provider prompt; the last provider prompt is shown separately, and overflow estimates remain visible. Validation is tied to the profile bytes and installed DSH version. The Web brain role is the Q6 35B alias with its verified 65,536-token load context; the worker remains Q4_K_M. See [repair and deployment evidence](HALO-MISSION-CONTROL-020-REPAIR-2026-10-02.md).

## Research fallback repair - 2026-10-07

Web fast-first now treats missing provider/authentication, empty or navigation-only
bodies, JavaScript shells, and truncation missing the requested evidence as
unusable results, including HTTP 200. After one unusable stock web result, the
agent must load desktop-optional-tools and try the existing Wigolo CLI before
repeating stock fetches. Truncation alone is not proof of a paywall.
Explicit Reddit requests and community/practitioner research require reddit-search,
with RSS discovery, validation, pacing, and partial-coverage reporting. Reddit is
not primary verification of a news claim. No MCP catalog was enabled.

Installed Web profile and fast-first preset were updated with backups; only
persona prefixes changed and parsed unrelated YAML values were preserved.
The shared optional-tools skill was updated. Web was restarted after the news
turn ended. LM Studio retained only halo-fast-35b-q6; 27B remained unloaded.
Wigolo retrieved actual article prose from the same Times-Call URL stock fetch
returned as navigation. Reddit live validation hit HTTP 429; no further retry
was made. A future model turn still needs to demonstrate skill selection.
The failed news turn ended max-tokens with one output token; no finished story
or editorial audit was observed. This repair does not claim that failure solved.


### Native tool fallback added after the prompt-only repair failed

The fast-first tool-catalog now installs a preset-scoped tools/execute hook.
It automatically tries the existing Wigolo CLI once after unusable stock fetch
content (including displayed truncation/navigation) or missing/empty stock
search results. Results pass through the stock output schema and renderer;
pre-execute policies and post-execute checks remain in place. Cancellation,
policy denials, protected pages and HTTP 404 do not trigger fetch retries.
Each CLI call is capped at 25 seconds and bounded output. Failures explicitly
report partial coverage rather than silently returning navigation as evidence.
Queries explicitly mentioning Reddit use sequential Reddit RSS and the existing
reddit-search Python parser, with eight-second pacing and Retry-After handling.
RSS discovery has unknown comment coverage; no Redlib server was installed.

Nine checks passed, including actual Wigolo retrieval of the failing Times-Call
article and the real Reddit parser with controlled RSS/429 responses. Live Reddit
availability remains unverified after its earlier rate limit. Installed adapter
modules match canonical sources. Web was restarted after the news turn ended;
35B remains loaded and 27B remains unloaded. The news session again ended at
max-tokens; this adapter does not claim to fix that separate model termination.

## Current Web audit repairs — October 7, 2026

This section supersedes older launch/residency/default descriptions above for
DSH Web 0.2.0-rc.2. Web is intentionally OFF at Scott's request. Only the 35B
is loaded at 65,536 context; 27B is intentionally unloaded.

The selected main route and default delegated route are web-fast /
halo/qwen3.6-35b-a3b-q6, High reasoning, 24,576 maximum output. Compaction has
explicit 4,096 headroom across all four policies: effective pressure threshold
36,864, retention 22,528, summary max 8,192. The supported Web launch disables
the SDK character-estimate completion clamp while preserving true server
capacity and normal compaction.

The launcher preserves the operator's saved model choice and validates only
its effective LM Studio route. It never loads/unloads a fixed model pair or
removes other resident models. Active profiles/web/cordis.patch.yml takes
precedence over legacy settings.yaml. External providers manage their own
availability. Optional 27B selection remains available; manually load it before
selecting a route that needs it.

Embedded presets in web-profile/cordis.patch.yml are the editable authority.
External *-preset/agent.cordis.yml files are generated recovery mirrors. After
editing embedded composition, run node preset-sync.mjs sync and then check.
Supported detached startup refuses drift, verifies both version-pinned SDK and
adapter repairs, and preserves the Web-only opt-out environment setting.

The adapter now preserves positive reasoning-token telemetry and rejects
malformed/non-object historical tool arguments before dispatch, with explicit
tool/call context and no raw JSON parse cause. Valid replay is unchanged.
All 149 Mission Control contracts pass. Focused request, replay, launcher,
compaction and preset checks are detailed in HALO-DSH-AUDIT-2026-10-07.md and
HALO-DSH-IMPLEMENTATION-2026-10-07-AUDIT-REPAIRS.md. No completed news report,
live full-summary compaction or live delegation is claimed while Web is off.

Desktop reading/recovery copies and their SHA-256 manifest are synchronized.
Use the supported Start-StockDSH.ps1 when Scott chooses to resume; direct
unsupported CLI launches do not automatically inherit the Web repair opt-out.
