> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Halo development provider evaluation

Latest development change: [native-agent metrics and compaction clarification](CLI-METRICS-2026-09-02.md). Native counters are mapped, false native TTFT labels removed, and 94 deterministic tests plus two live metrics probes pass. Production is unchanged.

This is an independent clone, not a production checkout or linked worktree.
Production remains at `C:\Users\scott\Desktop\Code\dsh-halo-research`.

Workflow: parent owns deployment and integration; provider researcher owns candidate-specific findings; isolation reviewer checks launch/state separation; final acceptance checks real file/edit/test behavior and production fingerprints. Shared resource operations are serialized by the parent.

Initial candidate: OmniRoute 3.8.50 plus DSH 0.1.1-rc.2. Local inference remains the existing engine; no engine migration is part of this experiment. CLIProxyAPI/ProxyPal is the alternative if the first candidate fails a concrete requirement.

Current status: **native Claude and Codex subscription coding now pass in development**, and the opening-screen picker is installed. Read [the current CLI integration report](CLI-INTEGRATION-STATUS-2026-09-02.md) first. It supersedes the older authentication-blocked statements below: those checked empty development auth homes, not the existing official CLI logins. Other cloud accounts, long-session Codex compaction and per-session no-turn picker persistence remain unfinished. No production promotion.

Only launch via `dev/` scripts. Copied `stack/` launchers are historical material and must not be executed: they retain production paths.

## Open it

- Development cockpit: <http://127.0.0.1:3180>
- Development provider dashboard: <http://127.0.0.1:20129>
- Existing production cockpit remains <http://127.0.0.1:3080>.

The development model menu is searchable by provider, model name, or model ID. Its current snapshot contains 32 preserved direct-local choices and 2,705 gateway choices. Search `Claude`, `Codex`, `DeepSeek`, `Kimi`, `GLM`, or a local model name. Clear the search to restore all choices. The gateway list excludes only entries explicitly classified as non-chat; unclassified entries remain visible, so it is not a certified all-chat list. The raw catalog and exclusion receipt are preserved.

`configured` means a provider connection exists, **not** that every model has passed a live call. `connect account` means authentication/setup is pending. `context unverified` identifies a provisional or provider-declared context, not a measured loaded context. The two resident local gateway routes use the observed 32,768 context rather than OmniRoute's incorrect generic 128,000.

The direct tuned brain is the saved development selection. Selection alone does not start generation or load a model. Native full-user tools remain available; separate development state is not a workspace-only sandbox.

## Startup and shutdown

The current installation has pinned dependencies and a portable Node runtime; it does not require the production launcher. In PowerShell:

```powershell
Set-Location 'C:\Users\scott\Desktop\Code\dsh-halo-dev'
& .\dev\Start-DevProvider.ps1
& .\dev\Start-DevDsh.ps1
```

Only run these for a stopped development instance. An occupied port is refused, not seized. Starting these scripts does not warm/load models, restart LM Studio, create a Windows service, or install a startup task. Open the URLs above after the services become healthy. Launcher success means the process was started; it is not a health or provider-acceptance guarantee.

For shutdown, use the recorded development process identity, executable, start time and command line before stopping it. DSH receipts are in `.runtime\logs\dev-dsh-*.pid.json`; the provider receipt is `.runtime\omniroute\launcher.json`. OmniRoute also has a server child. Do not run a generic Node/process-name kill or copied `stack` stop script. Production and unrelated processes must remain alone.

This installation is not yet a one-command clean-machine installer. `prepare-dev.mjs` deliberately reads this machine's production baseline and copies four inherited native-access source files into this clone; it is a preparation tool, not a harmless everyday startup command. Do not rerun it over development source edits casually.

## Accounts and model refresh

The gateway's newly generated development dashboard password and API key are stored locally in:

`C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\credentials\provider-admin.json`

Open it locally if needed to sign into the development dashboard; do not paste it into chat, reports or Git. No personal account credentials were imported. Connect only accounts you intend to use for this experiment. Official CLI logins use separate homes under `.runtime\claude` and `.runtime\codex`; CLI subagents are a different integration from gateway-backed top-level model choices. See `PROVIDER-ACCESS.md` for the distinction and source-based options.

Catalog refresh is currently explicit, not a background synchronization service:

```powershell
& .\.runtime\node\node-v24.20.0-win-x64\node.exe dev/configure-provider.mjs
& .\.runtime\node\node-v24.20.0-win-x64\node.exe dev/sync-catalog.mjs
```

The first refreshes the complete descriptive provider snapshot and checks development management setup. The second merges richer capability/context data, existing local declarations, and read-only loaded-instance facts into development settings. Neither intentionally sends a model-generation request. Afterward, restart only the verified development DSH process to load the changed catalog. The direct-local list is preserved, not automatically rebuilt from newly installed GGUF files by this script.

## Reproduce deterministic checks

```powershell
& .\.runtime\node\node-v24.20.0-win-x64\node.exe dev/capture-acceptance.mjs
```

This runs development configuration, launcher, catalog and picker tests plus the inherited native-access wrapper tests. It writes timestamps, command, test-file hashes and complete output to `dev\evidence\acceptance.json` and `acceptance.txt`. These tests use fixtures/mocks where applicable; they do not authenticate providers or generate with models. The live coding evidence is separate under `.runtime\evidence\gateway-*`.

## Files to read before continuing

1. `dev\DEVELOPMENT-STATUS-2026-09-02.md`: decision, exact live results, blockers, source links and resume order.
2. `dev\ISOLATION-REVIEW.md`: independent production-integrity and runtime checks.
3. `dev\PROVIDER-ACCESS.md`: account/route distinctions and authentication instructions.
4. `dev\BROWSER-ACCEPTANCE-2026-09-02.md`: tested picker behaviors and explicit omissions.
5. `dev\picker\README.md`: searchable overlay build, provenance and maintenance.

All paths above are relative to `C:\Users\scott\Desktop\Code\dsh-halo-dev` unless a full path is shown. Reports are also copied to `C:\Users\scott\Desktop\Halo Stack Research`; runtime credentials and session contents are not copied into those public-facing reports.

## Known limits before promotion

No production promotion is authorized. First prove actual Claude/Codex authentication and model-selected coding; connect/test the desired API accounts; resolve the synthetic `keepalive` response-identity defect; review inherited dependency advisories; and try a useful multi-file job without mid-run assistance. The current success is a small integration smoke, not proof of general autonomous development. Production research/memory services are intentionally not attached to this separate provider experiment, and were not changed.
