# Halo Verified Coder

SCOPE: Halo stack configuration tasks only.

This zero-dependency DSH plugin provides `subagent_coder` as an optional
verified implementation workflow. It stages the worker in a detached Git
worktree, inherits the caller's explicit permission scope and native tool
catalog, rejects protected or out-of-scope staged changes, verifies in an
independent worktree, checks
for concurrent live edits before promotion, and rolls promotion back if the
post-promotion verifier fails.

The plugin records every result under `%LOCALAPPDATA%\HaloGate\runs`. A failed,
timed-out, or crashed verifier is never a pass. A verdict does not disable
the parent's tools, goal control, or later gate calls. The caller must report
the real receipt and obtain fresh verification for subsequent changes.
Temporary worker files
belong under the gate-owned `.halo-scratch` directory, which is excluded from
policy diffs and never promoted.

The plugin adds no root tool denylist, worker tool allowlist, shell-command
denylist, workspace sandbox, or custom delegation-depth cap. Windows ACLs,
operator-selected DSH permissions/modes, and native provider limits still
apply. Full-machine capability does not authorize work outside the user's task.

Staging is **not a security boundary** against a full-access worker. The gate
checks staged changes and verifier results; it cannot promise that an agent
with the user's machine access cannot modify outside files or verifier inputs.
This is an evidence/promotion workflow, not a tamper-proof isolation system.

## 2026-09-01 native-access correction

Removed the imposed planner/worker capability restrictions and post-verdict
locks. The native-access regression tests cover PASS, FAILED, explicit full
access, explicit narrower user policy, and inherited deployment defaults.
Protected-change rejection and fail-closed verifier tests remain in place.

Run the zero-model core tests with:

```powershell
node --test .\test\gate-core.test.mjs .\test\plugin.test.mjs
```
