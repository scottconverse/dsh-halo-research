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

The native `spawn_agent` control currently exposes OpenAI models only. Use the existing Codex CLI through the packaged launcher for DeepSeek execution, not a fictitious native subagent model:

```powershell
python -B C:\Users\scott\.codex\skills\openai-multi-agent\scripts\run_ollama_code_worker.py `
  --cwd <WORKTREE> --prompt-file <SHORT_BRIEF> `
  --result-file <RESULT> --events-file <EVENTS> `
  --stderr-file <STDERR> --receipt-file <RECEIPT>
```

Operate this through tools; Scott does not need to use a terminal. Give a self-contained task, file ownership, acceptance criteria, and output paths. Use the host's authorized permissions; the profile does not narrow Scott's standing access. Avoid competing workers editing the same files.

The launcher is a thin adapter over the stock `codex exec` tool loop. It writes a machine-readable receipt and reports success only when the child exits 0, a `turn.completed` event is present, and the nonempty authoritative `--output-last-message` artifact is present. A nonempty stdout `agent_message` must match that artifact; empty authoritative output or a mismatch fails, so commentary or an earlier status message cannot pass as the final answer. **Exit 0 alone is not success**; require `"success": true` in the receipt and read the actual diff, tests and final text. It rejects prompt/output path collisions before truncating any file, so a mistyped command cannot overwrite the brief. A stopped, unfinished worker can be continued on the same CLI session with `--resume <SESSION_ID>`, taking the ID from the previous receipt; pass a fresh short brief rather than replaying the coordinator conversation. A resumed run that returns a different session id is reported as failed, so continuity is never assumed.

For code execution, use `C:/Users/scott/.codex/ollama-deepseek-code-worker.config.toml` with `--ignore-user-config`. It uses a dedicated custom Responses provider at `http://[::1]:11434/v1`, a one-row DeepSeek catalog, and no web-search, app, plugin, memory, multi-agent, or skill-catalog prompt surface. This is deliberately stateless because Ollama's stateful follow-up handling is under repair. The full stock-router profile remains `C:/Users/scott/.codex/ollama-deepseek.config.toml` at `http://[::1]:11434/api/codex/v1`; reserve it as the selectable restoration and web-research path. High reasoning is selected based on the focused September 16 helper implementation trial; do not generalize that single task into a reliability guarantee.

No GPU model is required. Keep Ollama running and signed in. If the worker route fails, report the actual failure and repair that connection; do not silently spend the reserved OpenAI allowance on implementation.

## Bound the worker job

Start a fresh worker with a short file-based brief. Name the owned files and the failing behavior, not a prewritten patch. For a bounded fix, inspect the relevant code sections, run one baseline only if needed, edit, run the focused post-edit checks and `git diff --check`, then return the result. Repeat checks only for a new edit, failure or unresolved concern. Use `python -B` to avoid bytecode cleanup work; do not spend turns removing ignored generated caches. Preserve applicable repository instructions. Do not feed the coordinator conversation or unrelated installed skills into the worker.

The launcher reads the saved profile into explicit supported CLI overrides because the installed CLI does not reliably load `--profile` together with `--ignore-user-config`, and native Codex 0.147.0 cannot combine `--profile` with `--ignore-user-config` at all. The older full profile is retained for restoring its optional tools; its known compatibility limitations remain.

Measured limitations: the September 16 realpath code task completed unaided in 114 s, but used 530,485 cumulative tokens and missed the efficiency target. A later launcher/acceptance pair owned the launcher repair end to end and found a genuine resume-continuity bug in the launcher itself with a regression test; the final correctness pass required nonempty authoritative final output and rejected mismatched stdout evidence. The whole-task premium share still dominated because the same long coordinator conversation was replayed every root turn. Do not describe this as a proven 90% offload system. The future pattern that should meet it is one compact root dispatch, one worker-owned implementation through tests and docs, and at most one fresh acceptance worker - no repeated root review of the source.
