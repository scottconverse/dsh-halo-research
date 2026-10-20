# Automatic compaction retained-response repair — October 20, 2026

## Delivered result

The Web text-only compaction wrapper now handles a recent assistant response that alone exceeds the pressure threshold. One isolated replay of the exact previously failing history completed automatic compaction in **6.315 seconds**, included the oversized response, and resumed with **1,326 provider input tokens**, below the temporary **9,437-token threshold**. There was one successful compaction transaction and no failed retry. The model retained the task code, review findings and evidence limitations.

## Cause and narrow repair

Stock range selection always retains at least its newest priced surface node, even when retainTokens is zero. The previous fallback called that same stock selection under the context-overflow trigger, so it continued to preserve the oversized newest response. It could only summarize the already-small prefix again.

Changed source: stack/stock-dsh/compaction-text-only.mjs. During pressure admission, the wrapper resolves the same effective context/output/headroom threshold, including exact model-policy overrides. If the newest priced node alone exceeds that threshold, it immediately selects the complete non-system history instead of wasting summary calls on the prefix. It verifies both tool-pairing boundaries and uses the existing stock compactRegion transaction for shrink checking, cancellation, atomic replacement and durable events. After the transaction, it measures the replacement surface and rejects success if pressure is still at or above the effective threshold.

The existing recovery for stock nonshrinking-prefix/remaining-pressure errors now uses that same complete-history operation once. Other errors remain errors; ordinary pressure behavior and context-overflow dispatch remain stock. The system head is preserved. Incomplete tool pairs cannot be discarded. No node_modules files were edited and no thresholds, summary prompts, token allowances, selected models, defaults or integrations were changed.

The exact DeepSeek 1017 route still uses Low effort for normal requests and summaries. Its main output allowance remains 65,536. The summary allowance remains 8,192.

## Proportionate verification

The affected compaction-text-only module suite passed **8/8** in about 140 ms. It checks inclusion of the oversized tail, protected system head, ordinary and overflow delegation, the specific recovery path, rejection when the result still exceeds the threshold, incomplete-tool rejection, cancellation and unrelated-error propagation, plus the existing summary validation/assembler checks. No broad audit suite, benchmark matrix or subagents were run.

One isolated DSH home restored the original completed first turn from session session-326bc19c-34ad-4138-940f-d483d727e1ea. The exact original events through turn/end sequence 15 were used without editing any message, response or event. That preserves the real 40,206-output-token response, including its large reasoning block, without generating it again or adding padding. The restored history has its original session identity in a separate home; the original session and evidence were untouched. FIXTURE.json records the uncompressed-prefix SHA-256 and provenance. The initial restore attempt was rejected before inference because its header was not in a separate Zstandard frame; the framing was corrected without changing event contents.

The isolated configuration retained the same temporary thresholdRatio 0.009 and retainRatio 0.001 used by the failing test. One short follow-up prompt was submitted; no manual compact command or maintenance API was called. This verifies the common compaction engine through the headless carrier, not a separate UI automation test.

## Observed events

- Automatic start: event 20 at 2026-10-20T16:18:04.826Z, inside turn 2, no sourceCommandId.
- Summary: event 21 at 16:18:11.140Z. Shadowed range **8..13**, including the actual large assistant response at event 13. Previously the failed verification kept that response and summarized only range 8..9. Shadowed estimate: **51,083 tokens**.
- Successful end: event 23 at 16:18:11.141Z, no error. Duration **6.315 seconds**.
- Next request: event 27, exact model ollama/deepseek-v4.1-flash:1017-cloud, Low, maxTokens 65,536.
- Provider input: **998 noncached + 328 cached = 1,326 tokens**. The wrapper's post-compaction meter check also completed without its above-threshold rejection. Provider input and meter estimates are distinct measurements; both supported pressure recovery here.
- The response retained LIME-AUTO-20, the cursor concern and testing limitations, and distinguished inspection-based claims from executed tests. No test execution was falsely claimed.
- Turn ended normally at 16:18:12.803Z. Owned child exited code 0 at 16:18:12.856Z. Total child lifetime **9.696 seconds**.

This proves repair of the specific oversized-tail failure under the isolated lower threshold. It does not claim every future workload will compact successfully, or that an actual 734K normal-threshold crossing was generated for this test. Fixed system/tool overhead must still leave enough room for a smaller checkpoint; impossible budgets remain errors.

## Settings preservation, deployment and recovery

Normal Web and Desktop profile SHA-256 hashes matched before/after exactly; preservation.json records both. The isolated override was archived and reset to an empty patch list. No test processes remain.

The live Web fast-first preset imports the repaired module directly. All 92 listed Web sessions were idle; the verified node server on port 3080 was reloaded through its existing launcher (PID 24048 to 41848). Authenticated session listing after reload returned all 92 sessions and zero active turns. No user session was cancelled and no additional inference was run in the normal home.

Desktop uses the stock compactor and does not import this custom wrapper; its profile and compactor remain unchanged. This task repairs the specific custom-wrapper path demonstrated by the failing test, and does not claim separate Desktop installed acceptance.

The pre-change module is preserved privately in the Codex task folder. The repaired deployable module and its SHA-256 recovery entry, current reading notes and this report were synchronized to Halo Stack Research. Raw session/reasoning logs, local recovery backups and credentials are excluded from Git. The prior mixed-result report remains historical and links to this repair.

## New model usage for this verification only

| Category | Tokens |
|---|---:|
| Noncached input | 43,785 |
| Cached input | 14,546 |
| Generated output, including reasoning | 1,843 |
| Total request traffic | 60,174 |

This includes one summary and one resumed response. It excludes the reused historical first turn, which was not regenerated, and coordinating Codex usage. No cost estimate is inferred. The failed header-framing load made no model request.

[Exact follow-up prompt, temporary settings, fixture provenance, durable compaction events, response, usage and preservation evidence](evidence/retained-response-fix-2026-10-20/).
