# The escalation test

Read this before any external call. It exists to stop two failures: paying for
work self can do, and shipping work that was never checkable.

## The decision

```
external_worth_it =
      self_failed_acceptance_twice
   or task_in_known_weak_class
   or irreversible_high_stakes
   or (wallclock_critical and ext_est > 4x faster and task >= 1 hour)
  and can_verify_the_output
  and est_external_cost < value_of_time_saved
```

Each clause is deliberate:

- **`self_failed_acceptance_twice`** — two *recorded* failures from `accept`, not
  two disappointing drafts. One failure is a signal to add the missing verification or raise the model, not
  to change model.
- **`task_in_known_weak_class`** — see the evidence table. Self's documented
  weakness is exact/dense optimization, not ordinary application code.
- **`irreversible_high_stakes`** — auth boundaries, migrations, data deletion,
  billing. A different lineage is genuinely useful here; that is the one place
  correlated blind spots matter more than cost.
- **`ext_est > 4x faster`** — 90 minutes of self vs 20 minutes of external, on a
  task blocking something else. Anything under an hour does not amortize the
  setup.
- **`can_verify_the_output`** — a test, an oracle, a schema, a diff you can read.
  No check, no delegation.
- **`est_external_cost < value_of_time_saved`** — at a few dollars per task this
  is almost always true for an hour of your time; the clause exists to stop
  reflexive delegation on cheap work, not to do accounting theater.

## Evidence, dated

Use these to argue with the bar, not as permanent facts. Re-check quarterly.

| Claim | Source | Date |
|---|---|---|
| Self (DeepSeek 1017, LOW) passed 151/152 groups but failed the dense weighted-matching case: 31 pairs / 30,199 versus achievable 40 / 38,023 | four-repository benchmark, this workspace | 2026-10-24 |
| Self at LOW used 13.7M input tokens, 79 tool calls, 5 malformed calls on that case | same | 2026-10-24 |
| Self at **HIGH** matched the same 151/152 and 3/4 repairs, was 25.9% faster and 28.2% cheaper overall (16.27 vs 21.95 min; $0.276 vs $0.385), and recovered cardinality on the same graph — 40 pairs — but still missed optimum: 36,861 vs 38,023 (−3.06%). The journal case was slower and costlier at high. | `deepseek-high` comparison, this workspace | 2026-10-24 |
| At high, self made 7 incorrect supporting audit claims versus 3 at low, and scored 17/20 on planning versus 18/20 | same | 2026-10-24 |
| Opus 5.5 high passed 4/4 and scored 44/44 on the pre-edit audit, at 704s / $2.48 | same | 2026-10-24 |
| On HumanEval at a fixed 65,536-token allowance, low passed 164/164, off 159, high 161, max 161 (all attempts; high and max each had two cap-exhausted loops). Low cost 94,004 output tokens; max cost 313,630. | `effort-bench`, this workspace | 2026-10-24 |
| Sonnet 5.5 medium passed 4/4 in 298.5s / $0.78 — the fastest passing configuration | same | 2026-10-24 |
| Terra 5.6 failed the dense case (23/24) despite the fastest solve time | same | 2026-10-24 |
| Effort ladder: Sol xhigh = index 51 at $0.39/task; Opus medium = 51 at $1.34; Opus max = 58 at $5.98; Sol max = 52 at $0.72 | Artificial Analysis Intelligence Index via CodingFleet, <https://codingfleet.com/blog/claude-opus-5-5-vs-gpt-6-1-sol/> | 2026-10 |
| Codex spends ~22.5k tokens before reading the prompt (one-word reply: 22,549 / 22,528 / 22,794 for Luna, Sol, Astra) | measured here with `codex exec` | 2026-10-24 |
| Claude Code `-p --output-format json` returns usage and `total_cost_usd` (one-word haiku call: in=2, out=4, $0.0051) | measured here | 2026-10-24 |
| OpenCode Zen listed 85 models and refused a chat completion with HTTP 403 | measured here | 2026-10-24 |

## Effort is not the remedy for a wrong approach

The failure above persisted at high. Raising the rung changed the *cost profile*
(cheaper and faster here, mostly through fewer graph calls) and recovered
cardinality, but not exactness: 3.06% off optimum is still a fail. So when the
failure is "the approach is wrong", change the approach (use the library) or the
model — do not spend a higher effort rung hoping it becomes an exact solver.
Effort is a lever on thoroughness, not on algorithmic correctness.

Also note the direction of the efficiency result: high was cheaper overall here,
but slower and costlier on the journal case. One attempt per case does not make
either rung a universal default.

## Worked examples

**"Rename `foo` to `bar` across 40 files and fix imports."**
Self, existing tests. A compiler/test run is the oracle. No escalation. A local batch would
work too, but self is faster than assembling a prompt file for 40 edits.

**"Implement exact maximum-weight matching on general graphs."**
Do not ask any model to reimplement a solved algorithm. Use a library
(NetworkX `max_weight_matching`) and an independent brute-force oracle on small
inputs. If the *review* matters, escalate one bounded audit to Opus or Sol — as a
reviewer, not an implementer. This is the exact case that broke self, Terra and
Luna in the benchmark.

**"Migrate the auth schema with a rollback path."**
Self with independent verification, plus one external audit from a different lineage, scoped to the named
risk: "review this migration's rollback and tenant isolation." That passes
`irreversible_high_stakes`; it does not license handing over the implementation.

**"Classify 300 support emails."**
Local batch, `-Parallel 2`. Not external, not self one at a time. If the local
model is too weak (check on 10 items first), then self; external is the last
option because per-call overhead dominates at this size.

**"Self failed acceptance twice on a dense graph optimizer."**
Now `self_failed_acceptance_twice` is true. Options, in order: (1) replace the
hand-rolled solver with a library, (2) delegate the isolated module to Sol high
in a worktree with the failing test as the acceptance command, (3) escalate to
Opus. Record which, and let `report` tell you whether it paid.

## Anti-triggers

Do not escalate for:

- style, tone, verbosity, or "it reads better"
- a second opinion with no named risk
- batches under ~50 items
- a task you have not attempted yet
- a failure you cannot express as a command
- "the leaderboard says it's better" without the effort setting

## Revising the bar

After ~10 recorded tasks, read `report`. Promote a class to external only with
at least three cases where self needed two failed acceptances and external
needed none. Demote when external's acceptance rate does not beat self's. Add the
date and the evidence to this file when you change a rule.



