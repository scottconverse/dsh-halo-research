# Bounded local LM Studio helper

The specified `scripts/ask_local.py` helper path is `C:/Users/scott/.codex/skills/openai-multi-agent/scripts/ask_local.py`. Once installed, it provides one-shot access to tuned local models. It is a bounded helper, not an autonomous coding agent: it sends a prompt and optional context files directly to the loaded LM Studio instance and writes the answer and a `.receipt.json` record with the requested model, instance ID, actual response model when supplied, token usage, reasoning count, and timing. It does not run a custom tool loop or tune models/global settings.

Use `--role coder` for bounded coding drafts and mechanical tasks. Use `--role brain` for bounded review or analysis. The helper accepts `--prompt-file`, repeatable `--context-file`, and `--output-file`. `--reasoning high` applies to brain only; coder defaults to no reasoning. `--max-tokens` bounds the response. Defaults preserve the current loaded instance when one is available. A newly loaded model remains resident so the helper does not unload another model.

Example:

```powershell
python C:/Users/scott/.codex/skills/openai-multi-agent/scripts/ask_local.py `
  --role brain --reasoning high --prompt-file $promptFile `
  --context-file $briefFile --output-file $resultFile
```

Keep source edits, tests, and tool-using implementation on Ollama DeepSeek by default. Review the helper output and receipt, then verify any proposed code or findings against the actual source. The helper's availability, output, or model load does not prove correctness or autonomous agent capability. Do not inspect, start, reconfigure, download, benchmark, tune, or unload local models outside a task that calls for the bounded helper; newly loaded models remain resident.
