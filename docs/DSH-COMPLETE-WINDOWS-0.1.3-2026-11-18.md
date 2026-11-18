# Complete DSH for Windows 0.1.3

Installer 0.1.3 packages DSH Web and the official Desktop at 0.2.2-rc.1. It retains the embedded Desktop Mission Control panel. The paired Strata and Browse settings are available in both surfaces.

| Preset | Halo lead | 5070 Ti worker | Browse |
| --- | --- | --- | --- |
| Halo + 5070 Ti | Full memory | On demand | Off |
| Halo + 5070 Ti (32K capped) | 32K with expert-cache prefetch | On demand | Off |
| Halo + 5070 Ti + Browse | Full memory | On demand | Lead only |
| Halo + 5070 Ti (32K capped) + Browse | 32K with expert-cache prefetch | On demand | Lead only |

The standard paired preset uses full memory. The general DSH default remains the existing cloud preset. Strata controllers use private Halo loopback routes for the two lead profiles and the worker's SSH tunnel. Supply Strata engines, model assets, verified launch inputs, and worker SSH access using the [installation guide](../stack/complete-windows/README.md). Browse uses the installer-owned headless Chromium profile with a separate loopback relay.

## Artifact

- GitHub release [v0.3.17](https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.17)
- [DSH-Complete-Windows-0.1.3.zip](https://github.com/scottconverse/dsh-halo-research/releases/download/v0.3.17/DSH-Complete-Windows-0.1.3.zip)
- SHA-256 `77880e74a332b6c07d096db28f76153c090b4f77f27da1a9ed109cb23e18499f`
- All 63 files in the bundle manifest matched both the candidate directory and the packaged ZIP.

## Windows verification

The setup ran headlessly in a new Halo destination with shortcuts suppressed. The installer checked its cached vendor archives, built the pinned Redlib dependency with a private Rust toolchain, and provisioned DSH Web, the official Desktop app, and the separate Browse browser. An initial run needed the Rust standalone shims added to the private toolchain path before setup could resume.

Headless session creation caught a duplicate `list_agents` entry. In the locked DSH version the control plugin already provides this tool. The final ZIP drops the duplicate. Both profiles were regenerated with the final package code, all 63 packaged source files were compared byte-for-byte against the isolated installation, and the affected checks were rerun against the corrected profiles.

- The private Web host served authenticated HTML and its Mission Control answered HTTP 200. The official Desktop host ran via Electron in Node mode. All seven tabs opened from the embedded panel in headless Chromium. The dashboard showed zero failed or stuck plugins.
- Under both profiles, the full-memory lead, 32K capped lead and dedicated worker reached their configured loopback endpoints through DSH's adapter. The fixtures verified readiness probing with mock endpoints. The 32K expert-cache prefetch controller and worker SSH path are included, with prior run evidence in the [Strata record](evidence/strata-paired-startup-2026-11-17/README.md). This installer check used no GPU or live SSH worker.
- Both Browse presets opened and read a local fixture through the real extension and dedicated browser. Browse tools were absent from the standard presets and the worker tool set. The installer-owned browser and private test listeners were shut down afterward.
- The working Web and Desktop profile files and the existing Desktop executable matched their before-check hashes. No models were loaded or downloaded during setup or verification.

[Verification receipt](https://github.com/scottconverse/dsh-halo-research/releases/download/v0.3.17/VERIFICATION.json)
