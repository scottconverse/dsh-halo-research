# Evidence

What this skill's rules rest on. Two studies, both single-attempt, both run from
this workspace. Raw rows live outside this repo (`effort-bench/`), because they
contain prompts and model output.

---

## 1. HumanEval at four effort levels

**Setup.** OpenAI HumanEval, 164 function-completion tasks with official tests.
Model `deepseek-v4.1-flash:1017` via Ollama. One attempt per task per arm,
temperature 0, 65,536-token output allowance for every arm, context advertised at
1,048,576 and provider-managed (no `num_ctx` sent), prompt prelude included in the
program before execution. Run 2026-10-24, 656 calls.

Rates below are **all-attempt**: a cap-exhausted call stays in the denominator and
counts as a failure, because that is what the caller experienced.

| Arm | Pass | Attempts | Rate | 95% CI | Cap-exhausted | Median s | Total output tokens |
|---|---:|---:|---:|---|---:|---:|---:|
| off | 159 | 164 | 97.0% | 93–99% | 0 | 0.49 | 30,675 |
| **low** | **164** | **164** | **100%** | 98–100% | 0 | 1.19 | 94,004 |
| high | 161 | 164 | 98.2% | 95–99% | 2 | 1.41 | 241,630 |
| max | 161 | 164 | 98.2% | 95–99% | 2 | 1.61 | 313,630 |

Paired McNemar, same tasks: off vs low 5 discordant, all in low's favour,
p = 0.062; off vs high p = 0.727; off vs max p = 0.625.

**The four cap-exhausted calls are the finding, not an artifact.** At the 64K
allowance, after 100–230 s of thinking and no answer: `sort_array` (high),
`fix_spaces` (high), `closest_integer` (max), `order_by_points` (max). An earlier
16K probe also exhausted on one of them, so this is a loop, not a tight budget.
They count as failures above and are listed here so the failure mode stays
visible.

**Interpretation.** Off → low is the real step, and it does not reach
significance at n = 164. Beyond low the arms are indistinguishable while output
tokens rise 3.3× from low to max. On familiar function-completion code, effort is
a cost lever, not a correctness lever.

**Caveats.** HumanEval is saturated and contaminated; 164 tasks cannot resolve
1–3 points at the ceiling; one attempt per cell means binomial intervals only.

---

## 2. Four-repository benchmark: low vs high

**Setup.** Four synthetic Python repositories (SQLite work queue, durable binary
journal, exact allocation, weighted matching), hidden acceptance suites totalling
152 groups, 15-minute budget, shared file/test tool. Same prompts and starters in
both arms.

| Case | Low | High | Time low → high | Cost low → high |
|---|---|---|---|---:|---:|
| Dispatch queue | 48/48 | 48/48 | 177 → 169 s | $0.0589 → $0.0569 |
| Chronicle journal | 40/40 | 40/40 | 110 → 179 s | $0.0317 → $0.0564 |
| Exact allocation | 40/40 | 40/40 | 182 → 187 s | $0.0538 → $0.0562 |
| Weighted matching | 23/24 | 23/24 | 848 → 441 s | $0.2403 → $0.1066 |
| **Total** | **151/152** | **151/152** | **21.95 → 16.27 min** | **$0.3847 → $0.2760** |

**The failure survived the higher rung.** On the dense graph, low returned 31
pairs / weight 30,199; high returned 40 pairs / weight 36,861; the exact answer
is 40 / 38,023. High recovered cardinality and closed most of the gap, but
remained 3.06% off and failed the exactness check. High also disclosed that its
large-graph optimizer was time-boxed local search, not exact weighted Blossom.

**Audit and planning did not improve with effort.** High found 44/44 planted
categories against low's 43/44, but made seven incorrect supporting claims
against three, and scored 17/20 on planning against 18/20.

**Interpretation.** This is why the rubric says effort is not the remedy for a
wrong approach: use the library and an oracle instead. It is also why the skill
records the effort rung on every call — a comparison across rungs is not a
comparison.

**Caveats.** One attempt per case, run at different times; the journal case got
slower and more expensive at high, so the efficiency result is case-specific.

---

## What the evidence does not support

- A universal effort default. Low won HumanEval; high won the repository total.
- That 64K is the optimal output allowance, or that 1M-context behaviour has been
  validated. The allowance was fixed so the arms could be compared; nothing here
  tests context length.
- A claim that any arm is incapable of a task because one run hit a cap.
- Cross-model rankings from either study. Both are single-model or single-suite.

