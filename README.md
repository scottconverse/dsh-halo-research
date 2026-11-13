# DSH Halo for Windows

A community configuration for DeepSeek Harness with Web, the official Desktop app, embedded Mission Control and connected research tools. The complete online installer **0.1.2** pins Web/Desktop **0.2.2-rc.1** and creates a separate installation. This is not an official DeepSeek distribution.

[Landing website source](site/index.html) · [Documentation](docs/INSTALL-AND-RECOVER.md) · [Quick start](stack/complete-windows/README.md) · [Issues and contributions](https://github.com/scottconverse/dsh-halo-research/issues)

## What it does

- Runs separate Web/Desktop profiles with a seven-tab Mission Control dashboard, embedded inside Desktop.
- Configures private Ollama and Wigolo, Reddit/Redlib and XERJ integration paths. Accounts, models and indexed documents require separate setup.
- Provides pinned downloads, locked dependencies, installation receipts and ownership-scoped start/stop scripts.

## Quick start

Download [DSH Complete Windows 0.1.2](stack/packages/DSH-Complete-Windows-0.1.2.zip), verify its [SHA-256 checksum](stack/packages/DSH-Complete-Windows-0.1.2.zip.sha256), extract it and run:

```powershell
.\Install-DSH.cmd
```

Use a **new destination** and keep your working installation. Setup needs internet access, downloads applications and can request elevation or a restart for missing prerequisites. It does not pull or invoke models. Normal XERJ startup can load its embedding model. Read the [installation guide](stack/complete-windows/README.md) before starting.

## Website

The responsive landing site lives in [site/](site/README.md). It needs Node 22+ and no package installation:

```powershell
npm run dev --prefix site
npm run build --prefix site
npm test --prefix site
```

Preview at `http://127.0.0.1:4178/dsh-halo-research/`. The [site guide](site/README.md) covers built preview and GitHub Pages deployment. Hosting is prepared, not enabled automatically.

## Documentation

- [Installer verification and limits](docs/DSH-COMPLETE-WINDOWS-0.1.2-2026-11-13.md)
- [Current Halo configuration](docs/HALO-CURRENT-CONFIGURATION.md)
- [Installation and recovery](docs/INSTALL-AND-RECOVER.md)
- [Desktop Mission Control source and operation](stack/desktop-mission-control/README.md)
- [Implementation history](docs/HISTORY.md)
- [Previous detailed README, preserved as a dated reference](docs/HALO-README-BEFORE-LANDING-2026-11-13.md)

## Project status

Actively developed community configuration using upstream release-candidate software. The current installer payload passed isolated headless Web/Desktop-host verification on an existing Windows PC. That acceptance does not establish fresh-PC prerequisites, provider sign-in, model quality or every integration's live behavior. Prior GitHub release ZIPs remain unchanged; use the current download above.

## Contributing

[Open a reproducible issue](https://github.com/scottconverse/dsh-halo-research/issues), inspect the relevant source and dated evidence, and submit a focused pull request. Preserve profiles, credentials, sessions and recovery records; follow [AGENTS.md](AGENTS.md). Do not include private logs or account data.

## License

No root license grant is currently declared for this repository. Bundled/downloaded upstream components retain their own licenses and terms.
