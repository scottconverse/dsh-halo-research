---
name: deepseek-harness-model-routing-1024
description: >-
  Route work inside DSH Desktop. The session model is the default and does the
  work; local Ollama is the free batch lane; an external Claude or Codex call is
  an exception that must pass an explicit escalation test. Use when choosing a
  model or effort for a task, when a task has failed acceptance twice, for large
  homogeneous batches (classify, summarize, extract, sweep), before spending
  Claude or ChatGPT quota from inside DSH, when reviewing an irreversible change
  (auth, migration, deletion, money), or when asked which models this machine
  can actually reach.
---

# DSH model routing (1024)

This is a *rework-avoidance* router, not a cost sorter. The session model is
already paid for by the turn, so its marginal dollar cost is zero. What costs
the owner is wall-clock and rework. Route accordingly.

Three lanes, in order:

1. **Self** — the DSH session model. Default for everything.
2. **Local** — Ollama on this machine. Free, private, parallel 1–2. The batch lane.
3. **External** — `claude -p` or `codex exec`. Paid, slow to integrate, and an
   exception handler for capability ceilings, not a cheaper pair of hands.

Everything else (OpenCode Zen, Antigravity, hosted Gemini) is reachable only if
`scripts/route.ps1 probe` says so today. Do not document or assume a lane that
the probe cannot reach.

## The rule

Self does the work. Escalate only when the escalation test passes:

```
external_worth_it =
      self_failed_acceptance_twice
   or task_in_known_weak_class          # exact/dense algorithms, huge single shots
   or irreversible_high_stakes          # auth, migrations, deletion, money
   or (wallclock_critical and ext_est > 4x faster and task >= 1 hour)
  and can_verify_the_output             # no oracle, no delegation
  and est_external_cost < value_of_time_saved
```

`can_verify_the_output` is the load-bearing clause. If you cannot check what
comes back, an external model is a more confident guess. A failed acceptance
counts only if a command produced it — see `accept` below.

No escalation for: style, verbosity, "a second opinion", batches under ~50
items, or a task you have not actually attempted yet. Full rubric and worked
examples: `references/decision-rubric.md`.

## Two different things called "effort"

**Model reasoning effort** is a request setting: Ollama's `think`, Claude's
`--effort`, Codex's `model_reasoning_effort`. DSH does expose it for the session
model, but a direct HTTP call from this skill does **not** inherit DSH's model
configuration — it goes straight to the provider. So the skill resolves the
setting itself and sends it explicitly.

**Implementation verification** is what you do around the work: tests, oracles,
diff review. It is not a model setting, and it should not be inflated on a fixed
ladder.

### Model settings for this machine

`config/model-settings.json` gives `deepseek-v4.1-flash:1017-cloud` explicit
settings, sent on every call to that model:

| Setting | Value | How it is sent |
|---|---|---|
| Reasoning effort | `low` | `think: "low"` |
| Output allowance | 65,536 | `options.num_predict: 65536` |
| Context | 1,048,576 advertised | **provider-managed**; `num_ctx` is not sent |

Low is the recommended default for this exact model because it was the best
observed result in the one short-coding suite (164/164, against 159 for off and
161 for high and max) at the lowest output cost. Higher rungs remain available
by explicit choice: `-Effort high`, `-Effort max`. Nothing escalates
automatically.

Ollama documents that cloud models use their maximum context by default. The
1M capacity is recorded as **advertised**, separate from any observed or
enforced limit; sending `num_ctx` would not enforce the cloud context size, so
the skill does not send it.

Other models keep the provider's own settings. A model with no entry in that
file gets no `think` and no `num_predict`, exactly as before.

### Verification should match the task

| Situation | Verification |
|---|---|
| routine, bounded, existing tests | run the existing tests |
| behaviour is unclear or new | add one focused check for that behaviour |
| a named risk (auth boundary, migration rollback, concurrency) | a targeted adversarial test, or one different-lineage review |
| exact algorithm or optimisation | use the library and an independent oracle |

Do not add tests or repeat work the change does not justify. Do not treat a
bigger verification ritual as a substitute for choosing the right approach.

**Effort is not a remedy for a wrong approach.** Self run at high still missed
the exact optimum by 3.06% on the same dense graph that failed at low — the rung
bought speed and cost, not correctness. When the failure is "the approach is
wrong", change the approach (use the library) or the model; do not climb the
effort ladder hoping it becomes an exact solver.

## Reachability

Probe before claiming, and treat the result as session state:

