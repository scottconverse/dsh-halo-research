# Delegating an implementation to an external model

Only after `decision-rubric.md` says yes. The external model never touches the
live tree, and it never gets the last word.

## 1. Isolate

```powershell
git worktree add ../wt-<task> -b ext/<task>
```

A worktree is a second checkout with its own index. If the external model
wanders, `git worktree remove --force ../wt-<task>` throws all of it away.

## 2. Give it a self-contained artifact

Good brief: the failing test, the module, the contract, and the acceptance
command. Bad brief: "look at this repo and fix it."

```powershell
@'
The module in src/matching.py must maximize cardinality, then weight, then the
lexicographically smallest partner vector. tests/test_matching.py currently
fails on test_18_dense_random. Do not change tests. Return only the edits.
'@ | Set-Content prompt.txt

codex exec -m gpt-6.1-sol --cd ../wt-<task> -s workspace-write `
  "Implement the change described on stdin. Do not touch tests." < prompt.txt
```

For Claude, `claude -p --model opus --permission-mode acceptEdits` inside the
worktree does the same job with its own sandbox. Prefer Codex when you need the
`--cd` scoping; prefer Claude when you want the diff in the transcript.

## 3. Take a patch, not a claim

```powershell
git -C ../wt-<task> status --short
git -C ../wt-<task> diff > proposal.patch
```

Review checklist before applying:

- [ ] Scope: only files the brief named, or a justification for anything else
- [ ] Tests untouched (unless the task *was* the tests)
- [ ] No new dependencies, or the dependency is justified and pinned
- [ ] No secrets, no absolute author paths, no debug prints left behind
- [ ] The change matches the contract, not just the failing test
- [ ] Errors handled where the contract says they must be

## 4. Apply and accept yourself

```powershell
git apply proposal.patch
./scripts/route.ps1 accept -Task <task> -Cmd "pytest -q"
```

If `accept` fails, that is a recorded failure for that task — exactly what the
ledger is for. Do not mark it accepted because the model said it was fine.

## 5. Clean up

```powershell
git worktree remove ../wt-<task>
git branch -D ext/<task>   # only if the patch is applied or discarded
```

Leave the worktree in place while you are still reviewing; remove it the moment
you are done, so a stale checkout does not confuse the next session.
