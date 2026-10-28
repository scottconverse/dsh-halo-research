# Bounded Coder, Coordinator and Auditor/Nudger — October 28, 2026

## Delivered behavior and deployment boundary

`stack/three-role` implements a native DSH plugin and three presets. Desktop
ran four controlled projects through real managed children. The same plugin
loaded in a separate real Web host and exposed all three presets. The active
Verdict Web host/profile was not changed, restarted, cancelled or messaged.
Its canonical deployment row is staged for an idle installation. This is not
a claim that the active Verdict sessions have adopted this orchestration.

Scott authorized building, testing and tuning the three-role proposal while
preserving existing models, defaults and active Web work. This implementation
does not migrate or reparent the independently created Verdict coder/auditor.
It does not change Verdict or add requirements to that product.

## Implementation

The host reuses DSH 0.2.1-rc.3's tools, agents, managed subagents, presets and
goals services. A small provider descriptor uses the stock continuable
in-process managed-child protocol. No separate agent runtime, MCP server,
shell polling loop or model HTTP client was introduced.

The Coordinator owns one bounded objective, the full explicit requirement
list, one Coder and one Auditor. Starting requires direct human input in that
root session's current turn; an existing goal is not overwritten. It can
inspect, send direction, pause/resume its children and complete the project.
It has no product shell/write tools. The Coder has native coding/check tools
and the packaged staff-engineer v2.1 skill. The Auditor has bounded realpath-
confined reads, one-folder listing, fixed read-only Git views and saved Coder
event reads. Role guards deny the Auditor shell, edits, tests and controls;
the Coder cannot delegate or control other sessions. Ancestor Coordinator
guards do not impose the Coordinator role on its Coder child.

An Auditor finding must name an existing agreed requirement and concrete
evidence. The host relays it using the exact live Coordinator parent authority
to its actual managed Coder. It remains agent-authored, not human approval.
The Coder acknowledges, reports a fix or disputes it with counterevidence.
Only the Auditor can close a Coder-reported fix. Exact unresolved duplicate
findings are not resent. Unknown message admission is exposed rather than
blindly repeated. Disputes remain open for evidence-based Coordinator
direction; the Coordinator cannot simply mark them closed.

Coder activity and idle events schedule debounced, coalesced Auditor review.
`triad_wait` waits on project events, with a 20-second upper bound per call.
The Coordinator owns the native persisted goal; workers have no separate
goal loops. This is event-driven review, not a promised five-minute timer.

The JSON project record retains all requirement text/status/evidence,
findings, dispositions, reports, child IDs and project events. Native session
journals remain the execution receipts. Completion checks every requirement,
all findings, both reports, review flags and worker activity. A documented
blocker stays incomplete; green tests or a final message alone cannot pass
that state gate. This gate relies on the Auditor's evidence judgments and
does not prove those judgments are correct.

## Real Desktop acceptance

All times below are October 28 Mountain Daylight Time. Details are in the
sanitized metadata receipt at
`../stack/three-role/acceptance/desktop.json`; private journals remain in the
Desktop DSH home rather than in Git.

