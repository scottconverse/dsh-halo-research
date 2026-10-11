# DSH transport and maintenance-compaction repair — October 11, 2026

## Current status

Updated 2026-10-11 22:32 UTC. This is the current status. The detailed status and compaction-plan text below is an earlier audit snapshot; any “pending,” “running,” or proposed chunked-repair wording there is historical and superseded by this section.

The custom multi-chunk compactor has been discarded. `stack/stock-dsh/compaction-text-only.mjs` and its focused test file were restored byte-for-byte to the `6e24164` baseline. The deployed Web profile points to that source file. This restores the original one-pass, text-only stock-handler path; it is not evidence that live compaction succeeds. The output-budget, Ollama Undici transport, and retrieval repairs were preserved. No new `/compact` command, chunk harness, or model inference was used to test compaction. The earlier seq580 attempt still has no verified successful checkpoint or history reduction.

The supported Web launcher passed its resident-model guard after the exact idle LM Studio Qwen resident was unloaded. The saved Web default remains `ollama-local/qwen3.8:27b-q6_K`, reasoning Off, context 131072, maximum output 24576. One bounded Web request was started, then stopped by the operator at 77.079 seconds without an assistant answer. Treat that check as **inconclusive**; it is not a verified Wigolo failure or success. The supported Web stop was then run and a fresh intermediate check found no listeners on ports 3080/3090 and Mission Control refused a new connection. After the Desktop launcher check, the supported Web launcher was run once more; it returned ready with the saved Qwen route. Fresh Mission Control status at 22:34:47 UTC reported DSH up, Ollama API healthy, no models listed, and zero queued inputs. Web and Mission Control are currently up; no inference followed the restore. The earlier LM Studio inventory was empty.

The documented Desktop launcher returned exit code 0 and ran the catalog refresh/preflight. Its saved default remains `ollama/deepseek-v4.1-flash:cloud`, reasoning Off; the generated Desktop model library contains 9 rows. The launcher did not expose a native app surface in the available UI inventory, so the actual Desktop picker was **not observed**. No Desktop inference or local model load was requested. Earlier integration proofs remain carry-forward evidence only and were not repeated here.

## What was already verified in this audit

The surrounding integration audit now has these actual end-to-end proofs:

| Integration | Evidence and observed result | Scope limit |
|---|---|---|
| Desktop automatic Wigolo | Session `a7e88496-b032-4a36-8720-19f3866cc72b`, turn 3, one `web_fetch`, official Library page HTTP 200, automatic Wigolo fallback identified in the result. | The active local preset was exercised; the other preset mirrors were not separately run. |
| Desktop Reddit | Session `ed366f05-119f-42f6-9bf6-90ddf189a47e`, one fetch through local Redlib; 41 comments retrieved versus 43 reported, explicitly partial. | Partial source coverage is retained; it is not described as complete. |
| Web Reddit output schema and fallback | Session `5450c05f-fb9f-49dc-afdb-e7653a024a62`, one fetch, Redlib HTTP 200, “Ballot initiative 3A”, 41/43 comments, partial. | This proves the repaired Web path and schema for the exercised thread, not every Reddit input. |
| Web browser and reference memory | Session `9821c554-faf9-4e2f-8dd2-0d5e1af14230`; actual memory search, Chrome navigation, and page snapshot all returned without error. | Read-only verification; no memory write. |
| Native Claude/Codex adapter generation and continuity | Four successful CLI adapter requests completed 18:32:06–18:32:40 UTC: two Claude Haiku 4.5 requests (12.345 s and 10.839 s) and two Codex GPT-6 Luna requests (6.394 s and 3.818 s). The second request for each provider resumed that provider's same native thread and repeated the marker. | This verifies the native adapter only; it does not prove picker UI integration. The sanitized receipt is below; raw provider output stays local. |
| LM Studio normal GUI | The regular LM Studio GUI was observed with “Select a model to load” and no resident model; receipt `lmstudio-gui-restored.json`. | This does not establish a headless Desktop mode. No headless build or adapter was attempted. |

