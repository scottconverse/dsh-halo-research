# Bounded three-role projects in DSH

One DSH plugin supplies three session presets, backed by DSH 0.2.1-rc.3's
existing agents, managed subagents, tool guards, presets and goal services.
There is no MCP server, second agent runtime or timer script.

* **Coordinator** owns the complete human-approved objective and requirement
  list, manages its two children, resolves disputes and decides completion.
  It has inspection and project-control tools, with no shell or product edits.
* **Coder** uses the packaged staff-engineer skill, ordinary native coding
  tools and proportionate checks. It acknowledges findings, reports fixes or
  disputes them with evidence. It cannot delegate or control other sessions.
* **Auditor/Nudger** reads confined project files, saved Coder events and fixed
  read-only Git views. It can send requirement-bound findings and independently
  close Coder-reported fixes. Shell, write, test and session-control tools are
  denied by runtime guards, rather than relying solely on its prompt.

The Coder's native shell has the Windows user's normal capabilities; its
project scope is an instruction contract, not an operating-system sandbox.
An Auditor checklist records judgments and evidence. It is not a mathematical
proof of correctness, and this plugin cannot prevent an incorrect review.

## Installation and use

Keep this folder at a stable absolute path. `Install-ThreeRole.ps1` previews a
single additive profile row. Supply the actual DSH home and profile name.
Only use `-Apply -IdleConfirmed` after verifying that host and its jobs are idle.
The installer backs up the profile privately under that DSH home, preserves
existing settings, never restarts DSH and does not replace a pre-existing row.
An active Web host must be left alone; configure/load it at an idle boundary.

After loading the plugin, create a fresh **Three-role coordinator** session.
Give it the approved absolute project directory, bounded objective, full
requirements and exact delivery authority. For example:

```text
Use triad_start in <absolute project directory>.
Objective: <bounded outcome and done conditions>.
Requirements: R1 <full acceptance>; R2 <full acceptance>; ...
Preserve project instructions and settings. Do not add scope.
Keep working through the existing native goal until the requirements have
individual evidence and findings are resolved. Report genuine external
blockers as incomplete. No publication unless expressly authorized here.
```

`triad_start` requires a direct human instruction in that root Coordinator
turn and refuses to overwrite an existing goal. Children inherit the current
Coordinator provider/model/effort; no model defaults are changed. The plugin
does not supply different output/context settings or make independent HTTP
model calls. Each role mounts Halo's existing text-only compaction service in
its own realm, with the exact DeepSeek 70% policy, 8K summary/headroom and 55%
tail retention. Existing model/output/context settings remain owned by DSH.
Other existing presets are unchanged. This folder depends on its sibling
`stock-dsh/compaction-text-only.mjs` and that deployment's installed packages.

The Coordinator uses compact `triad_status` and event waits. `view: contract`
returns the FULL agreed objective/requirements, `view: evidence` with an ID
returns that entire finding/requirement record, and `view: full` returns all
saved history. Nothing is deleted or summarized in durable evidence. Routine
status/wait calls omit accumulated narrative arrays and expose statuses/counts.

Auditor wakeups coalesce meaningful Coder activity over 15 seconds. Reads,
searches, skill loads, images, job listings and acknowledgment-only dispositions
do not invalidate a review. Writes, edits, shell execution, job output/cancellation
and fixed/disputed dispositions do; shell/job output is deliberately conservative
because it can contain mutations or new execution evidence. Repeated job-output
polls can therefore still create a pending revision. No model-based activity
classifier or extra review agent is used.

Open/acknowledged findings suppress automatic fix-review wakeups until the Coder
records dispositions. The Coder's checkpoint tool rejects unresolved disposition
handoffs; a narrative claim cannot substitute. The initial independent baseline
review still runs immediately. The Auditor closes only `fixed` findings after
checking their source and receipts, retains an event cursor, reuses unaffected
evidence and reconciles every requirement at final acceptance. Its report must
name the actual inspected `reviewedRevision`; newer changes remain dirty and
block completion. This is review ordering and freshness accounting, not proof
that a model actually read the code correctly. All original closure, role,
individual-requirement and settled-worker completion checks remain enforced.

