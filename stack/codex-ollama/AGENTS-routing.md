## Codex usage and worker routing

- For substantial development work, follow `C:/Users/scott/.codex/skills/openai-multi-agent/references/ollama-fallback.md`. Use the live Codex usage reader at the start, before dispatch when the reading is older than five minutes, and at task boundaries about every 15 minutes during sustained work.
- Keep Sol/Terra/Luna workers while the minimum remaining main Codex quota is at least 10%. Below 10%, use Ollama `deepseek-v4.1-flash:cloud` for execution, tests, and review; Astra is for coordination only. Missing quota is unknown, not zero. No automatic reset-credit redemption or separately billed OpenAI fallback.
- Use the Codex CLI `ollama-deepseek` profile through Ollama's stock desktop router for DeepSeek workers; the native subagent model list does not currently include it. Do not ask Scott to operate a terminal. This routing preference does not expand the scope of any task.

