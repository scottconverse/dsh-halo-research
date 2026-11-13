# Halo upgrade, isolated Windows installation and Desktop Mission Control

Final evidence reconciliation: November 13, 2026. This record supersedes the earlier open-blocker snapshots for this installation task. Existing receipts were reused; no inference, model loading, working-host restart or desktop input was performed to publish this update.

## Delivered installation and evidence

| Component | Delivered state | Evidence and practical limit |
|---|---|---|
| Halo Web | DSH 0.2.2-rc.1 with retained Halo patches | Authenticated page and application asset HTTP200; Mission Control reconnected. Selected receipt: [web](evidence/upgrade-and-desktop-mc-2026-11-13/web.json). |
| Halo Desktop | DSH 0.2.2-rc.1, eight matching official add-ons and six retained archive repairs | Version/archive provenance, installed short-request adapter wire check and later actual installed-host headless acceptance. Existing model selection/settings/goals preserved. Six repair diffs and hashes: [recovery source](../stack/desktop-tuning/rc1-repairs/README.md). |
| Wigolo | 0.3.1 | Build/version, MCP handshake/search/fetch discovery, bounded fetch HTTP200 from the configured command. Saved Halo Wigolo MCP rows remain disabled; research fallback points to this build. |
| Ollama | 0.40.16 | Signed official installer; installed API version checked, all 36 prior catalog entries preserved, zero resident models immediately after install. Idle/client ownership checked before cutover. No inference acceptance claimed. |
| Redlib | 0.40.0 | Elevated ownership/idle check preceded cutover; same loopback18080 endpoint HTTP200, reported commit matches installed build; [receipt](evidence/upgrade-and-desktop-mc-2026-11-13/redlib.json). Service intentionally left available. |
| XERJ | 1.0.0-rc.101 | Original 305-file index preserved. Explicitly authorized MiniLM embedding-only copied-index compatibility passed, then tested copy promoted. Live counts6/14 and bounded reads matched; original data retained. Model unloaded/node stopped afterward. [Receipt](evidence/upgrade-and-desktop-mc-2026-11-13/xerj.json). No LLM or reindex. |
| Strata | Native 0.2.13, HIP engine0.1.59 | Official installer checksum matched; installed version verified and left unloaded. Detached cryptographic signature validation was not completed; installed executable is NotSigned. This limitation remains disclosed. |
| Verdict | Signed 1.1.0 available | Existing recording remains off. No new activation or model job. |
| Isolated complete Windows install | Release bundle0.1.0 / Web+Desktop0.2.1-rc.3 | Actual installed GUI check, authenticated Web200, Mission Control200;208plugins/173active/35disabled/0failed/0stuck. Private homes/data; Web3180, MC3190, Ollama11435, XERJ9202, Redlib18082. Owned services stopped after checks. [GUI](evidence/upgrade-and-desktop-mc-2026-11-13/isolated-desktop.json), [Web](evidence/upgrade-and-desktop-mc-2026-11-13/isolated-web.json), [cleanup](evidence/upgrade-and-desktop-mc-2026-11-13/isolated-cleanup.json). |
| Embedded Desktop Mission Control | Full seven-tab Web dashboard | Installed additively for next normal Desktop launch; actual rc.1 host and headless Chromium acceptance passed. Web dashboard remains independent. [Implementation](HALO-DSH-IMPLEMENTATION-2026-11-13-DESKTOP-MISSION-CONTROL.md). |

## Source and artifact boundaries

This publication updates Halo deployment pins/locks, version/hash-guarded repairs, xAI compatibility patches, Wigolo launcher recognition, XERJ promoted-store launcher, full Desktop Mission Control and recovery/documentation. Main's newer portable research adapter options and complete-installer source0.1.1 are retained. The already-verified isolated GUI fix is now also in Control-DSH.ps1: explicit Desktop launch uses a visible window, background services stay hidden. No GUI was launched during publication.