An explicit Coordinator message to the Auditor claims the same review queue and
cancels the pending automatic wakeup, avoiding a second notification for that cut.
Failed mutation tools also mark a new revision: a thrown error can follow a partial
write. Windows state replacement retries only transient EPERM/EACCES/EBUSY sharing
errors, at most six 50 ms waits; it never replays the Coder's command. Permanent
save errors still surface, with the previous state file and pending temp retained.

The Auditor also has `triad_hash`, approved separately by Scott: confined,
read-only SHA-256 plus byte count for regular project files up to 128 MiB. It
streams the bytes, returns no contents, and rejects observed size/time changes
during hashing. Compare against an established baseline. This is independent
byte verification, not source review or behavioral proof. The Coder can hash
through its existing shell; the Auditor and Coordinator have no general shell.

A host-owned relay uses the exact
live parent to deliver a structured finding to its managed Coder; messages
remain agent-authored. This does not grant sibling messaging or human approval.
Unresolved exact duplicate findings are not resent. Unknown message admission
is exposed for reconciliation instead of being blindly retried.

## Goals, pause and recovery

The Coordinator owns one native persisted goal. Workers have no independent
goal loop. `triad_control pause` pauses that goal and requests cancellation of
both managed children under native ancestor authority. Inspect live states and
saved receipts before assuming quiescence: an external process may outlive a
cancelled turn. A pause is not rollback or project completion.

`triad_control resume` uses the saved project and child IDs, resumes the native
goal and sends a checkpoint to those same continuable children. Native DSH
handles cold continuation. Open the original Coordinator after a host restart;
do not create a replacement project merely because children are unloaded.
The private JSON state is under `<DSH_HOME>/storages/three-role/projects.json`.
Retain it together with native DSH session journals for recovery.

Pause/resume/complete act on the whole project: omit `role` and call once.
The optional resume message is broadcast to both workers. Send Coder-specific
or Auditor-specific direction with separate `action: message` calls instead.

Upgrade only at genuine all-host/job idle; never force a pause to manufacture
that condition. The source is shared by Web and Desktop. Preserve profiles,
project state and journals, and load changed modules through the normal supported
idle lifecycle. No automatic startup rearming is claimed.
The first failed development spawn is retained as a paused diagnostic trial;
it never had a successful child and must not be mistaken for resumable work.

Completion requires every agreed requirement marked verified, every finding
closed by the Auditor after a Coder fix, both reports, no pending review, and
no running worker. A blocked item is incomplete. Completion is a project state,
not implicit merge/tag/release approval. A generic product remains independent
of DSH unless its approved specification says otherwise.

## Verification

`node --test test.mjs` checks durable state, scope and role boundaries,
deduplication, closure/completion gates, confined reads and native adapter
contracts. Live Desktop acceptance and encountered defects are recorded in
`../../docs/HALO-THREE-ROLE-2026-10-28.md`. Mock tests and source inspection
are distinguished there from actual managed sessions and file/test receipts.
These checks are small product acceptance exercises, not benchmarks.

## October 29 recovery fixes

Status includes native activation, rounds used and the cap. Explicit project
resume can rearm an active/disarmed goal; status reads cannot, and used rounds
are retained. Native human pause/stop and cap enforcement remain authoritative.

After two automatic Coordinator rounds containing only inspection tools or no
tools, a turn-stopping guard waits for input, a worker result, a goal change or
disposal. It does not reject/consume an inbox message, admit another goal round,
infer completion from prose, or change the goal. A waiting turn appears running.
Unknown and action tools conservatively count as work. An exhausted goal is
never rearmed or given a larger budget by this guard.

Coder checkpoints are allowed with open findings, and ready work can be reviewed
despite unrelated unresolved findings. Findings still require the existing
Coder disposition and independent Auditor closure; completion guards are intact.
Shell/output tools invalidate review when project content changes, including
background changes observed on a later poll. Unknown or failed Git snapshots
conservatively invalidate review. Ignored generated output is not source change;
new checkpoint evidence independently requests review. Fixed Git views include
HEAD identity and committed diff without granting shell or arbitrary Git arguments.

Canonical source was deployed at verified idle on October 29. Profiles, project
state and journals were preserved; no host was restarted and the existing
512/512 goal remains disarmed. Loading and validating the new module in both
live hosts is still pending. The installed Cordis/DSH dispatcher fixture proves
event waiting and input/disposal responsiveness, not live Desktop acceptance.
