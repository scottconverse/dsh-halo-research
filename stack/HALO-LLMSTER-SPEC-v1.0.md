# Halo llmster migration specification v1.0

Date: 2026-09-02
Status: Proposed; documentation only. Not installed, deployed, or acceptance-tested.
Scope: DSH Halo local model hosting. Companion: HALO-LLMSTER-IMPLEMENTATION-PLAN-v1.0.md.

## 1. Decision and purpose

Make standalone llmster the normal local model host for DSH. Eliminate the requirement to keep LM Studio Desktop or Bionic running solely to serve local models. Keep the existing model library, tuned aliases, unrestricted picker, DSH capabilities, and operator interface.

Scott explicitly accepts using Bionic on other machines for prepaid cloud credits. Local Bionic cloud integration and simultaneous Bionic/llmster operation are NOT release requirements. Leave the installed applications, credentials, chats, and library intact as fallback; this is not uninstall authorization.

Success means opening Halo Cockpit starts the required local serving components and prepares the tuned pair without opening a model-management GUI. This is an operational migration, not a promised throughput improvement or a new autonomy benchmark.

## 2. Evidence and precedence

Canonical repository: C:\Users\scott\Desktop\Code\dsh-halo-research
Inspected HEAD: 092d29c1ee08ca133b3e58b393844b7ff3063b0c.
The working tree also contains uncommitted native-access and documentation work. HEAD alone does not describe installed behavior. Preserve those changes.

Source read on 2026-09-02:
- stack\Launch-Halo.ps1: fresh DSH start selects/preloads pair; reopening preserves selection.
- stack\startup\halo-startup.mjs: currently requests lms server start when API unavailable, but does not establish standalone daemon ownership.
- stack\HALO-CURRENT-CONFIGURATION.md: current native-access repair supersedes historical restrictive gate settings.
- Live model.yaml aliases: declare 32K, one slot, Q4 daily routes and load settings below.
- stack\mission-control\mission-control.mjs: mixes API, CLI, runtime/log and application-version sources; must distinguish these under llmster.

The preceding read-only investigation found lms daemon status isDaemon=false and PID 26136 belonging to Bionic. This is a dated observation, not a current PID to stop. Refresh ownership during implementation. Standalone llmster was not found in two standard locations; no exhaustive absence claim is made.

This specification supplements, not replaces:
C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Spec-v3.5.md
Latest live/native-access records take precedence over older restrictive instructions. No historical measured results become llmster results without new evidence.

## 3. Goals and non-goals

Must achieve:
1. DSH works with both desktop model applications closed.
2. Fresh launch prepares both tuned models; repeat launch neither duplicates loads nor resets operator choices.
3. All existing provider entries and available local/LM Link choices survive.
4. Startup, errors, residency, and backend identity are correctly visible.
5. A documented, bounded rollback restores the previous host without data loss.

Not included:
- Bionic cloud bridge, new subscriptions, credential extraction, or model downloads.
- Engine upgrades, Q6 tuning, context expansion, parallel-slot changes, memory-split changes.
- DSH redesign, mandatory gate enforcement, changes to permissions/tools/skills.
- Research Gateway implementation, OpenClaw, Ollama, CivicCast, TownLight, WSL or Windows Sandbox work.
- Always-on pre-login service, automatic reboot, multi-hour performance campaigns.

## 4. Operator experience and architecture

Scott opens the existing Halo Cockpit shortcut. DSH stays at http://127.0.0.1:3080; Mission Control stays at http://127.0.0.1:3090; local inference stays at http://127.0.0.1:1234.

Flow:
Halo shortcut -> serialized startup -> verified llmster owner + API -> DSH settings ready -> catalog refresh -> fresh-start pair preload -> cockpit ready.

Components may start in parallel internally only where safe; do not delay DSH's HTML page unnecessarily. Show background startup progress while models load; distinguish Loading from Ready and show a clear failure with a log path.

Run as Scott in his normal signed-in Windows session, without new restrictions on DSH. No LocalSystem service. Opening DSH after a reboot must start the backend; boot/login by itself must not preload models unexpectedly. Explicit at-login daemon-only startup can be a later option.

