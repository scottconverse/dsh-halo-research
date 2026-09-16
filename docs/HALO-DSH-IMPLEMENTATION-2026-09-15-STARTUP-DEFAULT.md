# Local startup model correction — September 15, 2026

## Cause and correction

Stock DSH's `session/selectModel` calls `agentDefaultModel.saveSelection`, persisting the chosen model in the live `settings.yaml`. The Halo launcher previously ensured both local models were loaded, but did not restore the startup default. Consequently the saved Ollama DeepSeek choice survived stop/start even though canonical deployment settings specify `lmstudio / halo-coder-q4km`.

The existing `start-dsh-detached.mjs` now calls `startup-default.mjs` before spawning DSH. It reads the canonical `agent-default-model` section, replaces only that section in the live YAML, and removes any previous cloud-specific reasoning effort with the replacement. All other settings are retained. The supported PowerShell launcher invokes this path only when starting a new DSH process, so clicking Start on an already running instance does not override current choices. Session histories and per-session model selections are not edited.

This reuses the stock settings namespace; it does not add a provider or patch DSH. Cloud models remain selectable. The default applies to new sessions, not to reopening a conversation already using a cloud model.

## Verification and recovery

The focused Node test covers cloud-to-local restoration, removal of stale reasoning effort, preservation of unrelated provider settings and comments, idempotence, and refusal to write invalid YAML. A real stop/start through the desktop launcher's underlying scripts verifies the live model catalog default. See `evidence/startup-default-2026-09-15.json`.

Restore both `stack/stock-dsh/start-dsh-detached.mjs` and `startup-default.mjs` together with the deployment `settings.yaml`. The existing pinned DSH installation supplies the YAML parser. The recovery directory contains synchronized copies and hashes. No credentials are copied.
