# Halo autonomy repair — 2026-08-30

## Outcome

The prompt-only to-do failure was not accepted as a model-quality verdict. It
exposed routing, authority, greenfield, shell-safety, and observability defects
in the installed Halo harness. This repair addresses those defects without
changing the accepted 64/64 memory split, 32K context, or `parallel=1` load
envelope.

## Preserved failure baseline

- DSH session: `session-4dd98f2e-106d-4f4c-9721-d6b4e5b1493d`
- Workspace: `C:\Users\scott\Documents\HaloTodoPromptOnly`
- Canonical evidence: `evidence\prompt-only-todo-20260830`
- Active event interval: 15:07:57–15:14:21 (6m24s), not 162 minutes
- Durable trajectory: 20 tool calls, 19 results, no `turn/end`
- Last durable call: unbounded `Get-ChildItem -Recurse`; no durable result
- Context before failure: 21,073 / 32,768 tokens, approximately 64%; no
  compaction event occurred
- DSH backend disappeared while the browser retained a stale Running state and
  retried its connection
- Docker CLI and Docker Desktop were absent, but the worker substituted a local
  Node path and overstated completion of the Docker requirement

The recursive command's output size makes it a plausible trigger, but no
Windows crash record proves the terminating cause. The old launcher discarded
DSH stdout, stderr, PID, and exit evidence, so the exact exit cause is
unrecoverable.

## Structural changes

1. Restored live routing to the accepted 35B planner and Q4_K_M worker. Q6 is
   retained only as an explicit candidate.
2. The strict Halo Build root is mechanically denied direct write/edit/shell
   operations and ungated implementation through generic, Codex, Claude Build,
   workflow, and Ralph children.
3. Added `halo_preflight`, a read-only tool that checks the actual Git, Node,
   package-manager, Python, Docker CLI, and Docker-daemon state before a brief
   is created.
4. Added non-Git greenfield support. The planner supplies acceptance files only
   under `.halo-acceptance`; the gate creates and commits them before the worker
   starts. They are protected from the worker, verified in independent
   worktrees, and never promoted into the user's project.
5. Added worker shell guards for unbounded recursive directory enumeration and
   foreground development servers.
6. Added `Run-HaloCockpit.ps1`. DSH now has preserved stdout/stderr logs,
   child/supervisor PID metadata, health time, exit code, and one bounded
   restart instead of an unsupervised hidden process.
7. The first real supervised launch exposed pnpm 11's interactive dependency
   build prompt. The launcher now supplies an explicit allow-list for the five
   build-script packages DSH requested and passes `--no-open`, leaving browser
   opening under `Launch-Halo.ps1`'s control.

## Test evidence

Baseline before repair:

```text
node --test
9 passed, 0 failed
```

The new tests were first observed RED for all three missing contracts:

```text
greenfield gate: failed because the workspace was not Git
launcher evidence: missing RedirectStandardOutput
planner policy: direct write was allowed
```

After implementation:

```text
node --test
13 passed, 0 failed
PowerShell parse: PASS
```

Live startup then passed: DSH returned HTTP 200, `workspace.list` and
`pluginInventory/list` returned `ok=true`, the v9 Halo Verified Coder entry was
present with no failed plugin entry, and the supervisor recorded its health
timestamp and exact command under `C:\Users\scott\.dsh\logs`.

The added tests prove successful greenfield promotion, refusal of a worker
that rewrites greenfield acceptance tests, root mutation/bypass denial, worker
shell guards, and launcher evidence wiring. They do not prove a long real-world
build; Scott requested short verification and real-use evaluation.

## Remaining evidence boundary

The exact original prompt should be rerun once through the repaired strict Halo
Build preset with a 15–20 minute cap. Because Docker is absent on this machine,
an honest result must now report the unmet Docker precondition rather than
silently changing the requested deployment contract. A full Docker acceptance
run requires Docker to be installed and its daemon running.
