# Optional Ollama worker connection

This reference applies only when the owner explicitly requests this worker integration. It is not the normal routing policy for coding work. Current owner instructions, provider choices, effort and usage limits take precedence. No automatic workers, additional reviewers, token-share targets, artificial minimum spending or quota-polling loop.

## Select the authorized route

The checked-in worker profile selects `deepseek-v4.1-flash:1017-cloud` through the dedicated `ollama-code-worker` provider at `http://127.0.0.1:11434/v1`, with reasoning effort `none` (Off). Read the selected profile rather than restoring a historical model ID or endpoint from this document. Do not change an installed profile as part of repository documentation work.

A configured integration does not establish that a native `spawn_agent` tool accepts its model. Use only a provider/control path actually exposed in the active environment. Do not invent a native DeepSeek subagent option or substitute a separately billed API key.

## Packaged launcher

The repository source is `stack/codex-ollama/skill/scripts/run_ollama_code_worker.py`. An installed copy may live under `%USERPROFILE%\.codex\skills\openai-multi-agent\scripts`; publishing source does not deploy that copy.

```powershell
python -B <PATH_TO_LAUNCHER> `
  --profile <AUTHORIZED_PROFILE.toml> `
  --cwd <WORKTREE> --prompt-file <SHORT_BRIEF> `
  --result-file <RESULT> --events-file <EVENTS> `
  --stderr-file <STDERR> --receipt-file <RECEIPT>
```

Operate through the available tools; the owner does not need to type commands. Supply a short self-contained assignment, file ownership, focused acceptance and expected return report. Keep prompts/results/logs in a private task directory. Do not send the entire coordinator conversation or unrelated skill catalogs.

The launcher reads explicit profile overrides because supported Codex CLI versions can differ in their handling of `--profile` with `--ignore-user-config`. The restricted worker profile disables optional app/plugin/memory/search/multi-agent prompt surfaces. The separate full router profile is a selectable integration, not an automatic fallback.

Use `--resume <SESSION_ID>` only for an authorized continuation with a short new brief. The launcher rejects an unexpected returned session ID. Each invocation receipt has its own `invocation_id`; a resumed session ID is not an invocation identity. Missing or inconsistent final output remains a failure.

## Bound the assignment

Use one worker for one bounded task. Reproduce a defect when practical, inspect the relevant files, edit, run meaningful affected and required checks, and return the actual result. Reuse passed evidence unless new edits or an unresolved failure justify another check. Keep waiting in tools rather than repeatedly replaying the lead context. Stop when the outcome and authorized delivery are complete.

If the route fails, report the concrete error. Do not silently load another local model, create an agent team, change defaults, spend money, or retry indefinitely. After two failures with the same cause, diagnose and change approach before another attempt. Preserve state and evidence when handing off or compacting.

## Accounting limits

The historical September 16 work and its incomplete raw-token-share target are described in `docs/HALO-CODEX-WORKER-REPAIR-2026-09-16.md`. Those measurements do not establish current reliability or justify more work to improve a ratio. New invocation IDs help distinguish resumed invocations but do not solve aggregate accounting by themselves. The local `report_offload_usage.py` prototype is not published: its completed/partial checkpoint accounting can overlap. Do not use it to claim final totals.
