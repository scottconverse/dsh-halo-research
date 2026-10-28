# Three-role review/context tuning — October 28, 2026

## Scope and reason

Scott authorized reducing repeated reviews and context overhead without weakening
audit/acceptance, another Desktop trial, documentation and push. Verdict and the
production Web host were left alone. He subsequently approved an Auditor-only,
project-confined SHA-256 tool. No other capabilities, product features, provider
changes or release requirements were added.

The previous ledger trial's rejected premature closures showed that the closure
guard worked. They also exposed a workflow defect that Codex should have addressed:
the Auditor tried closing findings before the Coder supplied fix dispositions.
Calling that only a successful safeguard missed the avoidable review/rework.

## Implementation

`stack/three-role/index.mjs` now returns compact status/wait results: requirement
and finding IDs/statuses, worker report counts, actual child/goal state, review
flags and revision. The FULL objective/requirements remain available through
`triad_status view: contract`; `view: evidence` plus an ID returns the entire
record; `view: full` returns all saved evidence/history. Durable evidence is not
deleted, truncated or replaced by a summary. Workers receive the complete
requirements at startup.

Read/search/skill/image/job-list operations and acknowledgment-only dispositions
no longer invalidate audit. Writes, edits, shell execution, job output/cancellation
and fixed/disputed dispositions do. Failed mutation tools invalidate too, since
an exception may follow a partial write. Shell/job output classification remains
conservative; repeated job-output polling can still create a pending revision.

Automatic review wakeups coalesce over 15 seconds and wait for outstanding Coder
fix/dispute records. The baseline independent review still starts immediately.
Coder checkpoint reports reject open/acknowledged finding dispositions rather
than accepting a narrative substitute. The Auditor instructions explicitly forbid
closing those findings or polling for records, require source/receipt inspection,
and retain final reconciliation of every agreed requirement. Reports name the
revision actually inspected. Newer changes remain dirty and block completion.

An explicit Coordinator message to the Auditor claims the same queue and consumes
the pending automatic wakeup. Ordinary relay deliveries and individual acceptance
records no longer wake the Coordinator unnecessarily. Settled-worker/checkpoint
events still do. Default waits remain cancellation-safe, bounded to 20 seconds;
the existing native goal provides continuation, not a shell polling loop.

All prior gates remain: individual verified requirements, no unresolved findings,
Auditor-only closure after a Coder-reported fix, both worker reports, no pending
review and no running worker. Role, path, publication and goal boundaries remain.
Revision accounting does not prove that a model reviewed the code correctly.

## Desktop inventory retest

Visible chat: **Tuned three-role Desktop acceptance tria**. Project
`0a7e7390-248b-4723-bef4-fa4d0054cf21`; Coordinator `80722ffe`, Coder `127d46e4`,
Auditor `977f6e9a` (full session IDs in the sanitized receipt).

The fresh synthetic fixture used the identical full R1–R8 contract and protected
11-test suite from the earlier trial. It started with the same incomplete ledger
and CLI behavior. Codex's baseline was 2 pass/9 fail, exit 1. The task covered
strict event validation, immutable all-or-nothing batches, durable ID idempotency,
validated stored history, deterministic reporting, CLI error/argument behavior,
atomic sibling-temp persistence, protected files and full independent acceptance.

At **2:42:20 PM Mountain**, the Auditor completed baseline review with ten actual
source findings. Coordinator GO preceded the Coder's first shell/write. The Coder
recorded all ten fixes before its **2:43:08 PM** checkpoint. The Auditor reread the
changed source/README/receipt, checked protected content, separately reconciled
every R1–R8 outcome, then closed ten fixed findings and reported revision 16.
Project completion was accepted at **2:43:57 PM**; the Coordinator ended at
**2:44:02 PM**. Native goal was complete; dirty/queued flags false; both workers
settled. No premature closure/completion errors occurred in this trial.

The Coder ran the acceptance suite once after implementation: **11/11, exit 0**,
with command/output/exit saved in `verification.txt`. No additional regression
suite was needed for a newly discovered defect. Codex independently read the
final library, CLI, tests, README, receipt and per-requirement evidence, checked
actual saved execution/ordering/job/goal records and recomputed protected hashes:

| File | SHA-256 |
|---|---|
| CONTRACT.md | `eb38ce218a1be7a8a69d4ceef0f728b2eba16c91f0a1f2bf639915793783ed17` |
| acceptance.test.mjs | `4890f5b9de578c1f4573afa1560d212448a217eea29fae449ce7009dd9784daa` |

All three Coder jobs registered/settled; the Auditor had no execution jobs. The
fixture is not a Git repository; one Auditor and one Coordinator Git-status
probe returned that error. These are recorded, not hidden as a clean-error run.

## Observed overhead, with limits

| Saved-session measure | Earlier ledger trial | Tuned ledger trial |
|---|---:|---:|
| Auditor reports | 9 | 2 |
| Coordinator assistant steps/messages | 78 | 25 |
| Auditor assistant steps/messages | 67 | 19 |
| Coordinator wait calls | 37 | 10 |
| Auditor Coder-event reads | 21 | 1 |
| Input tokens | 2,040,311 | 413,284 |
| Output tokens | 93,819 | 40,557 |
| Cache-read tokens | 17,207,660 | 1,675,276 |

