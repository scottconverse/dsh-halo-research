# Halo v0.3.8 - LibreOffice CLI skill and document/PDF workflow

DSH Web and Desktop can now use the installed LibreOffice CLI through their
existing skill and PowerShell services. One real shared workflow created an
editable document in Web and rendered the same saved project to PDF in Desktop.
Existing models, defaults and research integrations are preserved.

## Included since v0.3.7

- cli-anything-libreoffice skill, discovered and loaded by both running apps.
- Small JSON argument-array runner using the real installed Click CLI in one
  process so edits persist until explicit save; no replacement document engine.
- Exact dependency record for the isolated cli-anything-libreoffice 1.0.0 Python
  environment, plus installation, usage, recovery and removal instructions.
- Dated installation report and native execution/preservation receipts.
- Public sample editable ODT, rendered PDF and saved project JSON.
- Current README and history. The rc.3 upgrade, XERJ recovery and earlier Halo
  routing/plugin/skill repairs remain included.

## Existing evidence reused; no more tests

The earlier installed acceptance loaded the skill through each host's native
skill tool. Web created the editable document in 1.637 seconds; Desktop rendered
the same saved project through real LibreOffice in 24.868 seconds. Both PowerShell
operations exited 0. The resulting ODT structure and all six intended text items
were checked in both outputs; the PDF is a readable one-page document identifying
LibreOffice 26.8.1.1 as its producer. Four DSH profiles and all 70 pre-existing
skill files were unchanged. These were native tool executions, not model-driven
chat runs; no provider model calls or benchmarks were used.

No tests, model calls, installations, app restarts or benchmarks were run for
this publication. Only release metadata, source identity and archive membership
are inspected. The existing acceptance does not establish every Calc/Impress
operation, complex formatting or arbitrary Office-file round trips.

- [Installation and acceptance report](docs/HALO-LIBREOFFICE-CLI-2026-10-25.md)
- [Skill instructions](stack/stock-dsh/skills/cli-anything-libreoffice/SKILL.md)
- [Installation, dependency and recovery notes](stack/stock-dsh/skills/cli-anything-libreoffice/README.md)
- [Native execution and preservation receipt](docs/evidence/libreoffice-cli-2026-10-25/acceptance.json)
- [Editable sample ODT](docs/evidence/libreoffice-cli-2026-10-25/halo-briefing.odt)
- [Rendered sample PDF](docs/evidence/libreoffice-cli-2026-10-25/halo-briefing.pdf)
- [Saved project JSON](docs/evidence/libreoffice-cli-2026-10-25/halo-briefing.json)
- [Complete work history](docs/HISTORY.md)

## Distribution and exclusions

This is the Halo deployment source release v0.3.8. Upstream Web/Desktop DSH
remains 0.2.1-rc.3; this publication changes no application/runtime settings.
GitHub's source ZIP/tar archives include the skill, documentation and sample
ODT/PDF/project. No installer, Python environment, third-party application engine
or additional binary asset is distributed. LibreOffice must be installed on a
target machine; the recovery instructions describe the separate CLI environment.

Private conversations, raw diagnostic helpers, credentials, runtime ledgers,
personal voice skills, environments/caches, model weights, downloaded installers,
backups and the broken accounting prototype are excluded. Existing historical
tracked runtime-patch and registry-path backups remain export-ignored in source
archives; Git history is not rewritten. Earlier XERJ LocalCache recovery limits
remain documented in the v0.3.7 repair report.
