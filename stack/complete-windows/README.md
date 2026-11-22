# Complete DSH for Windows — installer 0.1.5

**Installer 0.1.5** pins Web and the official Desktop to **DSH 0.2.2-rc.5**, retains the seven-tab embedded Desktop Mission Control panel, and includes the paired Strata presets and opt-in, lead-only Browse. Web retains its browser dashboard. Each host uses its own authenticated
connection, profile and dashboard state; private ports avoid the existing Halo
installation. Installation never pulls or invokes a model.

Web's global **New Session** uses the registered Default workspace or opens the folder chooser. Sessions started from a specific project retain that folder. The Desktop package uses the stock workspace client and has no stale Verdict command registration.

Download the [Windows installer 0.1.5](https://github.com/scottconverse/dsh-halo-research/releases/download/v0.3.20/DSH-Complete-Windows-0.1.5.zip) and [checksum](https://github.com/scottconverse/dsh-halo-research/releases/download/v0.3.20/DSH-Complete-Windows-0.1.5.zip.sha256), or build it from source:

```powershell
node stack/complete-windows/build.mjs --output C:/DSH-bundles/DSH-Complete-Windows-0.1.5
# In that new bundle folder, on the destination Windows x64 machine:
.\Install-DSH.cmd
```

Previously published ZIPs remain available at their original release URLs;
they do not gain these updates when downloaded again. No fresh-PC, provider
account, inference-quality or model/GPU acceptance is implied by source changes.

One guided online setup for Windows x64: DSH Web and the actual Electron App,
the released triad fixes, Mission Control, private Ollama, Qwen model choices,
DeepSeek 1017 cloud at Low effort, Wigolo, Reddit/Redlib, XERJ and native
Claude Code/Codex connections. This additive package leaves the existing
portable-cloud installer available.

## Install on the destination PC

Use the newly built 0.1.5 bundle. Verify its manifest/checksum, extract it, and run:

```powershell
.\Install-DSH.cmd
# Optional short, new destination under LOCALAPPDATA:
.\Install-DSH.cmd -Destination "$env:LOCALAPPDATA\D014"
```

Existing or partial installations are not upgraded in place. A different bundle
version cannot resume an older installation. Keep old working installations and
rollback files; install to a new destination and validate before retiring one.

The default is `%LOCALAPPDATA%\DSH-Complete`. It refuses existing directories;
use `-Resume` only for its own interrupted setup. Keep downloads and receipts
to resume. Do not copy a different installer version over a partial setup.

If the Redlib build stops with MSBuild `FileTracker : error FTK1011` on a deeply
nested file path, keep the partial folder and its logs. Run the same verified
bundle again with a short, unused destination under `%LOCALAPPDATA%`, such as
`D014` above. Start a new install for this workaround. The installer’s resume
receipt belongs to the original destination.

The published 0.1.4 ZIP installed successfully on a Windows 11 PC with an
RTX 5060 Ti using this workaround. Web, the signed Desktop host, and all seven
Mission Control tabs on both hosts passed headlessly with zero model calls.
The test used portable PowerShell 7 and copied profiles. See the
[5060 Ti verification evidence](../../docs/evidence/complete-windows-0.1.4-5060ti-2026-11-20/README.md)
for the exact artifact, observed failure, and test limits.

The bootstrap downloads a pinned Node distribution into this installation.
Other artifacts have pinned checksums; npm uses the included lockfile and an
explicit package-local native-build script allowlist. No global npm install,
LM Studio, Gufo, Docker, Halo paths or Halo model files are required.

The bootstrap provisions missing PowerShell 7. The Reddit build provisions
Python, Git, Rust MSVC and C++/CMake/LLVM/NASM prerequisites through their normal
Windows installers. This can request elevation or a Windows restart; it does
not silently bypass either. These shared development prerequisites are not
removed on uninstall. Existing DSH profiles and shortcuts are preserved. Pass `-NoShortcuts` to keep a new setup entirely out of the Desktop shortcuts folder.
Setup does not change PowerShell execution policy. If Windows or an organization
blocks downloaded scripts, resolve that through its normal trusted-script
approval process; the installer does not bypass it. Redlib is built without
starting a service or treating a live Reddit content request as an install gate.
Its receipt distinguishes installed from live usability not yet observed.

Allow several GB for apps/build tools and additional space for selected
models. This is an online installer, not an offline bundle of model weights.

## Start, accounts and models

The new **DSH Complete** desktop folder contains three distinct shortcuts:
**DSH Desktop**, **Start DSH Web**, **Stop DSH + Wigolo**. Existing shortcuts
are unchanged. Start/stop owns only processes recorded by this installation;
PID, executable, command line and creation time must match before cleanup.
An occupied port is a conflict, not permission to stop/reuse another service.

Both hosts use `<installation>/home`, separate `web` and `desktop` profiles,
and one shared triad state. Electron uses its own `data/electron` directory.
Ollama uses port 11435 and private model storage, one resident model and one
parallel request. Web/browser Mission Control use3180/3190; embedded Desktop Mission Control uses3191. XERJ uses9202 and Redlib18082.
These services bind loopback. Keep Web launch tokens private.

Web setup generates preset recovery mirrors and applies the reviewed rc.5
runtime repairs inside the new installation. The Web launcher checks both
before starting any services. If you intentionally edit a registered Web
preset, back up and review `home/profiles/web/cordis.patch.yml`, then run
this command from the installation folder to update its recovery mirrors:

```powershell
.\tools\node\node.exe .\stack\complete-windows\web-runtime.mjs sync
```

The launcher stores the mirrors and original patched runtime files under
`runtime-patch-backups`. Headless Web startup uses `.\Start-StockDSH.ps1 -NoOpen`.

Desktop's **Mission Control** sidebar entry embeds the same seven tabs, charts,
memory graph and controls as Web: Overview, Models, Sessions, Plugins, System,
Memory, Settings. It connects to Desktop's current ephemeral authenticated host,
not the Web host. Its listener stops with Desktop. Settings use this installation's
Desktop live profile and separate desktop-profile recovery mirror. Automatic
LM Studio recovery is disabled for this Ollama-only installation; no Halo models
or accounts are adopted. Model controls require explicit user action.


From the installed folder, perform account sign-in yourself:
Use a PowerShell 7 terminal for these commands.

```powershell
.\Control-DSH.ps1 -Action OllamaSignIn
.\Control-DSH.ps1 -Action CodexSignIn
.\Control-DSH.ps1 -Action ClaudeSignIn
```

These invoke the providers' normal sign-in flows. No credentials or existing
profiles are copied into the bundle. Claude/Codex CLI accounts are separate
from the Ollama model gateway; their configuration homes are `data/claude` and
`data/codex`, so these flows do not replace an existing CLI profile. Availability and usage limits belong to those
accounts. Using a delegation tool still requires task authorization.

Register DeepSeek cloud and download only the local models you want:

```powershell
.\Control-DSH.ps1 -Action Models -Models 'deepseek-v4.1-flash:1017-cloud'
.\Control-DSH.ps1 -Action Models -Models 'qwen3.8:27b'
# Other included choices: qwen3.6:35b (about 23 GB), qwen3-coder:30b (about 19 GB).
```

The three local choices are the official Ollama Qwen family equivalents,
not copies of Halo's LM Studio quantization aliases. Qwen 3.8 27B is about
18 GB. Actual digest metadata is recorded after download. No inference is
performed by installation/model registration. GPU allocation and speed must
be established on the destination; shared RAM is not dedicated VRAM.

Select a local model in DSH's native model selector and its local-tools
preset. Presets own tools; they do not silently replace the global route.
Local metadata is bounded to 16K context/4K output. The DeepSeek cloud row
keeps its existing 1M context/64K output and Low effort. The two account-backed
presets expose the corresponding native delegation tool. Triad creation is
always explicit, and the goal cap is never reset or raised automatically.

Wigolo is an MCP child of each host; the research fallback uses its installed
CLI and the included Reddit parser. Browser binaries are private. XERJ has a
fresh persistent data directory: no Scott/private corpus is bundled. Its
neural embedding assets may be downloaded on first use. Empty search results
are not a broken installation or an existing indexed research collection.

Mission Control retains its existing views. LM Studio operations are disabled
in Ollama mode; the existing Halo configuration/default behavior is unchanged.

## Halo Strata and Browse

The original cloud route stays the global default. Choose **Halo + 5070 Ti** for a full-memory Halo lead or **Halo + 5070 Ti (32K capped)** for the separate 32K profile with Windows expert prefetch. Both delegate to the same 5070 Ti worker on demand. The first message starts the selected Halo engine. The worker starts on the first delegated model request. The companion files are included and selection alone loads no model.

Before using a paired preset, copy `stack/strata-paired/settings.example.json` to `stack/strata-paired/settings.json` under this installation, then fill in the paths and hashes. Supply your compatible Strata engines, model pack, native and PLE GGUF, tokenizer and ranked-expert profile. The installer does not copy or download these model assets or configure SSH. Use the supplied capped HIP and worker CUDA launch templates, or verified existing inputs. Keep the full-memory source JSON on loopback port 8081 and the capped and worker source JSON on 18181. The installed controllers write private launch copies. The active installer ports on Halo are 8181 (full), 8183 (capped), and 8182 (SSH tunnel to worker loopback 18181). No existing Halo listener is reused by the installer.

Install `psutil` in the controller Python and `psutil` plus a compatible `gguf` reader in the prefetch Python. The worker requires its assigned Windows SSH account and trusted host key, the CUDA Strata Control layout, `psutil`, and its verified asset receipts. Use the original [Strata prerequisite and safety guide](https://github.com/scottconverse/dsh-halo-research/blob/v0.3.15/stack/strata-paired/README.md) for the receipt formats and memory requirements. The preflight commands below only inspect files, process conflicts and headroom. Set `$python` to the configured local controller Python.

```powershell
& $python -B .\stack\strata-paired\halo.py preflight
& $python -B .\stack\strata-paired\halo.py preflight --capped
& $python -B .\stack\strata-paired\worker.py preflight
```

For Browse, run `.\Control-DSH.ps1 -Action StartBrowse` and choose either **Halo + 5070 Ti + Browse** or **Halo + 5070 Ti (32K capped) + Browse** in a new session. Only that lead preset exposes Browse through DSH. The worker remains on `local-lean`. The browser uses this installation's headless Chrome for Testing profile in `data/halo-browse/chrome` and a separate loopback relay on 19972. Stop it with `.\Control-DSH.ps1 -Action StopBrowse`. The regular **Stop** action also stops Browse if this installation started it. The browser extension and Chromium are provisioned by the setup. No browser starts during setup.

## Recovery, removal and updates

Keep `INSTALL-RECEIPT.json`, `MODEL-RECEIPT.json`, downloaded artifacts, `home`,
`agents`, `data`, process receipts and logs. Stop this installation before
backup. Credentials in data/configuration should be treated as private.

Use **Stop DSH + Wigolo** or `Control-DSH.ps1 -Action Stop`. It preserves all
settings, goals, history, model weights and search data. If an identity check
fails, investigate the retained receipt instead of killing the PID by age.

To remove the setup, first stop it, back up the data, then remove only its
installation directory and its three shortcuts. Shared Windows prerequisites
and provider accounts remain. Existing Halo installations are untouched.
Install updates into a new destination; this package does not migrate profiles
or execute the upstream Desktop installer. The unmodified upstream Desktop
shell can register the `dsh:` protocol on first launch and retains its normal
update/security policy. Use this full setup on the new PC; do not launch it
alongside another Desktop installation whose protocol association you need to
preserve. No Desktop window or installer was launched on Halo during preparation.

Sources: [DSH](https://github.com/deepseek-ai/deepseek-harness),
[Ollama](https://github.com/ollama/ollama),
[Wigolo](https://github.com/KnockOutEZ/wigolo),
[Reddit/Redlib setup](https://github.com/scottconverse/reddit-search-redlib),
[XERJ](https://github.com/xerj-org/xerj).
