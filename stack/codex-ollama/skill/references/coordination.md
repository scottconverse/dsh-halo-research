# Coordination and handoffs

## Minimal board

Reuse equivalent existing files. Create records only when useful:

- `board/INDEX.md`: phase, milestone, owners, statuses, blockers, next action. Lead-owned.
- `board/roles.md`: actual model/session assignments and verified execution capabilities.
- `board/tasks/YYYYMMDD-slug.md`: objective, source snapshot, file scope, interfaces, acceptance.
- `board/handoffs/from-to-slug.md`: delivered changes, checks, findings, next action.
- `board/objections.md`: unresolved review findings and resolutions.
- `board/lessons.md`: useful decisions and improvements to later tickets.

The board stores coordination; native tools perform execution. Markdown polling is not an agent launch. Workers own task-specific records; the lead owns shared index updates. With no writable repository, use the host's supported persistent artifact mechanism for a portable handoff and label work as unintegrated. Do not claim the repository was updated. Do not duplicate Git-backed code into unrelated storage merely to preserve coordination.

## Tickets and file ownership

Give each worker or helper a self-contained packet with:

1. One objective and observable definition of done.
2. Material design decisions and exact interfaces, reusing project designs.
3. Allowed files, dependencies, base revision, and relevant uncommitted source snapshot.
4. Accessible paths or required excerpts, including applicable repository instructions.
5. Focused verification commands and expected behavior.
6. Required return format and recipient.

Bound the task to fit the context. Send the necessary source and decisions rather than the full lead conversation by default. Short file-based briefs reduce repeated context replay. Checkpoint or split oversized work without dropping requirements. Workers may make routine choices within scope; escalate ambiguity affecting behavior, interfaces, architecture, or acceptance to the lead.

Use isolated worktrees or disjoint ownership for concurrent edits. Do not let workers overwrite each other or user changes. Reconcile patches against their base revisions and relevant uncommitted state before application; record the original submission before lead repairs obscure it.

## Handoff format

Use this for substantive transfers; keep routine status updates shorter:

```yaml
from_role: LEAD | REVIEWER | WORKER
from_model: actual ID or unknown
to_role: LEAD | REVIEWER | WORKER
status: OPEN | IN_PROGRESS | BLOCKED | READY_FOR_REVIEW | DONE | REJECTED
milestone: identifier
ticket: repository-relative path
session: exposed identifier or unknown
base_revision: commit plus relevant source snapshot
intent: one sentence
artifacts:
  - file or usable patch path
checks_run:
  - command, executor, execution platform, outcome, evidence path
checks_not_run:
  - required check, reason, next executor
risks:
  - remaining issue or none identified
ask: next action
```

Workers submit READY_FOR_REVIEW; only the lead marks DONE. Reviewers inspect requirements, relevant source, the actual diff, and evidence in a fresh context when useful. Return concrete defects and necessary corrections; avoid unrelated stylistic churn. Label checks as personally executed or worker-reported. A missing independent-review requirement remains outstanding.

## Proof and lessons

For substantial milestones, keep concise proof under `docs/proofs/<milestone>.md` or an existing equivalent with accepted revision, implementer/reviewer, checks and outcomes, and unresolved limitations. Link existing evidence instead of duplicating it. Capture only lessons that change later work. Keep routing targets separate from actual usage and outcomes; a target is not evidence of performance or savings.

## Desktop and Work handoffs

Include repository/source identity, branch and revision, uncommitted patches or actual changed files, milestone state, completed checks with execution platform, open findings, actual model assignments, and next action. Paths on another machine are not transferable artifacts. Exclude secrets.

The receiver must inspect its checkout, applicable instructions, and capabilities, then reconcile source differences before editing. Preserve a consistent base for comparisons. Do not claim local/remote synchronization without an observed successful operation.
