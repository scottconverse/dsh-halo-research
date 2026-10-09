# Windows recovery — October 9, 2026

DSH Desktop and stock DSH Web were restored and tested serially after the Windows reinstall. The already-installed, signed LM Studio 0.4.21 at `C:\Program Files\LM Studio\LM Studio.exe` was used. No LM Studio installer ran and Bionic was not installed. Launching classic LM Studio repaired its stale CLI registration, which had pointed to a missing Bionic executable.

The full Desktop application folder was restored from Windows.old. Surviving Node 24.21.0 and PowerShell 7.6.6 runtimes were copied to the original Program Files paths through the existing elevated helper, with matching executable hashes. No global PATH rewrite was required.

Desktop's model catalog refresh now casts preserved cached Ollama lines to `string[]`, avoiding a crash while Ollama is offline. Its saved profile contained two registrations of each `local`, `local-codex`, and `local-lean` preset. Only the obsolete registrations were removed. All plugin capabilities and enable/disable flags were preserved; the tuned 27B spawn defaults were carried into the retained full presets. The repaired profile is in `stack/windows-recovery-2026-10-09/desktop-cordis.patch.yml`. Original profile and script backups remain in the live evaluation directory and work evidence.

Mission Control's launcher now uses the same exact Node executable as the supported start/stop scripts. Previously it selected Scoop Node from PATH, causing the ownership-safe stop to reject its process. Wigolo's surviving better-sqlite3 native extension had Node ABI 141 versus the restored runtime's ABI 137; rebuilding that dependency restored a real SQLite query and successful city-page retrieval. The old native binary is preserved in work evidence. No Wigolo source or model tuning was changed.

Verification:

- Desktop normal Electron window and bundled host listener started through the supported VBS launcher. The actual Desktop host/profile completed a model read/write/readback session and a separate successful PowerShell session using only `halo/qwen3.8-27b-q6`, context 131072, output allowance 24576.
- Web's supported launcher started DSH and Mission Control. Its actual `fast-first` preset completed PowerShell file operations and an HTTP 200 `web_fetch` with only `halo/qwen3.6-35b-a3b-q6`, context 65536, High reasoning, output allowance 24576. The saved turn ended `completed` with no tool errors.
- Wigolo independently fetched the City of Longmont page with HTTP 200. This verifies the repaired CLI path; the model smoke used successful stock retrieval and did not exercise automatic fallback.
- All 36 pre-existing session files matched their original SHA256 baseline after the model tests.
- Mission Control: 149 contract tests passed. Web focused checks: 51 passed, one optional test skipped. Launcher-specific contracts were rerun after the Node-path repair.
- Models were unloaded before switching between apps. Both apps are stopped and no models remain loaded after acceptance.

These bounded checks verify app startup, authenticated APIs, local inference, file/shell tools, public retrieval, persistence, and shutdown. They do not establish a completed local-news pipeline, full compaction recovery, every optional/cloud provider, or every installed plugin. Ollama is still unavailable; cached picker entries are preserved rather than claimed operational.

Recovery scripts and compact proof files are under `stack/windows-recovery-2026-10-09/`. Smoke scripts create disposable work fixtures and saved test sessions. Do not run both apps/model tests concurrently. `Restore-Runtimes.ps1` refuses to overwrite an existing runtime executable; it is an initial recovery helper, not a routine launcher.
