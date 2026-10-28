# Desktop three-role inventory ledger trial — October 28, 2026

## Result

PASS for this bounded trial. The native Coordinator reached project complete
only after all eight requirements were verified, all eleven source-grounded
findings were closed and both workers settled. Actual get_goal readback was
complete/disarmed, goal-33739a13-0d89-44d7-b0c3-71c7ae9238d0. Verdict and the
production Web host were not messaged, edited, restarted or tested.

Project 3b2e3cd4-10d1-464b-9871-e1419bd235f3. Desktop sessions:
- Coordinator session-26af927e-19f7-4156-9fb4-459a77480ddb
- Coder session-33228c93-1aa9-4374-9d01-d8a18f1fc000
- Auditor session-5348a9d6-0b79-431e-aa2f-700ea4f99f63

The task was a dependency-free Node 24 inventory ledger library and CLI, with
strict validation, immutable atomic batches, durable idempotency, deterministic
reporting, cross-process JSON persistence, structured CLI errors and atomic
file replacement. A working solution grew from the incomplete starter to about
140 library lines and 125 CLI lines, plus seven focused regression cases and
documentation. All task files remain in
`C:\Users\scott\Documents\Codex\2026-10-28\three-role-ledger-trial`.

## Trial design and actual sequence

This was a controlled seeded-defect exercise. It establishes that the Auditor
caught these real implementation defects, not a general bug-detection rate or
a blind sample of naturally occurring Coder mistakes. Some findings overlap;
eleven finding records are not eleven independent defect classes. A-011 covered
missing verification/documentation, rather than an algorithm defect.

Before dispatch, the unchanged acceptance suite ran against the starter:
11 tests, 2 passed, 9 failed, exit 1. Baseline output is retained privately in
`three-role-ledger-baseline.txt`. There were approximately 30 GiB free RAM and
584 GiB free disk. The existing selected DeepSeek1017 Low route was preserved.

An initial prompt asked the Coordinator to read CONTRACT.md before starting.
Its project-confined read tools require project membership, so that instruction
could not work. It made unsuccessful access/initialization probes and stopped
before a valid goal existed. Codex supplied the full contract inline once.
That was a startup correction, not autonomous recovery; it must not be hidden
in a zero-intervention claim. The normal documented startup format already
expects the complete requirement text. No plugin code was changed this trial.

After the corrected start, the Coordinator retained R1–R8 in full (whitespace
and typographic range dashes normalized, no acceptance removed). Its Coder
waited for baseline review. At 2:25:54 PM Mountain the Auditor had recorded its
initial findings/report. The Coordinator sent GO BASELINE REVIEW COMPLETE at
2:25:58 PM. First Coder shell call was at 2:26:00 PM, and first source write
at 2:26:45 PM. Thus the material findings preceded edits and checks.

The Auditor reported strict-field/state validation failures (A-001/A-002),
caller mutation and partial batch acceptance (A-003), unsafe arithmetic
(A-004), key-order-sensitive idempotency (A-005), trusted malformed history
(A-006), unsorted reporting (A-007), invalid CLI arity/commands and unstructured
errors (A-008/A-009), direct destructive persistence (A-010), and absent
acceptance/documentation receipts (A-011).

The Coder repaired source and added focused regression cases. The Auditor
reread code and actual tool receipts; it never ran shell commands or tests.
It initially attempted closure before the Coder recorded fixed dispositions.
The plugin rejected those closures. The Coordinator sent a targeted reminder
to the Coder at 2:27:52 PM to record its finding dispositions. Coder fixed
records then enabled independent Auditor closure. Codex did not steer either
worker during implementation or acceptance reconciliation after startup.

The Coordinator's first final-completion attempt was rejected while review
was active. It waited and successfully completed at 2:28:46 PM, then read back
the real goal. Its final turn ended at 2:28:53 PM. No partial delivery was
accepted, and no additional human GO was needed after baseline release.

## Requirement-by-requirement reconciliation