```powershell
./scripts/route.ps1 probe          # installed/reachable, no model calls
./scripts/route.ps1 probe -Smoke   # one-word call per external lane; spends quota
```

Measured on the author's machine, 2026-10-24: `claude` 2.1.296 (haiku, sonnet,
opus all answered), `codex` 0.162.0-alpha.2 logged in via ChatGPT (Sol 6.1,
Luna 6, Astra all answered), Ollama up with local and cloud tags. OpenCode Zen
chat returned **403** despite its models endpoint working; Antigravity was not
installed. That is why the probe must be a completion, not a model list.

## Call, then accept

One call, one ledger line, one receipt:

```powershell
./scripts/route.ps1 call -Route local -Model qwen3.8:27b-q4_K_M `
  -PromptFile prompt.txt -Task summarize-docs

./scripts/route.ps1 call -Route external -Model gpt-6.1-sol `
  -PromptFile prompt.txt -Task fix-matching -TimeoutSec 900
```

Acceptance is a command, never an opinion:

```powershell
./scripts/route.ps1 accept -Task fix-matching -Cmd "pytest -q"
```

If it exits 0 the ledger marks the work accepted; if not, the task counts as a
failure and its retries increase. That number is what `report` divides by:

```powershell
./scripts/route.ps1 report            # per route/model
./scripts/route.ps1 report -ByClass   # per work class, for promotion decisions
```

Tag every call with `-Class` (e.g. `-Class auth-migration`). Class-level rows are
what the promotion rule in `references/decision-rubric.md` reads.

## Batch: local by default, one cloud exception

`batch` reads JSONL `{id, prompt}`, fans out to the Ollama endpoint with
`-Parallel 2` (local engines thrash above that), writes JSONL, and records one
ledger line per item.

```powershell
./scripts/route.ps1 batch -Model qwen3.8:27b-q4_K_M `
  -PromptFile items.jsonl -Out results.jsonl -Task triage
```

It refuses cloud-tagged models, with one explicit exception:
**`deepseek-v4.1-flash:1017-cloud`**. That model is allowed because it has
configured settings and the owner approved it, but it is **not** free local
inference — it consumes Ollama subscription/quota, runs in the cloud, and its
rows are priced as an API-equivalent estimate (or `unknown`, never zero). Every
other cloud tag is refused before any request is sent.

Batch rows separate execution from transport: `execution=cloud` with
`transport=ollama-http` for the 1017 model, `execution=local-weights` for models
that really run here. Local weights keep `cost_basis=free-local`; the cloud model
uses `estimated-api-equivalent`. Each item keeps its own call id, requested and
returned model, resolved effort and output allowance with sources, token counts,
elapsed time and stop reason.

Codex costs ~22.5k tokens *before* it reads your prompt, so it is the worst
batch lane on this machine. Claude carries per-call overhead too. Local weights
are free and parallel; self is fine under ~50 items.

## Delegating a real change

When the escalation test passes for an implementation task, do not let an
external agent edit the live tree. Use an isolated worktree, take a patch, then
review and apply it yourself:

```powershell
git worktree add ../wt-fix -b ext/fix
codex exec -m gpt-6.1-sol --cd ../wt-fix -s workspace-write "..." < prompt.txt
git -C ../wt-fix diff > proposal.patch
```

Details, review checklist, cleanup: `references/worktree-protocol.md`.

## Privacy

Local Ollama stays on the machine. Claude, Codex and any cloud-tagged Ollama model
(`:cloud`, `-cloud`, `:1017-cloud`) are somebody's cloud and run under the owner's account. Never send secrets,
credentials, or private client code to a non-local lane; ask if unsure. The
ledger records task names and model IDs — keep it out of version control
(`.state/` is git-ignored).

## Anti-patterns

- **Escalating to avoid thinking.** If the task has not been attempted with the right verification, an external call
  is procrastination with extra steps.
- **"Another opinion" as a reason.** A different lineage is worth it for a
  *named risk* (rollback path, tenant boundary, concurrency), not for taste.
- **Trusting a model list as a health check.** Zen listed 85 models and refused
  every completion.
- **Letting the external model be the last reader.** You review the diff and you
  run the acceptance command.
- **Quoting a leaderboard without the effort setting.** A 3-point gap measured at
  different efforts is not a gap.

## Changing the bar

The "truly large advantage" test is meant to move on evidence. After ~10 tasks,
`report` should show, per task class, attempts vs accepted for each route. Promote
a class to external only with at least three cases where self needed two failed
acceptances and external needed none. Demote when external's acceptance rate
doesn't beat self's. Record the change here with a date.

