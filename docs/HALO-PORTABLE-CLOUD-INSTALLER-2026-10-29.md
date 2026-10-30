# Portable cloud-only DSH installer — October 29, 2026

Scott requested a portable installer using the existing DeepSeek cloud settings
and triad fixes, without Halo-specific paths or local-model requirements and
without modifying his current installation.

## Delivered design

`stack/portable-cloud/build.mjs` creates a whitelisted, hash-manifested installer
bundle. `install.mjs` verifies all payload hashes, refuses any existing
destination, then installs npm-locked DSH 0.2.1-rc.3 into that new directory.
No global package, PATH, registry, service, shortcut or existing DSH home is
changed. Node24+/npm and a signed-in Ollama cloud gateway are prerequisites.

The generated profile registers only the Ollama cloud route for
`deepseek-v4.1-flash:1017-cloud`: Low reasoning, 1,048,576 context and 65,536
maximum output, with 70% compaction. Unrelated stock presets and upstream
DeepSeek-account/API registrations are disabled in this new profile. There is
one ordinary coding preset plus the unchanged three-role plugin presets.
No Qwen, LM Studio, Halo services, external coding CLI or local weights are
required. The stock DSH dependency graph still contains general-purpose provider
libraries; only the configured cloud route is registered.

The start script uses a destination-owned `home`, binds loopback, refuses an
occupied port, opens no browser and checks Ollama metadata before booting. It
refuses a model not identified by Ollama as cloud-backed. It never starts,
stops, signs in to or changes Ollama. Ctrl+C owns this installation's foreground
child only. A destination's native profile edits survive restart; relocation
rewrites only previous bundle-root paths and the managed loopback port. Session
project paths are not migrated. Use a fresh install on a different OS/architecture.

## Executed acceptance and reused evidence

- Installed614 locked dependencies into a new private Windows directory whose
  name included spaces. npm completed successfully; no global install.
- Native, boot-free composed configuration inspection succeeded.
- Native isolated Web boot exposed exactly `cloud-coding`,
  `three-role-coordinator`, `three-role-coder` and `three-role-auditor`, none
  broken. The only registered model provider was `ollama`; native default
  readback was DeepSeek1017/Low, model metadata1M/64K.
- The real packaged Web UI returned HTTP200 with its DSH boot manifest through
  the newly owned host's standard authenticated bootstrap/cookie flow. Auth
  protection was retained, with no existing-host credential inspection.
- Moved the stopped installation to another directory, preserving a synthetic
  state marker and profile customization. Rebound paths composed successfully;
  the relocated native host passed the same loaded-preset/model/UI checks.
- Focused new-installer checks verified cloud policy, overwrite refusal and
  rejection of a tampered payload before destination creation.
- Three present protected Halo profile/project-state files retained
  their original hashes. No current host was restarted, stopped or reconfigured.
- All temporary native hosts exited; acceptance port31888 was free afterward.
  No model inference, agent creation, triad project or external-provider run.

The canonical triad and compaction source is copied byte-for-byte; its earlier
focused and bounded live status-wait evidence is reused, not rerun. See
[the triad repair record](HALO-THREE-ROLE-REPAIR-2026-10-29.md) and
[sanitized portable acceptance](../evidence/portable-cloud/acceptance-2026-10-29.json).

## Diagnosed issues during this implementation

The initial portability test mistakenly used this Windows user's temporary
directory and then rejected that generated user path. Its fixture now uses a
neutral synthetic owner path. Existing-destination and tamper checks already
passed and were not repeatedly rerun.

The exact installed rc.3 runtime differs from the newer vendored upstream source:
default reasoning is a volatile profile field. A first native boot detected
missing Low from the initial settings-document approach. The installer now
places Low directly in the profile and does not seed that legacy settings file.

Two UI HTTP checks returned401 because the inspection client had no cookie jar.
Source diagnosis established a303 bootstrap cookie handoff. The client was
corrected to use that newly owned host's issued cookie; authentication was not
disabled or bypassed. All earlier checks that passed remain separately scoped.

## Deliverable, limits and preservation

The installer ZIP and its checksum are retained locally, with no private runtime
state or credentials inside. The builder's explicit15-file inventory and each
payload SHA256 are recorded by the public acceptance summary. Existing reading
and recovery records are synchronized; the current Halo deployment is unchanged.

Actual acceptance was Windows x64/Node24.21.0. The Node implementation selects
PowerShell on Windows and bash on Unix, but macOS/Linux were not executed. This
is the Web UI, not a repackaged Electron application. npm dependencies download
at install time; it is not an offline runtime bundle. Cloud account entitlement
and successful paid inference were not exercised, and no new autonomous triad
completion claim is made. These limits do not imply local model requirements.

Implementation stayed in the current Codex session following the requested
model-routing skill, without coding subagents, alternate providers or settings
changes. No new billed model call or served-model identity is inferred from
source configuration. The new installer uses an explicit npm lock; old product
release tests were not repeated.

## Published portable installer — Halo v0.3.12

The unchanged portable installer0.1.0 ZIP, INSTALL.md and SHA256SUMS.txt are
published at https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.12 .
Existing Windows installation/relocation/native-preset evidence is reused. No
rebuild, test, audit, model call, current-host restart or goal/settings edit was
performed for publication. Private receipts and recovery files remain preserved.
