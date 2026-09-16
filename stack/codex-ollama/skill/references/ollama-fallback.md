# Scott's usage-aware worker routing

Applies to Codex development work on this machine. This is routing guidance, not a background service or a guarantee that the current lead can change its own model.

## Check usage

Use the live `get_usage_limits` Codex app tool (currently `mcp__codex_app__get_usage_limits`). Scott calls this `/usage`; no installed skill with that exact name was found. Do not substitute retrospective token totals for account quota.

- Check at the start of substantial work. Before new worker dispatch, refresh if the last reading is more than five minutes old.
- During sustained work, check at the next task/tool boundary about every 15 minutes. Do not create a scheduled job or poll while idle.
- Prefer `rateLimitsByLimitId.codex`; use the legacy main `rateLimits` only when the named bucket is absent. Exclude unrelated buckets such as Codex Spark.
- For each available primary/secondary window, remaining is `max(0, min(100, 100-usedPercent))`. Use the lowest available remaining percentage. A missing, null, or nonnumeric value is unknown, not zero.
- Below 10 percent: Ollama workers. Exactly 10 percent or above: Sol/Terra/Luna remain available. Check live again after a reset before returning to OpenAI workers.
- If quota is unavailable, disclose that fact and refresh it; do not claim the threshold was crossed. Retain the last verified routing state until a fresh reading is available.

## Assign work

With sufficient quota, retain the existing smallest-effective-team and Luna/Sol/Terra assignment rules. Once below the threshold, do not start new OpenAI implementation or review workers. Let already-running workers finish their bounded slice; hand subsequent implementation, diagnosis, tests, and review to DeepSeek. Astra only defines tasks, tracks results, and coordinates handoffs. Its coordination still consumes Codex usage and cannot continue once provider limits prevent it.

The exact fallback model is `deepseek-v4.1-flash:cloud`, served by the signed-in Ollama account. Do not replace it with another DeepSeek release or a local model. Do not silently use a separately billed OpenAI API key or redeem a reset credit.

The native `spawn_agent` control currently exposes OpenAI models only. Use the existing Codex CLI with its Ollama profile for DeepSeek workers, not a fictitious native subagent model:

```powershell
$taskText | & 'C:/Users/scott/AppData/Roaming/npm/codex.cmd' exec `
  --profile ollama-deepseek --model deepseek-v4.1-flash:cloud `
  --cd $workspace --json --output-last-message $resultFile -
```

Operate this through tools; Scott does not need to use a terminal. Give a self-contained task, file ownership, acceptance criteria, and output paths. Use the host's authorized permissions; the profile does not narrow Scott's standing access. Avoid competing workers editing the same files. Capture exit status, model/provider identity, results, and tests; a launched process alone is not success.

Profile: `C:/Users/scott/.codex/ollama-deepseek.config.toml`. Endpoint: `http://127.0.0.1:11434/api/codex/v1`, Ollama's stock Codex desktop router. The profile's `openai` provider name selects Codex's authenticated transport; the router sends this allow-listed DeepSeek model to Ollama Cloud, not OpenAI inference. The plain CLI-generated `ollama-launch` profile at `/v1/` failed the initial tool-loop check; do not use it for fallback. The desktop route passed actual file editing and test execution with reasoning set to `low`.

No GPU model is required. Keep Ollama running and signed in. If the worker route fails, report the actual failure and repair that connection; do not silently spend the reserved OpenAI allowance on implementation.
