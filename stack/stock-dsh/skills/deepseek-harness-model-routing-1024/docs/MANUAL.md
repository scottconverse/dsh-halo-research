# Native plugin v0.1.0

For both DSH Web and Desktop, see the [plugin manual](../plugin/README.md). The root companion skill is intentionally short. Native model_route delegates to the unchanged route.ps1; normal chat/subagent selection remains DSH-owned.

# User manual

DeepSeek Harness Model Routing 1024 — a model-routing skill for DSH Desktop.

If you only read one section, read [Quick start](#quick-start). If you want the
reasoning behind the rules, read [Mental model](#mental-model) and
[references/decision-rubric.md](https://github.com/scottconverse/deepseek-harness-model-routing-1024/blob/main/references/decision-rubric.md).

---

## Mental model

The session model is the default lane. Its inference is already paid for by the
turn, so the only real costs are wall-clock and rework. Everything else in this
skill follows from that:

| Lane | What it is | When |
|---|---|---|
| **Self** | the DSH session model | everything, by default |
| **Local** | Ollama on this machine | homogeneous, checkable, private batch work |
| **External** | `claude -p`, `codex exec` | a capability ceiling, a named-risk audit, a worktree delegation |

Three ideas make it work:

1. **Capability floor before cost.** Cost ordering only applies once the task is
   within a lane's ability. Ambiguity, architecture, irreversible changes and
   exact algorithms start high.
2. **Reasoning effort and verification are different things.** Effort is a
   request setting (`think`, `--effort`, `model_reasoning_effort`); verification
   is what you do around the work. DSH exposes effort for the session model, but
   a direct HTTP call does not inherit DSH's model configuration, so the skill
   resolves and records it itself. For this model the default is **low**; higher
   rungs are an explicit choice, never an automatic escalation.
3. **Acceptance is a command.** `accept -Cmd "pytest -q"` records the exit code
   and marks the task. `report` divides cost by accepted items, not by attempts.

> **Effort is not a remedy for a wrong approach.** In a 164-task HumanEval sweep
> at the 64K allowance, `off` passed 159, `low` 164, and `high` and `max` 161
> each — with two cap-exhausted attempts at each of high and max. Raising the
> rung bought cost, not correctness. See [EVIDENCE.md](EVIDENCE.md).

---

## Install

Copy this folder into the skills directory DSH reads for your profile:

```powershell
$dst = Join-Path $env:DSH_HOME 'skills\deepseek-harness-model-routing-1024'
robocopy . $dst /E /XD .git .state /NFL /NDL /NJH /NJS /NP
```

Start a new DSH session (the skill catalog is read at session start). Confirm it
appears in the skill list, or just ask for routing and watch the skill load.

**Requirements:** PowerShell 7+, Python 3.11+ only if you use the test suite,
Ollama for the local lane, `claude` and/or `codex` CLIs for the external lane.
Missing lanes are reported by `probe` and are not blockers.

**Uninstall:** delete the folder above. Nothing else is modified — the ledger
lives in `.state/` inside the skill folder and is never written outside it.

---

## Quick start

```powershell
cd $env:DSH_HOME\skills\deepseek-harness-model-routing-1024

# 1. What is reachable right now (no model calls)
./scripts/route.ps1 probe

# 2. A local batch
@'
{"id":"a","prompt":"Classify into one word (billing, bug, feature, other): ..."}
{"id":"b","prompt":"..."}
'@ | Set-Content items.jsonl
./scripts/route.ps1 batch -Model qwen3.8:27b-q4_K_M -PromptFile items.jsonl -Task triage -Class support

# 3. Decide whether it passed
./scripts/route.ps1 accept -Task triage -Cmd "python check_batch.py" -All

# 4. What did accepted work cost?
./scripts/route.ps1 report -ByClass
```

---

## Command reference

```
route.ps1 <verb> [options]
```

| Verb | Purpose |
|---|---|
| `probe` | what is reachable now; `-Smoke` adds one-word calls (spends quota) |
| `call` | one model call, one ledger line, one receipt |
| `batch` | fan-out over JSONL items; local weights free, the 1017 cloud model allowed and estimated |
| `accept` | run the acceptance command and record the result |
| `defer` | record work that stays in-session |
| `report` | attempts, acceptance, cost per accepted item |
| `prices` | how a model will be classified and what rate it uses |
| `settings` | resolved effort, output allowance and context handling for a model |
| `help` | the short version |

### Global options

| Option | Default | Meaning |
|---|---|---|
| `-Task` | `adhoc` | task label; `accept` matches on it |
| `-Class` | `uncategorized` | work class for `-ByClass` reporting |
| `-Effort` | `default` | `default` uses the model's configured default (or the provider's, if the model has none); otherwise `off`, `low`, `medium`, `high`, `xhigh`, `max`, validated per provider |
| `-MaxTokens` | unset | output allowance; only sent to Ollama. Overrides a model default |
| `-TimeoutSec` | `600` | Ollama HTTP timeout |
| `-DryRun` | off | print the resolved settings and request body, write nothing |
| `-Json` | off | machine-readable output |

### `call`

```powershell
./scripts/route.ps1 call -Route local|external -Model M `
  (-Prompt "..." | -PromptFile path) [-Provider claude|codex|ollama] `
  [-Task T] [-Class C] [-Effort L] [-MaxTokens N] [-TimeoutSec N] [-DryRun] [-Json]
```

- Provider is inferred from the model name (`claude*`/`haiku|sonnet|opus|fable`
  → claude, `gpt*` → codex, otherwise ollama) unless `-Provider` is given.
- `-Route self` is refused on purpose: self is the session, not a subprocess.
  Use `defer` to record work you did in-session.
- Prompts go in on **stdin**, never as a command argument — quotes, newlines and
  backticks in a prompt cannot break the call.
- Each call appends to `.state/ledger.jsonl` and prints a `[receipt]` line with
  provider, model, tokens, cost and wall time.

### `batch`

```powershell
./scripts/route.ps1 batch -Model M -PromptFile items.jsonl `
  [-Parallel 2] [-Effort L] [-MaxTokens N] [-Out results.jsonl] [-Task T] [-Class C] [-DryRun]
```

- Input: JSONL with `{"id": "...", "prompt": "..."}` per line.
- Output: JSONL with `id`, `text`, token counts, wall time, and `error` when a
  call failed.
- Local by default. It refuses `-Route external` and every cloud tag except
  `deepseek-v4.1-flash:1017-cloud`. That model runs in the cloud over the same
  endpoint, consumes Ollama subscription/quota, and is priced as an
  API-equivalent estimate (or `unknown`), never as free local inference.
- Keep `-Parallel` at 1–2: local engines serialise or thrash under load.

### `accept`

```powershell
./scripts/route.ps1 accept -Task T -Cmd "pytest -q" [-All]
```

Runs the command in a child PowerShell, records its exit code, marks the task
accepted when it exits 0, and increments `retries`. It exits with the command's
code, so it composes in scripts and CI.

`-All` marks every entry for the task — intended for batch items that share one
artifact. On a task with attempts on several routes, use the default (last
entry) instead.

### `report`

```powershell
./scripts/route.ps1 report [-ByClass] [-ByEffort] [-Json]
```

Columns: attempts, accepted, accept rate, average wall time, tokens, known cost,
and cost per accepted item. Blank cost means “not knowable”, never zero.

### `prices`

```powershell
./scripts/route.ps1 prices -Model deepseek-v4.1-flash:1017-cloud
# -> cloud; $0.15/M in, $0.6/M out
```

Useful for answering “why is this cost blank?” without spending a call.

---

## Configuration

| Setting | Default | Notes |
|---|---|---|
| `DSH_ROUTING_LEDGER` | `.state/ledger.jsonl` | point it elsewhere to isolate a campaign |
| `OLLAMA_BASE` | `http://127.0.0.1:11434` | any OpenAI/Anthropic-compatible Ollama host |
| `config/prices.json` | shipped | API-equivalent list rates, informational, dated |
| `config/model-settings.json` | shipped | per-model effort, output allowance and context handling |

### Per-model request settings

Direct HTTP calls do **not** inherit DSH's model configuration; they go straight
to the provider. Models listed in `config/model-settings.json` therefore get
their settings sent explicitly, and every call records what was sent.

The one entry shipped today:

```json
"deepseek-v4.1-flash:1017-cloud": {
  "provider": "ollama",
  "effort": "low",
  "max_tokens": 65536,
  "context": { "handling": "provider-managed", "advertised": 1048576 }
}
```

- `effort` becomes `think: "low"` in the Ollama request.
- `max_tokens` becomes `options.num_predict: 65536`.
- `context` is **recorded**, not enforced. Ollama cloud models use their maximum
  context by default; the skill does not send `num_ctx`, because sending it
  would not enforce the cloud context size.

Any model not listed keeps the provider's own settings: no `think`, no
`num_predict`. Override per call with `-Effort` or `-MaxTokens`; the ledger
records the override as `explicit` rather than as a model default. Inspect the
resolved result without making a call:

```powershell
./scripts/route.ps1 settings -Model deepseek-v4.1-flash:1017-cloud
```

Prices are **not** what a subscription charges. They exist so a report can show a
dollar column when the provider returns one, or estimate it when it does not.
Local weights are priced at zero; cloud-tagged models are not.

---

## Recipes

### 1. Triage 300 support messages locally

```powershell
./scripts/route.ps1 batch -Model qwen3.8:27b-q4_K_M `
  -PromptFile messages.jsonl -Out triage.jsonl -Task triage -Class support
./scripts/route.ps1 accept -Task triage -Cmd "python check_triage.py" -All
```

Expected on this machine: ~23 s per item at parallel 2, zero dollars. If the
local model is too weak, check ten items first; do not escalate the whole batch.

### 2. Ask for an external review of a named risk

```powershell
./scripts/route.ps1 call -Route external -Model gpt-6.1-sol `
  -PromptFile review-brief.txt -Task auth-review -Class security
./scripts/route.ps1 accept -Task auth-review -Cmd "python verify_findings.py"
```

Use this when a *specific* risk is named (rollback path, tenant boundary,
concurrency). “Another opinion” is not a reason.

### 3. Delegate an isolated implementation

Never let an external model edit the live tree:

```powershell
git worktree add ../wt-fix -b ext/fix
codex exec -m gpt-6.1-sol --cd ../wt-fix -s workspace-write "..." < brief.txt
git -C ../wt-fix diff > proposal.patch
# review, apply, then:
./scripts/route.ps1 accept -Task fix -Cmd "pytest -q"
```

Full checklist in [references/worktree-protocol.md](https://github.com/scottconverse/deepseek-harness-model-routing-1024/blob/main/references/worktree-protocol.md).

### 4. Record in-session work

```powershell
./scripts/route.ps1 defer -Task migration -Class auth -Reason "handled in-session, independently verified"
```

Keeps the ledger honest about work that never went through `call`.

### 5. Compare two configurations

```powershell
./scripts/route.ps1 report -ByEffort -Json | ConvertFrom-Json | Format-Table
```

Only compare within a class and an effort rung. A cost comparison across rungs
is not a comparison.

---

## Ledger and reporting

One JSON line per event at `.state/ledger.jsonl` (git-ignored):

```json
{"id":"a1b2c3d4e5f6","ts":"2026-10-25T00:10:48Z","task":"verify-settings","class":"smoke",
 "requested_model":"deepseek-v4.1-flash:1017-cloud","served_model":"deepseek-v4.1-flash:1017",
 "provider":"ollama","model":"deepseek-v4.1-flash:1017-cloud",
 "effort":"low","effort_source":"model-default",
 "max_tokens":65536,"max_tokens_source":"model-default",
 "context_handling":"provider-managed","advertised_context":1048576,
 "tokens_in":9,"tokens_out":18,"tokens_total":null,"done_reason":"stop",
 "cost_usd":0.000012,"wall_ms":371,"accepted":false,"retries":0,"exit_code":0,"note":null}
```

`served_model` is whatever the provider said it ran; when the provider reports
nothing, the field is null rather than a copy of the request. `advertised_context`
is the capacity the provider claims, not an observed or enforced limit.

Fields are documented in [references/ledger.md](https://github.com/scottconverse/deepseek-harness-model-routing-1024/blob/main/references/ledger.md).
Promotion rule: move a task class to an external lane only after three cases
where self failed acceptance twice and the external lane passed first. Demote
when the external lane stops beating self.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `claude exited 1` | not signed in | run `claude` once interactively, or `claude doctor` |
| `codex exited … not supported` | wrong slug | `./scripts/route.ps1 probe`, then check `~/.codex/models_cache.json` |
| `ollama unreachable` | server not running | start Ollama; `probe` will list local and cloud tags |
| `batch refuses cloud tags` | model ends in `cloud` (other than the allowed 1017) | pull local weights, or use `call` for a one-off |
| `No ledger entries for task` | task label mismatch | `report` shows labels; `accept` matches exactly |
| `Effort 'xhigh' is not valid for provider 'ollama'` | per-provider validation | use `low`/`medium`/`high`/`max`, or `off` for Ollama |
| Cost column blank | provider returned no split | expected for Codex; leave it blank |
| `skipping malformed ledger line` | hand-edited JSONL | back up, remove the bad line |

Run the self-test after any edit:

```powershell
./scripts/test_route.ps1          # 60 unit assertions, no network
./scripts/test_batch_offline.ps1  # 22 mock assertions, local HTTP mock only
```

---

## Known limits

- **Context is advertised, not enforced.** The 1,048,576-token capacity for
  `deepseek-v4.1-flash:1017-cloud` is recorded as provider-managed. The skill
  does not send `num_ctx`; Ollama's own documentation says cloud models use their
  maximum context by default, and sending `num_ctx` would not enforce it. An
  observed limit, when one appears, is a separate fact from the advertised one.
- **Output allowance is a request, not a guarantee.** `num_predict: 65536` is
  sent, and the ledger records the provider's stop reason and actual token count
  so the difference is visible.
- **No locking.** `accept` rewrites the ledger while `batch` appends. Do not run
  both against the same ledger simultaneously.
- **Execution is local and unsandboxed.** Acceptance commands run as you.
- **Single-attempt evidence.** The bundled evidence is one attempt per cell.
- **License not chosen.** Add one before publishing.

## FAQ

**Does it change my DSH settings?** No. It only reads environment variables and
writes its own `.state/`.

**Can I use it outside DSH?** Yes — it is a PowerShell script. Any harness that
can run `pwsh` can call it.

**Why does `call -Route self` fail?** Because self is the running session, not a
subprocess. Use `defer` to record that work.

**How do I make it cheaper?** Use `low` for self, local for batch, and accept
that every external call carries ~22.5k tokens of Codex overhead before it reads
your prompt.




