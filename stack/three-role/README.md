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

The Coordinator uses `triad_status` and event waits. Auditor reviews are
debounced and coalesced after Coder activity. A host-owned relay uses the exact
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

Do not upgrade this plugin while its projects are running. Pause, verify jobs,
then reload only the idle host. No automatic startup rearming is claimed.
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
