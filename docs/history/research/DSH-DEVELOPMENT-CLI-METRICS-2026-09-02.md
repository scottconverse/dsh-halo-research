> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Native-agent metrics and Codex compaction clarification

SCOPE: DSH DEVELOPMENT only, `C:\Users\scott\Desktop\Code\dsh-halo-dev`. September 2, 2026, America/Denver.

## Delivered

The development cockpit at http://127.0.0.1:3180 now has a native-agent accounting panel. Expand the line below the composer for the exact input/cache/output counters, first complete model-message latency, usage coverage and session totals. It replaces the stock inference footer for native sessions and sessions containing native receipts. Ordinary local/API-only sessions keep the original footer. In mixed sessions the panel explicitly excludes local/API usage; it does not pretend these are combined session totals.

Per-message native TTFT and decode-speed labels are suppressed: the adapter's immediate banner/activity is transport output, not the model's first generated token. The ordinary 'Ran for' duration remains whole-turn elapsed time. Historical raw DSH sessionStats/trajectory records are not rewritten; those remain transport-level data and must not be consumed as native inference telemetry. The supported native accounting source is `/halo-dev/cli-metrics?sessionId=SESSION_ID`, not the stock tokenUsage projection.

## Mapping contract

| Measure | Correct interpretation |
|---|---|
| Codex input_tokens | Inclusive input total, including cached input. Uncached = input minus cached_input_tokens when cache is reported. |
| Claude input | input_tokens + cache_read_input_tokens + cache_creation_input_tokens. Only terminal result.usage is counted; assistant snapshots and modelUsage breakdown are not added again. |
| Output | Terminal output_tokens. reasoning_output_tokens is an included subset when supplied, not an additional charge/count. |
| Coverage | terminal-aggregate for successful terminal receipts; reported-before-failure if terminal usage exists but process fails; unreported if absent/invalid. Zero stays zero only when actually reported. |
| Wall time | Monotonic time from immediately before process launch through confirmed exit/termination result. Older receipts use started/finished wall-clock timestamps, identified in timingSource. Includes startup, model work, native tools and waits. |
| First model message | Monotonic arrival of a complete assistant text message. Excludes banners, initialization and tool activity. Not TTFT; chunk-level first-token timing is unavailable. |
| Decode speed / native tool time | Unreported. Do not divide output by entire agent wall time and call that decode tok/s. |
| Context occupancy | Not derivable from aggregate native usage. No aggregate usage chunks are injected into DSH's per-request context meter. |

The two providers can differ in what their terminal usage includes, including helper/model calls. The UI reports the CLI terminal aggregate faithfully; it is not a price calculation, provider invoice, or proof of identical billing scope. Invalid, negative, fractional or contradictory counters are rejected. Auxiliary title/compaction operations are excluded from coding-session totals. Receipt IDs prevent resumming duplicate terminal events. Cancellation during an activity yield now preserves its receipt exactly once.

## Evidence

- Baseline: 78 deterministic tests passed before source changes.
- Final deterministic acceptance: **94/94 passed**, 0 failed/cancelled/skipped, 4242.2495 ms. `dev\evidence\acceptance.txt` and `.json`.
- Parser RED: eight failing assertions before mapping implementation. Cancellation regression RED: 0 receipts instead of 1. Compiled UI RED: native firstTokenTime 11 instead of null. All subsequently GREEN.
- Two live development-only subscription probes, deliberately tiny instrumentation tasks, not coding-quality or speed benchmarks. Prompt: `Metrics smoke only: reply with exactly METRICS-OK: 42. No tools, commands, or file changes are needed.` Both fixture directories remained empty.

| Route | Native process elapsed | First complete message | Input | Output |
|---|---:|---:|---:|---:|
| claude-cli / sonnet | 8.861 s | 3.759 s | 47,289 | 12 |
| codex-cli / gpt-5.6-terra | 5.113 s | 4.061 s | 27,336 | 12 |

Live receipt identities and source hashes: `dev\evidence\cli-metrics-live-2026-09-02.json`. After the final development restart, `dev\evidence\cli-metrics-final-2026-09-02.json` checks identical restored metric values, served UI patch, service health, full provider catalog and production's seven monitored hashes. Raw local receipts remain in `.runtime\evidence\cli`; they can contain task data and are not copied to Research.

