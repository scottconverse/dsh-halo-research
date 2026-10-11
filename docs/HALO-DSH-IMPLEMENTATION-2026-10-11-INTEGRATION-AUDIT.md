## October 11, 2026: integration audit and partial repair deployment

Web remains on DSH 0.2.1-alpha.2, Ollama Qwen3.8 27B Q6_K, reasoning Off, 131072 context and 24576 maximum output. The existing reporting session is active and has not been interrupted. Only its model is resident; Desktop has not been launched for competing inference.

Mission Control's installed-version repair is deployed and verified through the live API and Chrome System tab: LM Studio 0.4.21.0 (installed executable). Dashboard-only restart changed Mission Control to PID47860; DSH PID10032 retained its original creation time. Deployment source SHA256: D9311A9C8BEE961C28086217E7F9E8FD7F1195FBDF09F85EAFFC35D0B38CBF98. The required installer contract suites passed.

Other repairs are STAGED, not live: Ollama stream timeout, default worker alignment, Reddit RSS-to-local-Redlib fallback, MCP tool visibility, text-only compaction, Desktop saved-default preservation, and Claude CLI discovery. The existing Web session still exhibits five-minute stream timeouts and failed compaction. No end-to-end success is claimed for those staged repairs. Claude's installed Store-bundled CLI was found and its authenticated status verified; no new generation was requested.

Audit evidence and deployment receipts: C:\Users\scott\Documents\Codex\2026-10-11\dsh-integration-audit. Detailed record: HALO-DSH-IMPLEMENTATION-2026-10-11-INTEGRATION-AUDIT.md. Earlier dated sections below are historical; they do not supersede this status.

Full audit: C:\Users\scott\Documents\Codex\2026-10-11\dsh-integration-audit\RESULT.md

## October 11 startup safeguards deployed

Both desktop shortcuts now reach a shared read-only model-startup preflight. A local Ollama route verifies its installed model and refuses competing LM Studio or Ollama residents; an LM Studio route refuses competing Ollama residents and a different or multiple LM Studio resident. No model is downloaded, loaded or unloaded by this check. Unknown inventories/timeouts fail with an explicit error. A refused connection to the other runtime means that server is off. Ollama cloud routes verify the selected catalog entry and do not require LM Studio.

Desktop's installed refresh script now preserves the entire saved catalog and selected default if LM Studio's CLI, inventory or native metadata is unavailable. It retries discovery on a later launch; it does not invent fresh metadata or delete cached picker entries. Its selection script preserves the actual saved DeepSeek cloud route and runs the same startup preflight.

Verification: seven focused guard checks passed; the actual Web Ollama27B inventory check and actual Desktop DeepSeek cloud preflight passed without inference. Missing-CLI and offline-metadata paths preserved byte-identical temporary Desktop profiles. Deployed Desktop script hashes and unchanged live profile are recorded in desktop-startup-deployed.json. The full Desktop app remains unlaunched while Web's reporting session runs. A cold launch through both shortcuts is still pending; no full app completion is claimed.

LM Studio background-start attribution: runtime-comparison/restore-baseline.ps1 line53 launched LM Studio.exe --run-as-service at 15:13:38 MDT October10, matching current PID37964. This was our restoration action. Read-only model inventories today were also ours and Mission Control's polls. The cause of the subsequent missing-window behavior has not been proven or repaired; no LM Studio restart has been performed during this audit.

## Web repairs deployed after authorized restart

Scott explicitly authorized restarting DSH to apply repairs. The pre-restart session and logs were preserved under pre-restart-20261011-114911. Web restarted successfully with Ollama qwen3.8:27b-q6_K, effort off, 24576 output tokens. The live profile now has the 600000ms Ollama stream idle timeout, aligned default worker, text-only compaction handler, and exposed browser/memory MCP tools. Actual fresh request13 in session5450c05f includes Chrome and reference-memory tools. Claude discovery repair was promoted; twenty focused runtime tests pass. Desktop startup safeguards are deployed; cold Desktop application verification remains pending.

