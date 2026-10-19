# Mission Control cloud and model-display repair - October 19, 2026

## Delivered behavior

Mission Control now recognizes Ollama cloud execution from Ollama's own `/api/tags` remote-host metadata, matched to the exact configured model. A local Ollama endpoint is no longer treated as proof that every model runs locally. DeepSeek `deepseek-v4.1-flash:1017-cloud` is reported as `cloud via Ollama`, local residency not applicable, with no local-model loading warning. A remote route does not raise the zero-local-model alarm. This does not claim cloud account availability or successful generation; no request was sent.

The Sessions table now has a **Model selection / history** column with **Next request (saved)** and its effort setting, followed by **Last used**. Usage, decode and historical model identity remain tied to past requests; they are not reassigned to a new selection. DSH's public session-list projection omits its internal pending selection. Mission Control reads that saved pending projection row locally, without writing it or activating an Agent. If there is no pending selection it displays the last-used selection, or default-at-request-time when none is recorded.

Used the existing System-tab **Validate config** action. It ran the installed DSH `web --dump-config`, not another downloaded version. Validation passed with zero warnings and current fingerprint `743B860B938995A2BC32C65C89C293B70ABE30B86DF6F77790CD72D839096F31`, DSH `0.2.1-alpha.2`, at 2026-10-19T23:50:43.999Z. This is composition/configuration validation, not a new inference or blanket end-to-end certification of every integration.

## Verification and recovery

The supported installer requires four contract suites: reasoning, data, UI and installer. All 108 final-candidate checks passed, including one focused regression demonstrating that exact remote Ollama metadata exempts the cloud route while retaining residency checks for local Ollama models. Syntax also passed. The first installed candidate exposed the omitted-pending-projection problem in the actual Sessions UI; corrected it and reran the mandatory installer checks for the changed candidate. No extra benchmark or model workload was introduced.

Verified the actual final dashboard: migrated Gufo-cache, Reddit and Longmont reporting rows show 1017 with effort off for the saved next request while retaining their respective historical models. The System view shows current validation. Live `/api/status` corroborates cloud execution, residencyApplicable false, warning null, and the new saved selection distinct from last-used. The running build hash equals installed/canonical SHA-256 `438536B40A0357038FFD606696FABCFD8B4E4FC7504808AA38199C0B547DEAA5`.

Only Mission Control was restarted to load each installed candidate. DSH Web remained the same PID 44540 on port 3080; Web/Desktop model defaults, model inventories, profiles, Wigolo, Reddit/Redlib and XERJ were not changed. No DSH/Desktop restart, model loading/unloading, subagents or generation requests.

The supported installer retained verified backups and receipts under `C:\Users\scott\.dsh-stock\mission-control\backups`. Original source/state, installation logs and scoped live receipt are private under `C:\Users\scott\Documents\Codex\2026-10-19\mission-control-repair`. Human-readable records and the final executable recovery copy are synchronized in Halo Stack Research. Credentials and raw conversation logs are not published.

Delegated usage: zero. DSH generation usage: zero. Coordinator token accounting is unavailable from the task tools, so no numerical total is invented. Unrelated dirty repository changes are excluded from this delivery.