Input was about 80% lower, output 57% lower and cache-read 90% lower in these
observed runs. They are saved usage-field sums, not a bill or a general cost or
speed benchmark. The earlier run includes a startup clarification, seven extra
regression cases and redundant verification; the new prompt supplied the full
contract at first start and explicitly reused unaffected evidence. Code generation
and findings differed (11 versus 10). The reductions cannot all be attributed to
plugin code alone. Both retained the existing selected DeepSeek 1017 Low route.

The inventory retest exposed one remaining duplicate notification: a Coordinator
explicit review at 2:43:12 PM overlapped the pending automatic wake at 2:43:20 PM.
Those messages coalesced into the same final Auditor round, but the notification
duplication was real. The subsequent queue fix was checked separately.

## Focused queue check and state-save repair

Desktop project `35460ffe-50b8-4942-baac-7c82b0c26ef6` corrected one protected
marker fixture and recorded one actual `node acceptance.mjs` execution. The
Coder fix preceded its report; Coordinator explicitly requested review at
**2:47:13 PM Mountain**. Exactly one post-checkpoint Auditor message was delivered,
with no automatic duplicate. All three requirements verified, finding closed,
reviewed revision 5 current, native goal/project complete at **2:47:32 PM**.

A transient Windows `EPERM` during atomic project-state replacement made a
completed command's bookkeeping appear failed. The Coder inspected the result
and receipt rather than rerunning acceptance; saved calls show exactly one
acceptance invocation. Codex reproduced the failure with a temporary 150 ms
Windows read lock: save failed EPERM, then succeeded after unlock. The repair
retries only the atomic state commit for Windows EPERM/EACCES/EBUSY, up to six
50 ms waits. The same real-lock probe then passed. Permanent errors still surface;
no claim is made about unlimited locks or automatic command replay safety.

The Coordinator also attempted separate native goal creation/update despite the
instructions; guards rejected them, and the project-owned goal completed through
`triad_control`. Those two denials are retained in the receipt. No goal authority
was widened to accommodate the mistaken calls.

## Independent hash capability and authority correction

The focused check's final narrative falsely said neither worker had shell/hash
authority. The **Coder did have PowerShell**, used it, and computed SHA-256.
Only Auditor/Coordinator lacked shell. A textual reread also cannot prove exact
byte identity, including encoding or line endings. This overstatement is corrected
here rather than repeated as an acceptance fact.

Scott approved `triad_hash` for the Auditor. It computes SHA-256 and byte count
from a regular project file, uses realpath confinement, streams at most 128 MiB,
returns no contents and rejects observed size/time changes while hashing. It
grants no shell or write capability. Compare with an independently established
baseline; hashing alone does not prove behavior, approval, provenance or acceptance.

Focused tests cover the standard `abc` digest, line-ending changes, outside-path
and directory rejection, actual tool execution and role denial. A mistaken literal
for the initial `okay` test vector failed once; the test was corrected to the
standard `abc` vector and passed. The other five tests passed unchanged, including
the real Windows-lock check and coalescing/freshness/order guards.

Final live Desktop project `b6789843-8523-4f6d-ac07-a33e897cda54` actually executed
Auditor hashes for both protected files (3916 and 6310 bytes respectively), matching
the independent baseline above. Its outside-project hash probe was rejected. It
also hashed the other five fixture files. Codex compared all seven files with
the before-hash list: unchanged. Neither worker executed shell/tests/writes in
this read-only check. All three requirements verified, both worker reports,
reviewed revision 0 current, native goal/project complete at **2:55:53 PM Mountain**.
The Coordinator made two denied pre-membership probes (working_directory and
triad_status), then recovered via triad_start; Auditor's non-repository Git probe
was also denied. The requested outside-path error was expected. These are model
tool-selection errors, not successful capabilities or hidden acceptance passes.

Across the three tuning/queue/hash Desktop projects, saved usage sums were
708,560 input / 71,519 output / 3,083,924 cache-read tokens. These include the
targeted follow-ups and their recovery/probe errors; they are not billed costs.
All registered jobs settled and all three projects/owned goals ended complete.
Computer control ended after these checks; remaining publication used files/Git.

## Deployment, evidence and limits

Only idle Desktop was exited/reopened through its existing shortcut to load the
source changes. Existing model/default/profile settings and per-role DeepSeek
70% compaction policy were preserved. The production Web plugin remains staged
at its existing idle deployment boundary; this task did not restart or message
Web, Verdict or another project. No tag/release was requested.

Synthetic fixture/evidence: `stack/three-role/acceptance/inventory-ledger-tuned`.
Exact authored synthetic prompts and native journals are retained privately under
Scott's dated Codex task folder/Desktop home; no raw private conversation,
credentials or reasoning dump is published. Reading/recovery copies and the
manifest are synchronized with this source. Future use should start a fresh
Three-role Coordinator with an explicitly approved cwd and complete requirements.

This is a short seeded-defect acceptance exercise. It is not a blind bug-finding
rate, a long-duration endurance test, a compaction-threshold test, a power-loss
proof, or a guarantee that a future Auditor cannot make a wrong judgment.
