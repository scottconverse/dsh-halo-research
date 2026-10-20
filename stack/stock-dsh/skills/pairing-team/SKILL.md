---
name: pairing-team
description: Optional coordinator/coder workflow. Use only when the owner explicitly requests pairing or delegation; never infer invocation from a generic coding task.
---

# Coordinator / coder pairing

## Owner precedence and bounded use

This optional workflow is not the default for coding work. Current owner instructions and existing task authorization override older process requirements below. Do not spawn a child or reviewer unless explicitly authorized. Reuse passed evidence; do not repeat checks solely for another review stage. Apply only relevant checks and repository-required gates. Do not re-ask for an action already covered by the owner's authorization. Stop when the requested outcome and authorized delivery are complete.


This is the operating procedure for a two-agent coding pair. It uses DSH's
stock delegation, session-history, and control tools. It is not a new agent
runtime, a permission boundary, or a reason to add another team to a small
task. The user remains the authority for scope and release actions.

The live stock capability map is in
`references/STOCK-PLUGIN-INVENTORY.md`. Read it when a tool is missing or when
the deployment has changed. It records the distinction between host plugins,
the local agent-preset composition, and UI-only projections; an installed
package is not proof that a model-facing tool is visible in this session.

The pairing has two distinct jobs:

- **Coordinator (brain):** understand the requested outcome, inspect the
  current state, write the handoff, dispatch one coder, supervise by evidence,
  inspect the coder's trajectory when needed, audit the result, and report the
  truth.
- **Coder (worker):** implement the assigned change, run the named focused
  checks, make local corrections, and return a concise evidence report.

The coordinator must not quietly become the coder. The coder must not turn a
local assignment into a release or production operation.

## Hard boundaries

The current user request is the only authority for scope. Neither agent may
infer permission for an unrelated feature, cleanup, integration, access
change, deployment, publication, push, merge, tag, or release.

The coordinator may inspect files, repository state, session history, child
status, and produced artifacts. The coordinator does not edit the assigned
implementation while that coder owns the assignment. If the coder is stopped
or the pairing is explicitly abandoned, the coordinator may resume the work
only after reporting the handoff boundary and re-grounding the repository.

The coder may edit files and run the checks named in the handoff. A commit is
allowed only when the user explicitly authorized committing for this task.
Push, merge, tag, release, deployment, and production actions each need their
own explicit authorization. Never put credentials, tokens, or private
configuration values in a handoff, checkpoint, log, screenshot, or commit.

Use one coder at a time in a shared worktree. Use a separate worktree only
when isolation is actually required. Do not add parallel agents merely to
create activity or burn quota.

## Stock plugin preflight and enforcement map

Use the stock mechanisms before inventing a process workaround. The current
Halo composition provides the following relevant capabilities:

- `dsh-tool-skill` and `dsh-skill-filesystem` load this procedure from the
  mounted skill directory.
- `dsh-tool-subagent` with the continuable `spawn` provider creates the coder;
  `dsh-tool-subagent-control` and its `list-agents` companion provide
  `send_message`, `interrupt_agent`, and `list_agents`.
- `dsh-tool-session-query`, backed by `dsh-session-query-sqlite`, provides
  `session_search`, `session_event_search`, `session_trace`,
  `session_event_trace`, and `session_event_read`. These are the coordinator's
  durable trajectory and evidence path.
- `dsh-client-ui-trajectory` gives the operator the same event ledger and
  timing view in the browser. It is useful for human inspection but is not a
  substitute for the model-facing session-query tools.
- `dsh-session-persistence-jsonl` plus `dsh-session-checkpoint-policy` make
  requests and side-effecting tool calls durable before execution. The
  checkpoint policy recovers intent, not exactly-once external effects.
- `dsh-token-meter`, `dsh-compaction-basic`,
  `dsh-compaction-tool-result-pruner`, and image offload handle context
  pressure. `dsh-repeat-tool-reminder` nudges identical-call loops, and
  `dsh-tool-call-timeout-policy` supplies cooperative deadlines to tools that
  declare one.
