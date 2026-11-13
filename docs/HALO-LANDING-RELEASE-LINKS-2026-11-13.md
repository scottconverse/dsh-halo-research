# Landing page release links — November 13, 2026

Scott requested that the live landing page point directly to release v0.3.14 and installer0.1.2, with publication and headless verification. Updated only site links, their maintenance/check contract and task records. Existing installation, models, installer ZIP, release assets/tags and other website content are preserved.

## Changed links

- Visible version strip: [Release v0.3.14](https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.14).
- Download button: [release installer0.1.2 ZIP](https://github.com/scottconverse/dsh-halo-research/releases/download/v0.3.14/DSH-Complete-Windows-0.1.2.zip).
- Checksum: [matching release asset](https://github.com/scottconverse/dsh-halo-research/releases/download/v0.3.14/DSH-Complete-Windows-0.1.2.zip.sha256).

The displayed installer/upstream versions stay0.1.2/0.2.2-rc.1. The release remains Latest. No installer/application rebuild or reinstallation applies to this link-only change.

## Executed source acceptance

`npm run build --prefix site` and `npm test --prefix site` passed, including exact release/download/checksum links, pinned versions, real assets under root and project subpaths, and fragment targets. Actual built output passed headless Chromium at1440×1050,820×1100,390×844: no overflow/broken images/anchors/pageerrors/HTTPfailures; mobile keyboard navigation, skip link, copy and no-JavaScript menu passed. All10unique external links returned200. Computed text contrast passed149visible text elements with no failures. Browser/server closed afterward.

[Built-site receipt](evidence/landing-release-links-2026-11-13/built-site-verification.json). Existing installer and model acceptance was reused; no models or DSH hosts were launched. Serial current Codex/OpenAI session, no subagents or external/local model jobs; no native computer input or working-installation changes. No test failures occurred.

## Publication procedure and records

The existing GitHub Actions workflow builds/tests the merged source, and an explicit master dispatch with deploy=true publishes the accepted site. Post-publication acceptance compares live assets byte-for-byte to this build, checks the exact public release/ZIP/checksum links, verifies the downloaded installer hash, and exercises the live site headlessly at desktop/tablet/mobile widths. Final deployment identity and live verification receipt are retained in the cumulative STATE.md and synchronized Halo Stack Research reading/recovery records. The live URL is https://scottconverse.github.io/dsh-halo-research/.
