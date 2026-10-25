# DeepSeek V4.1 Flash 1017 at four effort levels on HumanEval

Run: 2026-10-24 19:11 local (corrected harness, 65,536 output cap per call).
Model served: `deepseek-v4.1-flash:1017`. Dataset: OpenAI HumanEval, 164 tasks,
official tests, one attempt per task per arm. Temperature 0.

## Results

| Arm | n | pass | completed | rate | 95% CI | cap-exhausted | errors | median s | mean out tokens |
|---|---:|---:|---:|---:|---|---:|---:|---:|---:|
| off | 164 | 159 | 164 | 97.0% | 93–99% | 0 | 0 | 0.49 | 187 |
| low | 164 | 164 | 164 | **100%** | 98–100% | 0 | 0 | 1.19 | 573 |
| high | 164 | 161 | 162 | 99.4% | 97–100% | 2 | 0 | 1.41 | 1,473 |
| max | 164 | 161 | 162 | 99.4% | 97–100% | 2 | 0 | 1.61 | 1,912 |

Rate is over completed answers only. Cap-exhausted calls are reported separately
and excluded from the denominator, never counted as wrong answers.

## Paired comparison (McNemar exact, same 164 tasks)

| Pair | Discordant | Only first passed | Only second passed | p |
|---|---:|---:|---:|---:|
| off vs low | 5 | 0 | 5 | 0.062 |
| off vs high | 8 | 3 | 5 | 0.727 |
| off vs max | 4 | 1 | 3 | 0.625 |

Only `off → low` approaches significance, and it does not reach 0.05. Beyond
low, the arms are statistically indistinguishable on this suite.

## What effort actually bought

- **Off → low is the real step.** 159 → 164 passes (+3.0 points), for 3.1× the
  output tokens (30,675 → 94,004 total) and 2.4× the median latency.
- **Low → high → max bought nothing measurable.** 164, 161/162, 161/162.
  Output tokens rose to 241,630 and 313,630; thinking characters from 1,455 to
  4,325 to 6,487 per task.
- **Higher effort introduced overthinking loops.** Four calls returned no answer
  at all, hitting the 65,536-token cap after 100–230 seconds of thinking on
  trivial tasks: `sort_array` (116, high), `fix_spaces` (134, high),
  `closest_integer` (137, max), `order_by_points` (145, max). These are failures
  of the rung, not of the budget: the cap is 64K, and one earlier probe at 16K
  exhausted that too.
- **Off's five failures are genuine logic errors**, not truncation:
  /32 find_zero, /59 largest_prime_factor, /83 starts_one_ends, /132 is_nested,
  /145 order_by_points.

## Caveats

- **Saturation.** HumanEval is old, public, and near ceiling for this model. A
  3-point difference at 97–100% cannot be resolved with 164 tasks; the study is
  underpowered by construction for the top of the curve.
- **Contamination.** The tasks are in every training corpus. This measures
  familiar-problem completion, not novel engineering.
- **Single attempt per cell**, temperature 0. No repeated sampling, so no
  variance estimate beyond the binomial interval.
- **Harness correction.** An earlier 64K run executed the completion without the
  prompt prelude, which made /32, /38 and /50 fail in every arm (the prompt
  defines `poly`, `encode_cyclic`, `encode_shift`). That run is archived as
  `attempt-cap-65536-missing-prelude.jsonl`; this table is from the corrected
  harness. The bug depressed all arms equally, so it did not change the ranking,
  but it did change the absolute rates (e.g. low 98.2% → 100%).

## Files

```
results-cap-65536.jsonl        656 rows, one per call
raw/cap-65536/*.json            prompt, answer, thinking, stop reason (git-ignored)
archive/earlier-capped-runs/    2K, 8K, 16K and pre-fix 64K attempts, labelled by cap
bench.py                        runner; --cap is part of the run identity
```
