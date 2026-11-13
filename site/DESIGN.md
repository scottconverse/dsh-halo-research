# Site positioning and design

## Positioning

- Category: community Windows setup for DeepSeek Harness.
- Audience: technical Windows users who want Web and Desktop plus visibility into their AI workspace.
- Problem: configuring hosts, companion services and recovery separately obscures what is installed and running.
- Differentiator: separate Web/Desktop profiles, the same seven-tab Mission Control, and an inspectable, checksum-pinned online installer.
- Value: run the two interfaces and see their models, sessions, plugins and system state without assembling the configuration yourself.
- Themes: two interfaces; operational visibility; connected research; explicit model/account setup; installation and recovery; retained project context.
- Primary CTA: download installer 0.1.2. Secondary: see Mission Control.
- Maturity: community configuration under active development; upstream RC, not a production-readiness claim.

## Evidence and qualification

| Claim | Source | Treatment |
| --- | --- | --- |
| Web/Desktop 0.2.2-rc.1, installer 0.1.2 | stack/complete-windows/components.json, runtime lock | Confirmed pinned versions, not a claim about upstream Latest |
| Embedded seven-tab panel | stack/desktop-mission-control/index.mjs, client.js, dashboard.mjs | Confirmed source plus dated headless host acceptance |
| Isolated profiles, private ports, explicit accounts/models | stack/complete-windows/profile.mjs, install.mjs, Control-DSH.ps1 | Confirmed; not in-place upgrade or offline installer |
| Wigolo, Redlib, XERJ wiring | profile.mjs, research-tool-hook.mjs, xerj-mcp.mjs | Included integration paths; retrieval depends on service/data/source availability |
| Optional Claude/Codex connections | profile.mjs provider presets | Requires separate accounts, tools and explicit authorization |
| Shared knowledge and bounded project presets | stack/shared-knowledge/install.mjs, stock-dsh/skills/knowledge-{ingest,query}/SKILL.md, three-role/index.mjs, portable-cloud/profile.mjs | Confirmed skills/presets/state; no automatic import or team startup, no guaranteed review correctness |
| No model loads during acceptance | docs/DSH-COMPLETE-WINDOWS-0.1.2-2026-11-13.md | Historical acceptance only; normal XERJ startup can load embeddings |
| Local operation | installer paths and loopback bindings | Local hosts; online setup and cloud/web services still need network access |

No adoption, performance, inference quality or fresh-PC guarantees. No root license exists; do not describe this repository as permissively licensed. Upstream software retains its own terms. No roadmap commitments.

## Visual system, defined before implementation

Inherit Mission Control's colors and Segoe UI stack: background #0b0f14, panel #101c2a, border #27405c, text #eef6ff, muted #9fb3c8, teal #4fd8c4. Semantic amber #ffc86b is separate from the teal accent. The control-room theme comes from the actual product, not a generic SaaS template.

- Type: Segoe UI/system body; 44–88px responsive hero, 32–52px section headings, 16–19px body, 13px labels. Consolas/system monospace for version/command labels.
- Space: 8px base rhythm; content maximum 1184px; sections 80–120px apart.
- Form: 1px borders, 8–16px corner radii; solid teal primary button. No gradient text, glows or decorative motion.
- Layout: wide typographic hero → real embedded-panel capture → editorial capability rows → deployment map → installation sequence → candid status → final CTA.
- Responsive: desktop navigation at 760px; disclosure menu below; single-column diagrams below 680px. Screenshots fit the viewport with a link to full resolution.
- Access: skip link, visible focus, semantic regions, descriptive links, readable contrast, native disclosure navigation that works without JS. Reduced-motion preference disables smooth scrolling.
- Asset: unchanged real capture from isolated rc.1 headless acceptance, November 13, 2026. No live service, authentication token, private path or personal session is embedded in the site. No application startup needed to reuse this evidence.
