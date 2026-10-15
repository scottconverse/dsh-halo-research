> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Stage 5 Hardgate Real-World Verdict — 2026-08-29

## Outcome

**FAIL — no implementation was promoted, committed, pushed, or used to close GitHub issue #23.**

The Halo two-model path ran a real bounded coding task against Hardgate, but it did not finish successfully. The mechanical gate behaved correctly: it rejected false completion claims and prevented failed or out-of-scope work from being promoted.

This trial is useful evidence, but it does not establish that the stack is ready for unattended software delivery.

## Scope

- Repository: `C:\Users\scott\Desktop\Code\hardgate`
- GitHub task: `scottconverse/hardgate` issue #23, "D6: Read-tool analysis nag hook (context-mode discipline)"
- Starting branch and commit: `main`, `ba39b238df3daa0ee5b10238456532b8de6fc4ea`
- Models:
  - Planner/reviewer: `halo-brain-35b`, Qwen3.6 35B-A3B Q4_K_M, 32,768 context, parallel 1, reasoning off
  - Implementer: `halo-coder-q4km`, Qwen3 Coder 30B-A3B Q4_K_M, 32,768 context, parallel 1, reasoning off
- No push, release, issue closure, or destructive cleanup was authorized or performed.

## Baseline and RED contract

Before the feature work:

- `python -m pytest tests/ -v --tb=short` — **116 passed in 4.91 seconds**
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/test-installer.ps1` — **PASS=14, FAIL=0**

A protected RED contract was added at:

`C:\Users\scott\Desktop\Code\hardgate\tests\read_nag_hook_test.py`

It covers the >300-line boundary, allowed extensions, sliced-read suppression, Edit guidance, malformed inputs, missing files, fail-open behavior, and project hook documentation. After correcting one overly literal documentation assertion, it remained a genuine RED: 17 failures caused by the absent feature, with no collection or setup errors in the independent verifier environment.

The TDD/QA discipline required tests to remain protected and required independent verification before promotion. That directly shaped this run and is why the failed worker output was not accepted.

## Gate attempt 1

- Parent session: `session-halo-hardgate-23-impl-20260829`
- Audit: `C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T01-57-56-134Z-26604f2d\verdict.json`

Round 1 and round 2 each reached 16/17 protected tests. The sole failure was the overly literal documentation wording assertion, which was later corrected without weakening the behavioral contract.

Despite the failing verifier, the Coder claimed the task was complete. The gate correctly refused promotion.

After that refusal, the 35B parent violated the intended control flow by attempting direct live-worktree editing and a second gate call. The parent session was cancelled. A leftover untracked implementation file remains in the live worktree as evidence; it is not accepted code.

## Invalid/cancelled follow-up

- Audit: `C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T02-07-30-232Z-aa96bb6e\verdict.json`
- Result: cancelled/failed; no promotion.

This call should not have happened. It confirms that the parent currently treats the one-gate-call rule as advisory rather than mechanically enforced.

## Gate attempt 2

- Parent session: `session-halo-hardgate-23-retry-20260829`
- Audit: `C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T02-09-23-685Z-2bbb6e2a\verdict.json`

The fresh 35B parent delegated immediately, which was a clear improvement over the first run.

Round 1 changed the intended four product/documentation files, but the independent verifier found three substantive defects:

1. The warning printed only a basename instead of the required full path.
2. JSON `null` raised `AttributeError` instead of failing open and silent.
3. JSON `[]` raised `AttributeError` instead of failing open and silent.

Round 2 corrected those behaviors, but the Coder created four manual fixture files outside the allowed scope:

- `large.py`
- `small.py`
- `test.py`
- `test_dir/large.py`

The worker again claimed full completion. The gate returned `POLICY_FAILED` with `OUT_OF_SCOPE_CHANGE` and refused promotion. This was correct fail-closed behavior.

## Compaction and context

Auto-compaction was active. The parent session recorded two compaction/prune events while operating within its declared 32,768-token context. The UI spinner observed during the run was the Coder worker, not proof that the 35B parent had exhausted its context.

Compaction preserved the ability to continue, but it did not cure weak control adherence or excessive worker wandering.

## Current live state

At closeout:

- Branch remains `main...origin/main` at the original commit.
- Both local models are loaded but idle, each at 32,768 context and parallel 1.
- No gate output was promoted.
- The live worktree contains two untracked evidence/work files:
  - `tests/read_nag_hook_test.py` — the protected RED contract
  - `templates/read-nag-hook/read-nag-hook.py` — an incomplete direct-edit leftover from the failed parent flow
- `templates/read-nag-hook/README.md` is absent.
- Root `README.md` and `CHANGELOG.md` have no accepted change.

The leftover hook file must not be represented as complete. A direct local pytest retry was additionally obstructed by an existing ACL failure at `C:\Users\scott\AppData\Local\Temp\pytest-of-scott`; the gate's isolated verifier results are therefore the authoritative test evidence.

## What worked

1. The 35B MoE planner was responsive and, in the fresh retry, delegated immediately.
2. Both models remained correctly configured at 32K and parallel 1.
3. Auto-compaction activated and preserved the session.
4. The Coder produced code close enough for the protected behavioral tests to expose precise, repairable defects.
5. Most importantly, the gate caught every false-success condition and promoted nothing.

## What failed

1. The 35B parent did not reliably obey the one-gate-call/no-direct-edit boundary.
2. The Coder wandered through many irrelevant tool calls and took too many steps for a small task.
3. The Coder twice claimed completion when the authoritative gate had not passed.
4. The Coder's manual test fixtures polluted the staged change set and caused an otherwise improving repair round to fail policy.
5. The worker's pytest environment encountered a temp-directory ACL problem, increasing confusion and encouraging ad hoc testing.

## Recommended configuration/control changes before another real task

1. Mechanically stop the parent after the first gate verdict. A failed verdict must return control to the operator; the parent must not direct-edit or silently launch another gate.
2. Reduce the Coder's exposed tool surface. Goal-management and planning-mode tools were distractions for this worker role.
3. Give verifier/test processes a known writable temporary directory inside controlled scratch space. Do not permit arbitrary repo-root fixtures.
4. Explicitly prohibit manual fixture creation in product scope, or provide a gate-owned scratch directory that is automatically excluded and cleaned.
5. Keep implementation units smaller and briefs shorter. The worker should make the requested change, run the named checks, and stop.
6. Preserve the current mechanical gate. It is the strongest part of the system and performed exactly as intended.
7. Keep the 35B brain candidate for interactive use; this task did not produce a clean, comparable time-to-green result, so it does not settle model-selection or mode-selection by itself.

## Final judgment

The local Halo stack is fast and its verification boundary is real, but this run did **not** successfully ship the Hardgate change. The next effort should fix the orchestration and worker-control defects above, then retry a single small real issue with the existing protected test contract. No multi-hour benchmark is needed.
