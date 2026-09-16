## Codex usage and worker routing

- For substantial development work, follow `C:/Users/scott/.codex/skills/openai-multi-agent/references/ollama-fallback.md`. Use the live Codex usage reader at the start, before dispatch when the reading is older than five minutes, and at task boundaries about every 15 minutes during sustained work.
- Use Ollama `deepseek-v4.1-flash:cloud` and the tuned local LM Studio helpers for more than 90% of task work as a planning target, not a guarantee. Use Astra for coordination and bounded high-judgment work (1–5% target), and Sol/Terra/Luna for selective checks (6–9% target) when quota permits.
- Below 10% remaining in either available main Codex usage window, do not start new premium OpenAI workers. Missing quota is unknown, not zero. Do not automatically redeem reset credits or use separately billed OpenAI fallback.
- At 10% remaining or more, native Sol/Terra/Luna subagents may be selected for a bounded, useful implementation or review task when they materially help. Use the actual exposed model IDs (`gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`) and a fresh, self-contained brief when the runtime requires it; this is selective, not mandatory.
- Use the Codex CLI `ollama-deepseek` profile through Ollama's stock desktop router for DeepSeek workers; the native subagent model list does not currently include it. Do not ask Scott to operate a terminal. This routing preference does not expand the scope of any task.