Codex read the final library and CLI end to end, the acceptance and regression
tests, documentation and verification receipt, each Auditor evidence record,
finding histories, actual saved tool-result counts, goal events and job states.
These observations, rather than worker final messages, support this result.

| Requirement | Independent reconciliation | Result |
|---|---|---|
| R1 validation/API | Exact own-key validation, ASCII patterns, plain-object checks, safe positive quantity and version/dense-array validation feed both public entrypoints. Strict scalar/history acceptance cases passed. | Met |
| R2 atomic batches | Prior state and incoming events are copied into detached records; only detached collections are updated; every balance transition checks safe integer/nonnegative. Existing mutation, rollback, exact depletion and overflow cases passed. | Met |
| R3 idempotency/history | ID map compares payload fields, not JSON key order; incoming equal replay is skipped and conflicts throw; stored duplicate IDs and historical overdrafts are rejected before apply/report. Cross-process replay passed. | Met |
| R4 deterministic report | Validated touched-SKU set, ASCII comparator, zero retention, validated unique event count; no timestamps or writes. Sorting/immutability acceptance and additional allowed-character ordering passed. | Met |
| R5 CLI | Exact command/arity dispatch, direct process arguments, JSON parse/read handling, single structured stderr catch, no stdout on tested errors, nonzero exit. Actual subprocess tests covered spaced paths, missing state, replay, usage and corrupt input. | Met |
| R6 safe persistence | Source path is exclusive wx-created random sibling temp → write/close → rename; failure cleanup targets only the created temp. Existing-file bytes survived invalid apply and corrupt-state rejection, with no leftover temp. No injected I/O failure or power-loss claim is made. | Met within the explicit source-inspection/preservation acceptance |
| R7 immutable acceptance/evidence | Both protected hashes match; verification.txt records actual command, node version, exit 0 and unedited 11-test output. Native tool results separately show 7 regression and 18 combined tests passing. README documents behavior and limits. | Met |
| R8 independent audit/control | Findings preceded editing; full per-item evidence, Coder fixed records then Auditor closures; no Auditor write/shell calls; Coordinator enforced final settlement and native goal readback. All three session journals ended; no pending review. | Met |

Protected SHA-256 values, checked by Codex after completion:
- CONTRACT.md: EB38CE218A1BE7A8A69D4CEEF0F728B2EBA16C91F0A1F2BF639915793783ED17
- acceptance.test.mjs: 4890F5B9DE578C1F4573AFA1560D212448A217EEA29FAE449CE7009DD9784DAA

Saved Coder tool results: seq137 11/11 acceptance; seq149 7/7 regression;
seq184 18/18 combined; seq249 refreshed 11/11 acceptance receipt. All have
zero failures. The last source change removed an unused constant; the final
acceptance refresh followed it. Unchanged regression behavior was not rerun
again by Codex. Seven Coder jobs were registered and all seven settled.
Coordinator and Auditor registered no jobs. No owned job remains active.

## Limits and tuning observations

The enforced finding/completion boundaries worked even when models attempted
the wrong ordering. This is useful installed behavior, not proof that every
future Auditor judgment will be correct. This roughly four-minute project did
not exercise an unattended hours-long run, context-pressure compaction, host
restart recovery again, multiwriter locking, power-loss durability or a public
release. Those are not newly invented acceptance blockers for this trial.

The team was chatty: nine Auditor report records, repeated inspection/wait
cycles and extra failed Git views against a deliberately non-Git fixture.
Journal accounting totals were 2,040,311 input tokens, 93,819 output tokens
and 17,207,660 cache-read tokens across these three sessions. These are sums of
saved usage fields, not a provider bill or a benchmark. Independent review and
one reminder helped, but this trial does not establish cost efficiency. A
future approved tuning pass could reduce redundant review wakeups and status
payloads. No optional optimization was silently added to this task.

Exact prompts and raw journals remain private. A separate exact-project
metadata receipt contains only IDs, counts, state transitions, hashes and
tool names; it exports no conversation, reasoning, arguments or credentials.
The synthetic final fixture is preserved with this report for reproducibility.
