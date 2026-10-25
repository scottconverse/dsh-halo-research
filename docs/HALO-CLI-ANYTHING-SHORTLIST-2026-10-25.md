# CLI-Anything non-CAD shortlist — October 25, 2026

Scope: catalog/source review only. No additional app installation or qualification.
Current repository registry.json has 79 entries; public_registry.json adds 24 entries: 103 total catalog entries, not 103 independently qualified free Windows apps. The latter includes existing official/third-party CLIs, account-dependent cloud services and platform-specific tools. Registry update dates are metadata, not freshness guarantees.

Sources: [native registry](https://github.com/HKUDS/CLI-Anything/blob/main/registry.json), [public registry](https://github.com/HKUDS/CLI-Anything/blob/main/public_registry.json), individual SKILL.md files. Read complete registry metadata and the relevant Zotero/OBS/Shotcut/Inkscape interface instructions. Prior assessment also examined OpenRefine, draw.io and QGIS instructions. Neither catalog presence nor a vendor test count is installed-Windows acceptance.

| Priority | Application | Concrete Halo use | Important boundary |
|---|---|---|---|
| 1 | OpenRefine | Clean city expenditure/vendor/campaign-finance tables; retain reusable transformation history for newsroom reporting | Requires actual running OpenRefine, not just Python wrapper |
| 2 | draw.io | Editable architecture diagrams, reporting-process maps, relationships and project manuals | Export uses desktop app; keep editable originals |
| 3 | Inkscape | Publication SVG explainers, annotated diagrams, print-quality graphics and patent illustration preparation | Wrapper edits SVG/project state; real app needed for rendering/export; no claim of patent-office compliance |
| 4 | QGIS | Parcel/zoning/district/development maps and spatial joins for TownReporter | Needs QGIS Python/PyQGIS and qgis_process, not arbitrary global Python |
| 5 | Zotero | Human-managed source library, bibliography/citations, prior-art collections across research projects | Local API must be enabled; some writes need GUI; avoid experimental direct database writes |
| 6 | Shotcut | Cut meeting-recording excerpts by transcript timecode; prepare captioned explainers and source clips | Actual render needs MLT/melt + FFmpeg; Windows backend discovery must be verified before promising rendering |
| 7 | Obsidian OR Joplin | Retained editorial notebooks, source notes, project knowledge and tasks | Choose one; some integrations require running GUI/community API plugin. Official Obsidian CLI is separately listed in public registry |
| 8 | n8n | Deliberate recurring source collection/transcription/document workflows | Adds its own service/database/scheduler. Only useful for an actual recurring workflow; no automatic agent fan-out |
| Conditional | Calibre | Organize/convert long-form books/manuals to readable ebook formats for personal research | Library conversion, not OCR/claim verification; overlaps retained-document workflows |
| Conditional | ComfyUI | Generate editorial illustrations and product artwork from existing workflows | Comfy Desktop is present, but service availability and CLI path were not verified; do not install duplicate models |

OBS wrapper caveat: inspected skill primarily edits scene-collection JSON and recording/output configuration. That does not prove live capture start/stop automation; use/verify actual OBS WebSocket for that separate requirement. Audacity registry describes SoX-backed processing; do not assume every advertised app command drives the full GUI. NotebookLM entry calls itself an experimental scaffold and needs an authenticated third-party CLI; lower priority than existing local evidence tools.

Avoid needless overlap: more vector databases when XERJ is already installed; more model managers when DSH/Ollama/LM Studio already supply them; extra browser wrappers without a specific missing capability; macOS-only Safari/iTerm/QuietShrink and NVIDIA-specific Nsight on this Windows AMD system. CAD excluded by owner.

Suggested order for discussion: OpenRefine + draw.io first; then Inkscape or QGIS according to the next real deliverable. Zotero if a curated citation library is wanted. Media editing only when there is an actual clip to produce. No bulk installer or additional background services were added.
