# DeepSeek 1017 Low effort — October 19, 2026

Scott requested Low effort everywhere for the existing exact model `deepseek-v4.1-flash:1017-cloud`.

- Live Web and Desktop default selections now use `reasoningEffort: low`.
- Existing saved selections were migrated: 8 Web sessions and 6 Desktop sessions. New model-selection events were appended to the compressed logs; original event bytes and historical requests were preserved. Projection caches now select Low for the next turn.
- The Ollama Cloud provider fallback is Low in both live profiles and both repository recovery profiles. Its catalog contains only the selected DeepSeek 1017 model. Low maps to wire value `low`; Off/High/Max choices remain available.
- Installed dedicated Codex DeepSeek/launch profiles and the repository's 1017 worker profile use `model_reasoning_effort = "low"`. Exact-model catalog defaults are Low; other model rows are unchanged. Worker launcher reads this profile field rather than overriding it. Direct Ollama chat should use `think: "low"`.
- No model/provider IDs, token limits, integrations or other models' effort settings were changed. The repository Web baseline still selects local Qwen; its unrelated local default was preserved.

Verification: file readback; saved session event/cache agreement; exact-model effort mapping checked against installed provider source. The provider resolves explicit selection effort before provider fallback. No generation job, benchmark, installation or restart was performed. Neither DSH app had an identified running process during the change, so this verifies saved configuration for their next launch, not a newly observed generated response.

Private backups and session receipts remain outside Git under `Documents/Codex/2026-10-19/deepseek-1017-low`. Historical reports retain the effort settings that applied at their dates.
