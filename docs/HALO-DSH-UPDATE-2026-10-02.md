# Halo DSH 0.2.0-rc.2 integration — 2026-10-02

Both installed Halo hosts now run official DSH **0.2.0-rc.2**. This is an integration update, not a model benchmark. Both hosts were stopped before installation. No user turn was interrupted.

## Installed targets

- Desktop executable: `C:\Users\scott\AppData\Local\Programs\DeepSeek Harness\DeepSeek Harness.exe`
- Desktop home: `C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval\home`
- Desktop profile: `home\profiles\desktop\cordis.patch.yml`; all optional official packages pinned to 0.2.0-rc.2.
- Web deployment: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh`; official packages and pnpm lock upgraded from 0.1.6-alpha.1.
- Web home: `C:\Users\scott\.dsh-stock`; active profile `profiles\web\cordis.patch.yml`.
- Runtime endpoints: Desktop 19387; Web 3080. Both started and authenticated successfully with existing local credentials. No DeepSeek account sign-in was required.

## Preserved model policies

Desktop default remains `lmstudio-library / halo/qwen3.8-27b-q4km`, **Off** (`none` on the wire), 131072 context, 16384 max output. The tuned Q6 route retains 131072 context and 24576 output. Web remains `web-fast / halo/qwen3.6-35b-a3b-q6`, **High**, 65536 context and 16384 output; its fallback remains `web-fallback / halo/qwen3.8-27b-q6-fast`, Medium, 65536 context and 24576 output. No inference configuration, model files, or LM Studio global settings were changed. The existing one-hour timeout was left intact.

The five curated Ollama cloud models remain DeepSeek V4.1 Flash, GLM-5.3, Kimi K3, MiniMax M3, and GLM-5.3 Flash. Existing Claude/Codex CLI routes were preserved, not independently reauthenticated or benchmarked.

## Required 0.2 migration

The stock preset machinery now uses `@deepseek-ai/dsh-agent-preset-registry` and declarative `@deepseek-ai/dsh-agent-preset` rows. Old `.agent-presets` folders are no longer auto-discovered. Existing Halo compositions were ported into registered declarations in each active profile patch, including absolute file URLs for custom lean-tool catalogs. Web selects `fast-first`; Desktop selects `local`. The old folders remain recovery/reference material; editing their files alone no longer changes active registered declarations. Edit the profile declarations and their canonical recovery copies.

Web's stock fallback model-selection settings were carried into the `subagent-model-selection-settings` row. This restores `list_subagent_models` and its exact allow-list. No new dispatcher was created.

DSH automatically imports legacy `settings.yaml` into profile rows and renames the old file to `settings.yaml.imported`. Active configuration is now the profile patch. Web startup-default and catalog-sync helpers support that layout without recreating the legacy file. Canonical `stack/stock-dsh/settings.yaml` remains a deployment template and rollback reference, not the active runtime settings file.

Compaction remains at 70%; Web retains 55%, Desktop Local retains 25% with its existing 8192-token headroom and summary budget. Wigolo remains on demand and not preloaded. No computer-use installation was added.

## Focused verification

- Official Windows feed's SHA-512 matched the downloaded installer; Authenticode status Valid, signed by Hangzhou DeepSeek Artificial Intelligence Co., Ltd. Installer exit 0; app.asar package version 0.2.0-rc.2.
- Web `dsh --version` reports 0.2.0-rc.2. Optional package installs succeeded in both targets.
- The upgraded pi-ai adapter still implements `streamWithSnapshot` and the snapshot Models `streamSimple` hook. Three sampling-plugin checks pass: Off/thinking payloads, unaffected routes, and hook composition/disposal. This checks integration compatibility, not a new live Qwen generation measurement.
- Authenticated fresh-session catalog reads returned the preserved defaults and five cloud models.
- Actual fresh sessions in both hosts sent a cloud-only DeepSeek request, received exactly `HALO_UPDATE_OK`, and recorded `turn/end` completed with no error events. Web advertised 25 tools, Desktop 27. Defaults were restored after the temporary cloud selection.
- Web startup restoration was exercised against a stale selection in an isolated copied profile: restored true, legacy settings recreated false. Catalog synchronization was exercised on an isolated copied 0.2 profile.
- LM Studio before and after held only `orcasaq-2-cyber` (OrcaSAQ 2 Cyber 27B), 131072 context, idle. No local model was loaded, unloaded, or reconfigured.

Machine-readable event evidence: `docs/HALO-UPDATE-0.2.0-VERIFICATION-2026-10-02.json`. Cloud checks establish the host/preset/provider integration, not all account-specific routes or local-model quality. Desktop UI appearance was not screenshot-verified by the available native UI tooling.

## Launch behavior and recovery

Use the existing **DSH Halo Desktop** shortcut / `Launch-DeepSeek-Harness-Evaluation.vbs` to preserve the custom Desktop home. Use the normal Web shortcut for its established model-loading behavior. For a host-only Web start, `node stack/stock-dsh/start-dsh-detached.mjs` starts Web without loading models; that is how this update was verified while preserving Orca. The update does not change normal Web launch's local-pair load/unload policy.

Pre-update backups and installer evidence: `C:\Users\scott\Documents\Codex\2026-10-01\dsh-update-020\before`, `before-manifest.json`, and `official-feed.json`. This folder also retains the post-import pre-preset profile copies. New installer is in the same root. Old Desktop 0.1.7-rc.2 installer remains in Downloads. Rollback requires stopped hosts, reinstalling that Desktop version and restoring its backed-up profile/settings, and restoring Web package.json/lock plus reinstalling dependencies and restoring its old settings/profile. Restore both configuration and binary/package versions together; restoring only a settings file is insufficient after the 0.2 migration.

Canonical Desktop snapshot: `stack/desktop-tuning/deployed-2026-10-02-020`. Canonical Web profile: `stack/stock-dsh/web-profile/cordis.patch.yml`. Human records and recovery copies are synchronized under `C:\Users\scott\Desktop\Halo Stack Research`.

## Claude catalog correction — 2026-10-02

Replaced pinned `claude-sonnet-5` / Claude Sonnet 5 with `claude-sonnet-5-5` / Claude Sonnet 5.5 in both live profiles and canonical recovery copies. Current Claude rows are Opus 5.5, Sonnet 5.5, and Haiku 4.5 (still the latest released Haiku per Anthropic's current model documentation). Sonnet exposes Low, Medium, High, Xhigh and Max; its existing High selection default remains unchanged. Official model identity and supported levels were checked against Anthropic's Sonnet 5.5 and effort documentation, and installed Claude Code 2.1.283 help.

Neither host had active turns. Brief host restarts restored native CLI registration after live config reload dropped it. Both authenticated runtime catalogs now return `claude-sonnet-5-5` and exclude `claude-sonnet-5`; their local model defaults remain unchanged. No Claude generation was needed for this catalog correction. Evidence: `HALO-SONNET-PICKER-VERIFICATION-2026-10-02.json`.

Sources: https://platform.claude.com/docs/en/models/sonnet-5-5/overview and https://platform.claude.com/docs/en/build-with-claude/effort .
