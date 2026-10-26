# Halo v0.3.9 - Five application connections for DSH Web and Desktop

OpenRefine, draw.io, TextFlowKit, Siftwing and PatentForge are connected through
small skills using DSH's existing native skill and PowerShell services. This
release includes those connections, their documentation, recovery instructions
and nonprivate acceptance artifacts. Existing models, defaults, plugins and
research integrations are preserved.

## Included since v0.3.8

| Connection | Installed component / included capability | Earlier acceptance |
|---|---|---|
| OpenRefine | Official hash-verified 3.10.1 Windows archive; CLI 1.0.1 from pinned upstream source; loopback startup helper and data-cleaning skill | Web imported a synthetic CSV; Desktop changed two city cells and exported the expected cleaned rows |
| draw.io | Official hash-verified 32.6.1 Windows archive; CLI 1.0.0; editable-diagram and native-render skill | Web created two nodes and a connector; Desktop reopened the editable file and rendered a real SVG |
| TextFlowKit | Existing 0.1.19 Windows runtime; transcription/export skill and CLI entry point | Web transcribed three seconds of synthetic speech; Desktop exported the timed result to Markdown |
| Siftwing | Existing dev.57 installation; bounded retained-evidence retrieval skill | Both hosts retrieved a retained Longmont official-source passage |
| PatentForge | Isolated Lean 0.5.0 installation; project API skill, private-runtime dependency record and scoped startup helper | Web created a synthetic project; Desktop retrieved it; five services became healthy |

All five skills were loaded by both running hosts. The earlier acceptance used
native ToolRuntime execution with isolated sessions, not autonomous model
selection of skills. Four preexisting DSH home/profile configuration hashes were
unchanged. No user jobs were stopped or DSH apps restarted for these connections.

- [OpenRefine/draw.io installation, corrections and acceptance](docs/HALO-OPENREFINE-DRAWIO-2026-10-25.md)
- [OpenRefine/draw.io native receipts and sample outputs](docs/evidence/openrefine-drawio-2026-10-25/acceptance.json)
- [TextFlowKit/Siftwing/PatentForge installation and acceptance](docs/HALO-APP-CONNECTIONS-2026-10-25.md)
- [TextFlowKit/Siftwing/PatentForge native receipts](docs/evidence/app-connections-2026-10-25/acceptance.json)
- [CLI-Anything application shortlist](docs/HALO-CLI-ANYTHING-SHORTLIST-2026-10-25.md)
- [Complete work history](docs/HISTORY.md)

## Existing evidence reused; no more tests

No tests, model calls, benchmarks, installations or app restarts were run for
this publication. Release work is limited to documentation, source/archive
membership, tag creation, publication and remote identity checks. Earlier
acceptance is described above without implying fresh runtime testing.

Material limits remain explicit:

- The official OpenRefine 3.10.1 archive matches its published SHA256, but its
  running version endpoint reports `3.10-SNAPSHOT [TRUNK]`. The label was not
  changed. The initial Name trim changed zero cells because import already
  trimmed whitespace; the later City normalization changed two cells.
- PyPI draw.io CLI 1.0.0 lacks upstream main's --id flag. The skill uses returned
  shape IDs. Real SVG export passed; PDF/PNG and complex diagrams were not
  additionally tested.
- PatentForge's internal model-driven analysis still needs separate cloud
  credentials and remains unconfigured/unverified. Project create/read and
  service availability are not proof of that analysis pipeline.
- Siftwing's internal research/OCR/model routes do not inherit DSH settings and
  were not exercised here. Retained-passage retrieval was verified.

## Distribution, preservation and exclusions

This is the Halo deployment source release **v0.3.9**, not an upstream DSH
application release. Web/Desktop remain **0.2.1-rc.3**. Publication changes no
runtime settings: DeepSeek 1017 Low/65,536 output, existing model choices,
Wigolo, Reddit/Redlib, XERJ, model_route and the LibreOffice connection remain
as configured. Earlier v0.3.8 content remains included.

GitHub source ZIP/tar archives include the five skill bundles, documentation,
dependency/recovery notes and synthetic/public-source acceptance artifacts.
They do not bundle third-party application engines or make this repository a
standalone installer. Follow each skill's recovery instructions on another
machine; local accounts, services and environments are not recreated by cloning.

Private conversations, credentials, raw private diagnostics, runtime ledgers,
personal voice skills, user projects/data, caches, virtual environments, model
weights, downloaded installers, backups and the broken accounting prototype
are excluded. Previously tracked historical runtime-patch and registry-path
backups remain export-ignored in source archives; Git history is not rewritten.
