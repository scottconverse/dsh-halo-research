# DeepSeek 1017 coding, output-cap and compaction test — October 20, 2026

## Result

Coding repair passed all 24 independently authored hidden tests on its first external scoring. Native manual compaction completed and retained useful task state. The attempted 64K output-cap challenge did not reach the cap: the model emitted one vector and stopped normally. Automatic threshold-triggered compaction was not exercised. These are three separate outcomes, not an overall pass for the 64K ceiling.

## Identity and scope

One DSH Web session: session-4c14643b-93ef-46fe-a7c3-983df078c729, fast-first preset. Selected provider/model: ollama/deepseek-v4.1-flash:1017-cloud. Returned model metadata: deepseek-v4.1-flash:1017. Main request headers before and after compaction show reasoningEffort low and maxTokens 65536. Configured context is 1048576. No production configuration, model, default or integration changed. No subagents or concurrent application tests. Web was started with its normal launcher and remains running; all three test turns ended normally.

Exact prompts, specification, model implementation and independent tests are retained in [the evidence folder](evidence/deepseek-coding-stress-2026-10-20/). Private raw session logs and authentication-bearing helpers are excluded from Git.

## Coding task

A deliberately defective Node ledger required exact BigInt money; canonical JSON without executing getters; prototype-safe accounts; semantic idempotency; complete batch rollback; strict calendar/timezone validation; chronological ordering; detached output; revision- and ledger-scoped pagination; and validated snapshot restoration. Hidden tests remained outside the model workspace and were not exposed to it.

Submission: 2026-10-20T15:22:09.090Z. Coding turn ended: 15:24:36.098Z. Wall time **2 minutes 27.008 seconds**, 21 model steps. The model encountered a syntax error in its tests, then a wrong expected balance assertion; it corrected both. Its supplied-plus-authored suite finished 27/27. The coordinator then ran the independent hidden suite once: **24/24 passed**, 155.4584 ms. Hidden checks included amounts beyond safe integers, getters, cycles versus aliases, late-batch rollback, duplicate and conflicting IDs, impossible dates, equal-time pagination, stale/foreign/forged cursors, detached snapshots, restore isolation and deterministic transfer conservation. Passing these finite cases is not a claim of exhaustive correctness or production readiness.

Files changed by the model: ledger.mjs, ledger.test.mjs and NOTES.md. Specification and supplied smoke tests were preserved.

## Output ceiling attempt

The separate prompt requested 12,000 explicit JSONL vectors with no generator, abbreviations, tools or voluntary early stop. It returned exactly one vector and ended normally at 15:25:25.785Z. Usage was 654 output tokens including reasoning, not a 65,536-token response. No max-token stop or overflow was observed. This probe failed to exercise the ceiling and failed the requested stream completion. No repeated coercion or follow-up output flood was run.

The largest coding response reported **17,597 output tokens**. That demonstrates a response above 16K on this route, but does not establish the full 64K ceiling. 65,536 was accepted in the actual request headers; its cutoff remains unverified.

## Native manual compaction and retention

The actual UI /compact command started compaction event147 at 15:32:09.727Z; summary event148 at 15:32:17.205Z; end event150 at 15:32:17.206Z. Duration **7.479 seconds**. Command completed normally. The summary shadowed range11..142, 47 selected event sequences, estimated39,460 tokens. Summary request usage:57,714 input and1,353 output; configured summary allowance8,192.

A single tool-free retention request after compaction ended at15:32:58.834Z. Actual provider input including cached input fell from **68,599** immediately before compaction to **26,906** after it, a reduction of41,693 tokens (60.8%). The response retained AMBER-LEDGER-64, five core requirements, exact changed files, the earlier test failures and final27/27 result, and honestly said the64K ceiling was not reached. The checkpoint text retained cursor/snapshot requirements and uncertainty. This verifies useful manual summarization and resumption, not every detail under a later coding workload.

The checkpoint excludes the last assistant response from the shadowed range and therefore describes the vector request as awaiting a response; the retained unshadowed one-vector response let the next model answer correctly. This is a coverage boundary in the summary, not evidence that all retained messages disappeared.

Automatic pressure-triggered compaction remains unverified. The ordinary thresholdRatio0.7 on a1,048,576 context is about734K; filling it solely for this test would be disproportionate. No threshold was lowered and no production profile was altered.

**Confirmed effort discrepancy:** the installed custom checkpoint wrapper (stack/stock-dsh/compaction-text-only.mjs) hardcodes reasoningEffort off. Main coding and retention turns used Low; the separate summary path uses Off. This test did not repair that existing setting.

## DSH usage accounting

Deduplicated by durable event sequence; each assistant/message usage counted once, plus the single compaction/summary usage. Cached input is repeated request traffic and is not generated output or current context occupancy. Monetary charges are not available from these logs.

| Phase | Requests | Noncached input | Cached input | Output | Total traffic |
|---|---:|---:|---:|---:|---:|
| Coding |21|94,159|1,012,498|36,116|1,142,773|
| Cap attempt |1|891|67,708|654|69,253|
| Compaction |1|57,714|0 reported|1,353|59,067|
| Retention |1|3,650|23,256|319|27,225|
| **Total** |**24**|**156,414**|**1,103,462**|**38,442**|**1,298,318**|

The1.298M number is the sum of request traffic across24 calls, primarily repeated cached prompt input; **38,442 tokens were generated**. Coordinator Codex usage is additional and is not included: an exact current-turn counter was not obtained, so this report does not claim an all-provider total. No paid-dollar estimate is fabricated.

## Preserved artifacts and limitations

[Initial prompt](evidence/deepseek-coding-stress-2026-10-20/PROMPT.md), [cap prompt](evidence/deepseek-coding-stress-2026-10-20/CAP-PROMPT.md), [retention prompt](evidence/deepseek-coding-stress-2026-10-20/RETENTION-PROMPT.md), [hidden test result](evidence/deepseek-coding-stress-2026-10-20/hidden-result.txt), [checkpoint](evidence/deepseek-coding-stress-2026-10-20/COMPACTION-SUMMARY.md), [retention response](evidence/deepseek-coding-stress-2026-10-20/RETENTION-RESPONSE.md), [usage](evidence/deepseek-coding-stress-2026-10-20/usage.json).

No Desktop run, new packages, provider changes, benchmark matrix or production-code repair was performed. The local synthetic project is test material only.

Subsequent repair: the hardcoded-Off wrapper discrepancy described above was fixed after this test; see [Low summary repair](HALO-COMPACTION-LOW-FIX-2026-10-20.md). The historical test observations remain unchanged.
