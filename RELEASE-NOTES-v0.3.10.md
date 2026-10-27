# Halo v0.3.10 - Desktop startup recovery

The Desktop launcher now opens DSH using its saved model catalog when an optional catalog refresh fails. Previously, that failure prevented the application from opening even though the saved catalog was intact. The selected-model safety check remains mandatory; a failed safety check still blocks startup.

## Included since v0.3.9

- Recorded source for the deployed Desktop launcher at `stack/desktop-tuning/Launch-DeepSeek-Harness-Evaluation.vbs`.
- Startup diagnostics in the Desktop home's local `logs/desktop-startup.log`, including refresh and safety-check exceptions. The log itself is not included in this release.
- Dated repair documentation, updated configuration/operating records and the history index.
- Scott's standing maintenance rule: handle DSH Halo Desktop, Start DSH Web and Stop DSH + Wigolo shortcuts together, preserving their distinct actions and checking their current targets/icon files.

[Full repair record](docs/HALO-DESKTOP-STARTUP-2026-10-27.md) | [Work history](docs/HISTORY.md)

## Earlier verification reused - no more tests

The completed repair's earlier focused checks established that forced refresh failure falls back to the saved catalog, while forced model-safety failure still blocks startup. The normal desktop shortcut then opened a responding DeepSeek Harness main window. Its startup log confirmed the saved `ollama / deepseek-v4.1-flash:1017-cloud` route and unchanged model residency. The profile diff contained catalog array-spacing normalization only; model IDs, defaults, effort, limits and integrations were preserved. All three desktop shortcuts' executable targets and icon files existed.

These are earlier repair observations, not new tests for this publication. No tests, model calls, benchmarks, installs or restarts were performed for the release.

## Limits

The original refresh exception could not be reproduced under normal Windows access, and the old launcher had not retained its diagnostic output. The repair addresses its confirmed fatal-refresh behavior without claiming a proven cause for the earlier discovery failure. Refresh still runs synchronously; this release does not add a timeout to the LM Studio CLI. Startup evidence does not establish every optional DSH tool's behavior.

## Distribution and preservation

This is **Halo deployment source release v0.3.10**, not an upstream DSH application version. The previously documented Web/Desktop upstream version remains **0.2.1-rc.3**; this publication does not upgrade either application. Existing models, defaults, skills, plugins, Wigolo, Reddit/Redlib, XERJ and the v0.3.9 application connections remain preserved.

GitHub's source archives include the launcher source and documentation, with all previous release content retained. They are not a standalone installer. The launcher retains this machine's documented installation paths.

Only the scoped repair and public documentation were added since v0.3.9. Private startup logs, raw conversations, credentials, model files, runtime data, local diagnostic fixtures and rollback copies are not included. Existing archive exclusions for historical runtime-patch backups and the registry-path backup remain in effect. No private files, backups or broken accounting prototype were added, and Git history was not rewritten.
