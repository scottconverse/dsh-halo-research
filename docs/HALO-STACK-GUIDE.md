## November 5, 2026 - Shared knowledge library

Web and Desktop now have knowledge-ingest and knowledge-query in their existing
native skill roots. Both use `C:/Users/scott/Documents/DSH Knowledge Library`.
No existing notes/receipts were imported or changed. Profiles, models/defaults,
goal state and all pre-existing skills remain byte-identical (119 captured files).
No extra agents, automation, services, model calls, host restarts or Strata startup.
Native-provider discovery/loading for both installed configurations and one public
source ingestion/read-only retrieval passed; no live chat quality claim is made.
Usage, preservation, concurrency limits and recovery: [HALO-DSH-IMPLEMENTATION-2026-11-05-KNOWLEDGE.md](HALO-DSH-IMPLEMENTATION-2026-11-05-KNOWLEDGE.md).

## November 3, 2026 — Web and Desktop rc.5

Both installed DSH hosts now use upstream 0.2.1-rc.5. Desktop's idle installation, optional official profile dependencies and the same six existing Halo archive repairs are complete. Its visible one-turn cloud chat and PowerShell tool check passed. Existing goals and shared triad source were preserved; no triad was restarted. Local Qwen retains Medium/32K configuration, while Strata deliberately remains off. Desktop's temporary acceptance model selection was restored explicitly; 118 captured files are byte-identical, with one profile default-model serialization difference disclosed in the report. See [Desktop upgrade and receipts](HALO-DESKTOP-RC5-UPGRADE-2026-11-03.md) and [Web upgrade](HALO-WEB-RC5-UPGRADE-2026-11-03.md). Earlier dated snapshots below remain historical.
## October 28, 2026, 4:35 PM Mountain — production Web triad loaded

Production Web now loads the tuned `halo-three-role` plugin. Native inventory reports it active and all three presets registered after an idle-only normal restart. Existing Web profile bytes were preserved before the additive row. Verdict implementation ownership moved to a fresh visible Desktop triad in the existing merge-trial worktree; full requirements and historical evidence were retained privately. The first two repairs are Critical severity normalization and AppImage packaging. Product completion is still pending; no final Verdict merge/tag/publication is authorized. Earlier staged/untouched Web notes below describe their historical checkpoints. See [HALO-VERDICT-DESKTOP-TAKEOVER-2026-10-28](HALO-VERDICT-DESKTOP-TAKEOVER-2026-10-28.md).

## October 28, 2026 — how to run a bounded three-role project

Tuned workflow: use compact `triad_status`/`triad_wait`; fetch `view: contract`
once for FULL requirements and `view: evidence` plus ID for individual complete
records. Coder records fix/dispute dispositions before its checkpoint. Auditor
reviews changed paths/receipts, reuses unaffected evidence, reconciles every
requirement at acceptance and reports the actually inspected revision. It can
independently hash protected project files with `triad_hash` without shell/write
access. A hash is byte evidence, not proof of correct behavior. Explicit and
automatic review requests now share one queue. See
[the tuning record and limits](HALO-THREE-ROLE-TUNING-2026-10-28.md).

In Desktop, create a **Three-role coordinator** session. Give it the approved
absolute project directory, bounded objective and full acceptance list, and
ask it to use `triad_start`. It creates one managed Coder and one read-only
Auditor/Nudger with a native Coordinator goal. Coder uses staff-engineer;
Auditor traces code and receipts, sends requirement-bound findings and checks
the fixes. Coordinator owns scope, disputes and completion. A partial or
blocked checklist cannot complete the plugin project.

Ask that Coordinator to pause/resume through `triad_control`. These operations
apply to the whole project; omit `role` and call once. A resume checkpoint is
broadcast, so send worker-specific directions separately with action message.
Verify idle states and any external jobs before assuming cancellation finished.
After restart, reopen the same Coordinator and resume its saved children;
do not create replacement sessions. Completion grants no implicit release
authority. Auditor tool restrictions are enforced, while Coder project scope
is an instruction contract rather than a Windows sandbox.

