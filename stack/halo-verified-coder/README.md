# Halo Verified Coder

SCOPE: Halo stack configuration tasks only.

This zero-dependency DSH plugin replaces the generic `subagent_coder` tool with
a fail-closed implementation gate. It stages the worker in a detached Git
worktree, launches it through a synthetic `workspace-write` parent, rejects
protected or out-of-scope changes, verifies in an independent worktree, checks
for concurrent live edits before promotion, and rolls promotion back if the
post-promotion verifier fails.

The plugin records every result under `%LOCALAPPDATA%\HaloGate\runs`. A failed,
timed-out, or crashed verifier is never a pass. Once a gated unit starts, the
same parent agent cannot mark its active DSH goal complete until the latest
gate verdict is `PASS`.

Run the zero-model core tests with:

```powershell
node --test .\test\gate-core.test.mjs .\test\plugin.test.mjs
```
