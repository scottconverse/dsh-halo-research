# Desktop existing-session model repair — October 19, 2026

Completed directly by the coordinator. No subagents, installations, benchmarks, restarts or local-model loading/unloading. This supersedes the Desktop verification gap in HALO-DEEPSEEK-1017-DEFAULT-2026-10-19.md.

The prior change removed the old cloud catalog entry but left durable model selections in existing sessions pointing at it. Desktop correctly rejected those stale IDs with UNKNOWN_MODEL. The new model was present in the actual picker; saved default configuration alone had not migrated existing sessions.

Used Desktop's own model picker to select deepseek-v4.1-flash:1017-cloud with effort Off in all four sessions whose effective saved selection still used the retired Ollama cloud route: Check Longmont Library page title; # Research task: find and; Reddit thread retrieval verification; Wigolo MCP entry disabled explanation. Changes are normal appended model/selection events, not edits to earlier requests or conversation text. Local and other-provider selections were preserved. No compatibility alias or replacement code was added.

Read the concatenated zstd session logs and verified the latest selection event in each of those four sessions: provider ollama, exact new ID, reasoningEffort off. The original affected conversation then completed one prompt: "Reply exactly OK. Do not use tools." Returned OK, served model deepseek-v4.1-flash:1017. Event-based duration 532 ms; UI rounds to 1 second. Request reported 20184 input and 2 output tokens (20186 total). No other session received a prompt. Previous failed turns remain visible as historical records.

Opened the new-session screen and visibly confirmed the same new default and Off. Actual picker showed a single Ollama Cloud entry, alongside retained local Ollama, Gufo/LM Studio, Claude and Codex entries. Returned Desktop to the repaired Wigolo explanation conversation. Screenshot and scoped private receipt are in C:\Users\scott\Documents\Codex\2026-10-19\dsh-desktop-session-repair. No raw private conversations or credentials are published.

A transient UI target was stale during one selection; refreshed state and completed the operation. No runtime source/config changes were necessary in this repair. Coordinator tool/model token accounting is unavailable; delegated usage is zero. The single Desktop model request's usage is stated above.