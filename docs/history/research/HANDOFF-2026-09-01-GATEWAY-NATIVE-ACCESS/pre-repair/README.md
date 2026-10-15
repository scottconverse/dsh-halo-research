> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# Halo Verified Coder

SCOPE: Halo stack configuration tasks only.

This zero-dependency DSH plugin replaces the generic `subagent_coder` tool with
a fail-closed implementation gate. It stages the worker in a detached Git
worktree, launches it through a synthetic `workspace-write` parent with a
six-tool implementation-only surface (`read`, `write`, `edit`, `glob`, `grep`,
and `pwsh`), rejects protected or out-of-scope changes, verifies in an
independent worktree, checks
for concurrent live edits before promotion, and rolls promotion back if the
post-promotion verifier fails.

The plugin records every result under `%LOCALAPPDATA%\HaloGate\runs`. A failed,
timed-out, or crashed verifier is never a pass. Once a gated unit starts, the
same parent agent cannot mark its active DSH goal complete until the latest
gate verdict is `PASS`. After the single gate call returns, that parent cannot
call the gate again or mutate files around the verdict. Temporary worker files
belong under the gate-owned `.halo-scratch` directory, which is excluded from
policy diffs and never promoted.

Run the zero-model core tests with:

```powershell
node --test .\test\gate-core.test.mjs .\test\plugin.test.mjs
```