The corresponding sanitized receipts are under
`C:\Users\scott\Documents\Codex\2026-10-11\dsh-integration-audit`. The
complete chronological integration audit remains in that folder's `RESULT.md`.
Version-controlled sanitized summaries and bounded local-receipt extractors
are in `docs/evidence/dsh-integration-repair-2026-10-11/`; the folder's
`SHA256SUMS.txt` records the evidence package hashes.

## Full integration requirement matrix

| Area | State | Evidence and exact scope |
|---|---|---|
| Web Ollama default, worker alignment, and one-model startup guard | Deployed; live route verified. | `model-startup-tests.txt` is 7/7; `launcher-tests.txt` is 19/19; the actual Web preflight selected installed `ollama-local/qwen3.8:27b-q6_K` and preserved the model route. Resident conflict is checked before launch; the startup guard did not change the saved picker or unload a competing model. |
| Desktop saved-default/catalog preservation | Guarded and fixture-tested. | Both saved defaults in `desktop-default-verification.json` stayed unchanged; missing CLI/offline model metadata preserved the same profile SHA-256 in `desktop-offline-verification.json`. The refresh script retains the complete saved catalog. No claim that every picker entry was exercised. |
| Mission Control | Deployed and live status API verified. | Focused suites: 84 UI contracts and 12 service/status checks passed. The live API identified the correct Ollama resident/provider, reported fresh `jobs.active=[]` and `queuedInputs=0`, and distinguished the configured route from actual residency. See `HALO-DSH-IMPLEMENTATION-2026-10-11-MISSION-CONTROL.md`. |
| Output-budget guard | Deployed through supported startup. | `stack/stock-dsh/output-budget-patch.mjs` is version-pinned and backup-backed; its focused regression is `stack/stock-dsh/test/output-budget.test.mjs`. It preserves true provider capacity while disabling only the SDK character-estimate clamp. It does not raise the configured 24,576 output maximum. |
| Output-budget and text-only compaction policy | Deployed; focused regression contracts pass. | `node --test test/output-budget.test.mjs test/compaction-budget.test.mjs test/compaction-text-only.test.mjs` passed 17/17 on October 11, after the bounded-chunk regressions were added; the earlier policy-only result was 13/13. It covers output headroom, bounded stock fallback, text-only summary constraints, ordered source coverage, atomic tool-call/result groups, provider-failure diagnostics, and 24K request serialization. Eight nonfatal YAML `!!js process.platform` warnings appeared while loading stock profiles. The live existing-history attempt below remains the separate end-to-end gate. |
| Retrieval integrations | Actual Web and Desktop requests passed. | Details and partial Reddit limits are in the earlier integration table. Wigolo and Redlib outputs are not conflated; Reddit's 41/43 coverage remains explicitly partial. |
| Native subscription providers | Four requests and same-thread continuation passed. | Claude and Codex native CLI adapters each completed an initial request and same-thread continuation. Adapter proof does not establish a stock model-picker row. |
| Existing-history Web compaction | Current bounded maintenance compact is pending. | One /compact started at seq580, ID 58e29ad0-bfd1-4f9c-ab2f-e045f8b5bc60. The session UI still shows Running; the latest parsed journal has no terminal event/result. The 11+1 plan is offline only; chunk execution, summary fidelity, atomic commit, and history reduction are not yet verified. |
| Desktop headless mode / complete picker matrix | Not verified. | No headless build was made; no claim that all picker models or presets were exercised. |

## Compaction failures and confirmed cause

The maintenance command targeted only the existing session
`44bc0b27-fc26-4044-b8db-d6928ccbcf3d` (“Report Local News Longmont Colorado”),
which had stopped after the earlier reporting attempt. The session stream is
concatenated Zstandard JSONL; `session-status.mjs` decodes every frame and writes
`session-current.json` without resuming the reporting turn.

