# Isolated automatic compaction verification — October 20, 2026

## Result: trigger verified; pressure recovery did not cleanly pass

Automatic compaction started without /compact, a maintenance API call, or injected events. It committed two summaries, then a third summary attempt was rejected because it was not smaller. The agent continued and answered the follow-up correctly. This proves the automatic trigger and checkpoint persistence, but **does not prove successful recovery below the temporary threshold**. No production fix is claimed by this verification task.

## Isolation and identity

One fresh session: session-326bc19c-34ad-4138-940f-d483d727e1ea. It used the installed DSH 0.2.1-rc.2 headless carrier with a separate DSH_HOME under the Codex task folder, not the normal Web or Desktop home. No Web/Desktop restart or modification occurred. The same custom compaction-text-only.mjs module was used, including the newly corrected Low-effort exact DeepSeek route. Provider/model request headers: ollama/deepseek-v4.1-flash:1017-cloud, reasoningEffort low, maxTokens 65536; model context 1048576.

Only the isolated profile used thresholdRatio 0.009 (floor 9437 tokens), retainRatio 0.001 (983-token target from the message budget), headroom 4096 and summary allowance 8192. Model task tools were disabled except the stock plan-exit declaration which remained in the header; no tools or subagents were called. Background title inference was disabled. No packages or models were installed. Existing normal profiles were hashed before/after and matched byte-for-byte.

This verifies the common compaction engine through its headless carrier. It is not a separate Web-interface or Desktop-interface automatic-compaction test.

## Actual work, not token padding

The first prompt supplied 39,290 characters of the real ledger specification, implementation and tests from the preceding coding task. It asked for a short static review, with no execution, file edits, delegation or browsing. The follow-up asked for retained task code, concerns and uncertainty. Exactly two normal model turns were submitted in this one session; no manual compact command or output flood was used.

The initial review generated a short visible answer but reported 40,206 total output tokens. Its durable message contained 163,223 reasoning characters and 1,073 answer characters. Low effort did not prevent substantial reasoning on this task. It raised a plausible cursor-tampering issue in the synthetic ledger; this verification did not execute an exploit or repair that code, so it remains a static-review finding, not independently proven behavior.

## Durable events and timing

- First child ran 15:59:07.461Z–16:01:47.445Z (159.984 seconds); turn 1 ended normally at 16:01:47.352Z. First request usage: 12,594 input and 40,206 output.
- Same session resumed at 16:01:55.572Z. Automatic compaction started at 16:01:57.511Z, event 20, turn 2, with **no sourceCommandId**. First summary event 21 committed at 16:02:33.053Z; end event 23 at 16:02:33.056Z. Duration 35.545 seconds. It replaced event range 8..9, estimated 9,996 tokens.
- Second automatic summary started immediately, event 24, at 16:02:33.056Z; summary 25 and end 27 at 16:02:36.026Z. Duration 2.970 seconds. It summarized the preceding checkpoint, estimated 682 tokens.
- Third attempt event 28 started 16:02:36.028Z; end 29 at 16:02:43.890Z recorded: **summary is not smaller than the shadowed content (747 estimated framed tokens >= 676)**. No new summary committed for that attempt.
- The normal response then completed, event 36 at 16:02:47.475Z. Follow-up child exited code 0 at 16:02:47.563Z. Follow-up input was 41,128 noncached + 268 cached = 41,396 tokens, still above the artificial 9,437 threshold. It remembered LIME-AUTO-20, the cursor concern, test limitations, and that it had not executed tests.

There were two successful transactions plus one rejected attempt, not three successful compactions. No unmatched start remained. Process exit success is not interpreted as pressure-recovery success.

## Why this exposed a limit

The installed selectCompactableRange retains a recent tail and never splits tool pairs. It always retains at least the last priced surface node even when called with retainTokens 0. At admission of the second turn, the large 40K-output prior assistant response remained that recent tail. The first summary replaced the large supplied user material, but the retained response alone exceeded this unusually low threshold. Re-summarizing the small prefix could not solve that condition; the fallback also kept the tail and eventually hit the smaller-summary guard.

This explanation is supported by source inspection and the selected/shadowed ranges. It does not establish that the normal approximately 734K threshold is broken: this artificial test set its threshold well below the model's unexpectedly large recent response. Conversely, the summaries and completed answer are not enough to call automatic pressure relief fully working. No threshold was raised after the run to obtain a passing result, and no extra model turns were added.

## Usage and limits

Recorded durable usage across the two regular replies and two committed summaries:

| Category | Tokens |
|---|---:|
| Noncached input |68,928|
| Cached input |440|
| Generated output, including reasoning |49,933|
| Total recorded request traffic |119,301|

**This is a lower bound**, not a complete total: the rejected third summary request has no durable usage record in the session. Coordinator Codex usage is also excluded. No monetary charge is inferred. The first summary reported 8,355 output tokens despite an 8,192 configured summary allowance; this is recorded as provider-reported usage, not a separately verified explanation of limit semantics. This run did not test the 64K cutoff.

## Preservation, cleanup and delivery

Both owned child processes exited normally and no test model job remains. The isolated active cordis.patch.yml was reset to an empty patch list; its exact used settings are archived as USED-TEST-OVERRIDE.yml for inspection. Normal Web/Desktop profiles were never edited. Their before/after hashes are in preservation.json. Normal apps, selected models, defaults, Wigolo and Reddit/Redlib were left alone.

A launcher-help probe before isolation was fully set up failed on a sandbox EPERM while accessing a pre-existing .dsh headless module-fallback path. A subsequent first isolated launch was blocked on installed package-link access; it ended before a model session was created. The supported escalated path then ran the sole test session. No permission failure was reported as product failure, and no dependency installation was attempted.

[Exact prompts, temporary configuration, compact event evidence, visible responses, process terminal records and usage](evidence/automatic-compaction-2026-10-20/) are published. Private raw session logs and the long reasoning text are excluded. Human-readable report copied to Halo Stack Research. The normal configuration needs no recovery change because it did not change.

Subsequent repair: [oversized retained-response recovery](HALO-RETAINED-RESPONSE-FIX-2026-10-20.md) fixed and successfully replayed this specific failure. The mixed observations above remain the original test record.