The plugin also loaded in an isolated real Web host. Production Web is still
running Verdict and was left untouched; apply/load the staged plugin only at
an idle boundary. Do not interrupt Verdict to enable this feature. Details,
installer preview/apply behavior, proof and limitations are in
[the dated record](HALO-THREE-ROLE-2026-10-28.md) and
[the plugin guide](../stack/three-role/README.md).

## October 27, 2026 - DeepSeek compaction policy

DeepSeek 1017 has a model-specific 70% automatic-compaction threshold in every Web and Desktop preset (734,003 tokens with the configured 1M window). Low effort, 1M context, 64K normal output, summary caps, headroom, retention and other models' thresholds are unchanged. Installed profiles/preset files and canonical sources are synchronized. No tests, inference or restart was run; already-mounted sessions may require their ordinary idle reload. See HALO-DEEPSEEK-COMPACTION-2026-10-27.md.

## October 27, 2026 - Desktop startup

Desktop now opens through its normal shortcut. A failed model-catalog refresh uses the saved catalog and writes details to the Desktop home logs/desktop-startup.log. The selected-model safety check still blocks unsafe startup. Models/defaults and integrations are preserved. Maintain Desktop, Web Start and Web Stop shortcuts together. See HALO-DESKTOP-STARTUP-2026-10-27.md for verification and the unproven cause of the earlier refresh failure.

## Current state — October 11, 2026, 20:30 UTC

The Ollama transport and text-only output-budget repairs are deployed. The bounded text-only compaction path is implemented in stack/stock-dsh/compaction-text-only.mjs with focused coverage in stack/stock-dsh/test/compaction-text-only.test.mjs; its focused test run passed 17/17. For the selected existing session, offline planning found 159 messages (including one system head), 76 atomic groups, 68 tool groups, 11 source chunks plus one merge, and exact ordered coverage of source indexes 0–158. This is planning evidence only.

One authorized maintenance /compact is still shown as Running in the existing DSH session UI: compaction ID 58e29ad0-bfd1-4f9c-ab2f-e045f8b5bc60, start seq580 at 20:06:16.413 UTC. The latest full journal parse at 20:26:20.513 UTC still ended at compaction/start seq580 (330 frames, 582 events), with no terminal event, summary, or reduction. The in-app UI showed “Compacting context…” and the selected Ollama Qwen 27B Q6_K route at 20:29 UTC. Mission Control’s fresh API showed a connected stream, zero regular active jobs, and zero queued inputs; this maintenance command is not represented in that job list.

Per-chunk execution remains unverified: the installed logger buffers INFO records in memory, and no persistent progress sink or provider prompt-token metadata was found. A five-second runner CPU sample at 20:28:48Z was flat; sparse earlier/current counters increased by about 286.5 CPU seconds, which does not attribute work to this compact. The UI’s displayed token and context counters are not a captured provider request or chunk-progress evidence. No final checkpoint has been accepted, and task/evidence fidelity, atomic commit, and actual history reduction remain open. No duplicate compact, reporting prompt, model switch, or restart has been issued during this attempt.

The configured route remains Ollama qwen3.8:27b-q6_K, reasoning off, context 131072, max output 24576. Native Claude/Codex adapter verification passed four requests with same-thread continuation for both providers; picker UI remains unverified. Reddit retrieval remains partial at 41/43 comments; Desktop headless mode remains unverified. See the dated repair record and sanitized evidence for chronology, recovery, tests, and limitations.

## October 11 verified integration status, 18:31 UTC

Desktop's active local preset now completed a real official Library fetch through automatic Wigolo (3.270 seconds) and a real Reddit thread through local Redlib (1.900 seconds). The Reddit result preserves 41 retrieved versus 43 reported comments, explicitly PARTIAL, with full JSON evidence. The output validator accepts typed evidenceFile/coverage metadata while still rejecting malformed or arbitrary fields. All three embedded preset mounts are updated; only the active local preset was exercised.

Web's browser and reference-memory tools are now verified through an actual local Qwen27B turn, session9821c554-faf9-4e2f-8dd2-0d5e1af14230: memory search returned an empty graph for a verification-only nonce, Chrome opened the official Longmont Library page, and its snapshot read Library - City of Longmont. All three tool results have isError:false; the turn reached completed. This was a read-only lookup, with no memory writes. The UI displayed 2m2s. This proves execution beyond catalog visibility.

