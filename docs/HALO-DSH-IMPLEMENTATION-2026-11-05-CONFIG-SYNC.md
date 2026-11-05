# November 5, 2026 â€” repository and installed configuration synchronization

The repository had drifted from the installed Web/Desktop configuration: profile
snapshots omitted current Local Qwen settings, installer sources pinned rc.3 rather
than installed rc.5, and the newly installed shared-library skills were only on their
feature branch. This update reconciles those source/configuration gaps without
changing the running installations.

Safe source mirrors now include both native profiles and dependency locks, Desktop's
root overlay/launcher, sanitized Strata configuration and optional sampling hooks.
The exact deployed Mission Control variant is retained separately because canonical
Mission Control already contains additional portable-install changes. Six Desktop
archive edits are retained as hash-gated byte transformations against official rc.5,
with a read-only plan and new-file-only reconstruction utility. A one-off owner command
is an inert historical reference, not a new installed goal control.

Both source installer manifests/locks now pin rc.5, version0.1.1. The complete
Desktop component uses the existing verified official rc.5 installer SHA512. Updated
builders whitelist the empty library template, two skills and a destination-path
initializer. Both complete hosts share their new installation's library. Refusal of
existing library/skill locations protects notes; no private corpus/accounts are copied.
Original published ZIPs and all earlier evidence remain unchanged.

## Verification and limits

- Three affected installer profile/bundle checks and two library/render/bundle checks
  passed; no account/model calls.
- Read-only7-Zip listing proved the actual rc.5 download is an NSIS wrapper around
  app-64.7z, unlike the old direct extraction assumption. Updated source extracts
  that inner payload without running the installer. A focused wrapped/direct/missing
  payload fixture check passed; this is not a new full-install acceptance claim.
- All source-lock DSH packages resolve rc.5 (296cloud/298complete); non-DSH versions
  retain their own upstream numbering. A stale rc.3 lock caused ERESOLVE on the first
  complete metadata update; preserving it and resolving fresh fixed the conflict
  without force/legacy-peer flags or touching installed dependencies.
- Two-skill path rendering including spaces/apostrophes, empty library generation and
  refusal to overwrite existing contents passed. No private corpus copied.
- All six original rc.5 archive entry hashes matched and reconstructed exactly to
  installed hashes in read-only plan; wrong-source refusal/already-patched behavior
  checked. Full output-archive installation was not run or newly claimed.
- Five YAML documents parsed structurally. Standard YAML reports the existing native
  `!!js` expressions as custom tags; they were not executed or removed. This is not
  a new live-host configuration acceptance claim.
- 106 protected live configuration/goal/skill files remain byte-identical at readback.
  Existing November3 installed Web/Desktop acceptance and earlier bounded triad result
  are reused. No restart, UI control, model call, subagent or Strata startup occurred.
- No new clean-PC install, external-account inference or universal hardware claim.
  Older published ZIP evidence applies to those older artifact identities only.

[Install and recover](INSTALL-AND-RECOVER.md) is the current cross-machine entrypoint.
[Source map](evidence/config-sync-2026-11-05/source-map.json) and
[bounded acceptance](evidence/config-sync-2026-11-05/acceptance.json) are sanitized
public records. Private inventory/backups are under the dated Codex config-sync
folder. Credentials, raw history, goals and user notes are not exported.

One accountable Codex agent, serial execution, no subagents. No external model job
was launched; available session identity is not independently metered per-file work.
Reading/recovery copies are synchronized additively. Git delivery is recorded after
remote verification in the private task state rather than inventing a commit here.
