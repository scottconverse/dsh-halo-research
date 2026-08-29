# Halo Stage 3 DSH-Native Verification Gate Design v1.1

Date: 2026-08-27

SCOPE: Halo stack configuration tasks only.

This version supersedes v1.0 where the documents conflict. It incorporates
the joint Codex/Claude review and the source finding in
`STAGE-3-HANDOFF-TO-CODEX-2026-08-27.md`.

## Decisive correction

No DSH core fork is required. The gate creates a synthetic parent through
`ctx.agents.create()` whose `meta.cwd` is the detached staging worktree and
whose session carries `sandbox/mode = workspace-write`. It then calls the
existing `ctx.subagents.start('spawn', { parent: stagingParent, ... })` seam.
DSH's existing child creation copies the supplied parent's workspace and
sandbox policy. The normal cockpit remains `danger-full-access`.

The runtime proof is two-part: the zero-dependency gate engine is executable
without model inference; the final synthetic-parent/child proof requires the
real Coder path and therefore must run only in a coordinated memory window.
Source inspection is never relabeled as runtime proof.

## Mechanical pipeline

1. Validate repository-relative editable and protected paths; require at
   least one protected test/verifier path and forbid overlap.
2. Snapshot the live editable paths for compare-and-swap promotion.
3. Create a detached staging Git worktree and overlay the current tracked and
   untracked working state.
4. Create the synthetic `workspace-write` parent and run the tuned Coder from
   it. The child receives a self-contained brief and exact path boundaries.
5. Hash the staged tree. Reject any protected or out-of-scope change.
6. Create a separate verification worktree, apply only accepted editable
   changes, restore protected files from the live pre-run baseline, and run
   the verifier without a shell. Exit failure, timeout, and launch crash are
   all failures.
7. Permit one repair brief carrying preserved failure output; two worker
   rounds is the hard maximum.
8. Before promotion, compare the live editable snapshot with the pre-run
   snapshot. Any concurrent edit refuses promotion.
9. Back up changed live files, promote only the accepted paths, and run the
   verifier again in the real workspace. On failure, restore the backup and
   emit `PROMOTION_FAILED_ROLLED_BACK`.
10. Write the complete structured verdict outside the repository. After a
    gated unit is armed, deny goal completion until its latest status is
    `PASS`.

## Fail-closed states

`FAILED`, `GATE_CRASHED`, `VERIFIER_FAILED`, `VERIFIER_TIMEOUT`,
`VERIFIER_CRASHED`, `PROMOTION_REFUSED_CONCURRENT_CHANGE`, and
`PROMOTION_FAILED_ROLLED_BACK` never authorize completion. No model assertion
can replace the verifier exit status.

## Phase-1 acceptance boundary

Required before installation: module syntax, tool mount through a real DSH
session, wrapper-level synthetic-parent wiring, honest green/promotion,
protected-test rewrite rejection, verifier timeout, verifier crash,
stdout/stderr capture, and path traversal rejection.
The real local-model canary proves the final synthetic-parent inheritance and
is scheduled only after the competing TownLight workload releases memory.

The broader v1.0 mutation matrix remains useful follow-up hardening, but it is
not allowed to hold the usable Phase-1 gate hostage for days.