Closing a browser tab does not stop the server or unload models. Preserve explicit operator load/unload controls. Do not implement a new hidden watchdog, auto-restarting inference loop, or automatic retry of a failed generation.

## 5. Startup lifecycle (P0)

- Use the resolved installed lms executable, not an ambiguous PATH entry.
- Query daemon status without inadvertently launching a desktop app; establish exact behavior during installation.
- When no backend exists, invoke supported lms daemon up --json, require isDaemon=true and correlate the PID/executable with the API listener before declaring standalone readiness.
- Start the local HTTP server using the supported command and verify an authenticated model-inventory response. An open TCP socket is not sufficient.
- Preserve existing API authentication and binding. Do not put tokens in logs or introduce unrelated access restrictions.
- If a desktop app or foreign process owns the endpoint, show an explicit conflict. Do not silently fall back to a GUI host, kill it, change ports, or adopt it as llmster.
- During the authorized initial migration, gracefully close the positively identified idle Bionic/LM Studio host once. Preserve user state and owned request evidence; do not terminate active inference.
- Reuse existing startup mutexes and verify duplicate shortcut clicks create only one daemon/preload sequence.
- Suggested bounded defaults: 60 seconds daemon readiness, 30 seconds API readiness, existing 90 seconds settings readiness, existing 600 seconds maximum per model load. Poll with deadlines, not indefinite waits. One timeout is a reported failure, not a restart storm.
- If a load finishes after a client timeout, reconcile actual residency before any retry. Never blindly issue a second load.
- Preserve the existing fresh-server versus reopen distinction: fresh server selects daily brain and preloads pair; reopening refreshes choices without resetting active sessions, default choice, or residency.
- If the backend is restarted while DSH survives, reconnect and refresh; preserve selection and rely on explicit load/JIT rather than forcing the pair back into memory.
- A partially successful preload must be reported accurately; do not unload a successful load as cleanup without an explicit reason.

## 6. Model contract (P0)

| Role | Alias | Stable loaded identifier |
| --- | --- | --- |
| Daily planner | halo/qwen3.6-35b-a3b | halo-brain-35b |
| Daily coder | halo/qwen3-coder-30b-a3b-q4km | halo-coder-q4km |

Both use existing Q4_K_M weights, loaded context 32768, parallel=1, no idle expiry for explicitly preloaded pair. Load sequentially to avoid overlapping staging peaks. Retain both resident if the unchanged known envelope fits; do not change memory allocation to make migration pass.

Retain selected llama.cpp-win-x86_64-vulkan-avx2@2.31.2 if supported by the installed daemon. Record daemon, CLI, and inference-engine versions separately. If this combination is unsupported, report the exact compatibility issue before substituting a different engine.

Preserve alias files and inherited templates byte-for-byte unless a demonstrated compatibility defect needs a narrowly documented translation. Current declared settings include GPU max/strict cap, unified KV, KV GPU offload, F16 KV, batch 2048, physical batch 512, flash attention, 32 checkpoints, mmap=false, keepModelInMemory=true, speculative MTP/simple=false. The brain's custom enableThinking default is false; preserve the available boolean toggle. Do not invent medium/high support.

Confirm quant, context, slot count and actual GGUF from live evidence. Other settings must be labeled declared, exposed by runtime, or unobservable; a file value is not runtime proof.

## 7. Picker, tools, and compatibility (P0)

Retain provider ID lmstudio to avoid breaking sessions and routing. A display label may clarify LM Studio / llmster, but do not rename model IDs.

Keep existing catalog entries and other providers. Merge discovered LLM entries with stable identities, preserve quant variants and LM Link identity, and never replace the catalog with only loaded models. Empty/failed discovery must retain saved choices and show stale/unavailable status.

Keep auxiliary embedding/projector files distinguishable from selectable chat routes; no deletion or reclassification campaign belongs to this change. Offline remote entries are not local files. Unknown origins remain unknown.

Preserve accurate DSH context declarations, reasoning metadata, streaming, tool calls, cancellation, compaction settings, and existing cloud fallbacks. Native tools and authorized machine access remain unchanged. The verified-coder workflow remains optional, with existing caller-permission inheritance.

