# Scott's usage-aware worker routing

Applies to Codex development work on this machine. DeepSeek and tuned local helpers are the default for implementation and tests; this is routing guidance, not a background service or a guarantee that the current lead can change its own model.

## Check usage

Use the live `get_usage_limits` Codex app tool (currently `mcp__codex_app__get_usage_limits`). Scott calls this `/usage`; no installed skill with that exact name was found. Do not substitute retrospective token totals for account quota.

- Check at the start of substantial work. Before new worker dispatch, refresh if the last reading is more than five minutes old.
- During sustained work, check at the next task/tool boundary about every 15 minutes. Do not create a scheduled job or poll while idle.
- Prefer `rateLimitsByLimitId.codex`; use the legacy main `rateLimits` only when the named bucket is absent. Exclude unrelated buckets such as Codex Spark.
- For each available primary/secondary window, remaining is `max(0, min(100, 100-usedPercent))`. Use the lowest available remaining percentage. A missing, null, or nonnumeric value is unknown, not zero.
- Below 10 percent remaining in either available main Codex window: do not start new premium OpenAI workers. Keep implementation and tests on Ollama and bounded local helpers. At 10 percent or more, selective native Sol/Terra/Luna workers may be used when the task warrants them. The 1–5% Astra, 6–9% native worker, and 90%+ cloud/local figures are workload targets, not quota thresholds or measured guarantees.
- If quota is unavailable, disclose that fact and refresh it; do not claim the threshold was crossed. Retain the last verified routing state until a fresh reading is available.

## Assign work

Use the smallest effective team. Route implementation, diagnosis, and tests to DeepSeek by default, with tuned local helpers handling bounded drafts or mechanical tasks. Use Astra for coordination and bounded high-judgment work, and use native Sol/Terra/Luna subagents selectively when quota and task value support them; use exposed model IDs `gpt-5.6-sol`, `gpt-5.6-terra`, or `gpt-5.6-luna` with a fresh bounded brief when required by the runtime. At 10% remaining or more, they may be started when useful. Below 10% remaining in either available main Codex window, do not start new premium OpenAI workers. Astra coordination still consumes Codex usage and cannot continue once provider limits prevent it.

The default cloud execution model is exactly `deepseek-v4.1-flash:cloud`, served by the signed-in Ollama account. Keep bounded local helper tasks on their separate LM Studio route. Do not substitute another DeepSeek release for cloud execution, use a separately billed OpenAI API key, or redeem a reset credit automatically.

The native `spawn_agent` control currently exposes OpenAI models only. Use the existing Codex CLI with its Ollama profile for DeepSeek execution, not a fictitious native subagent model:

```powershell
$taskText | & 'C:/Users/scott/AppData/Roaming/npm/codex.cmd' exec `
  --profile ollama-deepseek --model deepseek-v4.1-flash:cloud `
  --cd $workspace --json --output-last-message $resultFile -
```

Operate this through tools; Scott does not need to use a terminal. Give a self-contained task, file ownership, acceptance criteria, and output paths. Use the host's authorized permissions; the profile does not narrow Scott's standing access. Avoid competing workers editing the same files. Capture exit status, model/provider identity, results, and tests; a launched process alone is not success.

Profile: `C:/Users/scott/.codex/ollama-deepseek.config.toml`. Endpoint: `http://[::1]:11434/api/codex/v1`, Ollama's stock Codex desktop router. The profile's `openai` provider name selects Codex's authenticated transport; the router sends this allow-listed DeepSeek model to Ollama Cloud, not OpenAI inference. The plain CLI-generated `ollama-launch` profile at `/v1/` failed the initial tool-loop check; do not use it for fallback. Keep the profile's model, high reasoning default, and stock router. High reasoning is selected based on the focused September 16 helper implementation trial; do not generalize that single task into a reliability guarantee.

No GPU model is required. Keep Ollama running and signed in. If the worker route fails, report the actual failure and repair that connection; do not silently spend the reserved OpenAI allowance on implementation.
