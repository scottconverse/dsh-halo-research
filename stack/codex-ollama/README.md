# Codex Ollama configuration overlay

Private Halo deployment recovery files, not a new plugin or replacement skill framework.

The `skill/` files overlay the existing `C:/Users/scott/.codex/skills/openai-multi-agent/` installation. They are only the changed files; retain that skill's existing measurement, assets, and other resources. Copy the corresponding files into the installed skill, including the refreshed coordination and local-trial references. `AGENTS-routing.md` is the routing block to merge into the existing global `~/.codex/AGENTS.md`, not a replacement for the rest of it. Copy `ollama-deepseek.config.toml` to `~/.codex/`.

An agent can reproduce the desktop integration using the existing signed-in Ollama 0.34.1+ installation:

1. Preserve the current root `model` selection in `~/.codex/config.toml`.
2. Run the stock `ollama launch chatgpt --config --model deepseek-v4.1-flash:cloud --yes`. Configuration alone does not restart the desktop app. Restore the preserved native model choice afterward.
3. The stock setup generates `ollama-launch-models.json` and `ollama-launch-codex-routing.json` in `~/.codex/`. Keep the original native models and only the requested DeepSeek cloud entry from Ollama's added recommendations. In the routing file, retain only DeepSeek. In the combined picker catalog, add `supports_parallel_tool_calls: false` only to rows missing it; standalone Codex 0.147.0 requires that field.
4. Install this overlay/profile. Keep the exact `deepseek-v4.1-flash:cloud` ID, high reasoning default, and stock `/api/codex/v1` router at `http://[::1]:11434/api/codex/v1`. The generated plain CLI `ollama-launch` profile is not the accepted worker route.
5. Use DeepSeek for implementation and tests by default. Use `ask_local.py` only for bounded local coder or brain tasks once that helper is present; see `skill/references/local-trial.md` for its arguments and limits. Keep the usage checks, including the rule against starting premium OpenAI workers below 10% remaining main Codex quota.
6. Verify a real edit/test task through `codex exec --profile ollama-deepseek`; check output files and test results, not just exit status. Verify one native-model response still succeeds. Restart the desktop app when Scott is ready, then verify its model picker.

Do not copy `auth.json`, credential stores, private keys, or the entire global Codex configuration into this repo. Ollama's existing signed-in session supplies cloud authentication.

See `docs/HALO-DSH-IMPLEMENTATION-2026-09-15-OLLAMA.md` for evidence, limitations, and documented restore behavior.
