# DSH for the Halo Windows workstation

This repository records the machine-specific DeepSeek Harness deployment on a Windows AMD Strix Halo workstation with 128 GB of unified memory. It contains deployment source, adapters, launchers, recovery instructions and dated evidence. Cloning it does not reproduce this machine's accounts, models or private runtime state. Separate installers create fresh deployments without copying that state.

## Complete Windows setup

The [complete Windows installer candidate](stack/complete-windows/README.md) packages
Web, actual Desktop, Mission Control, Ollama local/cloud choices, the triad fixes,
Wigolo, Reddit/Redlib, XERJ and native Claude/Codex connections. It uses a new
installation directory and private profiles. See the [November 2 implementation
and verification record](docs/DSH-COMPLETE-WINDOWS-2026-11-02.md) for passed
isolated backend checks and the remaining fresh-PC acceptance limits. It is not
yet a tagged public installer release. The earlier cloud-only release remains available below.

## Portable cloud-only installation

For a different machine, use the separate [portable cloud-only installer](stack/portable-cloud/README.md).
It creates a new DSH Web home with DeepSeek1017 Low/1M context/64K output/70%
compaction and the same triad fixes. It requires Node24+/npm and signed-in Ollama
Cloud, but no Halo hardware, local weights or LM Studio. It does not copy or edit
this machine's runtime state. See the [implementation and acceptance](docs/HALO-PORTABLE-CLOUD-INSTALLER-2026-10-29.md)
for actual Windows acceptance and cross-platform limits. Download the installer ZIP and instructions from
[Halo v0.3.12](https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.12).

## Current setup - October 25, 2026

| Component | Current configuration / record |
|---|---|
| DSH Web | `0.2.1-rc.3`, loopback `http://127.0.0.1:3080` |
| DSH Desktop | `0.2.1-rc.3`, separate preserved Desktop profile |
| Default Ollama cloud model, Web and Desktop | `deepseek-v4.1-flash:1017-cloud`, reasoning effort **Low**, maximum output **65,536 tokens** |
| Local inference choices | Existing Gufo, LM Studio and local Ollama entries remain selectable; they are not the cloud default |
| Other providers | Existing account-backed Claude and Codex choices are preserved; removing older Ollama cloud picker entries did not remove other providers |
| Live-web research | Wigolo through the deployment's research integration |
| Reddit research | Reddit RSS / local Redlib workflow and retrieval adapter |
| Explicit model routing | Native `model_route` plugin in Web/Desktop; retained CLI and companion skill; exact DeepSeek 1017 defaults Low/64K |
| Retained-document search | XERJ MCP with MiniLM neural embeddings; original 14-record Halo corpus restored, physical Windows data path pinned |
| Mission Control | Loopback `http://127.0.0.1:3090`; cloud-aware status and saved-versus-historical model display |

The four Desktop and five Web sessions selecting the retired DeepSeek cloud route were migrated to the new model with effort Off. Sessions selecting local models or other providers were preserved. Historical request records and titles can still contain earlier model names. One archived Web session's original workspace folder is missing; its saved selection is migrated, but the session remains unavailable for normal interaction.

The repository release [v0.3.11](https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.11) is a Halo source snapshot, not the upstream DSH version. It includes the shared triad fixes and their loaded-runtime/live status-wait evidence, retaining earlier application connections; see [release notes](RELEASE-NOTES-v0.3.11.md). The separate portable installer above creates a fresh cloud-only deployment; it does not migrate this machine's sessions or install the optional Halo applications.

The [October 19 Low-effort update](docs/HALO-DEEPSEEK-1017-LOW-2026-10-19.md) supersedes the earlier Off setting: both live defaults, all 14 saved sessions selecting DeepSeek 1017, and its dedicated worker profiles now use **Low**. Historical migration counts above describe the earlier model-ID repair.

The [October 23 Flint removal and title-call change](docs/HALO-FLINT-REMOVAL-TITLE-CALLS-2026-10-23.md) removes Flint from both pickers, restores DeepSeek 1017 Low for the four remaining Flint session selections, and disables auxiliary model-generated titles. Session names use the stock deterministic fallback; manual renaming remains available. Models and integrations otherwise remain unchanged.

The [October 24–25 publication record](docs/HALO-PUBLICATION-2026-10-25.md) links the native routing plugin, companion skill, actual activation/coding evidence and historical effort-study archive. Both installed routing copies match all 21 committed source files. The archived study was not rerun for publication.

The [October 25 rc.3 upgrade](docs/HALO-DSH-UPGRADE-2026-10-25.md) records both installed versions, preserved settings/skills/plugins, native routing and Wigolo/Redlib checks, and the missing XERJ corpus. The later [XERJ recovery](docs/HALO-XERJ-INDEX-RECOVERY-2026-10-25.md) identified Windows AppData redirection, restored the original 14 records and verified one real MCP retrieval.

The [LibreOffice CLI skill](docs/HALO-LIBREOFFICE-CLI-2026-10-25.md) is available in both apps for document/PDF production through existing PowerShell tools. One real ODT/PDF workflow is recorded; model defaults and integrations are preserved.

[OpenRefine and draw.io](docs/HALO-OPENREFINE-DRAWIO-2026-10-25.md) are also connected through skills in both apps: local data cleaning/CSV export and editable diagram/SVG production. Their shared real workflows, isolated installation, recovery and version caveat are documented; existing models/defaults/integrations are preserved.

