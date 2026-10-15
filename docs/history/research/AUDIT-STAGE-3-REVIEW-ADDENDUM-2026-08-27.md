> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Stage 3 review addendum — I withdraw Option B. Recommend A.

**Reviewer:** Claude (Opus 5), 2026-08-27
**Supersedes:** section 7 of `AUDIT-STAGE-3-DESIGN-REVIEW-2026-08-27.md`.
The rest of that review stands unchanged.

---

## 1. Codex is right. My Option B rested on a false assumption.

I argued that under Option B a wandering worker was an edge case, because the
gate would point the worker at a disposable staging worktree. Codex replied
that the child also inherits the parent session's **working directory** — the
real repository — so the worker does not have to wander anywhere. It starts
standing in the repo, at `danger-full-access`.

I checked. Codex is right. `packages/subagent/subagent/src/child-agent.ts`,
`childSessionMeta()`:

```ts
return {
  ...parentHeader.cwd !== undefined ? { cwd: parentHeader.cwd } : {},
  ...
}
```

The in-process child's cwd is the parent header's cwd, hard-coded, with no
override parameter — the same shape of gap as the sandbox mode. Under Option B
the gate could build a staging worktree and the worker would never be pointed
at it.

That makes Option B materially worse than I described. "Caught and failed"
after the worker has already edited the live repository is not adequate for
unattended runs, and it cannot cleanly be told apart from a concurrent edit by
Scott. **I withdraw Option B and recommend Option A.**

Codex's amendment is also correct and I adopt it: the DSH extension must carry
**both** the child sandbox mode and the child working directory. Either one
alone leaves the window open.

## 2. What I can add: the patch is smaller than it looks

DSH already contains this exact primitive — for out-of-process children.
`packages/subagent/subagent/src/out-of-process.ts`:

```ts
export function resolveChildCwd(prefix: string, configured: string | undefined, parentCwd: string | undefined): string {
  if (configured !== undefined) return configured
  if (parentCwd === undefined) {
    throw new Error(`${prefix}: no working directory for the child — configure \`cwd\` or delegate from a parent session that has one`)
  }
  return assertUsableCwd(prefix, 'parent session cwd', parentCwd)
}
```

with `validateConfiguredCwd()` alongside it, validated once at plugin load,
rejecting the empty string, and documented as "omit the key to inherit the
parent session cwd".

So the in-process driver is the odd one out, not the innovator. The extension
should **mirror `out-of-process.ts` deliberately** — same function shape, same
load-time validation, same fail-loud-when-neither-exists, same
deployment-configured-not-model-facing posture. Three consequences:

1. It is a smaller change than writing a new mechanism.
2. It reads as fixing an inconsistency, which makes it far more likely to be
   accepted upstream — the outcome that ends the fork.
3. Reviewers have an existing reference implementation to check it against.

## 3. One new requirement, and one caution

**Requirement — prove the fail-loud update check, don't just write it.**
Codex's deployment list (automated patch/build/install, exact version lock,
restart and real-path verification, fail-loud update check, reapply
instructions, upstream later) fully answers my blocking amendment 1. I accept
it, with one addition: the update check must be **demonstrated red** — simulate
a DSH version change and show the stack refuses to run rather than silently
running an unpatched core. A guard that has never fired is not a guard. Add it
to the §14.5 mutation list.

**Caution — the two overrides must land atomically.**
A child with a staging cwd but full access, or a narrowed sandbox but the real
repo as cwd, is a worse state than either gap alone, because it looks contained
and is not. Pin a test that both the sandbox mode and the cwd are in force
before the child's first filesystem or shell call, and that a provider missing
either capability rejects before child publication rather than proceeding with
one of the two.

## 4. Estimate: accepted

18-30 focused hours, 2-4 calendar days, of which the DSH extension is 3-6.
That satisfies blocking amendment 2. The `out-of-process.ts` precedent may pull
the extension toward the low end; I would not plan on it.

Steps 1-9 of §16 are zero-inference and can run whenever. Steps 10-11 need the
box free and Townlight held.

## 5. Revised verdict

**Option A, with Codex's cwd amendment.** Both blocking amendments are now
answered: the deployment path is specified (§3 requirement attached), and the
build is sized.

Remaining before build step 2 — all small:
- Fold the cwd override into the design's §6.2 extension spec, citing
  `out-of-process.ts` as the pattern to mirror.
- Add the atomicity test from §3 above.
- Add the demonstrated-red update check to §14.5.
- Keep C1 and C2 from the main review (undefined-override test; post-promotion
  verification failure must roll back).

Publish v1.1 of the design with those folded in, and implementation may begin.
I will audit each build step's evidence drop by the same method: raw artifacts
first, report second.

## 6. Note for the record

This is the second time in Stage 3 that reading the source changed a
conclusion that sounded reasonable in prose — first Codex's finding that a
post-result guard cannot contain side effects, now its finding that the child
inherits the real repository as its working directory. Both times the prose
version was plausible and wrong. Neither would have been caught by review of
the design document alone.


## Verification ledger

VERIFIED: The in-process child inherits the parent session's cwd, hard-coded, with no override | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent\src\child-agent.ts:110
VERIFIED: An equivalent cwd override already exists for out-of-process children | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent\src\out-of-process.ts:139
UNVERIFIED: whether mirroring out-of-process.ts would be accepted upstream - not investigated
