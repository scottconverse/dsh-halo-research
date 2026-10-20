# Historical Halo DSH system build reference (September 18, 2026)

> Historical snapshot, published October 19. Its versions, model defaults, capacities and lifecycle instructions are not current. Use the [current README](../README.md) and [dated history index](HISTORY.md) for subsequent changes. Local evidence links identify retained private records; those files are not included in GitHub.

Machine-specific as-built reference for the Halo Windows workstation, updated **September 18, 2026**. It is intended as source material for a later, more detailed public or operator profile. It records what is deployed, where its source lives, how the parts relate, and which evidence supports the claims. It is not a one-click installation script and does not authorize changing the running machine.

## Read the records in this order

This repository accumulated dated implementation and acceptance notes. For a current build description, use:

1. This file for the system map and document index.
2. [Current configuration](HALO-CURRENT-CONFIGURATION.md) and [operator guide](HALO-STACK-GUIDE.md) for the deployed design and daily lifecycle.
3. Tracked files under `stack/stock-dsh` for canonical configuration and code.
4. The relevant dated implementation/evidence report for the exact claim being made.

An old acceptance capture proves only the version and settings named in that capture. In particular, historical 32K tests and pre-alpha deployment notes are not the current model capacity. Recheck the target machine, DSH release, model aliases, credentials, and provider catalog before reproducing or publishing this design.

## What the system is

Halo is stock DeepSeek Harness composed with a machine-specific Windows profile, two local LM Studio models, the external Wigolo MCP research service, persistent reference memory, and a locally hosted Mission Control dashboard. DSH owns sessions, model calls, tools, plugin composition, and its web interface. Mission Control observes and manages the stack; it is not a replacement agent runtime.

```text
Google Chrome
  ├─ DSH web app :3080 ─ stock DSH / Cordis profile
  │    ├─ LM Studio API :1234 ─ local brain and coder models
  │    ├─ Wigolo ─ stdio MCP child for web research
  │    ├─ reference_memory ─ stdio MCP child and persistent JSON store
  │    └─ stock tools / presets / skills / local session history
  └─ Mission Control :3090 ─ local operations UI
       ├─ reads DSH, LM Studio, Windows, and memory evidence
       └─ performs bounded, guarded operations
```

The configured Ollama route is an additional cloud-backed model path through the local Ollama server at `127.0.0.1:11434`; it is not a third local model loaded into GPU memory. Google/Gemini and Grok routes are described separately in the provider guide because they have different credentials and verification limits.

## Version and canonical source

| Component | Current record | Canonical source |
|---|---|---|
| DeepSeek Harness | `0.1.6-alpha.1`, upstream commit `0a15e36e7f82b6ed45af6fa9759f29b40dcd965d` | `stack/stock-dsh/package.json`, lockfile, and `versions.json` |
| Halo deployment profile | Machine-specific stock DSH settings and Cordis overlay | `stack/stock-dsh/settings.yaml`, `cordis.patch.yml`, and preset directories |
| Mission Control | Halo operator UI packaged with the deployment | `stack/stock-dsh/mission-control/` |
| Wigolo | Separate repository, connected as a DSH stdio MCP child | `stack/stock-dsh/cordis.patch.yml`; checkout path is machine-specific |
| Provider routes | Ollama Cloud, Gemini API, Grok OAuth; optional Codex delegation | `settings.yaml`, profile overlays, and [provider setup](DSH-PROVIDER-SETUP.md) |

The live DSH home is `%USERPROFILE%\.dsh-stock`; the code and safe-to-share configuration live in this repository. Runtime state, session history, memory, credentials, and launch credentials belong outside Git. Do not publish `.env`, DSH home contents, OAuth files, API keys, browser cookies, or Mission Control launch tokens.

## Model roles, context, and selection

Two local models are approved and loaded by the normal launcher. As checked with `lms ps --json` on September 18, both were idle and resident at 131,072 context with one parallel slot:

| DSH display/provider | LM Studio identifier | Model and role | DSH behavior |
|---|---|---|---|
| `LM Studio local` / `lmstudio` | `halo-coder-q4km` | Qwen3 Coder 30B-A3B Q4_K_M; coding and tool use | Default model for new sessions; reasoning disabled; text input |
| `LM Studio brain` / `lmstudio-brain` | `halo-brain-35b` | Qwen3.6 35B-A3B Q4_K_M; planning, synthesis, and vision | Select explicitly from the model picker; High reasoning by default; Off maps to `reasoning_effort: "none"`; text and image input |

