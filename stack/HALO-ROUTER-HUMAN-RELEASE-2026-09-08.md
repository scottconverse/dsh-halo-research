# Halo Router 0.3.0 — active routing and human controls

Delivered in the isolated DEV DSH at http://127.0.0.1:3085. Production is not promoted or reconfigured. This supersedes the earlier shadow-only release scope following Scott's explicit request to make a complete human-usable router; the original shadow specification remains historical evidence.

## What the operator gets

Open Router in the opening screen or conversation header. Automatic selects a qualified route before DSH dispatches a planner or gated coding worker. Manual leaves selection with the native picker. Local first prefers qualified local routes; Local only disallows remote model fallback, not web tools. Search independently for a planner or coding-worker override. Selection details explain the actual route and reason. Settings and decision history survive DEV restarts. The delivered profile is Automatic / Local first; fresh installations default to Manual. Explicit native picker changes take precedence over automatic routing.

No JSON editing is required. The native picker remains available. The 2,747 catalog entries are discoverable routes, not a claim that every provider account is authenticated. Automatic qualification currently covers exact tested profiles for the local Q4_K_M coder, Claude Sonnet and Codex Sol. Other entries remain manually selectable; unknown qualification is not fabricated as a pass.

## Reuse and integration

The pinned DevHarmonics deterministic selector remains the policy, with the existing Factory differential tests and execution fingerprints. DSH owns the agent loop, providers, sessions, compaction and native tool execution. Halo's service uses request hooks; the DEV verified-coder wrapper registers the worker plan, then selection happens with the actual child tool schemas. The interface mounts through DSH's native plugin loader, Typert remote service and additive UI slots, not a second dashboard server or production bundle patch.

The plugin does not introduce model unloading, runtime configuration changes, adaptive ranking, an automatic retry/failover engine, or new restrictions on the agent's native tools. No claim is made that this deterministic selector has learned an optimal model for every task.

## Actual live acceptance

Full machine-readable receipts: `stack/halo-router-dev/evidence/active/`.

| Case | Actual result |
| --- | --- |
| Automatic root, after current-tool fingerprint fix | Local Q4_K_M selected; 2.394 seconds; request a3579388 prefix |
| Manual root | Claude Sonnet preserved; 14.424 seconds; request c1dde7a8 prefix |
| Explicit Codex planner | Codex Sol answered; 10.907 seconds; request 609138c2 prefix |
| Local coding worker | Independent verifier PASS; 25.612 seconds; request 9c5f1f80-0948-4eee-b269-0bcc28302c47 |
| Codex coding worker | Independent verifier PASS; 42.318 seconds; request ea3a1126-68a6-485e-8c48-41aa9b03552a |
| Browser-created ordinary DSH session | Plain prompt `Reply with exactly ROUTER-UI-OK. Do not use tools.` returned ROUTER-UI-OK; Automatic changed the original 35B route to the qualified local coder |

The browser session is `session-3d33ad66-fad1-41c5-b81a-bc5279ab8f09`. Its unmodified preset context was about 12.2K tokens; elapsed time was about 44 seconds. This is a UI and dispatch smoke, not an application benchmark. Coding smokes use small protected acceptance fixtures; they do not establish arbitrary large-project success.

Live UI checks: Manual/Automatic saves, searchable Codex worker override saves, Local-only rejects a remote override visibly without changing the saved settings, restored Automatic selection persists, native picker and Session log remain visible, Escape closes the panel and returns keyboard focus. The final UI uses the conversation header slot rather than covering native controls with an overlay.

## Failures retained, not hidden

- First worker integration failed before generation because a Cordis service was accessed without its dependency scope. Corrected to the supported `ctx.get` lookup and added a reproducing regression test.
- An honest local worker passed, but the first acceptance exporter read before the independent outcome was appended. Preserved both the false exporter failure and real gate receipt; exporter now waits for the independent outcome, and subsequent local/Codex runs passed.
- Native UI initially hit module-instance identity and missing remote injection errors. The DEV link resolves the same installed Typert instance as the host, and the client explicitly injects the remote service. Reloaded live UI is the acceptance, not source wiring alone.
- Measured observation latency included a roughly 574 ms maximum; the earlier 200 ms budget is not claimed proven. No multi-hour tuning was performed to conceal this.

## Restart, evidence and recovery

Runbook: `stack/halo-router-dev/README.md`. Launchers: `Start-RouterDev.ps1` and ownership-checked `Stop-RouterDev.ps1` in that directory. The acceptance driver is removed from the final profile; restart leaves only the user-facing router and normal DSH components. No automatic machine reboot was performed.

`capture-delivery.mjs` runs the focused suite, checks the 117-file production baseline, snapshots the records, and creates hash-verified copies in Scott's Research folder, including `Current Halo Configuration/halo-router-dev-0.3.0`. It does not copy the whole production home or replace newer sessions. Gate integration tests are separately run against both production and DEV wrappers. Final counts are in the saved test receipts rather than a precomputed claim here.
