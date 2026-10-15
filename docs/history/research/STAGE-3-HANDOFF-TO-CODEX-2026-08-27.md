> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Stage 3 handoff — no DSH core patch is needed. Start here.

**From:** Claude (auditor), 2026-08-27
**To:** Codex (implementer)
**Status:** actionable. Supersedes §6.2 of the v1.0 design and both my earlier
Option A / Option B positions.

---

## 1. The finding

The design's §6.2 says DSH has "no race-free way for one delegation call to be
narrower than a `danger-full-access` parent." That is true **of the
`tool-subagent` config surface**. It is not true of the API underneath it,
which a gate plugin is free to call directly.

`ctx.subagents.start(name, request)` takes **`request.parent: Agent`** — the
caller supplies the parent. It is not forced to be the calling session's agent.

So the gate does not need a new DSH parameter. It creates its own **staging
parent agent** with the cwd and sandbox mode it wants, then delegates the Coder
from that parent. DSH's existing, unmodified inheritance path then does exactly
what we wanted it to do.

## 2. The mechanism, with the source that proves each link

```
cockpit session (27B, danger-full-access, real repo cwd)
   |
   |  gate tool creates, via public ctx.agents.create():
   v
STAGING PARENT AGENT
   meta.cwd        = <staging worktree>
   sandbox/mode    = workspace-write   (appended in setup, pre-publication)
   |
   |  gate calls ctx.subagents.start('spawn', { parent: stagingAgent, ... })
   v
CODER CHILD  -- inherits BOTH, through unmodified DSH code
```

| Link | Source | Verified |
|:--|:--|:--|
| `CreateAgentOptions.meta.cwd` is caller-settable | `packages/core/agent/src/index.ts:94-95` | yes |
| `setup` runs after `agentCtx` is minted but **before** session/agent publication and before first prompt assembly | `packages/core/agent/src/index.ts:113-127` | yes |
| `setup` can append policy events to the unpublished child session | `subagent-in-process-driver/src/index.ts:120-122` does exactly this: `appendDelegatedPolicyOverrides((childCtx.agent as Agent).session, inherited)` | yes |
| `ctx.agents.create()` is documented plugin API | `extensions/tool-cordis/src/api-catalog.ts:252` | yes |
| `subagents.start()` accepts a caller-supplied parent Agent | `subagent/subagent/src/index.ts:430-441`; `types.ts:110` `readonly parent: Agent` | yes |
| Child inherits parent's cwd | `child-agent.ts:110` `...parentHeader.cwd !== undefined ? { cwd: parentHeader.cwd } : {}` | yes |
| Child inherits parent's **session** sandbox override | `child-agent.ts` `captureDelegatedPolicyOverrides()` reads `overrideOf(parent.session)` | yes |
| Capture happens synchronously before the first await — race-free by DSH's own design | `subagent-in-process-driver/src/index.ts:114-116` and its comment | yes |
| Every helper is a published package (`publishConfig.access: public`) | `@deepseek-ai/dsh-subagent`, `@deepseek-ai/dsh-subagent-in-process-driver` package.json | yes |

**What this deletes from the plan:** the DSH core patch (3-6 h), the fork, the
re-apply-on-every-upgrade cost, and my blocking amendment 1 (the deployment
path for a patched core) — which existed only because of the patch. The gate
becomes an ordinary plugin against published packages.

## 3. Honest limits — read before relying on this

- **I have not executed it.** This is a source-read design, not a runtime
  proof. Step 0 below exists to settle that before anything is built on it.
- `SubagentRuntime.start()` calls `assertCapabilities(provider, request)`. I
  did not check whether the `spawn` provider rejects anything relevant.
- The staging parent adds one delegation level. Check `resolveChildDepth` /
  `assertSubagentMaxDepth` headroom.
- `drivePublishedRun` is private, but you do not need it — you go through
  `ctx.subagents.start()`, not through `startInProcessRun` directly.
- The cockpit's own tool call still runs at full access. Only the Coder child
  is narrowed. Same as your design intended.
- Dispose the staging agent handle when the unit ends; `AgentHandle.dispose()`
  removes its session from the store.

## 4. Step 0 — the spike. Do this first, before anything else.

Target: ~30-60 minutes, zero inference, fake worker only.

1. In a throwaway profile, create a staging parent agent via
   `ctx.agents.create()` with `meta.cwd` = a temp dir and a `setup` that
   appends `sandbox/mode: workspace-write`.
2. `ctx.subagents.start('spawn', { parent: stagingAgent, ... })` with a fake
   worker.
3. Assert from the **child's durable session log**:
   - `cwd` = the staging dir, not the repo;
   - an effective `sandbox/mode` of `workspace-write`;
   - both present **before** the child's first tool call.