Browser checks: the historical Codex session retained 32s/21s whole-turn labels but lost both false 'TTFT 0s' labels. Its expanded panel showed 84,246 input = 30,486 uncached + 53,760 cache-read, 573 output including 86 reasoning; totals across two native runs were 196,075 input and 1,581 output. First-message timing for these older receipts was explicitly unreported. A saved local-brain/API run still displayed TTFT 23s / 59 tok/s and the original DSH statistics footer. No local generation was started to check that.

The final browser view also displayed the new Codex receipt: 5.11s, input 27,336/output 12, with the picker intact. Browser logs contained transient conversation-service-unavailable errors at 18:54:49Z while the UI package was being replaced, before the final 18:54:55Z server restart. The final reload recovered; subsequent inspection found no errors timestamped at or after 18:55:00Z. Do not report the entire installation window as error-free.

## Code and packaging

- `dev\cli-metrics.mjs`: pure provider-specific mapping, receipt index and read-only same-origin HTTP view. It serves counters only, never prompt, cwd, response text, authentication tokens/credentials or raw events.
- `dev\cli-runtime.mjs`: injectable monotonic clock and elapsedMs per normalized CLI event.
- `dev\cli-provider.mjs`: durable metrics receipts, replay on startup, cancellation-safe recording and development endpoint.
- `dev\picker\source\client\NativeMetrics.tsx`: native stats panel; supported priority shadow of the stock stats slot; existing model chooser preserved.
- `dev\conversation-metrics\patch.mjs` and `build.mjs`: minimal **development-only conversation UI package overlay** for native TTFT suppression. The final-node builder does not carry requestConfig, so the patch checks durable message.source.provider there; a second guard handles nodes that do carry requestConfig. Original pnpm files are never edited. Build refuses an unexpected upstream bundle hash; re-review on DSH updates.
- Installed artifacts: picker `0.1.1-rc.2-halo-dev-search.4`; conversation UI `0.1.1-rc.2-halo-native-metrics.2`.

An earlier overlay candidate checked optional requestConfig only; the browser caught that it did not fix the real final-node footer. That candidate is superseded by .2. This is why the compiled-function unit tests and final browser check both matter.

pnpm's isolated-profile peer check still reports missing peer declarations; DSH supplies those modules from its composing application. Offline install and live browser/server loading succeeded. This is not a claim of a clean standalone peer-dependency audit.

No production promotion, commit/push, local model load/unload, LM Studio change, Ollama operation or reboot was performed. No native permission scope was reduced.

## Codex already auto-compacts

Yes. OpenAI documents `model_auto_compact_token_limit`: when unset, model defaults determine the threshold for automatic history compaction. Source checked September 2: https://learn.chatgpt.com/docs/config-file/config-reference (formerly https://developers.openai.com/codex/config-reference/).

The gap is **our DSH adapter's continuity design**, not a missing Codex compaction engine. It starts `codex exec --ephemeral` for every DSH turn and serializes DSH's retained history into a new prompt. Codex can manage/compact its own in-process thread; that does not rewrite DSH's separate outer history. DSH's auxiliary compaction route currently returns unsupported for Codex. Long DSH sessions are therefore not proven safe merely because Codex itself supports compaction.

Preferred next design to evaluate: bind each DSH/native-provider conversation to a resumable provider-owned thread and reuse Codex's existing continuity/compaction. Handle provider/model switches, branch/restart semantics and cancel explicitly. Do not build a second summarizer merely because the old adapter assumed one was necessary. This turn implements metrics only, not persistent native threads or DSH compaction. No long-context acceptance was run.

## Recovery / takeover

Current verified development PID at deployment: **15364**, started 12:54:55 MDT; verify identity before using it. Receipt `.runtime\logs\dev-dsh-20260902-125455-98064a60.pid.json`. Never stop by process image name.

Pre-metrics source checkpoint: `.runtime\checkpoints\pre-cli-metrics-20260902.tar.gz`. Roll back selectively, preserving subsequent edits. Restore the old provider/runtime/picker sources; set the development profile's picker dependency back to the .3 tarball and remove the conversation-metrics dependency; reinstall that development profile with scripts disabled and restart only its verified idle process. Keep native receipts. Do not restore production or user CLI credential homes. Generated preparation code must agree with the rolled-back profile before rerunning it.

Production remains `C:\Users\scott\Desktop\Code\dsh-halo-research`, ports 3080/3090. Development uses its own `.runtime\dsh` and 3180. Reports/evidence are copied to `C:\Users\scott\Desktop\Halo Stack Research` under `DSH-DEVELOPMENT-CLI-METRICS-*` names.
