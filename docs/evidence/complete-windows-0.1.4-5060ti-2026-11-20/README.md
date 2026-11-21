# Windows installer 0.1.4 on the RTX 5060 Ti

On November 20, 2026 (Mountain time), the published installer completed on a
separate Windows 11 x64 PC with a GeForce RTX 5060 Ti. The test verified all 71
manifest files and the ZIP’s SHA-256
`d20a6d12d0c16dff0d5f55b7b95286970093af0d17a3ede27764a3bb29a65cf5`.
[Release v0.3.18](https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.18).

## Redlib path failure and recovery

The first attempt used a long, nested destination under LocalAppData. In
`boring-sys2`, the native Redlib build failed with MSBuild
`FileTracker : error FTK1011` while creating `link-cvtres.write.1.tlog`.
The second attempt used the same verified ZIP and a new
`%LOCALAPPDATA%\D014` destination. The native build and installation completed
without a cached Redlib binary.

From the extracted ZIP in PowerShell:

```powershell
.\Install-DSH.cmd -Destination "$env:LOCALAPPDATA\D014" -NoShortcuts
```

`-NoShortcuts` is optional. The test called the supported `Install-DSH.ps1`
entry point directly with a signed portable PowerShell 7 and the same
arguments. The installer provisioned Visual C++ Build Tools, Rust, and LLVM
with approval. Setup required no restart. The first attempt’s partial
destination was retained.

## Observed results

| Check | Result |
|---|---|
| DSH Web 0.2.2-rc.5 | Authenticated page returned HTTP 200. The Web Mission Control dashboard returned HTTP 200 and all seven tabs opened. |
| DSH Desktop 0.2.2-rc.5 | The downloaded and extracted Desktop executables passed Authenticode verification. The signed Electron executable ran the Desktop host in Node mode. |
| Embedded Desktop Mission Control | All seven tabs opened. The plugin overview reported zero failed and zero stuck plugins. |
| Model and process isolation | Zero model requests. Installed test profiles stayed unchanged. The existing Ollama process kept its identity and reported zero loaded models before and after. All test listeners closed. |

The headless checks used copied profiles, Playwright Chromium, and an inert
model metadata endpoint. They exercised the Web UI and the Desktop host with
its embedded dashboard. The normal GUI shortcut, live model or OCR requests,
provider sign-in, and unattended provisioning on a pristine Windows image
remain outside the test.

The first headless attempt reached the Web dashboard and stopped on an
immediate tab-selection assertion. The passing run awaited the selected tab
state and placed its first-use workspace inside the fixture. The empty test
workspace created by the first run was removed.

The receipts omit account-specific paths and transient process commands.
The screenshot’s Ollama status reflects the metadata endpoint used for the
headless check. [Install receipt](install-receipt.json) ·
[Headless acceptance](headless-acceptance.json) ·
[Host verification and cleanup](host-verification.json) ·
[Embedded Desktop screenshot](embedded-desktop.png).