| Sequence | Compaction ID | Start UTC | End UTC | Duration | Result |
|---:|---|---|---|---:|---|
| 565–566 | `d43b547e-3851-473e-9772-028503ed0349` | 18:33:18.219 | 18:38:24.801 | 306.582 s | Generic `Checkpoint generation did not complete: error`; no useful summary. |
| 570–571 | `0cd4c8a8-c08a-41bf-803f-f5d3903a1769` | 18:51:51.363 | 18:56:58.668 | 307.305 s | The checkpoint failed because Node.js fetch timed out waiting for response headers. The SDK error explicitly called for a matching Undici fetch and `fetchOptions.dispatcher` Agent whose `headersTimeout` reaches the SDK timeout. |
| 575–576 | `0d6a4308-d3c3-4909-8e63-a1ce78287621` | 19:23:04.803 | 19:33:04.831 | 600.028 s | Failed at the pi-ai 600,000 ms stream-idle timeout; no checkpoint summary or reduction. |
| 580–pending | `58e29ad0-bfd1-4f9c-ab2f-e045f8b5bc60` | 20:06:16.413 | — | Pending | The same existing-session /compact remains Running in the UI; journal last ends at start seq580. No terminal result, summary, fidelity review, or reduction. |

The pi-ai `streamIdleTimeoutMs: 600000` had already been propagated through the
Ollama profile. That setting does not control Undici's default response-header
timeout. Inspection of the installed OpenAI SDK error and call path confirmed
the missing layer: pi-ai passes its custom `options.fetch` through to the OpenAI
client, but the DSH Ollama profile had not supplied a custom fetch/dispatcher.
This is the confirmed cause of seq570/571. Seq565/566 contains only a generic
checkpoint error, so that attempt alone does not prove the same root cause;
its similar duration is consistent but insufficient evidence. The global idle
timeout was not stale.

The transport repair removed the specific Undici response-header timeout from
the next existing-history attempt, but did not make the checkpoint finish. The
terminal event for seq575/576 reports a distinct pi-ai stream-idle timeout at
600,000 ms. Do not treat that as another proven Undici failure or as proof that
the model generated nothing; the persisted session stream has no usage,
prompt-evaluation, or token-progress event for this request. The actual
`/compact` command selected 158 of 161 current surface nodes plus the system
head, keeping a two-node balanced tail. The custom wrapper JSON-serializes
those 159 messages into one text field and sends zero tool schemas. Replaying
the durable surface through the installed DSH heuristic yields 309,567 UTF-8
bytes for the message JSON and about 77,474 request tokens, with an 8,192-token
summary output limit. This is a reconstructed estimate, not a captured HTTP
payload or provider tokenizer count; runtime-only message projections were not
applied. The inspection found 83 tool-result messages, each included once by
the selected surface; it did not establish duplicated tool-result serialization
as the cause. The current one-shot full-history summary path therefore remains
the open failure. A future repair should summarize bounded, tool-pair-balanced
chunks in memory, carry forward each validated text-only intermediate summary,
merge all chunk summaries into the required six-heading checkpoint, and append
one durable replacement only after the final merge succeeds and the selected
source surface is unchanged. Any cancellation or failed chunk must leave the
original history visible. This strategy is proposed, not implemented or tested.

The first attempt's error was generic. The second attempt exposed the specific
Undici header timeout. Both failures ended with the session's explicit
“Compaction could not produce a useful summary” command result. They did not
produce a summary or reduce the history. A previous Mission Control wrapper
also counted non-job/scalar fields as an `active` count; a direct `/api/status`
read of `jobs.active`, `queuedInputs`, and `dataStale`, together with the session
`running=false` state, corrected that false count. No active task was stopped.

## Transport repair

The deployable repair is intentionally limited to the configured `ollama-local`
provider:

- `ollama-timeout-fetch.mjs` builds an Undici `Agent` whose `headersTimeout` and
  `bodyTimeout` are `max(timeoutMs, streamIdleTimeoutMs) + 1000 ms`. The
  configured 600,000 ms SDK and idle limits therefore use a 601,000 ms transport
  limit. The SDK timeout and pi-ai idle watchdog remain the user-facing limits.
- The custom fetch calls the pinned Undici `fetch` with that Agent as
  `dispatcher`, preserving the SDK's request init, including its abort signal,
  method, headers, and body. Agents are reused per timeout and fetch/Agent
  implementation, not recreated for each provider call, and are destroyed at
  process exit.
