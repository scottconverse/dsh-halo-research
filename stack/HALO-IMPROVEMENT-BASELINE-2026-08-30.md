# Halo improvement baseline — 2026-08-30

## Decision

Keep the accepted local daily pair:

- planner/reviewer: `halo/qwen3.6-35b-a3b`, Q4_K_M, 32K, one slot;
- verified worker: `halo/qwen3-coder-30b-a3b-q4km`, Q4_K_M, 32K, one slot.

The pair remains the operational baseline. The improvement promoted in this
unit is a stronger mechanical verification contract for documentation-shaped
repository work. Neither optional model audition produced evidence sufficient
to replace the daily pair.

## Hardgate contract repair

Repository: `C:\Users\scott\Desktop\Code\hardgate`

The existing protected test checked for hook-related strings but did not prove
the nested Claude hook schema. A semantic protected test was added first.

Genuine RED:

```text
1 failed, 17 passed in 1.32s
```

The failure distinguished the invalid `{PreToolUse}` top-level example from
the required `hooks -> PreToolUse[] -> hooks[] -> command hook` structure.

Autonomous run:

- parent session: `session-halo-hardgate-schema-repair-20260830`;
- gate run:
  `C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T06-42-07-297Z-0ef6fe0d`;
- gate parent: `halo-gate-8b587258-105a-4067-8a4d-5c27b14900da`;
- worker: `eb420172-f07f-494d-b5c9-86aea7f43291`;
- one `subagent_coder` call;
- verdict: PASS, round 1, VERIFIED;
- promoted path: `templates/read-nag-hook/README.md` only.

The gate receipt ran from `06:42:07.298Z` to `06:44:20.199Z`, or 132.901
seconds end to end for worker execution, isolated verification, promotion, and
post-promotion verification. This is the reusable real-repository baseline;
the tiny recovery smokes later in this document are health checks, not a
substitute benchmark.

Verification:

```text
isolated gate verification:      18 passed in 1.53s
post-promotion verification:     18 passed in 1.43s
independent target verification: 18 passed in 1.80s
complete Hardgate suite:         134 passed in 5.55s
```

Protected-test SHA-256 after the run:

```text
1449BD8BBE6A13624FBC497D4695ADA2C100CCB10E0B1345E25C6FDCBA440542
```

No Hardgate commit or push was made.

## Candidate auditions

### GPT-OSS 20B reviewer

Both the raw `openai/gpt-oss-20b` route and a temporary 32K/one-slot Halo alias
failed to establish stable inference. LM Studio recorded `Engine protocol
startup was aborted` and `Model is unloaded`. The temporary Halo alias and DSH
catalog entry were removed. This is an operational rejection only; the model
never produced a valid review, so no quality comparison is claimed.

### Qwen3-Coder-Next 80B worker

At the time of this audition the raw model remained on disk as
`qwen/qwen3-coder-next` (Q4_K_M, approximately 48.5 GB). A temporary
32K/one-slot Halo alias stayed at the beginning of its load long enough to wedge
the LM Studio service. No inference was attempted. The temporary Halo alias was
removed. **Later on 2026-08-30**, Scott approved the curated-library cleanup and
the raw GGUF was also removed; restoration requires a new download. This is an
operational rejection, not a quality result.

## DSH command-path finding

Sending `/permission read-only` through the programmatic `session.prompt` API
did not execute a DSH slash command; it was delivered to the model as ordinary
text and the session retained `danger-full-access`. Therefore future automated
auditions must not claim a permission change unless the actual DSH command path
or resulting session state is independently verified.

## Runtime recovery boundary

The 80B attempt required restarting LM Studio. During recovery, `lms ps`
reported a model `idle` before the backend health handshake was complete. A
request issued during that window timed out and the brain unloaded. The safe
load rule is now: serialize loads and do not issue inference until the `lms
load` command itself has completed successfully.

Final serialized recovery evidence:

- 35B cold load completed successfully in 8m 29.98s;
- brain returned exactly `HALO-RESTORE-OK` in 2.50s;
- 30B load behind the resident brain completed successfully in 2m 17.72s;
- coder returned exactly `CODER-RESTORE-OK` in 1.34s;
- `lms ps --json` showed both models idle at 32,768 context and one parallel
  slot;
- LM Studio and DSH both returned HTTP 200;
- live and canonical DSH defaults both named `halo/qwen3.6-35b-a3b`.

The unusually slow 35B cold load is a post-restart operational observation,
not an inference-speed regression. Once loaded, both exact-response smokes were
fast. The models remain resident to avoid paying that cold-load cost in normal
planner/worker use.

## Scope

This was intentionally a short functionality and evidence pass, not a soak or
benchmark campaign. Real repository use remains the primary evaluation. The
TDD/QA contract directly shaped the protected RED-before-repair sequence,
semantic acceptance test, narrow edit scope, and independent GREEN checks.