[TextFlowKit, Siftwing and PatentForge](docs/HALO-APP-CONNECTIONS-2026-10-25.md) provide transcription/export, retained-evidence retrieval and project storage through the same native tools. Their installed acceptance and remaining internal model-pipeline limits are documented.

## Daily use

Use the existing desktop shortcuts:

- **Start DSH Web** starts/reuses Web and opens the operator surfaces.
- **Stop DSH + Wigolo** runs the scoped Web shutdown path.
- **DSH Halo Desktop** opens the separate Desktop app.

The Web launcher validates the selected provider/transport. Its LM Studio-specific path reuses the selected resident model or loads into an empty inventory; it does not describe every route as a mandatory two-model load. A cloud route does not require local model residency. See the current [launcher source](stack/stock-dsh/Start-StockDSH.ps1) and [startup/integration history](docs/HISTORY.md) for the applicable behavior and limitations. Manual model changes remain separate from routine repository publication.

Web's live profile is `%USERPROFILE%\.dsh-stock\profiles\web\cordis.patch.yml`. Desktop uses its own profile/home; do not apply Web paths to Desktop. Accounts, credentials, session histories, memory data, downloaded models and runtime caches stay outside Git. Older checked-in settings and dated guides are historical evidence unless the current implementation record explicitly identifies them as active.

## Research tools

Wigolo discovers and reads live web sources. Reddit RSS and local Redlib handle community posts and comments. XERJ searches already-indexed evidence; it does not replace general web discovery. These integrations are retained together. Supported subreddit listing URLs now also use local Redlib through web_fetch; listing results explicitly exclude comment and other-page coverage. See the [listing repair record](docs/HALO-REDDIT-LISTING-REPAIR-2026-10-19.md) and [active Web preset wiring correction](docs/HALO-WEB-LISTING-WIRING-2026-10-19.md).

The legacy Wigolo MCP loader can be disabled while the research adapter remains active. The MCP Settings panel lists loader entries, so an absent named Reddit row does not alone establish a broken retrieval path. See [the UI integration record](docs/HALO-DSH-UI-PLUGINS-2026-10-15.md) and [XERJ installation](docs/HALO-XERJ-INSTALLATION-2026-10-17.md) for observed behavior and limits.

The bundled [reddit-search skill](stack/stock-dsh/skills/reddit-search/SKILL.md) includes the parser and Windows Redlib lifecycle instructions. On this machine Redlib uses `http://127.0.0.1:18080`. A process or HTTP response alone is not proof that Reddit-backed content was retrieved; use the evidence in the dated reports.

## Mission Control

The seven tabs are **Overview, Models, Sessions, Plugins, System, Memory and Settings**. They cover service/model state, session activity, tool inventory, machine resources, persistent memory and bounded configuration controls.

- Ollama cloud classification uses the exact model's remote-host metadata rather than assuming that a local Ollama endpoint means local inference.
- Sessions distinguish **Next request (saved)**, including effort, from **Last used**. Historical usage and speed stay associated with past requests.
- System validation uses the installed DSH build. The October 19 validation passed with zero warnings; the dashboard marks it stale when relevant configuration/version changes.
- Memory reads the deployment's existing store and writer/snapshot state; absent or stale evidence is not presented as healthy.

See the [Mission Control repair record](docs/HALO-MISSION-CONTROL-CLOUD-MODELS-2026-10-19.md) for the installed build hash, checks and recovery information. Mutation routes retain the existing per-launch authorization and loopback-origin controls.

## Optional development helpers

The [Ollama/Codex worker helper](stack/codex-ollama/skill/SKILL.md) is an optional integration. Its receipts now contain a distinct invocation ID so separate invocations that resume the same session can be distinguished. This does not by itself establish correct aggregate accounting or authorize delegation.

The [pairing-team skill](stack/stock-dsh/skills/pairing-team/SKILL.md) is opt-in. Current owner instructions, provider selections, scope limits and existing action authorization take precedence over older workflow rules. Do not automatically spawn workers or add review stages for ordinary work. Its plugin inventory is explicitly a historical snapshot.

The unpublished usage-reporting prototype and personal voice-skill copies remain local. They are not part of this repository release. Backups, private work files, credentials and raw session histories are excluded as well.

## Records and recovery

Start with [the history index](docs/HISTORY.md). The [rc.2 upgrade record](docs/HALO-DSH-UPGRADE-2026-10-19.md) documents installed acceptance, preservation, compatibility repairs and recovery. Current October 19 records include [default selection](docs/HALO-DEEPSEEK-1017-DEFAULT-2026-10-19.md), [Desktop sessions](docs/HALO-DESKTOP-SESSION-MODEL-REPAIR-2026-10-19.md), [Web sessions](docs/HALO-WEB-SESSION-MODEL-REPAIR-2026-10-19.md), and [Mission Control](docs/HALO-MISSION-CONTROL-CLOUD-MODELS-2026-10-19.md).

The [September build reference](docs/HALO-SYSTEM-BUILD-REFERENCE.md) and [October 1 archive review](docs/HALO-ARCHIVE-CONSOLIDATED-REPORT-2026-10-01.md) are historical records. Their old defaults, measurements and local evidence links must not be treated as current setup instructions or fresh verification.

Scott's local reading and recovery copies live in `C:\Users\scott\Desktop\Halo Stack Research`. Retain immutable private evidence locally; publish scoped implementation and readable reports without embedding credentials or raw conversations.
