# DSH Halo landing site — November 13, 2026

## Delivered scope

The repository had no landing website, design system for a marketing site, Pages configuration or deployment workflow. Added `site/` as a dependency-free static website using the existing Mission Control navy/teal tokens and Segoe UI stack. No runtime, model setting, executable, installer ZIP, release tag, local app profile or shortcut was changed. Work used the isolated publication checkout, preserving the canonical dirty working tree.

Applied the explicitly invoked landing-page skill: investigation, stack assessment, positioning, defined design system, implementation, actual three-width visual inspection and functional checks, then the README. The root README is now a concise entry point. Its former detailed contents are retained with corrected relative links in [the dated reference](HALO-README-BEFORE-LANDING-2026-11-13.md).

## Repository evidence and positioning

Positioning is a community Windows setup for technical DeepSeek Harness users. It emphasizes Web/Desktop, embedded Mission Control, research integration paths, explicit account/model setup and traceable installation/recovery. Shared knowledge and optional bounded project presets are supported by their actual source and profile wiring. [The evidence map and design system](../site/DESIGN.md) links claims to components, profiles, dashboard/plugin source, shared-knowledge initialization and project tools. No customer, performance, uptime or inference-quality claims were added. This is explicitly a community configuration using upstream release-candidate software, not an official DeepSeek distribution.

The main visual is an unchanged real rc.1 Desktop capture from the earlier isolated no-model headless acceptance. Source SHA-256: `c1e707307cb815679aa25697056780951d3be219ac41e3eb1e77adcfd38d0f7b`. It was inspected for tokens, private paths and personal sessions before copying. Its caption says metadata-only test environment, no loaded models, and not a live feed. The architecture diagram reflects installer-defined host/companion connections and ports; it is not a fabricated application screenshot.

## Verification actually executed

- `npm run build --prefix site`: passed, explicit five-asset public allowlist and `.nojekyll` output.
- `npm test --prefix site`: passed current-version/download coherence, unique/existing anchors, public assets under root and `/dsh-halo-research/`, correct asset response types and rejection of repository-document exposure.
- Actual **built output** tested with headless Chromium at **1440×1050, 820×1100 and 390×844**. All images loaded, one H1, no horizontal overflow, no missing fragment targets, no page errors and no failed HTTP responses.
- Mobile disclosure keyboard open/close, Escape focus restoration, skip link, clipboard copy and no-JavaScript mobile menu: passed.
- Computed text contrast checked 147 visible text elements at the final mobile viewport against 4.5:1 normal / 3:1 large-text thresholds: zero failures. This is a targeted contrast/keyboard check, not a comprehensive accessibility certification.
- All nine unique public URLs returned HTTP 200, including current ZIP, checksum, source, guide, verification record, issues and history.
- Final portable browser-check script executed successfully against the same built bytes. Receipt elapsed time: about 8 seconds. Browser and loopback server closed in `finally`; no owned service remains running.

[Machine-readable final receipt](evidence/landing-page-2026-11-13/verification.json) · [Desktop](evidence/landing-page-2026-11-13/desktop.png) · [Tablet](evidence/landing-page-2026-11-13/tablet.png) · [Mobile](evidence/landing-page-2026-11-13/mobile.png).

Screenshots were visually inspected at all three widths. The first browser run's no-JavaScript assertion selected the hidden desktop navigation link rather than the mobile link; the selector was corrected, with the passing final check recorded above. This was a harness failure, not a hidden production navigation defect. A later source sweep surfaced shared-knowledge and bounded-project presets, which were added with explicit opt-in language and rechecked in the final renders.

## Deployment and limitations

[Run/build/preview/deploy instructions](../site/README.md) are included. Relative assets work at the repository subpath or a domain root. The `Landing page` workflow builds/checks pull requests and master pushes, uploads a Pages artifact, and provides an explicit manual Pages deployment. GitHub Pages was not enabled by this task; no public hosted-site availability is claimed. Hosting activation is separate from having a deployable site. No domain, external font, tracker, backend or additional service is needed.

The page preserves installer acceptance limits: new destination rather than in-place upgrade; online downloads and possible Windows elevation/restart; no bundled credentials/model weights; normal XERJ startup can load embeddings; provider sign-in, fresh-PC prerequisites and inference quality were not part of the earlier headless acceptance. Integration wiring is distinguished from live retrieval. There is no root repository license grant; upstream terms are retained, with no new license invented.

Codex/OpenAI current session, serial execution, no subagents or external/local model jobs. No inference, embeddings, DSH host, normal Desktop window or native computer input was used. Existing installer/application acceptance was reused rather than rerun. No new executable/signing/release process applies to these static source changes. Research reading/recovery copies and the cumulative state record are synchronized at delivery.

## November 13 authorized publication

Scott explicitly authorized enabling GitHub Pages and publication after the source delivery above. GitHub Pages now uses Actions with HTTPS enforced. [Live website](https://scottconverse.github.io/dsh-halo-research/).

[Deployment run 43514304938](https://github.com/scottconverse/dsh-halo-research/actions/runs/43514304938) completed build and deploy successfully for accepted source master `5510c23bb47a8b2597951a97eea6babc49138318`. All five actual HTTPS assets returned 200 and matched the accepted build byte for byte. Actual live headless Chromium at 1440×1050, 820×1100 and 390×844 passed image/anchor/overflow, mobile menu, keyboard skip-link, clipboard and installer-download checks with zero page errors or failed HTTP responses. Browser closed afterward. [Live verification receipt](evidence/landing-page-2026-11-13/LIVE-VERIFICATION.json).

The earlier not-yet-hosted statement records the pre-publication state and is superseded by this section. Only repository hosting and documentation changed. No app/model service was started, no GUI input was used and the working installation was preserved. The subsequent documentation commit does not change the deployed website assets or require rebuilding the accepted artifact.