The real two-source check completed in 5m19s. Wigolo retrieved the official Longmont library page. Reddit exposed a missed output-schema integration: DSH rejected evidenceFile and coverage as undeclared web_fetch fields. The model recovered via RSS, but that does not verify Redlib dispatch. At Scott's explicit request, the installed dsh-tool-web source schema was extended with optional string evidenceFile and coverage properties. additionalProperties:false remains, and arbitrary/malformed metadata is not accepted. web-fetch-evidence-patch.mjs checks the pinned package version and complete pristine source SHA256, preserves a pristine backup, rejects unrelated drift, and reapplies on Web startup. Two focused installed-contract/idempotence checks passed. A second authorized restart and actual thread retry are in progress; no end-to-end Redlib pass is claimed yet.

Open: real Redlib turn after source patch; browser/memory operations beyond header visibility; compaction convergence and evidence fidelity; native subscription generation; Desktop cold launch; LM Studio missing-window repair. No broad reporting assignment or benchmark was started.

## Superseding repair record — October 11, 2026

The later verified Web, browser/memory, Desktop retrieval/Reddit, and native
provider outcomes, plus the confirmed Undici header-timeout cause and active
maintenance-compaction result, are recorded in
[HALO-DSH-TRANSPORT-COMPACTION-REPAIR-2026-10-11.md](HALO-DSH-TRANSPORT-COMPACTION-REPAIR-2026-10-11.md).
Historical “pending” statements above are preserved as chronology and are not
the current status. The actual existing-history compaction result remains
pending while its one bounded attempt runs.


## Reddit schema extension verified end to end

At Scott's request, DSH's web_fetch output schema now explicitly accepts optional string evidenceFile and coverage metadata. The typed closed schema remains enforced. DSH's own validator accepts the repaired output and rejects numeric evidenceFile, object coverage and undeclared arbitrary fields. The verified source patch is reapplied at Web startup, is idempotent, checks pristine SHA256/package version, preserves the original source, and rejects unrelated drift.

After restart, session5450c05f turn2 completed in exactly42.941 seconds, with one web_fetch call and no retry: Local Redlib HTTP200, title Ballot initiative3A,41 retrieved/43 reported comments, coveragepartial. Complete normalized JSON is C:\Users\scott\.dsh-stock\research-cache\reddit\b9298c85df4a6262e173.json. Receipt: web-schema-repair-verified.json. This supersedes the pending Redlib retry status below; the other listed audit items remain open. Web and Mission Control remain running with Ollama27B; Desktop was not launched.

## October 11 verified integration status, 18:31 UTC

Desktop's active local preset now completed a real official Library fetch through automatic Wigolo (3.270 seconds) and a real Reddit thread through local Redlib (1.900 seconds). The Reddit result preserves 41 retrieved versus 43 reported comments, explicitly PARTIAL, with full JSON evidence. The output validator accepts typed evidenceFile/coverage metadata while still rejecting malformed or arbitrary fields. All three embedded preset mounts are updated; only the active local preset was exercised.

Web's browser and reference-memory tools are now verified through an actual local Qwen27B turn, session9821c554-faf9-4e2f-8dd2-0d5e1af14230: memory search returned an empty graph for a verification-only nonce, Chrome opened the official Longmont Library page, and its snapshot read Library - City of Longmont. All three tool results have isError:false; the turn reached completed. This was a read-only lookup, with no memory writes. The UI displayed 2m2s. This proves execution beyond catalog visibility.

LM Studio's hidden --run-as-service process was replaced by a normal launch after confirming no model was loaded. Computer Use then observed its normal rendered chat window with Select a model to load. Live process inventory shows PID31308 without --run-as-service. The inventory receipt lmstudio-gui-restored.json records no LM Studio loaded models and no Desktop processes. Supported Web startup completed afterward; only Ollama Qwen27B is resident. Mission Control is running again. No install or version change was made to LM Studio.

versions.json now derives release0.2.1-alpha.2 and Ollama Qwen27B/Off from the installed package and current settings. Its old September release/source/model values are retained under previousDeployment, not presented as current facts.

Still pending: real native subscription-provider generation/continuity, compaction reduction on the actual problem history, final recovery verification and repository commit/push. Do not treat this status as completion of those checks.