- `dsh-tool-fs`, `dsh-tool-fs-search`, `dsh-tool-terminal`, and `dsh-tool-lsp`
  provide the evidence-gathering path for files, processes, and code
  navigation. `dsh-tool-todo` records the pairing stages; `dsh-tool-goal`
  records a genuinely long-running objective when one exists.
- `dsh-user-approval` and permission presets can fail closed for sensitive
  actions when the session policy requires it. The current local Halo profile
  is full-access, so these do not replace the explicit commit/release rules in
  this skill.

Before editing, perform a tool preflight. Confirm that the model-facing
catalog contains `subagent`, `list_agents`, `send_message`,
`interrupt_agent`, `session_trace`, `session_event_search`,
`session_event_trace`, and `session_event_read`. If any is unavailable,
report **pairing unavailable** with the exact missing tool or startup error and
do not edit the assigned implementation. Use `todo_write` to record the
pairing stages, with exactly one pairing item `in_progress`; the local preset
allows parallel todos for other workflows, but this is the pairing policy.

The stock plugins enforce durable logging, workspace authorization, child
lineage checks, cooperative tool cancellation, context recovery, and exact
event reads. They do not enforce an arbitrary five-minute heartbeat, decide
whether a trajectory contains a meaningful delta, or know whether the user
authorized a commit/push/merge/tag. Those remain explicit skill gates below.
Do not enable `workflow` or `ralph` as a replacement for this loop: use them
only when the user explicitly requests a workflow or fresh-agent iteration;
their parent-facing results intentionally hide intermediate child output.

## Before dispatch: ground and hand off

1. Read the applicable repository instructions and this skill.
2. Inspect the repository, branch, worktree, and current HEAD. Preserve
   existing user changes. Reproduce the defect or record the exact starting
   behavior; if it cannot be reproduced, say so rather than inventing a
   red-to-green claim.
3. Start from a fresh, bounded context. Do not send an agent a transcript dump
   or ask it to repair an ambiguous conversation. A short handoff beats stale
   history. A degraded coder is not repaired by more prompting: stop it,
   preserve the evidence, and dispatch a fresh context. Prefer compacting a
   healthy session when its history is still useful; a fresh context is for a
   degraded or ambiguous assignment.
4. Create one handoff using
   'references/HANDOFF.md'. Fill in the outcome, repository/worktree, branch
   and HEAD, in-scope files, observed behavior, acceptance evidence, focused
   checks, authorized actions, prohibited actions, progress limit, and return
   report. Re-check branch and HEAD immediately before dispatch because the
   repository may have changed while the handoff was being written.

The handoff is a scope statement, not a grant of authority. If the branch,
HEAD, repository instructions, or working tree differ from the handoff, the
coder reports the mismatch before editing.

## Dispatch

For a qualifying implementation task, pairing is not complete until the
coordinator makes a real 'subagent' (or explicitly requested
'subagent_fork') tool call and DSH returns a child identifier. Reading this
file, describing a handoff, or saying that a coder will be used does not count.
If the tool is missing, disabled, rejected, or returns no child identifier,
stop before editing and report 'pairing unavailable' with the exact error.

Use ordinary DSH continuable delegation by default. Use 'subagent_fork' only
when the child genuinely needs the parent's completed context; otherwise a
fresh child with the written handoff is easier to audit and less likely to
inherit stale assumptions. Use the owner's explicitly selected provider/model and effort. Do not restore historical brain/coder defaults, enable providers, or load competing models for this procedure. The adjacent plugin inventory is a dated snapshot, not a current capability guarantee.

The dispatch prompt must include the handoff, state that the coordinator's
instructions carry the owner's authority for this bounded assignment, and
include this line:

> Work only inside the handoff. Send a structured 'PAIRING_HEARTBEAT' to your
> direct parent at least every five minutes while active and at each milestone,
> then send a final 'PAIRING_RESULT'. Do not claim a check you did not run.

Capture the returned child id in the coordinator's working notes and use that
id for status and history inspection.