LM Studio's hidden --run-as-service process was replaced by a normal launch after confirming no model was loaded. Computer Use then observed its normal rendered chat window with Select a model to load. Live process inventory shows PID31308 without --run-as-service. The inventory receipt lmstudio-gui-restored.json records no LM Studio loaded models and no Desktop processes. Supported Web startup completed afterward; only Ollama Qwen27B is resident. Mission Control is running again. No install or version change was made to LM Studio.

versions.json now derives release0.2.1-alpha.2 and Ollama Qwen27B/Off from the installed package and current settings. Its old September release/source/model values are retained under previousDeployment, not presented as current facts.

Still pending: real native subscription-provider generation/continuity, compaction reduction on the actual problem history, final recovery verification and repository commit/push. Do not treat this status as completion of those checks.
## Reddit schema extension verified end to end

At Scott's request, DSH's web_fetch output schema now explicitly accepts optional string evidenceFile and coverage metadata. The typed closed schema remains enforced. DSH's own validator accepts the repaired output and rejects numeric evidenceFile, object coverage and undeclared arbitrary fields. The verified source patch is reapplied at Web startup, is idempotent, checks pristine SHA256/package version, preserves the original source, and rejects unrelated drift.

After restart, session5450c05f turn2 completed in exactly42.941 seconds, with one web_fetch call and no retry: Local Redlib HTTP200, title Ballot initiative3A,41 retrieved/43 reported comments, coveragepartial. Complete normalized JSON is C:\Users\scott\.dsh-stock\research-cache\reddit\b9298c85df4a6262e173.json. Receipt: web-schema-repair-verified.json. This supersedes the pending Redlib retry status below; the other listed audit items remain open. Web and Mission Control remain running with Ollama27B; Desktop was not launched.
## Web repairs deployed after authorized restart

Scott explicitly authorized restarting DSH to apply repairs. The pre-restart session and logs were preserved under pre-restart-20261011-114911. Web restarted successfully with Ollama qwen3.8:27b-q6_K, effort off, 24576 output tokens. The live profile now has the 600000ms Ollama stream idle timeout, aligned default worker, text-only compaction handler, and exposed browser/memory MCP tools. Actual fresh request13 in session5450c05f includes Chrome and reference-memory tools. Claude discovery repair was promoted; twenty focused runtime tests pass. Desktop startup safeguards are deployed; cold Desktop application verification remains pending.

The real two-source check completed in 5m19s. Wigolo retrieved the official Longmont library page. Reddit exposed a missed output-schema integration: DSH rejected evidenceFile and coverage as undeclared web_fetch fields. The model recovered via RSS, but that does not verify Redlib dispatch. At Scott's explicit request, the installed dsh-tool-web source schema was extended with optional string evidenceFile and coverage properties. additionalProperties:false remains, and arbitrary/malformed metadata is not accepted. web-fetch-evidence-patch.mjs checks the pinned package version and complete pristine source SHA256, preserves a pristine backup, rejects unrelated drift, and reapplies on Web startup. Two focused installed-contract/idempotence checks passed. A second authorized restart and actual thread retry are in progress; no end-to-end Redlib pass is claimed yet.

Open: real Redlib turn after source patch; browser/memory operations beyond header visibility; compaction convergence and evidence fidelity; native subscription generation; Desktop cold launch; LM Studio missing-window repair. No broad reporting assignment or benchmark was started.

## October 11 startup safeguards deployed

Both desktop shortcuts now reach a shared read-only model-startup preflight. A local Ollama route verifies its installed model and refuses competing LM Studio or Ollama residents; an LM Studio route refuses competing Ollama residents and a different or multiple LM Studio resident. No model is downloaded, loaded or unloaded by this check. Unknown inventories/timeouts fail with an explicit error. A refused connection to the other runtime means that server is off. Ollama cloud routes verify the selected catalog entry and do not require LM Studio.

Desktop's installed refresh script now preserves the entire saved catalog and selected default if LM Studio's CLI, inventory or native metadata is unavailable. It retries discovery on a later launch; it does not invent fresh metadata or delete cached picker entries. Its selection script preserves the actual saved DeepSeek cloud route and runs the same startup preflight.

