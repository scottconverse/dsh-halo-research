# The ledger

One JSONL line per event, at `.state/ledger.jsonl` unless `DSH_ROUTING_LEDGER`
points elsewhere. It is the only thing that makes "cost per accepted item" a
number instead of a slogan, and it is git-ignored because task names leak project
detail.

## Fields

| Field | Meaning |
|---|---|
| `id` | short random id for the event |
| `ts` | UTC timestamp |
| `task` | caller-supplied task label; `accept` matches on it |
| `class` | caller-supplied work class (`-Class`); defaults to `uncategorized` |
| `requested_model` | model the caller asked for |
| `served_model` | model identity the provider reported, when it reports one; null otherwise |
| `model` | kept for older rows; equals the requested model on new rows |
| `effort` | resolved model-side rung actually sent |
| `effort_source` | `model-default`, `explicit`, or `unspecified` |
| `max_tokens` | output allowance sent to Ollama; null when none was sent |
| `max_tokens_source` | `model-default`, `explicit`, or `unspecified` |
| `context_handling` | `provider-managed`, `requested`, or `unknown` |
| `advertised_context` | capacity the provider advertises; not an observed or enforced limit |
| `route` | `self` (recorded via `defer`), `local`, `external`, or `defer` |
| `provider` | `ollama`, `claude`, `codex`, or null |
| `execution` | where the weights ran: `local-weights`, `cloud`, or `external` |
| `transport` | how the request travelled: `ollama-http`, `claude-cli`, `codex-cli` |
| `cost_basis` | `free-local`, `provider-reported`, `estimated-api-equivalent`, or `unknown` |
| `tokens_in`, `tokens_out` | split counts when the provider reports them |
| `tokens_total` | total-only count (Codex) |
| `done_reason` | provider stop reason (`stop`, `length`, …) when reported |
| `cost_usd` | returned cost, or estimate from `config/prices.json`; null when unknown |
| `wall_ms` | wall-clock for the call |
| `accepted` | set by `accept`, never by hand |
| `retries` | incremented each time `accept` runs for the task |
| `exit_code` | exit code of the acceptance command |
| `note` | free text; batch items record `item=<id>`, errors record `error: …` |

Rows written before 0.3.0 lack the settings fields. They are left as they were;
a missing field means unknown, never zero.

## Verbs

```powershell
./scripts/route.ps1 defer  -Task t1 -Reason "handled in-session"
./scripts/route.ps1 accept -Task t1 -Cmd "pytest -q"      # last entry
./scripts/route.ps1 accept -Task t1 -Cmd "pytest -q" -All # every entry
./scripts/route.ps1 report
./scripts/route.ps1 report -ByClass    # one row per class/route/model
./scripts/route.ps1 report -ByEffort   # one row per effort/route/model
./scripts/route.ps1 report -Json
```

`accept` exits with the command's code, so it composes in scripts and CI.

`-All` marks every entry for the task, which is intended for batch items that
share one artifact. On a task that has both a self attempt and an external
attempt it would mark both accepted — use the default form there.

## Reading `report`

| Column | Meaning |
|---|---|
| `class` | work class, present with `-ByClass` |
| `effort` | model-side rung, present with `-ByEffort` |
| `attempts` | ledger events for that route/provider/model |
| `accepted` | events whose acceptance command exited 0 |
| `accept_rate` | accepted / attempts, percent |
| `avg_wall_ms` | mean call wall-clock |
| `tokens` | sum of in+out, or total when split is unavailable |
| `cost_usd` | sum of known costs — blank means "not knowable" |
| `cost_per_accepted` | cost / accepted; blank when cost or acceptance is missing |

A blank cost is honest, not zero. Codex returns a single token count, so its
cost stays unknown until a price split is supplied; do not fill it in with a
guess.

`execution` and `transport` are separate on purpose. A batch row for
`deepseek-v4.1-flash:1017-cloud` says `execution=cloud` and
`transport=ollama-http`: the request used the local endpoint, but the weights did
not run here, so its `cost_basis` is `estimated-api-equivalent` (or `unknown`),
never `free-local`. Only rows whose weights actually ran locally carry
`free-local`.

## What to do with it

- **Per task class**, compare attempts and acceptance across routes. A route that
  needs two attempts to be accepted is not cheaper than one that needs zero.
- **Promotion rule**: external enters a class only after three cases where self
  failed twice and external passed first.
- **Demotion rule**: external leaves a class when its acceptance rate stops
  beating self's.
- **Retention**: keep the file. It is small, append-only except for acceptance
  updates, and it is the only longitudinal evidence this skill has.

## Privacy

Task labels, model names, token counts and costs are recorded. Do not put
prompts or file contents in `-Task`. Do not commit `.state/`.

## Known limits

- **No locking.** `accept` rewrites the whole file while `batch` appends to it.
  Do not run them against the same ledger at the same time.
- **`-All` is coarse** (see above): it marks every entry for a task, which suits
  a batch but not a task with attempts on several routes.
- **Old rows are sparse.** Entries written before 0.1.1 may lack `class` or
  `tokens_total`; the report shows `uncategorized` and blank tokens rather than
  guessing.
- **`.state/` is not in git**, so published numbers cannot be reproduced from
  the repository alone. That is deliberate — the ledger leaks project detail.
