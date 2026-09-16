# Codex Ollama configuration overlay

Private Halo deployment recovery files, not a new plugin or replacement skill framework.

The `skill/` files overlay the existing `C:/Users/scott/.codex/skills/openai-multi-agent/` installation. They are only the changed files; retain that skill's existing measurement, assets, and other resources. Copy the corresponding files into the installed skill, including the refreshed coordination and local-trial references. `AGENTS-routing.md` is the routing block to merge into the existing global `~/.codex/AGENTS.md`, not a replacement for the rest of it. Copy both `ollama-deepseek.config.toml` and `ollama-deepseek-code-worker.config.toml`, plus `ollama-deepseek-code-worker-models.json`, to `~/.codex/`.

An agent can reproduce the desktop integration using the existing signed-in Ollama 0.34.1+ installation:

1. Preserve the current root `model` selection in `~/.codex/config.toml`.
2. Run the stock `ollama launch chatgpt --config --model deepseek-v4.1-flash:cloud --yes`. Configuration alone does not restart the desktop app. Restore the preserved native model choice afterward.
3. The stock setup generates `ollama-launch-models.json` and `ollama-launch-codex-routing.json` in `~/.codex/`. Keep the original native models and only the requested DeepSeek cloud entry from Ollama's added recommendations. In the routing file, retain only DeepSeek. In the combined picker catalog, add `supports_parallel_tool_calls: false` only to rows missing it; standalone Codex 0.147.0 requires that field.
4. Install this overlay. Keep the exact `deepseek-v4.1-flash:cloud` ID and High reasoning. The original full `ollama-deepseek` profile keeps the desktop router at `http://[::1]:11434/api/codex/v1` as a restoration option. For bounded coding use the separate `ollama-deepseek-code-worker` custom provider at `http://[::1]:11434/v1`; the installed skill documents its tested launcher. It disables optional search/app/plugin/memory/nested-agent surfaces only for that invocation.
5. Use DeepSeek for implementation and tests by default. Use `ask_local.py` only for bounded local coder or brain tasks once that helper is present; see `skill/references/local-trial.md` for its arguments and limits. Keep the usage checks, including the rule against starting premium OpenAI workers below 10% remaining main Codex quota.
6. Verify an actual edit/test task with the code-worker launcher; check the diff, passing tests and textual final reply, not just exit status. The September 16 task passed completion with no premium code repair, but used 530,485 cumulative tokens and did not meet the efficiency target. Do not assume `--ignore-user-config --profile ...` works: the installed CLI ignored the named profile in that combination. The launcher uses explicit settings read from the saved profile. This worker-only repair requires no desktop restart.

Do not copy `auth.json`, credential stores, private keys, or the entire global Codex configuration into this repo. Ollama's existing signed-in session supplies cloud authentication.

See `docs/HALO-DSH-IMPLEMENTATION-2026-09-15-OLLAMA.md` for evidence, limitations, and documented restore behavior.

Current transport research and measured acceptance: [September 16 report](../../docs/HALO-CODEX-TRANSPORT-RESEARCH-2026-09-16.md). Selecting the original full profile restores its optional surfaces; upstream search/stateful-response defects remain documented, so it is not claimed as equally reliable.