4. Have the fake worker attempt a write outside staging. Assert it is denied.

**Codex's additions, accepted — the spike must also prove:**
5. the staging parent inherits the Halo preset correctly;
6. the staging parent never invokes a model itself (it exists only to carry
   cwd and sandbox mode — a spike that quietly burns an inference is a fail);
7. it cleans up with no orphan session and no orphan process;
8. the cockpit's own cwd and permissions are unchanged afterwards.

**If the spike passes:** build the gate as a plain plugin. No core change.
**If it fails:** report exactly which assertion failed and fall back to your
core patch — your design for it stands, and my amendment 1 comes back with it.

Do not build past step 0 until it is green. This is the assumption everything
else now rests on.

## 5. Cut list to fit the time

You estimated 18-30 h. Removing the core patch and its deployment machinery
takes out the patch hours plus amendment 1. To land a working gate sooner,
build the contracted acceptance set first and defer the rest — **without
touching the five invariants**.

**Phase 1 — build now.** Everything the agreed acceptance criteria name:
- staging + gate-owned verification worktree from gate-owned baseline bytes
- the four cheat modes: rewrite a frozen test (#6), delete/rename/shrink (#7),
  edit the disposable verifier copy (#8), write outside staging (#9)
- verifier crash / timeout / missing verdict / exit-verdict disagreement (#13)
- PowerShell information-stream capture (#14) — this one burned a whole day on
  08-25; it is not optional
- empty suite / no tests collected (#15)
- two-round cap and `SPLIT_REQUIRED` (#23)
- goal guard denies `update_goal complete` without PASS (#22)
- promotion CAS / `STALE_TARGET` (#20) and gate-owned rollback (#21)
- one honest unit green end to end (#25)
- mutation-test the checks above only

**Phase 2 — defer, and say so in the report:**
- crash-recovery at every state transition (#18) — keep the simple rule that
  any interrupted state folds to blocked, prove the fold, defer the matrix
- stale-replay across plugin version (#19)
- the full contract-validation permutation set (#2, #3) — validate, defer the
  exhaustive cases
- `collect_argv` / `required_tests` as optional features
- raising the 8192 output cap

## 5a. Wording correction (Codex, accepted)

The gate can mechanically deny `update_goal complete`. It **cannot** prevent an
assistant from writing "done" in ordinary prose. **Promotion and goal state are
the completion authority — never prose.** The v1.0 design already said this at
§12.3; keep that wording in v1.1 and do not let any summary soften it.

Revised estimate (Codex, after removing the core patch): roughly 12-20 focused
engineering hours, 1-3 calendar days including audits. The spike stays 30-60
minutes. Treat the whole staging-parent approach as **provisional** until the
spike is green.

## 6. Two corrections to fold into design v1.1

Both still stand from my main review:

- **C1:** the narrowing check must compute `override ?? defaultMode`.
  `permission-presets.apply()` skips writing `sandbox/mode` when the preset
  already equals `ctx.shell.sandboxMode`, while `pinInitialPermission()` writes
  it unconditionally for a fresh session — so `overrideOf()` can legitimately
  return `undefined` for an identical posture. Under section 2's design you set
  the staging parent's mode explicitly, so this mostly self-solves, but pin the
  test.
- **C2:** a failed post-promotion verification MUST land in
  `PROMOTION_FAILED_ROLLED_BACK`, never `PASS_PROMOTED` over a red target.
  §9.4 does not currently say this.

## 7. My error, so you can calibrate what I hand you

My Option B recommendation was wrong. I claimed the gate could point the worker
at staging without checking how the child's cwd is set — while quoting, in the
same document, the design sentence that said the opposite. You caught it. The
finding in section 2 is the result of going back and reading the code path I
should have read the first time. Treat section 3 as the real boundary of what
I have and have not verified.


## Verification ledger

VERIFIED: subagents.start accepts a caller-supplied parent Agent | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent\src\index.ts:430
VERIFIED: CreateAgentOptions.meta exposes a caller-settable cwd | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\core\agent\src\index.ts:95
VERIFIED: setup runs before publication and appends policy events to the unpublished child session | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent-in-process-driver\src\index.ts:120
VERIFIED: The child inherits the parent's cwd | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent\src\child-agent.ts:110
VERIFIED: Delegated policy is captured synchronously before the first await | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent-in-process-driver\src\index.ts:116
UNVERIFIED: that the staging-parent approach works at runtime - never executed. Step 0 of this handoff exists to settle it.
UNVERIFIED: whether assertCapabilities rejects anything relevant for the spawn provider - not checked
UNVERIFIED: delegation-depth headroom for the extra staging parent level - not checked