If the owner speaks directly to the child, that is allowed. The child must
still treat a coordinator message as carrying the same authority within the
handoff and must report any conflict between current owner direction and an
older transcript as a current-vs-historical mismatch.

## Child heartbeat and checkpoint protocol

The child sends a direct-parent message named 'PAIRING_HEARTBEAT' at least
every five minutes while active and whenever it crosses a meaningful
milestone: inspected, reproduced, first edit, focused check started,
red-to-green result, blocked, or ready-for-audit. A heartbeat is a control
checkpoint, not conversational narration. It must contain:

~~~text
PAIRING_HEARTBEAT
elapsed: <minutes>
state: <grounding|reproduced|implementing|checking|blocked|ready-for-audit>
delta: <one new observable fact since the previous checkpoint>
files: <changed paths, or none>
checks: <command/result, or not run>
blockers: <none or exact blocker>
next: <one next action>
~~~

At completion the child sends:

~~~text
PAIRING_RESULT
changed: <paths>
behavior: <what now works>
checks: <commands and exact results>
commit: <hash or not authorized/not made>
limits: <remaining uncertainty>
~~~

If a heartbeat cannot be sent because the parent is unavailable, the child
writes the same checkpoint into its session by continuing the turn and sends
it as soon as the parent accepts messages. A missing heartbeat is evidence of
missing observability; it is not evidence that work is progressing.

## Coordinator supervision and trajectory access

The coordinator must supervise by new evidence, not by a spinner. The stock
DSH deployment already exposes the model-facing 'list_agents',
'session_trace', 'session_event_search', 'session_event_trace', and
'session_event_read' tools.
Use them; do not assume that a UI trajectory tab is the only source of truth.

For each supervision checkpoint:

1. Call 'list_agents' and identify the direct child by its durable id and
   status. This is a snapshot, not proof of progress.
2. Call 'session_trace' with that child id to confirm the parent/child lineage
   and visible descendants.
3. Search the child with 'session_event_search', using the literal
   'PAIRING_HEARTBEAT' (and, when needed, a distinctive handoff term), then
   use 'session_event_read' on the returned sequence to inspect the exact
   surrounding events. This lets the coordinator read the child's durable
   trajectory, tool results, checks, and blockers while the child is running
   or after it becomes idle/ready.
4. Use 'session_event_trace' when compaction, replacement, or a rewritten
   event makes the evidence chain ambiguous. Read the cited source event
   before treating a retained summary or replacement as proof.
5. Compare the newest checkpoint with the prior one. A new status label alone
   is not progress; a changed file, new diagnostic, test result, or artifact
   is.

The parent may send one precise correction with 'send_message' when the child
has drifted, omitted a required check, or reached a blocked state. The
correction must name the observed evidence and the exact next action. Do not
send repeated “keep going” messages, and do not poll a command that is still
running. Use the trajectory to decide whether to wait, correct, or stop.

The child is expected to expose enough working detail for an audit: current
state, changed files, command in progress or completed, output summary,
blocker, and next action. Do not request secrets or dump entire source files
into heartbeat messages.

## Spin limits and intervention

Use a five-minute heartbeat cadence. Count only meaningful deltas:

- After two or three heartbeat intervals (about 10–15 minutes) with no new
  evidence, send one precise correction or request a bounded status checkpoint.
- After roughly three heartbeat intervals (about 15 minutes) without progress,
  treat the assignment as at its hard cap. A hard cap is normally about
  15–25 minutes depending on the named check, but it is never extended merely
  because the child says it is close. Stop or interrupt it and report the exact
  last evidence; do not let an indefinitely spinning child consume the session.
- If the correction produces no new evidence by the next checkpoint, stop.
  Two ineffective corrections are a hard stop.
- Intervene immediately for repeated tool errors, test theater (commands that
  do not exercise the change), scope drift, premature “done,” missing required
  artifacts, or runtime degradation such as a stalled model/process.