- `adapter-integrity-patch.mjs` adds the fetch only when the resolved profile's
  provider is `ollama-local`. Other providers keep their existing transport. The
  patch remains version- and pristine-SHA-guarded, backup-backed, idempotent,
  and rejects unrelated source drift. `start-dsh-detached.mjs` runs the patcher
  during the supported startup path.
- The direct `undici` dependency is pinned at 8.10.2 in `package.json` and
  `pnpm-lock.yaml`; installation was verified with `pnpm install
  --frozen-lockfile --ignore-scripts` using pnpm 11.25.0.
- Both deployed Ollama profile sources specify `timeoutMs: 600000` and
  `streamIdleTimeoutMs: 600000`. The saved output limit, context, route, and
  reasoning mode were not changed for this transport fix.

The adapter patcher reported `{ changed: false, version: "0.2.1-alpha.2" }`
after the supported restart, confirming the installed adapter was already at
the complete expected shape. Its repair backup is
`stack/stock-dsh/runtime-patch-backups/dsh-llm-pi-ai-0.2.1-alpha.2-index.js.original`.

## Verification and live recovery

Focused verification completed:

- `node --test test/adapter-integrity.test.mjs test/ollama-timeout-fetch.test.mjs` —
  14 passed, 0 failed. This includes a local SSE streaming contract through
  OpenAI SDK 7.19.0, the same Undici package used by the Agent, timeout policy,
  request init/signal preservation, equivalent-profile reuse, and separate
  Agent implementations.
- `node adapter-integrity-patch.mjs` — readback was idempotent and retained
  version 0.2.1-alpha.2.
- `node --test test/output-budget.test.mjs test/compaction-budget.test.mjs
  test/compaction-text-only.test.mjs` — 13 passed, 0 failed; eight nonfatal
  unresolved YAML `!!js process.platform` warnings were emitted.
- Frozen pnpm install passed with the committed lockfile. An earlier offline
  install could not resolve cached metadata for an unrelated package; the
  later frozen install succeeded. The temporary junction used to test the
  cached Undici store was normalized by the frozen install to the expected
  `node_modules/undici` junction.

The SDK test proves that the custom fetch/Agent works with streamed responses.
The one existing-history maintenance attempt after deployment still failed at
the separate 600,000 ms stream-idle timeout, so end-to-end compaction is not
verified as working.

The supported `Stop-StockDSH.ps1` stopped DSH and Mission Control after a fresh
zero-job probe. The first combined PowerShell wrapper then incorrectly tested a
stale `$LASTEXITCODE` from the stop script and skipped startup; the stop itself
had completed successfully. A direct supported start first refused to proceed
because `lms ps` showed one idle LM Studio resident,
`halo/qwen3.8-27b-q6-fast` (Q6_K, context 65,536, queued 0). At that moment both
DSH and Mission Control listeners were absent. That exact model was unloaded,
and the empty LM Studio inventory was verified before retrying startup. The
supported start then succeeded with the configured Ollama route.

The source of the LM Studio model's reappearance was not established. The
`lms ps` record did not include a loader PID or load timestamp, and the local
LM Studio main log had no matching model-name event. No inference is made about
which user or process caused it. No model default, catalog, or autoload
preference was changed. The running maintenance request loaded one configured
Ollama Qwen model on demand; the observed `llama-server.exe` was a child of
`ollama.exe`, not a second LM Studio model.

## Evidence inventory and recovery

The primary receipts are:

| Evidence | Location |
|---|---|
| Sanitized in-repository evidence, including failed compact and reconstructed size | `docs/evidence/dsh-integration-repair-2026-10-11/`; hashes in `SHA256SUMS.txt` |
| Bounded reproducible local receipt extractors | `docs/evidence/dsh-integration-repair-2026-10-11/scripts/` (`summarize-compaction-session.mjs`, `summarize-native-receipt.mjs`, `analyze-compaction-input.mjs`) |
| Current compressed-session extraction | `C:\Users\scott\Documents\Codex\2026-10-11\dsh-integration-audit\session-current.json` (refreshed by `session-status.mjs`) |
| Earlier full session evidence preserved before compaction repair | `C:\Users\scott\Documents\Codex\2026-10-11\dsh-integration-audit\session-evidence.jsonl` |
| Web schema/fallback result | `C:\Users\scott\Documents\Codex\2026-10-11\dsh-integration-audit\web-schema-repair-verified.json` |
| Browser and reference-memory proof | `C:\Users\scott\Documents\Codex\2026-10-11\dsh-integration-audit\web-browser-memory-verified.json` |
| Desktop Wigolo and Reddit results | `desktop-wigolo-verified.json`, `desktop-reddit-verified.json`, and `desktop-reddit-contract.json` in the same audit folder |
| Native-provider verification | `native-provider-verification.json` (kept local; use the sanitized summary in this record) |
| Runtime configuration and dependency lock | `stack/stock-dsh/settings.yaml`, `web-profile/cordis.patch.yml`, `package.json`, and `pnpm-lock.yaml` |
| Runtime transport and guarded patcher | `stack/stock-dsh/ollama-timeout-fetch.mjs`, `adapter-integrity-patch.mjs`, and `runtime-patch-backups/` |
| Focused checks | `stack/stock-dsh/test/ollama-timeout-fetch.test.mjs` and `test/adapter-integrity.test.mjs` |
| Live app check | Mission Control `GET /api/status`; IAB browser 2/tab 1 showed the existing target session and the current Compact command state |

To recover the repair, restore these source files from the reviewed repository
revision, run the frozen pnpm install, then start with
`stack/stock-dsh/Start-StockDSH.ps1 -NoOpen`. The detached launcher reapplies
the version-pinned adapter patch and checks its pristine backup/readback before
launch. The expected Ollama route remains on demand; do not load an LM Studio
model while it is selected. The repair does not alter another provider or
change the persisted picker/default.

## Remaining limits

The current existing-session maintenance `/compact` remains pending. The last
UI observation at 20:29:10 UTC showed it Running; the last parsed journal at
20:26:20.513 UTC still ended at the start event (seq580), with no terminal
event. The bounded chunked summarizer is implemented and its focused tests
passed 17/17 before this attempt, but the offline 11-chunk-plus-merge plan does
not prove live execution. Do not claim a final summary, fidelity, checkpoint
commit, compaction success, or history reduction until those results are
observed and reviewed. Do not claim every model-picker choice or preset was
exercised. Desktop headless mode was not built or verified. Preserve the partial
Reddit coverage indicators and native-provider receipt locally; do not publish
raw logs or credentials.


## Historical snapshot — 19:44 UTC (superseded by current status above)

At 19:44 UTC, the sole post-transport-repair attempt had terminated at 19:33:04.831 UTC with `TIMEOUT: pi-ai stream idle timeout after 600000ms` after 600.028 seconds (seq575–576, compaction ID `0d6a4308-d3c3-4909-8e63-a1ce78287621`). It produced no checkpoint, summary, fidelity result, or history reduction. As of that snapshot, no further retry had been launched and the reporting turn had not been resumed; the bounded chunked summarizer was still only a proposal. The implementation and later pending attempt are recorded in the current status above and the receipt below.

The last independent Mission Control observation was 19:25:18.483 UTC during the attempt and showed fresh data, zero active jobs, and zero queued inputs; there was no post-failure Mission Control read. Post-failure Ollama `/api/ps` at 19:39:28.548 UTC was empty. The in-repo reconstruction is explicitly estimated and does not establish that prompt size caused the timeout. The first generic failure's cause remains unknown; the second failure's Undici response-header cause is proven for that attempt only. A prior Mission Control wrapper false count was corrected using direct `jobs.active`, `queuedInputs`, and `dataStale` fields.
## Bounded compaction attempt — current pending record, 20:33 UTC

The bounded implementation and 17/17 focused regression result are documented above. The full sanitized runtime receipt is evidence/bounded-compaction-live-attempt-2026-10-11.json, updated at 20:33:36.807 UTC. It records the UI state, last journal parse, Mission Control status, runner-counter samples, offline plan, logger limitation, and strict claim limits. The receipt hash is in the evidence package SHA256SUMS.txt. The 19:44 snapshot above is historical and superseded by this record and the current status at the top.
