# External calls

Read before the first `claude` or `codex` call in a session. Everything here was
measured from this repo's scripts on 2026-10-24 unless marked otherwise.

## How `route.ps1 call` invokes them

Provider is inferred from the model name unless `-Provider` is passed:

| Model pattern | Provider | Command |
|---|---|---|
| `haiku`, `sonnet`, `opus`, `fable`, `claude-*` | claude | `claude -p --model <M> --output-format json` |
| `gpt-*` | codex | `codex exec -m <M> -s read-only --skip-git-repo-check -o <tmp>` |
| anything else | ollama | `POST /api/chat` |

The prompt goes in on **stdin**, never as a command argument. That avoids the
Windows quoting class of bug entirely and lets prompts contain quotes, newlines
and backticks. Do not "improve" this into `-p "$prompt"`.

`claude --output-format json` gives a `result` plus `usage.input_tokens`,
`usage.output_tokens` and `total_cost_usd`. `codex -o <file>` gives the clean
final message; the token count comes from the `tokens used` line in stdout, and
it is a **total**, not an input/output split — so the ledger records
`tokens_total` and leaves cost unset for Codex.

## Effort per lane

`-Effort low|medium|high|xhigh|max` is passed to whichever lane is called, and
`default` (the omission case) sends nothing so the provider decides:

| Lane | Field | Verified |
|---|---|---|
| Ollama | `think: "<level>"` in the request body | yes — `think: high` returned a thinking block |
| Claude Code | `--effort <level>` | yes — flag present in `claude --help` |
| Codex | `-c model_reasoning_effort=<level>` | yes — printed `reasoning effort: high` |

The ledger records the rung, and `report -ByEffort` groups on it, because a cost
or acceptance comparison across different rungs is not a comparison.

## What a call costs before it does anything

| Lane | Fixed overhead | Receipt shape |
|---|---|---|
| Local Ollama (local weights) | none | `in=` / `out=` from `prompt_eval_count` / `eval_count`, cost $0 |
| Claude Code | small; returns real usage | `in=` / `out=` and `total_cost_usd` |
| Codex | **~22.5k tokens per call**, before your prompt | `total=` only |

Measured one-word calls: Codex Luna 22,528; Sol 23,220; Astra 22,794. Claude
haiku: in=2, out=4, $0.0051, 6.8s. Codex calls took ~5s of wall time but the
token spend is the point — this is why `batch` refuses paid lanes.

## Failure modes seen in the wild

- **A model list is not a health check.** OpenCode Zen's `/v1/models` returned 85
  models while `/v1/chat/completions` returned HTTP 403 on every attempt,
  including with browser headers. Probe with a completion.
- **A wrong model ID reads like "no access."** Codex returns
  `400 … not supported with a ChatGPT account` for a slug that does not exist.
  Check `~/.codex/models_cache.json` (or `codex exec` once) before concluding a
  tier is unavailable.
- **Codex writes files by default in an interactive run.** `route.ps1` always
  passes `-s read-only`; implementation delegation goes through a worktree
  (`worktree-protocol.md`), never the live tree.
- **Silent fallback.** Claude can route a request to an older model on a safety
  trigger, and Codex can fall back on missing metadata. If a result looks unlike
  the model you asked for, check the served model before blaming the model.

## Timeouts

`-TimeoutSec` applies to Ollama's HTTP call. Native CLI calls are not hard-killed
by the script; the DSH tool timeout is the backstop. For long Codex jobs, run
`route.ps1 call` as a background job and collect it, rather than raising the
tool timeout.

## Prices

`config/prices.json` holds API-equivalent list rates for estimating cost when the
provider does not return one. They are informational: a subscription does not
charge them, and they moved repeatedly in October 2026. Local weights are priced
at zero; cloud-tagged Ollama models (`:cloud`, `-cloud`) are not, and the ledger
will show `cost=n/a` until you add a rate. Check what a model will be treated as
with `route.ps1 prices -Model <M>`.
