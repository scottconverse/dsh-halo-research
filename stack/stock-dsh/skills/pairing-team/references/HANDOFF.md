# Coordinator-to-coder handoff

Optional template for explicitly authorized delegation only. Current owner limits and existing action authorization take precedence; no automatic extra reviewers, repeated checks, or repeated permission requests.

Create one short handoff per assignment. Fill only relevant fields; use exact paths and observed evidence. Do not put secrets in this file.

## Assignment

- **Outcome requested:**
- **Repository/worktree:**
- **Branch and starting HEAD:** Re-check before editing; this snapshot may have changed.
- **Files or subsystem in scope:**
- **Observed defect / starting behavior:** Include exact reproduction steps or say not reproduced.
- **Acceptance evidence:** Describe the behavior or artifact that proves completion.
- **Required focused checks:** Include the exact command or explain why no automated check applies.
- **Work order and commit gate:** State the order of edits and checks; every authorized commit waits for green tests, typecheck, lint, secret scan, and artifact checks that apply.
- **Honest no-reproduction path:** If the failure cannot be reproduced, report attempts and evidence; do not guess a fix or claim red-to-green.
- **User-authorized actions:** State the scope granted by the current request.
- **Environment constraints:** Record gotchas such as provider/model restrictions, local-LLM restrictions when applicable, service placement, and required working directory.
- **Stock tool preflight:** Confirm `subagent`, `list_agents`, `send_message`, `interrupt_agent`, `session_trace`, `session_event_search`, `session_event_trace`, and `session_event_read` are visible before editing. If one is missing, report `pairing unavailable` with the exact error.
- **Do not:** List specific out-of-scope files, production systems, external actions, release steps, secrets, and scratch paths such as `work\\`.
- **Progress limit:** Report a new observable delta; stop after two precise corrections without behavior change or when the runtime is degraded.
- **Return report:** Changed paths, concise diff summary, checks actually run and results, known limits, and exact artifact paths.

## Checkpoint contract

The coder must send `PAIRING_HEARTBEAT` to the direct parent at least every
five minutes and at each milestone. Each checkpoint names the elapsed time,
state, one new observable delta, changed files, checks and results, blockers,
and the next action. A completion message is named `PAIRING_RESULT` and lists
the changed paths, resulting behavior, exact checks, commit status, and
remaining limits.

The coordinator supervises with `list_agents`, then reads the child's durable
trajectory with `session_trace`, `session_event_search` for
`PAIRING_HEARTBEAT`, and `session_event_read` around the returned sequence.
Use `session_event_trace` when compaction or event replacement makes the
source of a checkpoint ambiguous. Use `todo_write` for the pairing stages,
with one pairing item in progress.
The status spinner alone is not evidence. After 10–15 minutes without a new
delta, send one precise correction; after about 15 minutes, or two ineffective
corrections, stop and report the last evidence.

If context compacts, re-read this handoff, the pairing skill, the latest
checkpoint, and the current diff before continuing. Compaction never widens
scope or turns an unrun check into a passing check.

The handoff communicates task scope; it does not grant authority beyond the user's request. If branch, HEAD, repository state, or instructions differ, report the mismatch before proceeding.