Verification: seven focused guard checks passed; the actual Web Ollama27B inventory check and actual Desktop DeepSeek cloud preflight passed without inference. Missing-CLI and offline-metadata paths preserved byte-identical temporary Desktop profiles. Deployed Desktop script hashes and unchanged live profile are recorded in desktop-startup-deployed.json. The full Desktop app remains unlaunched while Web's reporting session runs. A cold launch through both shortcuts is still pending; no full app completion is claimed.

LM Studio background-start attribution: runtime-comparison/restore-baseline.ps1 line53 launched LM Studio.exe --run-as-service at 15:13:38 MDT October10, matching current PID37964. This was our restoration action. Read-only model inventories today were also ours and Mission Control's polls. The cause of the subsequent missing-window behavior has not been proven or repaired; no LM Studio restart has been performed during this audit.
## October 11, 2026: integration audit and partial repair deployment

Web remains on DSH 0.2.1-alpha.2, Ollama Qwen3.8 27B Q6_K, reasoning Off, 131072 context and 24576 maximum output. The existing reporting session is active and has not been interrupted. Only its model is resident; Desktop has not been launched for competing inference.

Mission Control's installed-version repair is deployed and verified through the live API and Chrome System tab: LM Studio 0.4.21.0 (installed executable). Dashboard-only restart changed Mission Control to PID47860; DSH PID10032 retained its original creation time. Deployment source SHA256: D9311A9C8BEE961C28086217E7F9E8FD7F1195FBDF09F85EAFFC35D0B38CBF98. The required installer contract suites passed.

Other repairs are STAGED, not live: Ollama stream timeout, default worker alignment, Reddit RSS-to-local-Redlib fallback, MCP tool visibility, text-only compaction, Desktop saved-default preservation, and Claude CLI discovery. The existing Web session still exhibits five-minute stream timeouts and failed compaction. No end-to-end success is claimed for those staged repairs. Claude's installed Store-bundled CLI was found and its authenticated status verified; no new generation was requested.

Audit evidence and deployment receipts: C:\Users\scott\Documents\Codex\2026-10-11\dsh-integration-audit. Detailed record: HALO-DSH-IMPLEMENTATION-2026-10-11-INTEGRATION-AUDIT.md. Earlier dated sections below are historical; they do not supersede this status.
## October 9, 2026: current Web deployment after upgrade and audit

## DSH Web default — October 10, 2026

Web now uses **Qwen3.8 27B Q6_K through Ollama with observed ROCm**, thinking Off, 128K context and 24K output allowance. All 30 previous picker entries remain; the new route makes 31. One real Longmont homepage fetch completed through Wigolo. Desktop was unchanged. Comparison-only installs and the temporary 35B test model were removed. See [installation and verification](HALO-DSH-IMPLEMENTATION-2026-10-10-WEB-OLLAMA-27B.md).


DSH Web now runs **0.2.1-alpha.2**, the newest upstream GitHub release checked today. This is a prerelease; npm's ordinary latest tag still selected 0.2.0-rc.2 at the upgrade. Active stock packages and profile module resolution were aligned with alpha.2 rather than leaving old profile-local packages in use.

The approved Web default is **Qwen 35B Q6 through LM Studio**, serving identifier `halo/qwen3.6-35b-a3b-q6`, **65,536 context / 24,576 maximum output / parallel 1 / reasoning Off**. Fresh provider headers and actual LM Studio residency confirmed these values. Explicit effort choices remain available. The earlier generic 128K brain/worker notes below do not describe this Web route.

Double-click **Start DSH Web**. If LM Studio has no resident model, the launcher loads the exact saved local selection. If that selection is already resident, it reuses it. A different resident model causes a clear mismatch error; it does not add or unload a model or silently adopt the other selection. Cloud selections bypass local loading. **Stop DSH + Wigolo** stops the owned Web/Mission Control processes while preserving LM Studio residency. The real Chrome launch path passed after this upgrade.