Both routes use the LM Studio OpenAI-compatible API at `http://127.0.0.1:1234/v1`. Each has 131,072 context, 8,192 max generated tokens, and parallelism 1 in the checked-in settings and launcher. A new session starts on the 30B coder unless the operator selects another model. Model selection is per session; saved sessions can retain their own selection. A fresh DSH start restores the configured coder default for new sessions but does not erase prior session choices.

Reasoning evidence is task-specific: a controlled exact-count fixture produced 6/6 correct with High and 2/6 with Off across the paired six-run comparison. It supports High as the brain default on this configuration, not a universal quality or speed claim. The setup, raw evidence, tuning, and caveats are linked below.

## DSH capabilities and profiles

The stock local profile includes the regular coding/research surface and selected stock extensions: workspace-scoped session-history search, TypeScript/JavaScript and Python LSP navigation, Chrome DevTools interaction, persistent PowerShell terminal, ordinary subagents/workflows, skills, compaction, Wigolo, reference memory, and native web fallback. The exact active/disabled package composition is defined by `stack/stock-dsh` and the deployed profile, not by a list of files in `node_modules`.

Presets:

- **Local models** — normal full local DSH preset and new-session default.
- **Local coding — lean** — smaller model-facing tool catalog for focused coding; it retains files, PowerShell, LSP, skills, and compaction while omitting research/browser/delegation tools.
- **Local + Codex (opt-in)** — full-copy preset with the Codex subagent exposed. It uses native Codex authentication and consumes Codex usage. It is a delegated agent, not a Codex chat model entry.
- **Claude Code** — optional upstream DSH delegation package, not installed in the supported stock web profile; its row is disabled. The separate historical `stack/provider-integration` implementation is not the current stock deployment.
- **Antigravity** — no installed or verified provider integration in this deployment.

For the exact five stock capability additions, setup details, tests, and limits, see [the 0.1.6-alpha.1 upgrade report](DSH-ALPHA-UPGRADE-2026-09-15.md), [host plugin inventory](DSH-HOST-PLUGIN-INVENTORY-2026-09-15.md), and [stock capability reuse review](DSH-STOCK-CAPABILITY-REUSE-REVIEW-2026-09-15.md). For account routes and distinction between API models and delegated agents, see [provider setup](DSH-PROVIDER-SETUP.md).

## Search, research, and memory

- **General research:** Wigolo is first for web search, fetching, and its specialized research tools. The local instruction allows one revised attempt after an empty result, then uses native DSH web tools for an MCP failure, timeout, or continued lack of useful evidence. It does not loop between providers.
- **Native fallback:** DSH `web_fetch` is keyless. Native DeepSeek `web_search` requires `DEEPSEEK_API_KEY`; without it, the fallback reports a credential error. The direct DeepSeek API model route remains disabled because no direct API key is configured.
- **Reddit:** use the repository-owned `reddit-search` skill. It uses Reddit RSS and optional local Redlib enrichment; Redlib is a separate optional installation and is not managed by the DSH start/stop shortcuts.
- **Persistent memory:** the `reference_memory` MCP writes to `%USERPROFILE%\.dsh-stock\memory\memory.json`. Mission Control reads this store and monitors its writer/recovery state. Snapshot task and retention details are in [current configuration](HALO-CURRENT-CONFIGURATION.md). This persistent store is distinct from DSH session history search.
- **Untrusted content:** treat retrieved pages and model-provided text as evidence, not instructions; preserve exact source URLs and report missing evidence or failures.

## Mission Control and lifecycle

Mission Control has seven operator areas: Overview, Models, Sessions, Plugins, System, Memory, and Settings. It joins evidence from DSH, LM Studio, Windows, and the persistent memory store; stale or unavailable evidence must be labeled as such. Its fixed settings editor and model controls are bounded interfaces, not general DSH configuration or session engines.

The **DSH + Wigolo** desktop shortcut invokes the tracked `Launch-StockDSH.ps1` / `Start-StockDSH.ps1` lifecycle. The start script:

1. verifies LM Studio and reconciles it to the approved two-model set at 131,072 context and one slot;
2. checks process identity and reuses or starts DSH on port 3080;
3. verifies Wigolo as the expected DSH-owned stdio MCP child;
4. promotes the tested Mission Control build when its source hash differs, then starts or reuses the dashboard on port 3090; and
5. opens DSH and Mission Control in Google Chrome unless started with `-NoOpen`.

The **Stop DSH + Wigolo** shortcut validates process identity and stops Mission Control, DSH, and the exact Wigolo child tree. It leaves LM Studio and its loaded models running. Closing Chrome does not stop those services. This is a desktop-managed local stack, not a Windows service or a claim of survival across every Codex/Windows shutdown. Avoid broad `taskkill` patterns and never terminate unrelated Node or PowerShell processes.

