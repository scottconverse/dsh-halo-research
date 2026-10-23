# Flint coding task — October 23, 2026

## Verdict
The repaired queue passed **30/30 hidden behavioral checks**, versus **5/30** for the deliberately buggy starting code. Flint's own delivered suite passed 17/21 tests: two failed assertions and two errors came from incorrect test expectations. Its architecture note contains a retry-deduplication flaw. The agent did not finish autonomously: it rewrote a test-runner file ten times and never called a shell or executed its tests. The coordinator stopped that loop, then graded the untouched artifacts. This was one local coding task, not a comparative benchmark or evidence of production readiness.

## Task and execution
A small Python standard-library newsroom dispatch queue contained tenant isolation, input/output aliasing, idempotency, ordering, off-by-one, expiry, stale lease/token and concurrency defects. The explicit contract also required original-request replay to work after retry rescheduling. The model had the code, specification and one visible smoke test; 30 hidden checks were written and baseline-run before the model assignment. Hidden results and fixes were never fed back to Flint. A six-item architecture checklist was saved before reviewing its answer.

Deliverables requested: repair queue_store.py, add focused regression tests, run them and the smoke test, and write a maximum-600-word SQLite production design. Exact prompt and source artifacts are in [the evidence directory](evidence/flint-coding-2026-10-23/). No packages, external services or subagents were used.

Runtime: existing Unsloth Flint UD-Q4_K_XL via LM Studio0.4.26+4 / Vulkan2.63.0, one prediction slot, 262,144 loaded context, 32,768 per-response output allowance. The previous active request was cancelled only after Scott explicitly authorized cancellation/reload. Flint reloaded successfully in16.45s; a subsequent native inventory confirmed262144 context, idle, no queued jobs. This was a small-context task: initial provider input6440 tokens and largest completed-request input39294; it did not exercise a full256K prompt, compaction or the output cap.

Stock DSH0.2.1-rc.2 headless ran in a task-local home and project; normal Web/Desktop profiles were not edited. A normal-home headless configuration probe failed because its global patch names terminal-controller, absent from the stock headless composition. The task-local home avoided that unrelated deployment patch. A task-local API-key field mistake caused one zero-token startup failure; correcting it to the supported apiKeyEnv started the actual model task. No deployment repair was attempted during this exercise.

## Permission error: full access was present
Both normal saved app profiles retain danger-full-access, and the task's effective mode was danger-full-access. Flint twice supplied sandbox_permissions:workspace-write on a write call. DSH's dsh-sandbox approveEscalation rejects a narrower target as an invalid escalation before attempting filesystem access. The same write succeeded with danger-full-access. This is not evidence of a Windows ACL denial, loss of full-access settings or a human approval rejection. No permission setting was weakened or changed to recover. Other tool errors were a directory passed to read and an incorrect relative path passed to edit.

## Independent grading
The coordinator ran the prewritten hidden grader once on the final implementation:30 passed,0 failures,0 errors. Coverage includes tenant isolation, nested snapshots, idempotency conflicts, exact scheduling/deadline boundaries, claim limits/FIFO, expired and stale acknowledgements, same-owner token rotation, delayed retries, original replay after rescheduling, invalid inputs before mutation and contended calls. Finite concurrency checks do not prove every possible interleaving.

The coordinator also ran the delivered tests once:21 tests,17 passed,2 failures,2 errors. The four faulty expectations were:

- Ordering: clock0 was expected to claim jobs scheduled for time1.
- Claim limit: a second batch consumed jobs2and3, but the third batch was expected to start with job3again.
- Expiration: a job with deadline8 was expected to be claimable at time9.
- Retry delay: a job rescheduled for time3 was expected to be claimable immediately at time0.

No coordinator changes were made to the implementation or delivered tests, and no model retry was run with hidden feedback.

## Architecture review
The310-word design correctly discusses SQLite immediate transactions, single-writer tradeoffs, tenant-scoped uniqueness, fresh fencing tokens, an outbox, lease recovery and at-least-once delivery. It explicitly rejects claiming exactly-once publication from a local transaction alone.

It then proposes CMS deduplication by (job_id,attempt). A reclaimed retry has a new attempt, so that pair does not deduplicate the same logical publication across attempts. A stable logical publication key must be separate from the lease-attempt fence. It also leaves conditional fenced acknowledgement SQL, durable original-request conflict data, clock-skew/reboot policy and migration coordination underspecified. The design is a useful outline, not a production-ready architecture.

## Time, generation statistics and token accounting
Actual owned DSH process:2026-10-23T06:08:39.033Z through2026-10-23T06:23:15.002Z, **14minutes35.969seconds** (00:08:39–00:23:15 MDT onOctober23). This includes its startup and tool handling; fixture preparation, the earlier zero-token failure, model reload and coordinator grading/documentation are outside that interval. Exit4294967295 was caused by coordinator termination after non-progress, not natural model completion.

There were24 completed model steps,27 tool calls,4 tool errors and0 shell calls. The test-runner file was written10times. The coordinator stopped the run during step25.

Recorded completed-step totals:

| Metric | Tokens |
|---|---:|
| Cumulative input across requests, including repeated prefixes |714596|
| Generated output, including reasoning |28085|
| Reasoning subset of output |14401|
| Recorded input-plus-output traffic |742681|

**742681 is recorded local model-token traffic, not742681 generated tokens.** The in-flight25th request did not report usage, so these are lower bounds, not complete exact totals. Reasoning is already included in output. Codex coordinator account usage is not exposed by these logs and is not included. No billing or cached-token deduction is inferred.

A read-only native LM Studio listener captured19 request completion-stat samples. Native decode rates ranged25.19–45.02tokens/s in those samples; the first substantial repair generation was13971tokens at45.02tokens/s and312.044seconds total. These are runtime statistics from this task, including reasoning output, not DSH's display formula or a separate speed benchmark. They overlap the DSH usage and must not be added again. The listener did not capture every request; no complete-task average is claimed.

## Preservation and end state
Byte hashes confirm normal Web/Desktop profiles are unchanged. The task-local route did not change the selected normal model/default. The owned DSH process is stopped, the read-only native log listener is stopped, and native LM Studio inventory shows Flint idle at256K with no queued work. Flint remains loaded for Scott. No further test, model attempt, repair or benchmark remains running.

Evidence includes the exact task prompt, specification, original and final source, model-written tests/design, hidden grader, baseline/result summaries and accounting. Raw DSH events/reasoning, private configuration dumps and local logs remain under C:/Users/scott/Documents/Codex/2026-10-23/flint-coding/private and are not published. The report and scoped reproducible artifacts are recorded in the Halo repo; required reading records are synchronized. No new release tag is requested.