LM Link availability must be checked and reported separately. If a peer is offline, preserve its saved route and record live inference as not exercised; do not claim all remote routes tested. If a reachable peer works on the old host and fails on llmster, treat it as a migration regression, not silent scope removal.

## 8. Mission Control and logging (P0)

Show serving backend llmster, desktop host, or unknown independently from API availability. Show daemon version, inference-engine version, and collection timestamp separately. The absence of a GUI process must not mean inference is down.

Revalidate inventory, loaded models, actual context/slots, generation activity, log tail, GPU/system memory, LM Link origins and existing load/unload controls. Preserve unrelated memory-graph behavior.

Use real source freshness/error states. TCP reachable is not API healthy; resident is not generating; last decode rate is not current generation; cached inventory is not live residency. Where daemon logs differ, resolve the actual path and parse the actual format. Unsupported measurements say unavailable.

Structured startup evidence: run ID, timestamps/timezone, action, bounded duration, daemon identity, endpoint health, model key/identifier, observed envelope, errors and selected log path. No secrets or unrelated process command lines in published evidence.

## 9. Acceptance and evidence

Required deterministic checks:
- existing startup/picker tests remain green;
- stopped/healthy/conflicting backend branches;
- duplicate launches and load-timeout reconciliation;
- catalog failure preserves entries/providers;
- reopen preserves choice and does not preload;
- backend unavailable/stale telemetry never renders as healthy.

Required short live smoke:
1. With desktop hosts closed and no local generation active, ordinary shortcut starts standalone llmster and API.
2. Both aliases load once with correct Q4_K_M, 32K and one slot; engine/weight identity recorded.
3. One ordinary DSH request exercises a real tool; one explicit worker round trip returns. Archive exact prompts and any steering. This proves integration, not general autonomous software-building ability.
4. Picker can select an available non-default model and return; exercise one tiny non-default inference if resources permit, with actual loaded context checked. No automatic eviction of unrelated models.
5. Repeat shortcut does not change selection or reload models.
6. Mission Control agrees with raw sources for readiness/residency and sources available during smoke.
7. One stopped-backend recovery and rollback round trip work while idle.

Record wall time and memory opportunistically; do not turn these into performance rankings. No fabricated before/after gain from unlike prompts.

Reboot survival: test stopped-process launch now. At Scott's next chosen reboot, record actual post-reboot startup separately. Do not label simulated cold start reboot-proven.

## 10. Recovery, deployment and completion

Before installation preserve affected lms binaries/version, launcher/helpers, live and canonical settings, alias definitions, relevant LM Studio configuration, backend startup registrations and selected runtime. Inspect installer side effects; do not back up/re-download every GGUF. Record current library paths and sizes; preserve all model files.

Record exact installed paths and an actionable rollback command sequence in the deployment receipt, not guessed package-uninstall commands. Restore only changed artifacts after comparing current hashes, preserving newer operator changes. Stop only owned idle llmster and reinstate the former host/API. Do not restore shared .lmstudio wholesale or delete it.

Update canonical/current configuration, guide and implementation ledger only after actual deployment. Synchronize changed deployable files and the recovery manifest, with Research copies. Keep historical records; mark superseded behavior explicitly.

Done means live smoke + deterministic checks + rollback proof + synchronized documentation, with remaining reboot/remote-peer evidence honestly labeled. Bionic cloud availability is not a blocker.

## 11. Sources and limits

Official sources checked 2026-09-02:
- https://lmstudio.ai/docs/developer/core/headless — standalone Windows option, JIT catalog/load behavior.
- https://lmstudio.ai/docs/cli/daemon/daemon-up — daemon startup and JSON identity.
- https://lmstudio.ai/docs/app/basics/lmstudio-vs-llmster-vs-lms — distinction between GUI, daemon and CLI.
- https://lmstudio.ai/docs/cli/daemon/daemon-status
- https://lmstudio.ai/docs/cli/local-models/load
- https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/1639 — older Windows report of noninteractive LM Link failure; a risk to check, not proof of current failure.

Unresolved engineering checks: exact available llmster build, runtime compatibility, shared configuration discovery, daemon log locations, installer mutation footprint and LM Link under this account. These are bounded implementation checks, not missing product decisions. Do not interpret this document as evidence that they passed.

