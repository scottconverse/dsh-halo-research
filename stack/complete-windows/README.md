# Complete DSH for Windows — installer candidate

One guided online setup for Windows x64: DSH Web and the actual Electron App,
the released triad fixes, Mission Control, private Ollama, Qwen model choices,
DeepSeek 1017 cloud at Low effort, Wigolo, Reddit/Redlib, XERJ and native
Claude Code/Codex connections. This additive package leaves the existing
portable-cloud installer available.

**Candidate, not yet a published/accepted installer.** See the dated state and
verification record. An install receipt records actual completed stages; it is
not proof of account authorization, inference quality or GPU performance.

## Install on the destination PC

Build the public-file bundle with `node stack/complete-windows/build.mjs
--output <new-folder>`, or extract the released bundle when available. From
that bundle run the Windows command bootstrap (or use PowerShell 7 directly):

```powershell
.\Install-DSH.cmd
# Optional new destination, under your LOCALAPPDATA:
.\Install-DSH.cmd -Destination "$env:LOCALAPPDATA\DSH-Complete-2"
```

The default is `%LOCALAPPDATA%\DSH-Complete`. It refuses existing directories;
use `-Resume` only for its own interrupted setup. Keep downloads and receipts
to resume. Do not copy a different installer version over a partial setup.

The bootstrap downloads a pinned Node distribution into this installation.
Other artifacts have pinned checksums; npm uses the included lockfile and an
explicit package-local native-build script allowlist. No global npm install,
LM Studio, Gufo, Docker, Halo paths or Halo model files are required.

The bootstrap provisions missing PowerShell 7. The Reddit build provisions
Python, Git, Rust MSVC and C++/CMake/LLVM/NASM prerequisites through their normal
Windows installers. This can request elevation or a Windows restart; it does
not silently bypass either. These shared development prerequisites are not
removed on uninstall. Existing DSH profiles/shortcuts are not overwritten.
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
parallel request. Web/Mission Control use 3080/3090, XERJ 9200, Redlib 18080.
These services bind loopback. Keep Web launch tokens private.

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
