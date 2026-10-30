# Halo v0.3.12 - Portable cloud-only DSH installer

Install a separate DSH Web environment on another machine using DeepSeek Cloud
and the released triad fixes, without Halo hardware, Halo paths, LM Studio,
Qwen workers or local model weights. The installer refuses an existing target
directory and does not alter another DSH installation.

## Download and install

Download **dsh-cloud-installer-0.1.0.zip** from this release and extract it.
The installer version is 0.1.0; v0.3.12 is this repository's Halo release version.
The runtime is pinned to DSH 0.2.1-rc.3 using the included npm lockfile.

Requirements on the destination machine:

- Node.js 24 or newer with npm.
- Ollama running locally, signed in to an account with access to
  `deepseek-v4.1-flash:1017-cloud`; register that cloud model if needed.
- Internet access for dependency installation and cloud inference. Windows
  coding tools require PowerShell 7 (`pwsh`); repository inspection requires Git.

Open PowerShell in the extracted installer folder and run:

```powershell
node .\install.mjs --dest "$env:USERPROFILE\DSH-Cloud"
node "$env:USERPROFILE\DSH-Cloud\start.mjs"
```

Choose a destination folder that does not already exist. Open the authenticated
loopback URL printed by the launcher; it does not open a browser automatically.
Ctrl+C stops this installation. If the default port 3080 is already occupied,
choose a different port at installation using `--port 3088`. No existing service
is stopped or reused. All new settings, sessions, credentials and goals remain
under the chosen destination's `home` directory.

The installer sets DeepSeek 1017 **Low** reasoning, **1,048,576-token context**,
**65,536-token maximum output**, and **70% compaction**. Choose **DeepSeek Cloud
coding** for ordinary work or **Three-role coordinator** for an explicitly
approved bounded triad. It does not create a triad automatically. Existing role,
finding-closure, goal-cap and no-progress wait protections remain intact.

The attached **INSTALL.md** contains the complete installation, relocation,
preservation and prerequisite instructions. **SHA256SUMS.txt** covers both
downloaded files. The ZIP's previously recorded SHA256 is:

```text
c656e17d193ca31236d9b77010aa022829bc0465094663efb8e7726906d596e2
```

## Existing evidence reused; no new tests

The existing Windows acceptance installed the locked runtime into a separate
folder, verified the exact native model defaults and metadata, loaded the four
intended presets without broken entries, and retrieved the real Web UI through
its normal authenticated bootstrap. Moving the stopped installation preserved
state and a native profile customization while rebinding plugin paths. Existing
Halo profiles/project state retained their original hashes. Temporary acceptance
hosts exited and their regenerable dependencies were cleaned up.

The ZIP is the exact previously built artifact, not a rebuild. Publication runs
no tests, audits, model requests, installs, host restarts or goal/settings edits.
Existing canonical triad evidence, including its bounded live status-wait
observation, is reused without repeating it.

## Limits and source

Actual execution was Windows x64/Node 24.21.0. macOS/Linux execution was not
performed. The Node source selects platform-appropriate shell tools, but this
does not establish acceptance on those platforms. This is a Web installer,
not an Electron Desktop installer or an offline bundle. It requires the
destination's own cloud account; no paid inference/account-entitlement request
was made during acceptance. Native coding permissions are not an OS sandbox.
Private credentials, conversations, runtime state and recovery files are not
included. A ZIP checksum provides integrity, not a publisher signature.

- [Installation source and instructions](https://github.com/scottconverse/dsh-halo-research/tree/v0.3.12/stack/portable-cloud)
- [Implementation and acceptance record](https://github.com/scottconverse/dsh-halo-research/blob/v0.3.12/docs/HALO-PORTABLE-CLOUD-INSTALLER-2026-10-29.md)
- [Sanitized acceptance evidence](https://github.com/scottconverse/dsh-halo-research/blob/v0.3.12/evidence/portable-cloud/acceptance-2026-10-29.json)
- [Triad repair and live status-wait evidence](https://github.com/scottconverse/dsh-halo-research/blob/v0.3.12/docs/HALO-THREE-ROLE-REPAIR-2026-10-29.md)