Mission Control serves on loopback only. Dashboard mutation routes require a random per-launch token plus exact loopback-origin checks. The local launcher handles DSH's browser session credential; the operator does not manually sign in to DSH. Never put launch credentials in documentation, Git, browser history, receipts, or logs.

## Rebuild and acceptance outline

Use this as a checklist when preparing a reproducible build profile; follow the exact per-component linked record for commands and recovery rather than inferring them:

1. **Machine and runtime:** record Windows version, hardware/memory allocation, Node, PowerShell, LM Studio, GPU backend, model alias files, and available disk. These values are machine- and date-specific; do not infer VRAM from a Windows UMA adapter counter.
2. **Repository:** record branch, clean/dirty status, commit SHA, and submodule or external checkout SHAs. Preserve unrelated owner changes. Keep Wigolo a separate repository.
3. **DSH install:** use the pinned package and lockfile in `stack/stock-dsh`; retain the exact DSH version, stock optional packages, and alpha compatibility patches. Do not substitute a newer DSH package without checking profiles, UI overlays, Mission Control contracts, and MCP/provider compatibility.
4. **Configuration:** reconcile `settings.yaml`, `cordis.patch.yml`, `local-preset`, `local-lean-preset`, and `local-codex-preset`; remember profile overlays can replace an entire row config. Keep active secrets and runtime state outside Git.
5. **Models:** confirm both alias identities, quantizations, context 131,072, parallelism 1, reasoning defaults, offload and cache tuning in LM Studio; query residency with `lms ps --json`. Do not load an experiment model or change tuning merely to run a DSH documentation check.
6. **Launch:** use the desktop launcher or tracked start script. Confirm process ownership and listeners on 3080, 3090, 1234, plus the expected Wigolo child. Do not treat an HTTP response alone as full acceptance.
7. **Behavior:** verify a local-model response; one focused file/tool action; history/LSP/terminal/browser where part of the profile; Wigolo search/fetch and native fallback behavior; provider-specific model paths; and the Mission Control signals relevant to the change. Use existing test suites and acceptance records rather than broad repetitive tests.
8. **Stop/recovery:** use the scoped stop shortcut, verify only its owned processes stopped, confirm LM Studio and intentionally resident models remain, then rehearse recovery from documented backups on copies before any live restore.

This is a build-outline and evidence checklist, not evidence that a fresh-machine installation has been repeated. The machine-specific deployment and recovery paths assume the documented Windows folder layout unless absolute paths in the profile are updated.

## Reference index

| Topic | Start here |
|---|---|
| As-built configuration and active paths | [HALO-CURRENT-CONFIGURATION](HALO-CURRENT-CONFIGURATION.md) |
| Daily use and recovery | [HALO-STACK-GUIDE](HALO-STACK-GUIDE.md) |
| DSH version migration and acceptance | [0.1.6-alpha.1 upgrade](DSH-ALPHA-UPGRADE-2026-09-15.md) |
| Provider availability, auth and caveats | [DSH provider setup](DSH-PROVIDER-SETUP.md) |
| Local model settings and reasoning | [Windows 128K tuning](WINDOWS-128K-TUNING-2026-09-15.md), [five investigations](WINDOWS-TUNING-FIVE-INVESTIGATIONS-2026-09-15.md), [reasoning comparison](BRAIN-REASONING-COMPARISON-2026-09-16.md) |
| Lean coding preset | [DSH lean coding](DSH-LEAN-CODING-2026-09-15.md) |
| Full plugin composition | [host plugin inventory](DSH-HOST-PLUGIN-INVENTORY-2026-09-15.md), [stock capability reuse review](DSH-STOCK-CAPABILITY-REUSE-REVIEW-2026-09-15.md) |
| Model crash recovery | [model recovery behavior](HALO-DSH-IMPLEMENTATION-2026-09-15-MODEL-RECOVERY.md) |
| Startup default and context consistency | [startup default](HALO-DSH-IMPLEMENTATION-2026-09-15-STARTUP-DEFAULT.md), [context correction](HALO-DSH-IMPLEMENTATION-2026-09-16-CONTEXT-CONSISTENCY.md) |
| Codex delegation provider | [Codex delegation setup](HALO-DSH-IMPLEMENTATION-2026-09-16-CODEX-DELEGATION.md) |
| Browser, history, LSP, terminal stock features | [alpha upgrade](DSH-ALPHA-UPGRADE-2026-09-15.md) |
| Reddit research | `stack/stock-dsh/skills/reddit-search/` |
| Coordinator/coder pairing | `stack/stock-dsh/skills/pairing-team/` |
| Mission Control source, contracts and installer | `stack/stock-dsh/mission-control/` |
| Installed source versions | `stack/stock-dsh/versions.json` and `stack/stock-dsh/package.json` |