Runtime degradation means stop messaging entirely and report it: huge context
passes, one-token outputs, missing retries, silent self-completion, or a tool
that keeps spinning without a checkpoint. Never poll a still-running command.
Change the diagnostic approach or stop; more input makes a degraded runtime
worse.

An agent that is merely thinking, loading a model, or waiting on a tool has
not demonstrated progress. Distinguish a documented long operation from a
hang by the child's checkpoint and actual process/tool evidence. Do not
restart a command or create another child just to make the spinner change.

## The pairing loop

1. **Ground:** inspect the real repository and record the starting evidence.
2. **Handoff:** write the short, decision-complete assignment before dispatch.
3. **Dispatch:** make the real 'subagent' call and record the child id.
4. **Implement:** let the coder work only inside the handoff, with five-minute
   checkpoints and milestone heartbeats.
5. **Supervise:** read status and trajectory; apply the spin limits above.
6. **Audit:** after the child reports ready, inspect the actual diff and files
   on disk. Verify the claimed commands and results independently. Check that
   the fixture can expose the defect and that skipped, zero-test, setup-failed,
   or stale checks are not described as passing.
7. **Correct:** if the audit finds a bounded defect, send one concrete
   correction and re-audit the new evidence. Do not silently take over the
   implementation.
8. **Accept:** report what changed, what was actually verified, what remains
   uncertain, and whether a commit was authorized and made. A coder's
   completion message is not proof.

Before any authorized commit, the coder runs the handoff's complete focused
gate: the relevant test, typecheck, lint, and secret scan, plus any required
artifact check. A skipped, zero-test, setup-failed, or stale result is not
green. After a commit has been independently audited, any correction is a new
follow-up commit (never amend the audited hash).

## Evidence rules

- Prefer a failing-before / passing-after check for a reproducible defect.
- If no reproduction is possible, report attempts and available evidence; do
  not invent a successful red-to-green result.
- For browser or UI work, verify the user-visible landmark and the absence of
  the wrong surface, not only an HTTP status or URL.
- Verify every expected deliverable exists at its exact path.
- Treat skipped tests, zero tests, setup failures, and stale CI as unresolved.
- Lint is part of the pre-merge gate alongside tests, typecheck, and secret
  scanning. Do not call a red lint check acceptable because another check is
  green.
- Check release artifacts against their claims before calling them published.
- Audit concurrency code against its connection/resource model, not only the
  happy path. Verify that an artifact actually matches the claim made about it.
- Keep the independent audit bounded. Do not launch broad suites without a
  reason tied to the changed behavior.

Never use a fixture too small to expose the reported defect. A baseline that
passes before the fix is not a useful baseline. Re-run the important checks
independently instead of accepting pasted output.

## Compaction and handoff recovery

If either agent compacts its context, it must re-read the repository
instructions, this skill, the handoff, the latest 'PAIRING_HEARTBEAT', and the
current diff before acting. Do not rely on a remembered transcript. The
coordinator must re-check the child id/status and the latest session events
after compaction. A compacted context is not permission to widen scope or to
repeat already verified work.

The coordinator's owner-facing report must use plain English and label what is
verified live, what comes from a dated handoff or source inspection, and what
remains unverified. Do not narrate unchanged status on every heartbeat.

Production is a separate gate. Do not touch it unless the current request says
so explicitly. Do not push a credential-bearing branch or stage scratch
directories such as 'work\\'. Credential rotation follows an exposure
assessment, not teardown alone: if a secret was exposed, rotate it; if the
assessment proves it never left loopback or local logs, say why rotation is
unnecessary.

## How to invoke

Ask DSH to load **pairing-team** and give it a bounded task, for example:

> Use the pairing-team skill for this bounded bug fix. Ground the repository,
> write the handoff, dispatch one continuable coder, supervise it with
> 'list_agents' plus the session trajectory tools, enforce the five-minute
> heartbeat and spin limits, audit the diff independently, and report exact
> verification. Do not commit or publish unless I authorize those actions.

State separately if commits or publication are authorized. The skill does not
enable a disabled provider, change permissions, or grant release authority.
