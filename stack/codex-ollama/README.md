# Codex Ollama configuration overlay

Private Halo deployment recovery files, not a new plugin or replacement skill framework.

The `skill/` files overlay the existing `C:/Users/scott/.codex/skills/openai-multi-agent/` installation. They are only the changed files; retain that skill's existing coordination, measurement, assets, and other resources. `AGENTS-routing.md` is the block to merge into the existing global `~/.codex/AGENTS.md`, not a replacement for the rest of it. Copy `ollama-deepseek.config.toml` to `~/.codex/`.

An agent can reproduce the desktop integration using the existing signed-in Ollama 0.34.1+ installation:

1. Preserve the current root `model` selection in `~/.codex/config.toml`.
2. Run the stock `ollama launch chatgpt --config --model deepseek-v4.1-flash:cloud --yes`. Configuration alone does not restart the desktop app. Restore the preserved native model choice afterward.
3. The stock setup generates `ollama-launch-models.json` and `ollama-launch-codex-routing.json` in `~/.codex/`. Keep the original native models and only the requested DeepSeek cloud entry from Ollama's added recommendations. In the routing file, retain only DeepSeek. In the combined picker catalog, add `supports_parallel_tool_calls: false` only to rows missing it; standalone Codex 0.147.0 requires that field.
4. Install this overlay/profile. Keep the exact `deepseek-v4.1-flash:cloud` ID and stock `/api/codex/v1` router. The generated plain CLI `ollama-launch` profile is not the accepted worker route.
5. Verify a real edit/test task through `codex exec --profile ollama-deepseek`; check output files and test results, not just exit status. Verify one native-model response still succeeds. Restart the desktop app when Scott is ready, then verify its model picker.

Do not copy `auth.json`, credential stores, private keys, or the entire global Codex configuration into this repo. Ollama's existing signed-in session supplies cloud authentication.

See `docs/HALO-DSH-IMPLEMENTATION-2026-09-15-OLLAMA.md` for evidence, limitations, and documented restore behavior.