Installer source0.1.1 still pins rc.5. Published v0.3.12/v0.3.13 ZIPs remain original0.1.0/rc.3 artifacts; no assets/tags/checksums were replaced. The isolated installation uses the latter plus documented local GUI and port corrections. Halo rc.1 and embedded Halo Desktop dashboard do not imply those releases were rebuilt with these changes. This task publishes source and receipts, not new signed executables/installers.

## Model and acceptance limits

Existing Local Qwen is configured Medium, output32768, context131072. Mocked Web adapter serialization and the installed Desktop short request sent Medium/32768 with131072 metadata; [Desktop wire receipt](evidence/upgrade-and-desktop-mc-2026-11-13/desktop-wire.json). Desktop's bundled SDK still has a near-full-context output clamp caveat. This is not a claim of full-window generation or inference quality. No provider/default/effort change is authorized by this publication. DeepSeek1017 integrations retain Low.

XERJ neural compatibility required a one-time explicit embedding-only exception. It is complete and the model was unloaded. Normal XERJ on-demand startup may load its embedding model again, so do not launch it just to verify this publication. Desktop dashboard startup observes models; it does not duplicate Web's automatic recovery owner.

The isolated install was tested on the existing Halo PC, not a fresh PC. Native Codex/Claude sign-ins and optional model registration/download remain user onboarding, not tested account-backed execution. Shared Rust prerequisite ended at1.100.0. Current install software scope is complete at the documented evidence tiers; these limits are not hidden or represented as passed tests.

## Recovery

Keep rollback local and private. Web before-cutover files are in the dated upgrade staging rollback directories. Desktop before-cutover archive/profile copies are in desktop-live-rollback. Redlib retains pre-cutover executable/launcher and elevated receipts. XERJ retains original physical data plus prior executable/launcher/README under its cutover recovery; stop only the verified owned node before restoring all three. Never reindex or rewrite metadata to simulate compatibility. Native Strata and Ollama before/after receipts remain local.

Desktop Mission Control rollback removes only its additive insert block while Desktop is fully closed, preserving any later unrelated profile edits; exact before-profile copies and hashes are retained locally. The isolated install retains pre-GUI controller and pre-port-isolation copies. Its port overrides must stay consistent across complete.json, Web profile and installed Mission Control; do not reuse Halo3080/3090/9200 on this same PC. No automatic rollback execution is claimed tested.

Current Research reading/recovery records and the single STATE.md remain synchronized. Public evidence selects version/status/hash/count fields from private originals; raw chats, credentials, runtime tokens, indexes, sessions, model weights and private backups are excluded. Prior implementation timings/model-wire checks are historical; publication uses the current OpenAI Codex session serially, no subagents or local model jobs.

## Publication validation

Integration is based on the current main branch, preserving the already published installer/shared-knowledge work and portable research options. Affected checks: 24 adapter/output/research tests passed (one opt-in live Wigolo check intentionally skipped), 11 adapter-integrity tests, five Desktop dashboard contracts, four installer tests, and the PowerShell owned-identity regression passed. Three manifest/lock pairs agree; changed JavaScript, JSON, YAML and four PowerShell scripts parse. Six archive repair diffs reconstruct the exact recorded hashes. The credential-pattern scan found no private credentials in the publication candidate.

The rc.1 adapter adds a header waterfall service; unit mocks now implement that actual API. The SDK1.5.2 clamp fixture differs from the older SDK and reaches a one-token floor in the synthetic overflow case; the scoped opt-out preserves the requested cap. Guarded patch transformations use exact pristine fixtures and reject partial drift; unit tests never apply patches to a shared installed dependency tree. Initial stale-test failures were corrected to the current API/fixtures, not hidden or counted as passes. Hash-sensitive xAI patch payload bytes remain unchanged, including CRLF/context whitespace.

This is repository/source publication only: no executable/installer was built, signed, replaced, tagged or released. No GUI input, service restart or model workload was used to publish it.
