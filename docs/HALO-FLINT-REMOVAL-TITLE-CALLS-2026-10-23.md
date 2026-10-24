# Flint removal and auxiliary title-call disable — October 23, 2026

## Delivered configuration

Scott requested removal of Flint from both DSH pickers, restoration of Ollama DeepSeek 1017 Low as the default, and removal of competing model-generated session-title calls. No new tests or inference jobs were authorized or run.

- Removed the exact `lmstudio-library/flint` catalog entry from the installed Web and Desktop profiles and both tracked profile copies. Other model entries and provider settings are preserved.
- Both installed and tracked defaults now select provider `ollama`, model `deepseek-v4.1-flash:1017-cloud`, effort `low`. Web's installed default was already correct; Desktop had selected Flint. The repository's older Web baseline was aligned with the requested default.
- Preserved DeepSeek's 1,048,576-token context, 65,536-token maximum output, Low provider fallback and available effort choices. Other model limits and efforts are unchanged.
- Disabled only the stock `session-title-llm` loader row in both profiles. The stock `session-title` service remains enabled: deterministic prompt-derived fallback names, existing titles and manual renaming remain available. No replacement title model, queue, adapter or custom title implementation was added.
- Removed Flint-specific context, label and output overrides from the Desktop catalog-refresh source and installed script. Ordinary inventory discovery and all other model policies are unchanged.
- Four saved sessions still selected the removed model: one Web and three Desktop. Appended a new DeepSeek 1017 Low model-selection event and updated the corresponding next-turn projection for those sessions only. Original compressed log bytes, historical requests, results and titles were preserved. Other sessions were not changed.

Flint had already been unloaded and its 25,054,688,704-byte GGUF deleted from LM Studio at Scott's prior request. LM Studio's inventory no longer listed it. Historical Flint reports and evidence remain historical records; they are not current picker instructions. Existing local model runtimes and all other downloaded models remain in place.

## Cause and scope

The earlier Python JSON task generated 15,510 main-task output tokens in 9 minutes 20.898 seconds. Its trajectory explicitly recorded an auxiliary title request to the same Flint instance, with a 4,096-token ceiling. LM Studio also recorded other intervening requests, but its redacted bodies and missing client identities did not permit reliable attribution of every request. Disabling DSH's known auxiliary title provider addresses the confirmed source without claiming all contention was explained.

Read-only inspection also established an installed LM Studio chat API path for `thinking_budget_tokens`, internal `reasoning.budgetTokens`, and forwarding to its llama.cpp backend. That is a runtime budget, distinct from a trained Low/Off setting. No Flint thinking setting was applied or inference-tested; Flint was subsequently removed instead.

## Verification boundary

Verification was limited to configuration parsing, exact readback, semantic before/after comparison and session-selection readback. The parsed profile differences were restricted to the Flint row, default selection and title-provider disable. No DSH inference, benchmark, test suite, application launch or restart was performed. Neither DSH app had an identified running process before the edit; these changes are saved for the next normal launch, not a newly demonstrated running-app result.

Wigolo, Reddit/Redlib, XERJ, Mission Control, permissions, presets, other providers and existing model files were not changed. Private backups, raw trajectories and per-session migration receipts remain outside Git under `Documents/Codex/2026-10-23/flint-removal`.

## Recovery and delivery

Source profiles and the refresh script are versioned in this repository. The dated report, installed-profile recovery copies and SHA-256 manifest are synchronized to Halo Stack Research. The working record identifies configuration/readback evidence separately from runtime verification. No release tag is created by this task.
