# Portable cloud-only DSH

**Source revision November 5:** installer source 0.1.1 pins DSH rc.5 and adds
an empty private shared knowledge library with ingest/query skills. These are
source changes, not a replacement for the immutable previously published ZIP.
The v0.3.12 cloud ZIP / v0.3.13 complete ZIP contain the earlier 0.1.0/rc.3
inputs and do NOT gain rc.5 by downloading them again. For current source builds
and the exact evidence limits see [Install and recover](../../docs/INSTALL-AND-RECOVER.md).
No fresh-PC installation or model-quality acceptance is claimed for 0.1.1.


A separate DSH Web installation using the existing DeepSeek cloud settings and
the released three-role fixes. It does not install into, edit or restart an
existing DSH installation. There are no Halo paths, GPU checks, local model
weights, LM Studio, Qwen workers, Wigolo, Mission Control or account-backed
Claude/Codex dependencies in this profile. The triad workers inherit the same
DeepSeek cloud selection.

## Requirements

- Node.js 24 or newer, including npm. Installation downloads the pinned DSH
  0.2.1-rc.5 dependencies using the included npm lockfile.
- Ollama installed and running on the destination machine, signed in to an
  account authorized for `deepseek-v4.1-flash:1017-cloud`. Register that cloud
  model with Ollama if needed. Cloud availability and account limits are owned
  by the provider. No model weights need to be loaded locally.
- Internet for installation and inference. Git is needed for the triad's Git
  inspection in repositories. Windows coding tools use PowerShell 7 (`pwsh`);
  Unix coding tools use bash. Your project may need its own build tools.

The local Ollama service is a cloud gateway, not a local inference requirement.
This installer never signs in, changes your Ollama defaults, starts or stops
Ollama, pulls local weights, or sends a model request. No API keys are bundled.

## Install

Extract the portable installer bundle, then in that folder run:

```powershell
node install.mjs --dest "D:\Apps\DSH-Cloud" --port 3080
node "D:\Apps\DSH-Cloud\start.mjs"
```

On macOS/Linux choose an appropriate path, for example `--dest "$HOME/DSH-Cloud"`.
The destination must not already exist. The installer refuses overwrites and
leaves an interrupted download in its own new folder for diagnosis. It never
edits the default DSH home, shell profile, registry, PATH, scheduled tasks,
shortcuts, existing sessions or goals. It installs no global npm packages.

After startup, open the printed loopback URL in your browser. The launcher runs
in the foreground; Ctrl+C stops this installation. It will not kill/reuse a
service already using the configured port. Choose another port in this new
installation's `portable.json` while stopped if necessary. It opens no browser
automatically and accepts no network-facing bind address.

Select **DeepSeek Cloud coding** for ordinary work or **Three-role coordinator**
for an explicitly approved bounded triad. The read-only Auditor and coding
worker retain their existing runtime role restrictions. Triad creation is not
automatic. The upstream permission controls remain available; a separate home
is isolation of configuration/history, not an operating-system sandbox for
coding tools.

## Preset and preservation

DeepSeek uses Low reasoning effort, a 1,048,576-token context setting,
65,536-token maximum output and 70% automatic-compaction policy. Compaction
uses the same cloud route, with 8K summary/headroom and 55% retained tail.
Model-generated auxiliary titles are disabled. The no-progress guard waits
after two inspection-only automatic Coordinator rounds, preserving native goal
identity, used counts and caps; it does not guarantee correct agent judgments.

All new sessions, settings, credentials and goals live under `<destination>/home`.
`INSTALL-RECEIPT.json` records the isolated installation outcome. The launcher
sets `DSH_HOME` only for its child process and does not inherit an existing DSH
home. On relocation it rebinds only its managed module paths and loopback port,
preserving native profile-editor changes. It leaves `home/settings.yaml`, credentials, goal
records and project/session history intact.

Move the entire stopped installation between directories on the same OS and
architecture; the next launch rebinds the generated plugin paths. For another
OS/architecture, run the installer bundle afresh so npm selects the proper
native dependencies. Existing session project paths are not rewritten when
moving a used installation. Keep `home` private and back it up before moving;
do not publish an initialized installation with credentials or private history.

`node start.mjs --dump-config` inspects the composed config without booting a
host or contacting a model. Startup checks cloud metadata and refuses a local
inference fallback. It does not prove your account can complete a paid model
request; no model request is made as part of installer verification.

## Build from the repository

```powershell
node stack/portable-cloud/build.mjs --output "D:\Downloads\DSH-Cloud-Installer"
```

The builder copies only an explicit file whitelist and records SHA-256 hashes
in `bundle.json`. The installer verifies those hashes before writing a new
destination. These hashes detect accidental bundle changes; they are not a
publisher signature. The canonical triad and compaction modules are copied
unchanged from this repository; no Halo runtime/profile files are copied.

This is a portable Web installer, not a repackaged Electron Desktop app. The
source is cross-platform; acceptance recorded with this change identifies the
OS actually exercised and does not imply tests on other operating systems.
