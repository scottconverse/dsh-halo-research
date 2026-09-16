# Approved local-model recovery

September 15, 2026.

## Problem and scope

LM Studio recorded two unexpected model-engine exits at 19:43:14 and 19:43:15 local time. The application and API remained up, but both approved models disappeared. Mission Control's recorded GPU allocation fell from 51.9 GiB to 2.6 GiB. The configured GPU memory carveout did not change. The underlying cause of the engine exits was not established.

The existing launcher restored the approved pair only when explicitly run. Stock DSH's model provider routes inference and does not supervise LM Studio's model processes. This repair extends the existing Mission Control machine integration; it does not add a DSH provider, substitute a runtime, or change the model defaults.

## Behavior

- Watch independently of the browser page while the Mission Control server and DSH are running.
- Use new `Engine protocol runtime exited unexpectedly` entries in LM Studio's main log, together with observed model residency. Mere absence or an unavailable model-list request is not a crash signal.
- Restore only previously resident approved models: `halo-brain-35b` and `halo-coder-q4km`. Retain their 131,072-token context, one parallel slot, GPU offload, and no-MTP load commands.
- Respect Mission Control's intentional unload controls, including an unload requested during recovery. Ordinary disappearance without an unexpected-exit entry is left alone, including direct LM Studio or CLI unloads.
- Persist recovery observations and explicit unload suppression across Mission Control restarts. A fresh installation starts at the end of the log so historical failures do not trigger new loads.
- Serialize model changes and limit repeated recovery attempts. Failures remain visible rather than being reported as successful loads.

The background check runs every 15 seconds. A model gets at most three recovery load attempts within ten minutes, with at least 15 seconds between attempts. A successful explicit Load resets its attempt history. After a confirmed intentional unload, a subsequent explicit load through LM Studio or the desktop launcher also re-arms observation. The Models footer reports each role's recovery state or error.

The watcher restores model availability. It does not replay a failed conversation, relaunch an intentionally closed application, alter the BIOS/driver GPU carveout, or claim to fix the underlying LM Studio engine crash. The supported desktop Stop action still leaves LM Studio and resident models running.

## Verification

The installed Mission Control SHA-256 is `D9D2DBC21CB5FF079B66BA9305C4333A1C00843C9D6D8CEBA77E6B519B8D4E26`.

The installer passed all four required suites: 13 reasoning checks, 40 data checks, 35 UI checks, and 14 installer checks (102 total). Nine new data checks execute the actual asynchronous recovery supervisor and mutation queue with substituted I/O and clock. They cover crash/absence correlation, ordinary unload, null inventory, pending work across restart, actual failed-load retries, rate limits, Unload during a recovery load, queued-operation suppression, re-arming after an external load, wrong-model aliases, DSH stopped, bounded log chunks, partial lines, and rotation.

These are simulated failure signals, not deliberate crashes of the live GPU engine. The original natural crash was diagnosed from LM Studio's log. Both approved models were restored using the real LM Studio loader. Live Mission Control acceptance separately exercises intentional Unload, two watcher ticks, a Mission Control restart, and explicit Load. Its results and final resident model settings are preserved in [live-recovery.json](evidence/model-recovery-2026-09-15/live-recovery.json); the agent-operated procedure is [Verify-LiveRecovery.ps1](evidence/model-recovery-2026-09-15/Verify-LiveRecovery.ps1).

Only Mission Control was restarted for deployment. DSH, Wigolo, Ollama's connection settings, and the running Codex application were preserved. Documentation and changed recovery files are synchronized under `C:\Users\scott\Desktop\Halo Stack Research`.