Wigolo's CLI fallback worked in an actual model session after native search lacked credentials. Reddit subreddit RSS routing was repaired and verified in a resumed session using only r/Longmont results. **Redlib belongs to the reddit-search skill** as optional full-post/comment enrichment. The surviving pinned Redlib installation at `C:\Users\scott\TownReporterTools\Redlib` passed its live usable gate on loopback 18080 (HTTP 200, 25 posts); RSS success and Redlib usability are separate checks of the same skill workflow. The automatic Web search hook returns RSS discovery; it does not itself perform Redlib enrichment.

Mission Control passed 215 live acceptance checks, including installed build/receipt identity, configuration, model residency, memory writer/store, snapshots and the restored hourly/startup memory snapshot task. Its slow cold-start timeout was repaired. The missing memory MCP dependency now uses the pinned deployment-local package. Host memory health does not imply that memory tools are exposed by the lean session catalog.

Web regression gates passed 61 tests with one optional live article test skipped; the Mission Control runner passed 149 tests and the two new slow-start tests passed separately. Live tests covered file/PowerShell tools, skill loading, LSP, web fetch, research fallbacks, persisted-session resume and cancellation. Browser automation returned ERR_BLOCKED_BY_CLIENT, so visual UI acceptance remains unconfirmed. A complete news pipeline and automatic full compaction were not exercised. See [upgrade audit and evidence](HALO-DSH-IMPLEMENTATION-2026-10-09-WEB-ALPHA2.md). Earlier dated sections below are historical snapshots and may describe superseded settings.

## October 9, 2026: Web shortcut startup error repaired

The restored Start DSH Web shortcut reached the launcher but failed because LM Studio had no resident model. The selected route was web-fast/halo/qwen3.6-35b-a3b-q6. Loaded only that model at context 65536, parallel 1, and verified the exact Launch-StockDSH.ps1 path opened Chrome with DSH and Mission Control. Mission Control returned HTTP 200; DSH listened on 3080; loaded-model inventory contained only the selected 35B Q6 model.

Fixed Start-StockDSH.ps1 to retain validation stderr and launcher-model-route.mjs to print concise errors instead of stack traces. All 13 focused route tests pass. The empty-model failure path was exercised without unloading the working model. Startup still validates the selected route; it does not automatically load/unload models or switch to another resident model. Git history confirms the old fixed-pair autoload behavior was removed in eb4e5578. No upstream version or model defaults changed. This check verifies startup, not a full reporting pipeline.

# Halo stack guide

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

The launcher checks LM Studio, converges it to the two approved 131,072-token single-slot models, starts or reuses DSH and its Wigolo child, promotes the tested Mission Control build, and opens both pages in Google Chrome. The launcher handles DSH's local browser-session credential; the operator does not manually sign in. A second click reuses healthy processes.

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

- `halo-brain-35b` is the default coordinator for planning, synthesis, and vision.
- `halo-coder-q4km` is the delegated coding and tool-using model.
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

A fresh desktop start restores `lmstudio-brain / halo-brain-35b` as the default coordinator for new sessions. Both approved local models remain loaded. DSH normally saves model-picker changes as the next-session default; those choices may persist during the running instance, but the next fresh launch restores the deployment default. Existing conversations retain their own selected model. Clicking Start while DSH is already running reuses it without resetting the model.

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


## Mission Control repair — 2026-10-11
Ollama residency is displayed alongside LM Studio, with provider-specific route matching. GPU usage uses Windows CIM if Get-Counter fails. Failed or stale refreshes show a visible warning; fresh recovery clears it. Configuration validation passed against the installed deployment. See HALO-DSH-IMPLEMENTATION-2026-10-11-MISSION-CONTROL.md for scope, verification and limitations.

## Current verified Web state — October 11, 2026, 19:25 UTC

This entry supersedes older conflicting Web-off, 35B, and pending integration
status above. Stock Web and Mission Control are running on DSH
0.2.1-alpha.2. The selected route is `ollama-local/qwen3.8:27b-q6_K`,
reasoning off, context 131,072, and maximum output 24,576. The maintenance
request loaded that one configured Ollama model on demand; LM Studio had no
resident model. The saved route and model catalog were not changed.

