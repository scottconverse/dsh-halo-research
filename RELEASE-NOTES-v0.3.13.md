# Halo v0.3.13 — Complete Windows DSH installer

This release adds an online Windows x64 installer for a fresh machine: DSH Web,
the actual Desktop App, Mission Control, Ollama local/cloud configuration,
Qwen model selections, the released triad fixes, Wigolo, Reddit/Redlib, XERJ and
native Claude Code/Codex connections. DeepSeek 1017 cloud retains Low effort.
LM Studio, Gufo and Halo-specific model files are not required.

## Download and install

Download these assets from the release:

- `DSH-Complete-Windows-0.1.0-candidate.zip` — original verified installer bundle.
- `DSH-Complete-Windows-0.1.0-candidate.zip.sha256` — checksum.
- `INSTALLATION.md` — current installation, account/model setup and recovery guide.
- `VERIFICATION.json` — preserved prepublication verification receipt.

ZIP SHA-256: `78cf4a455da92873671317ed00695e423f26e0a5a217ec7665fe1a2f9676b1e8`.

Verify the hash, extract the ZIP, open its installer folder, then run
`Install-DSH.cmd`. It normally installs missing PowerShell 7 and provisions the
remaining pinned dependencies. Default destination: `%LOCALAPPDATA%\DSH-Complete`.
Existing destinations are refused except a matching installer-owned resume.
Windows elevation, script trust and restart requirements are not bypassed.
No model weights, credentials or private Halo corpus are bundled.

The ZIP filename and its embedded candidate README are intentionally retained
to preserve the exact verified bytes. Use the separate current instructions.
This release's repository documentation differs from the original bundle only
in publication documentation; the implementation was not rebuilt or changed.

## Verification and limits

Existing evidence is reused: pinned runtime installation/native builds, archive
integrity, isolated native Web and actual Desktop backend authentication/startup/
shutdown, nine loaded Web presets including triad roles, and affected installer,
ownership, research-schema and Mission Control checks. No additional test or
model run was performed for publication.

**A complete fresh-PC installation has not been observed.** Destination prerequisite
provisioning and Redlib compilation, actual shortcuts/Desktop GUI, provider
account calls, companion end-to-end behavior and GPU/model performance remain
unverified. Sign in normally and download only the models selected on that PC.
Publication is not evidence of those outcomes.

The original [verification record](docs/evidence/complete-windows-2026-11-02/verification.json)
and [implementation account](docs/DSH-COMPLETE-WINDOWS-2026-11-02.md) retain their
scope, failures and historical prepublication status. Existing Halo applications,
settings, goals, model defaults, shortcuts and recovery files were not changed.
The earlier cloud-only installer release remains available as v0.3.12.
