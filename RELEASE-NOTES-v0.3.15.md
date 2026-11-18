# v0.3.15 — Halo Strata paired startup

This source release adds the DSH Web and Desktop presets for Halo with a 5070 Ti worker.

- **Halo + 5070 Ti** uses full-memory Halo Strata by default for the paired setup.
- **Halo + 5070 Ti (32K capped)** is separately selectable. It prefetches the ranked expert ranges on Windows and verifies the 20 GiB working-set cap on both the server and the engine.
- Both presets start the same remote worker when the lead delegates, using a loopback-only SSH tunnel. Ordinary Local Qwen and the original Strata configuration are preserved.

[Setup, configuration and rollback](https://github.com/scottconverse/dsh-halo-research/blob/v0.3.15/stack/strata-paired/README.md) · [Verification and measured startup results](https://github.com/scottconverse/dsh-halo-research/blob/v0.3.15/docs/evidence/strata-paired-startup-2026-11-17/README.md)

Release checks used copied profiles, mock inference endpoints and a live read-only worker preflight. The prior real capped startup and cleanup are documented separately. No models were loaded for the release.

The Windows installer remains [0.1.2 on v0.3.14](https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.14). Apply the source overlay separately on a provisioned Halo installation.