| Check | Actual evidence | Result |
|---|---|---|
| Corrective nudge end to end | Project `646cf51b-9c50-4eb9-a5d8-7de907cd32cf`, about 10:58–10:59 AM. Auditor read the deliberate subtraction defect and delivered A-001 before the Coder edited. Coder acknowledged, changed `a - b` to `a + b`, ran the existing assertions and saved a receipt. Auditor reread source/receipt, closed A-001 and individually verified R1–R3. | Complete, including native goal; no pending review. |
| Actual code/check receipt | Saved Coder tool results contain `ACCEPTANCE_PASS: three addition cases` and `EXIT=0`. Existing `acceptance.mjs` hash stayed `4d145f4c0041cef67a03ecbea8dfbb978edd6bf31c01768f56ce099866ebbce5`. | Real execution, not a mocked model or an Auditor-run test. |
| Goal pause, host restart and cold continuation | Project `a81a6f8d-ab24-488d-9635-c2f1d8da9f76`, about 11:00–11:05 AM. Original Coordinator and both child IDs survived an idle Desktop restart. Native goal pause/resume events persisted. Coder created `resume.txt` only after resume; Auditor independently verified it and preserved README. | Complete under the original identities. |
| Cancellation of running children | Project `b13a7929-5c44-4c30-864d-71ba4d598f4e`, about 11:09–11:10 AM. Both running child journals ended `aborted`, nested cancellation kind `parent`. Same children resumed, completed the read-only requirement and settled. | Complete; real cancellation, not merely an idle badge. |
| Auditor tool surface | Live Auditor reported no `pwsh` or file-write tool in its catalog, declined the misdirected Coder write instruction, and `forbidden.txt` remained absent. | Catalog isolation observed. No installed guard-denial receipt was fabricated for an uncallable tool. Runtime guard behavior is separately covered by adapter tests. |
| Final role load and native goal readback | Project `f4a76909-44d9-48ae-914a-9d00fa7d9637`, 11:28–11:29 AM, after the final idle Desktop reload. Fresh Coordinator, Coder and Auditor instantiated with their compaction services. Both workers read the neutral README. Two premature completion attempts were correctly rejected while workers were active. After settlement, native completion seq 84, `triad_status` seq 90 and `get_goal` seq 92 agreed on goal `goal-abb89af2-a631-4025-b435-76c3ba6b504a`, phase `complete`, revision 2; native readback was disarmed. | Complete; no API/service-load failure. README SHA-256 remained `b19ac2bb769f745591ada1bd592235f5e66b1e923e00866e7770a9b40b91171f`. Threshold crossing was not exercised. |

The private arithmetic fixture is under
`C:\Users\scott\Documents\Codex\2026-10-28\three-role-acceptance`.
The lifecycle fixture is its sibling `three-role-lifecycle`.
The final load fixture is `three-role-final-load`. The cancellation trial's
reused lifecycle README had content/no-write evidence, not a pretrial byte hash;
the final neutral fixture did have a before/after hash.

## Defects found during development and corrections

1. Native `tools.register` needs JSON Schema. Passing the stock helper's
   concise DSL directly produced unusable argument schemas. The adapter now
   builds explicit closed JSON Schemas and validates arguments before execution.
2. The Coder preset omitted the required
   `tool-fs-search.sampleOverCapGlobResults` field. The first worker spawn
   failed. It is now explicitly `false`; all three presets registered after
   an idle Desktop reload. The failed project `bc6e9d39-…` remains paused as
   diagnostic evidence, with no successful child or fixture write.
3. Native child interruption requires `{kind: 'ancestor', agent: parent}`.
   The initial bare-parent call paused the goal but failed to interrupt the
   children. Workers obeying a waiting instruction was not counted as proof
   of cancellation. After correction, the third project proved parent-aborted
   turns in both real child journals.
4. A `role` argument suggested that pause/resume applied to one worker. It
   actually applies to the project. The lifecycle Coordinator sent Coder text
   to both workers and attempted a redundant goal resume. The Auditor refused
   to write. The final API rejects `role` except on `action: message`, clearly
   labels resume text as a broadcast, and avoids resuming an already-active
   native goal. Worker-specific direction uses separate message calls.
5. Paused/non-running Coder writes and execution are now denied by the role
   guard. Completion requires a running project; completed projects cannot
   be paused or messaged. Fixed Git reads use a `.` pathspec to confine a
   nested project's view, and disable external diff/text conversion/hooks/
   fsmonitor execution.
6. The running-child trial's final model narrative incorrectly claimed its
   native goal had not completed after `get_goal` was denied by the role guard.
   The saved native `goal/change` event actually recorded completion. Safe
   `get_goal` readback is now allowed, `triad_status` includes the real parent
   goal metadata, and the persona explains that `triad_control` owns mutations.
   The final fresh-load trial checks both readbacks after completion.
7. Stock Web disables host-level compaction. Preset registration alone would
   not supply a compaction service to the new roles. Each role now mounts the
   existing `stock-dsh/compaction-text-only.mjs` service in its own realm, plus
   stock compact command and tool-result pruner. The exact DeepSeek 1017 policy
   is 70%, with 8,192-token summary/headroom and 55% tail retention; the generic
   new-role threshold is 80%. Existing presets and model definitions are
   unchanged. Offline assertions verify all three policy configurations and
   a fresh Desktop project instantiates all three roles. This does not claim
   a near-1M conversation actually crossed the automatic threshold.

