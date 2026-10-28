# Universal goal availability — October 28, 2026

Scott requested goal setting in every Web and Desktop session, regardless of preset, including already-open sessions.

## Cause

The stock browser composition disables the host `command-goal` and `tool-goal` rows, expecting presets to register those surfaces in their own scopes. Halo fast-first did not include them. The full local/local-codex presets did; local-lean also omitted them. Installed packages and an enabled host goal service therefore did not establish that a particular agent could invoke the command or tools. `/goal` previously arrived in the Verdict sessions as ordinary conversational input.

Halo fast-first is a custom reduced coding preset intended to reduce the model-facing tool catalog and prompt overhead. It is not a model or reasoning-effort setting. Relative to the full local preset, it also omits structured plan mode, todo tracking, presentation tools, persistent terminal tools, subagent fork, workflow tools and Ralph. These omissions were inspected as configuration differences, not newly declared product defects. Disabled external-provider subagent rows in the full preset are not active capabilities. No additional capability was enabled by this repair.

## Repair

Both installed host profile patches and their canonical source copies now override the existing root rows:

```yaml
- id: command-goal
  disabled: false
- id: tool-goal
  disabled: false
```

Shared registration makes the command and three goal tools available independently of the preset, including existing agents that retain an older preset revision. Existing preset-local registrations remain intact. The goal service and round driver retain their existing per-session state and authority controls. Availability does not create or arm a goal in every session.

Changed source files are `stack/stock-dsh/web-profile/cordis.patch.yml` and `stack/desktop-tuning/cordis.patch.yml`. Installed equivalents are the Web profile under `C:\Users\scott\.dsh-stock` and the Desktop profile under `C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval\home`. The existing contents were preserved; only the two enabled-row overrides and explanatory comments were appended. Private backups and exact readback evidence remain outside Git under the dated Codex incident folder.

Web applied the supported live profile reconciliation. Its active Verdict coding session was not restarted, cancelled or messaged. Desktop was initially closed and was opened through its existing shortcut for verification. No launcher, icon, model, provider, effort, output/context budget, compaction setting or other plugin setting was edited.

## Observed verification

- The existing Web auditor session offered **Goal — Set or view the goal for a long-running task** in native command suggestions.
- Bare `/goal` returned the native command result **No goal is currently set**, without a model turn.
- The previously authorized auditor objective was created through that native command. DSH returned **Status: active**, **Activation: armed**, **Rounds: 0/256**, and displayed **Tools updated: 3 added**.
- Saved session event 536 records creation of `goal-98069d0e-5b41-47a5-bff1-1242bb68b4ca`. Automatic user-message events carry `source.kind: goal` and that same ID. By event 961, round 8 had started without another user prompt. This proves automatic continuation across turns, rather than merely an agent claiming it can continue.
- Desktop's existing Halo local session also offered the native Goal command. Bare `/goal` returned **No goal is currently set**. No Desktop goal was created.
- All four changed profile files retain their original content before the appended override. This verifies preservation of model/default settings in those files.

During Desktop UI verification, an autocomplete selection accidentally submitted the unrelated `diagnose-windows-sandbox-acl` skill. That model turn loaded the skill and asked for a failing path. Its question was cancelled and the turn stopped. Its recorded final response says the diagnostic script was not run and no permission changes occurred. This was an operator error, not part of the verification plan; no claim of zero inference is made for this task. No benchmark or Verdict acceptance test was started by this repair.

## Limits and delivery

The goal driver continues on idle round boundaries; it does not promise a five-minute schedule. Its existing 256-round cap, explicit pause/clear controls, and complete/blocked stopping conditions remain. Automatic resumption after a future application restart was not separately exercised. One live Web and one live Desktop session were inspected, with universal availability established by the shared registration rather than a new model turn in every preset.

This repair is installed and recorded in canonical deployment source. It is not tagged or published as a release. Goal activation is not proof of Verdict completion; the auditor must still reconcile the agreed requirements against code and evidence.

## Operating procedure for future sessions

1. Enter bare `/goal` in the intended session. Read the native result. A model saying an objective is in force is not a goal-service readback.
2. Set the objective through `/goal` followed by the agreed done conditions. Preserve scope and acceptance; optional work remains optional.
3. Confirm the intended objective, active status, armed activation, round count and cap. Availability alone is not activation.
4. Verify a subsequent round starts without a new human message. Saved goal-source events must refer to the same goal ID.
5. Use the native Goal controls to pause, resume or clear when needed and read back the resulting state. Do not guess unsupported command syntax.
6. Reconcile every agreed requirement against code, applicable checks, installed behavior and delivery. A completed goal, green CI or a coder summary is not proof of product completion.

A read-only auditor should maintain one concise state record with the full agreed checklist, evidence, unresolved items, candidate identity and session cursor. Preserve its prohibition on coder messages, product edits, tests, builds, model calls, restarts, cancellation, delegation and scope expansion. This repair did not make the auditor a coordinator or a nudger. Automatic rounds continue at idle boundaries rather than on a fixed polling interval.

## Unexpected VS Code window: ownership established

At 10:12:24 AM Mountain on October 28, the Verdict coder opened VS Code for installed-editor acceptance. Coder event 10039 describes Launch VS Code Simple Browser with CDP. The observed process command matched: a new window with temporary user-data and extension directories, a temporary development extension, remote debugging port 9222 and a temporary acceptance project. The extension opened Simple Browser against a temporary Verdict server.

This action was separate from the goal repair. The coder and window were left running. Opening the window establishes ownership, not successful editor acceptance. Attribute unexpected windows using the actual process command and saved launch receipt before acting.

## Delivery and accounting

Public documentation records the configuration, cause, native readbacks, automatic rounds, preservation boundaries, operating procedure and limits. Private backups and raw conversations are excluded. No new benchmark or Verdict acceptance suite was run for this documentation delivery. The accidental Desktop diagnostic turn is disclosed above; aggregate token usage and cost were not independently measured. Source delivery uses the existing master branch; no tag or release is requested.
