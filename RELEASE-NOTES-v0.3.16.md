# v0.3.16 — Opt-in Browse for Halo

The Browse companion adds two opt-in session presets to DSH Web and Desktop.

- **Halo + 5070 Ti + Browse** uses the full-memory Halo Strata lead.
- **Halo + 5070 Ti (32K capped) + Browse** uses the capped Halo Strata lead.
- Both presets expose Browse tools to the lead. The 5070 Ti worker keeps its existing `local-lean` preset. The normal presets and global model selection stay as configured.

Browse 0.1.5 runs in headless Chrome for Testing with a dedicated profile and a loopback-only relay. The existing headless verification used real Browse navigation and snapshots against a loopback test page in both DSH profile fixtures. The ordinary presets, global tool view and worker preset had no Browse tools. Copied profiles rolled back byte for byte. Verification loaded no models.

[Setup, rollback, and the verification record](https://github.com/scottconverse/dsh-halo-research/blob/v0.3.16/stack/halo-browse/README.md)

This is a source release. [Windows installer 0.1.2](https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.14) remains available on v0.3.14.
