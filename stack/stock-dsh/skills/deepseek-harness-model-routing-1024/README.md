# DeepSeek Harness Model Routing 1024

**Self first. Local for batch. External only when it pays.**

A model-routing skill for **DSH Desktop** that treats the session model as the
default lane, uses local Ollama for free batch work, and treats a Claude or
Codex call as an exception that must pass an explicit escalation test.

`0.3.1` · 60 unit tests + 22 mock assertions · PowerShell 7 · Windows-first

---

## Why this is not a cost router

The usual routing skill sorts by price per token. Inside DSH that optimises the
wrong variable: the session model's inference is already paid for by the turn, so
its marginal dollar cost is zero. What actually costs you is **wall-clock and
rework**.

So this skill optimises **cost per accepted item** — and it makes “accepted” a
command's exit code rather than a judgment call.

## Lanes

| Lane | What it is | Use it for | Cost |
|---|---|---|---|
| **Self** | the DSH session model | everything, by default | already paid |
| **Local** | Ollama on this machine | homogeneous, checkable, private batch work | free |
| **External** | `claude -p`, `codex exec` | capability ceiling, named-risk audit, worktree delegation | your quota |

OpenCode Zen and Antigravity are not assumed. `probe` decides.

## Install

```powershell
$dst = Join-Path $env:DSH_HOME 'skills\deepseek-harness-model-routing-1024'
robocopy . $dst /E /XD .git .state /NFL /NDL /NJH /NJS /NP
```

Start a new DSH session so the skill catalog picks it up.

## Quick start

```powershell
./scripts/route.ps1 probe

./scripts/route.ps1 call  -Route local -Model qwen3.8:27b-q4_K_M `
  -PromptFile prompt.txt -Task summarize -Class docs

./scripts/route.ps1 accept -Task summarize -Cmd "pytest -q"

./scripts/route.ps1 report -ByClass
```

One call, one ledger line, one receipt. `accept` records the exit code; `report`
divides cost by accepted items, not by attempts.

## Commands

| Verb | Purpose |
|---|---|
| `probe` | what is reachable now; `-Smoke` adds one-word calls (spends quota) |
| `call` | one model call, one ledger line, one receipt |
| `batch` | fan-out over JSONL items; local weights are free, `deepseek-v4.1-flash:1017-cloud` is the one allowed cloud exception, priced as an estimate |
| `accept` | run the acceptance command and record the result |
| `defer` | record work that stays in-session |
| `report` | attempts, acceptance, cost per accepted item (`-ByClass`, `-ByEffort`) |
| `prices` | how a model will be classified and what rate it uses |
| `help` | the short version |

Full reference: [docs/MANUAL.md](docs/MANUAL.md).

## Verified, not asserted

- **60/60 unit tests and 22/22 mock assertions** — no network, no quota, no model calls.
- **Batch allows exactly one cloud model** — `deepseek-v4.1-flash:1017-cloud`, priced
  as an estimate, never as free local inference.
- **Explicit settings for the 1017 cloud model** — `think: low`, `num_predict: 65536`,
  and the 1M context recorded as provider-managed. `settings -Model ...` prints the
  resolved request without calling the model.
- **Real calls exercised end to end**: Claude `haiku` (`in=2 out=4 $0.0051`),
  Codex `luna` (`total=22,549`), Ollama `deepseek-v4.1-flash:1017-cloud` with
  `think: high` (`9 in / 18 out`, $0.000012).
- **164-task HumanEval sweep at four effort levels, 64K cap**: off 97.0%,
  low 100%, high 99.4%, max 99.4% — with two overthinking cap-loops each at
  high and max. Details and caveats in [docs/EVIDENCE.md](docs/EVIDENCE.md).

## Design rules

1. **Self first.** Escalate the model only after effort has been raised and a
   command has failed.
2. **Acceptance is a command.** No command, no “accepted”.
3. **Local is the batch lane.** Paid lanes refuse `batch`, deliberately.
4. **External models propose; you apply.** Worktree in, patch out, review, test.
5. **A model list is not a health check.** Probe with a completion.
6. **Blank cost is honest.** Never invent a number to fill a table.

## Documentation

- [Landing page](docs/index.html)
- [User manual](docs/MANUAL.md)
- [Evidence](docs/EVIDENCE.md)
- [Decision rubric](references/decision-rubric.md)
- [External calls](references/external-calls.md)
- [Worktree protocol](references/worktree-protocol.md)
- [Ledger](references/ledger.md)

## Not goals

- Not a leaderboard. Rankings appear only to justify a threshold, with dates.
- Not a multi-agent framework. One delegated artifact at a time.
- Not a replacement for tests. It decides *who* writes code, not whether it is
  right.

## Status

`0.3.1` — scripts, tests and docs working against the author's machine. Direct
Ollama calls for `deepseek-v4.1-flash:1017-cloud` send `think: low` and
`num_predict: 65536` explicitly and record the advertised 1M context as
provider-managed. Every other model keeps its provider defaults.

## License

Not chosen yet. Add one before publishing.