The Ollama response-header timeout repair is deployed and passes its focused
SDK/Undici tests. One existing-history `/compact` is running on the previously
failed news session. Its terminal summary, text fidelity, and actual reduction
are not yet verified; this is not a resumed reporting task. The confirmed
cause, repair, retry handle, evidence map, restart history, and limitations are
in [HALO-DSH-TRANSPORT-COMPACTION-REPAIR-2026-10-11.md](HALO-DSH-TRANSPORT-COMPACTION-REPAIR-2026-10-11.md).

## October 28, 2026 — native goals for continued work

Goals are available in all Halo Web/Desktop presets, including existing sessions. Enter bare `/goal` for native state, set the agreed objective, then confirm active status, armed activation, the correct objective and cap. Verify a subsequent goal-driven round without another human message. Availability, conversational promises and continuation are different facts.

Use native Goal controls and read back changes. The driver continues at idle boundaries subject to its cap and stop conditions; it is not a fixed timer. An auditor goal preserves its read-only scope and full acceptance checklist. Goal completion is not product acceptance. See [Universal goal availability](HALO-UNIVERSAL-GOALS-2026-10-28.md) for evidence and limits.

## October 29: triad recovery source update

The shared three-role source now exposes native goal activation/rounds and repairs
explicit active/disarmed resume. Two automatic inspection-only/empty Coordinator
rounds wait for input or worker/goal/lifecycle events instead of consuming another
round. Coder progress reports and reviews of ready work can proceed with unrelated
open findings; closure/completion restrictions remain. Git content detection avoids
review churn from unchanged output polling, including background-change handling.
Bounded Git views include HEAD and committed diff. Existing model defaults and all
profiles/project evidence are preserved.

Source was deployed at verified all-host/job idle, with rollback copies. Neither
host was restarted/reloaded. **The live hosts still need a supported normal idle
load and readback.** The Verdict goal stays disarmed at 512/512. See
HALO-THREE-ROLE-REPAIR-2026-10-29.md for exact checks and remaining runtime limits.

## Halo v0.3.11 source release

The three-role fixes and existing runtime evidence are published as Halo
deployment source release v0.3.11. Both hosts had already loaded the repaired
canonical plugin; the bounded live Web result above is reused. Publication adds
no test run, runtime upgrade, model/default change or goal mutation. Private
receipts and recovery files remain local and preserved.
Release: https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.11

## Optional portable cloud-only installer — October29

A separate destination-only DSH Web installer is available under the repository's
stack/portable-cloud. It uses the same DeepSeek1017 Low/1M/64K/70% cloud policy
and unchanged triad fixes, without Halo paths or local-model requirements. It
requires Node24+/npm and signed-in Ollama; no existing Halo host, configuration,
goal or session was modified. Native isolated Windows boot and directory
relocation acceptance passed without inference. See
HALO-PORTABLE-CLOUD-INSTALLER-2026-10-29.md for instructions/evidence/limits.

## Published portable installer — Halo v0.3.12

The unchanged portable installer0.1.0 ZIP, INSTALL.md and SHA256SUMS.txt are
published at https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.12 .
Existing Windows installation/relocation/native-preset evidence is reused. No
rebuild, test, audit, model call, current-host restart or goal/settings edit was
performed for publication. Private receipts and recovery files remain preserved.

## November 3, 2026 launcher correction

See [HALO-WEB-LAUNCHER-REPAIR-2026-11-03.md](HALO-WEB-LAUNCHER-REPAIR-2026-11-03.md). Start verifies authenticated HTML and application JS; Stop is scoped to Web-owned processes and waits for the host task to end. Desktop and model settings are preserved. Local Qwen is deliberately stopped after confirmed system commit pressure; do not assume it is serving. Browser rendering acceptance remains unverified.

## November 3, 2026 Web upgrade

DSH Web now runs official latest 0.2.1-rc.5 with the existing pi-ai 1.0.2 pin and Halo fixes. Authenticated page/module200 and Mission Control connected; 1583 preservation hashes match. Desktop is still installed rc.3 with its signed rc.5 update pending; no running Desktop acceptance was performed. Local Qwen is intentionally off. See [HALO-WEB-RC5-UPGRADE-2026-11-03.md](HALO-WEB-RC5-UPGRADE-2026-11-03.md).
