# Halo simplified autonomous coding evidence — 2026-08-30

**Result:** orchestration and mechanical gate path PASS; implementation-quality
review found one documentation defect outside the protected contract.

**DSH parent session:**
`session-halo-hardgate-simplified-20260830`

**Gate run:**
`C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T06-19-50-999Z-6bcf3a43`

**Target repository:** `C:\Users\scott\Desktop\Code\hardgate`

No Codex correction, repair prompt, or steering was sent after the task was
submitted. No commit, push, or GitHub issue change was made.

## What was proved

The 35B Halo Orchestrator inspected the repository, formed one bounded unit,
and called `subagent_coder` exactly once. The 30B Q4_K_M worker ran in the
gate-owned staging worktree. The parent remained idle during worker inference.
Both models stayed resident at 32,768 context with one parallel slot, and only
one generated at a time.

The worker received only the simplified DSH-native coding surface. Its actual
tool calls used `write`, `read`, and `pwsh`, all within the allowed set of
`read`, `write`, `edit`, `glob`, `grep`, and `pwsh`. It had no goal, plan,
subagent, research, or orchestration tools.

The parent tool transcript contains one `subagent_coder` call at sequence 782.
After the verdict, the only parent tool call was `read` at sequence 818. There
was no second worker call and no parent-side write, edit, or shell mutation
after the verdict.

HaloGate changed and promoted only:

`templates/read-nag-hook/README.md`

The protected test remained byte-identical. Its SHA-256 before and after was:

`275A4DAE671EF9786A56079157FFCF3C246DE9520660123B1B3A4B5B6E5D15F1`

The isolated stage was removed after successful promotion. The durable
`verdict.json` records one VERIFIED round, PASS, post-promotion PASS, and the
single promoted path.

## Test record

The protected contract was RED before the autonomous run:

- `16 passed, 1 failed` in 2.79 seconds.
- The only failure was the missing
  `templates/read-nag-hook/README.md` artifact.

The autonomous gate then recorded:

- isolated verifier: `17 passed` in 1.53 seconds;
- post-promotion verifier: `17 passed` in 3.87 seconds.

Independent verification after DSH stopped recorded:

- target contract: `17 passed` in 1.21 seconds;
- full Hardgate suite: `133 passed` in 4.23 seconds.

The gate ran from `2026-08-30T06:19:50.999Z` to
`2026-08-30T06:21:02.593Z`. The complete parent turn, including inspection,
delegation, verified promotion, read-only review, and report, took about three
minutes wall clock.

DSH's completed-session counters measured 57.7 decode tokens/second for the
35B parent (2,192 tokens over 37.983 seconds of decode) and 60.9 decode
tokens/second for the 30B worker (2,878 tokens over 47.286 seconds of decode).
These are real full-agent turns, not tiny direct-completion benchmarks.

## Important falsification finding

Green tests did not make the generated documentation fully correct. The new
README's `settings.json` example uses a top-level `PreToolUse` object with a
`script_path` field. Hardgate's existing canonical template uses the actual
nested Claude hook shape:

`hooks -> PreToolUse[] -> hooks[] -> {type, command}`

The protected test checked only for required strings, so it could not detect
that schema error. This is an honest boundary of the proof:

- the local planner/worker/gate system completed the contracted unit without
  steering and enforced its mechanical boundaries;
- the supplied contract was insufficient to certify the user-facing wiring
  example;
- Hardgate should not commit this issue as finished until a stronger protected
  documentation contract and a new bounded unit correct that example.

The authoritative GitHub issue body was also checked after the run:
`https://github.com/scottconverse/hardgate/issues/23`. Its core acceptance plan
is the five hook-behavior cases covered by the passing tests; it does not ask
for a README. The hook behavior therefore satisfies the issue's stated core
plan. The invalid README came from an additional local protected requirement,
and it still makes the present uncommitted change set unsuitable to commit as
written.

This finding does not invalidate the Halo orchestration proof. It demonstrates
why the gate receipt is authority only for the behavior encoded in the
protected verifier, and why the 35B's post-PASS read-only review still matters.

## Working-tree boundary

The Hardgate worktree remains intentionally uncommitted. At the end of the
proof it contained the pre-existing untracked hook implementation and
protected test plus the newly promoted README directory:

```text
?? templates/read-nag-hook/
?? tests/read_nag_hook_test.py
```

No unrelated tracked file changed.