The last live cancellation project used the corrected project-wide control
contract. Focused tests cover all these adapter/control regressions.

## Web verification and staged installation

A temporary private DSH home booted the installed stock Web packages with
this plugin overlay, `--host 127.0.0.1 --port 0 --no-open`. The real browser
menu exposed Three-role coordinator, coder and auditor. No API key was added,
no model selected and no Web inference was requested. The temporary host and
its tab were closed; its chosen port was verified closed. The active Verdict
host on 3080 and Mission Control on 3090 remained untouched. The Web screenshot
is `../stack/three-role/acceptance/web-presets.png`.

This proves actual Web loading/preset registration, not a second Web coding
exercise. Desktop supplied the managed-child/coding/lifecycle execution proof.
The live production Web profile is intentionally not installed while Verdict
is active. The additive row is staged in
`stack/stock-dsh/web-profile/cordis.patch.yml`. At an idle deployment boundary,
`stack/three-role/Install-ThreeRole.ps1` can preview/apply that row to the actual
Web home and then load through its normal idle restart. Its default is preview,
it requires an idle acknowledgment for application, checks saved running
three-role projects, backs up privately, and never restarts a host itself.

An exploratory CLI `web --help` probe unexpectedly attempted to boot the
default profile; the sandbox denied its root-file write. That command was not
repeated with broader access. The real Web check used an explicitly isolated
home and port instead.

## Preservation, tests and recovery

The pre-existing Desktop profile text, excluding trailing whitespace, matched
the before-task backup before the new additive plugin row. No model/provider,
effort, context, output, compaction, Wigolo, Reddit/Redlib or ordinary preset
setting was changed. The observed selected route remained DeepSeek 1017 Low.
Children's saved model identity is the same exact 1017 cloud ID. The plugin
passes the parent's current provider/model/effort to native activation and
does not override the existing Low/1M/64K/70% configuration. Launchers/icons
were not edited, so the three-shortcut maintenance rule was not invoked.

Five focused Node tests passed: durable restoration; scope/deduplication/
closure/completion gates; path confinement; real disposable profile-installer
preview/idle/preservation/idempotence; and role/relay/pause/resume adapter
contracts. `preset-sync.mjs check` passed with all four external Web preset
mirrors in sync. No benchmark or Verdict tests were launched by this task.

The first sandbox test attempt encountered EPERM on temporary atomic state
rename. The same tests passed in the authorized normal Windows context; no
product security check was removed. Automatic approval review also rejected
an initial collector that could copy conversation prompts into Git. It was
replaced with an exact-project allowlist that exports only metadata, hashes,
tool names, state transitions, counts and fixed PASS markers. No conversation,
reasoning, prompts, arbitrary tool output, credentials or private backups are
included in the public receipt. Exact trial prompts remain in private journals.

Use the original Coordinator session to resume a persisted project. Keep its
native journal and `<DSH_HOME>/storages/three-role/projects.json` together.
Pause and verify quiescence before upgrading this plugin. Cancellation does
not establish that an external job has terminated; reconcile its process and
receipt before retrying. The Coder shell is not an OS confinement mechanism.
The plugin supplies no human impersonation, automatic publication authority,
cross-provider policy or migration of unrelated sessions.

The reading/recovery copies in `C:\Users\scott\Desktop\Halo Stack Research`
include this record, current configuration, guide, source plugin and staged
deployment files with SHA-256 manifest entries. Private profile backups and
raw sessions stay outside the repository and reading recovery package.

## Available usage and delivery

The controlled Desktop sessions, including the failed trial, record 362,971
input tokens, 61,075 output tokens and 4,599,936 cache-read tokens across their
saved assistant-message usage entries. These are journal accounting totals,
not a provider bill or performance benchmark. No API price or cost was
invented. OpenAI Codex performed implementation/coordination; the authorized
Desktop trials used Scott's selected existing DeepSeek route. No Codex
subagents or new providers were introduced.

Source, staged configuration, skills, sanitized evidence and documentation
are delivered together on the existing research repository branch. No tag,
public product release or Verdict merge is part of this task. Active Web
deployment remains the explicit idle-boundary item described above.
