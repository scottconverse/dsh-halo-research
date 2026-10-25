# OpenRefine and draw.io — October 25, 2026

## Delivered

Both programs and isolated CLI packages are installed and connected to the
running DSH Web and Desktop hosts using their existing watched skills and native
PowerShell execution. No new MCP service, model/provider edit, application
restart, global PATH change or login autostart.

| Component | Installation |
|---|---|
| OpenRefine | Official 3.10.1 Windows-with-Java ZIP, published SHA256 matched; local loopback server on 3333 |
| OpenRefine CLI | 1.0.1, pinned HKUDS/CLI-Anything source commit `34f519533bc175d2fe287ab8316b0dd99bb9cc43` |
| draw.io Desktop | Official 32.6.1 Windows no-installer ZIP, published SHA256 matched |
| draw.io CLI | PyPI cli-anything-drawio 1.0.0, private Python environment |

Install locations, hashes, restart commands and rollback are in the
[OpenRefine skill](../stack/stock-dsh/skills/cli-anything-openrefine/README.md) and
[draw.io skill](../stack/stock-dsh/skills/cli-anything-drawio/README.md).

## Actual acceptance, one shared workflow per program

No chat-model requests were made. In isolated sessions, the actual running DSH
ToolRuntime loaded both skills on both hosts and ran the existing native pwsh
tool. A temporary loopback inspector attached only to the identified host was
closed afterward. This verifies native skill discovery and actual execution,
not an autonomous model deciding to select these skills.

1. Web imported a synthetic two-row CSV into real OpenRefine, applied the Name
   trim history and inspected two rows. OpenRefine import had already trimmed
   whitespace, so the Name history changed zero cells; this is not counted as
   proof that the Name transform changed data.
2. Desktop continued that same project, applied GREL lowercase/trim to City,
   changing two cells, and exported CSV. Actual values were verified as
   `Alice,longmont,12` and `Bob,boulder,7`, preserving both amounts.
3. Web created a genuine editable .drawio file, two labeled nodes and a
   connector. Desktop reopened that file and exported SVG using the actual
   draw.io executable. The XML contains two vertices and one edge; the rendered
   SVG contains all three expected labels.

See [selected native receipts](evidence/openrefine-drawio-2026-10-25/acceptance.json),
[clean CSV](evidence/openrefine-drawio-2026-10-25/clean.csv),
[editable diagram](evidence/openrefine-drawio-2026-10-25/reporting-workflow.drawio)
and [SVG](evidence/openrefine-drawio-2026-10-25/reporting-workflow.svg).

## Problems found, corrections and limits

- Restricted installation initially failed creating CLI executables with
  Windows access denied. The authorized elevated install completed inside the
  private environments; system Python and PATH were not changed.
- The first Web diagram step used upstream main's --id flag, which the published
  PyPI 1.0.0 package rejects. The installed source was inspected; the skill now
  captures returned shape IDs. Only the unfinished diagram step was repeated,
  reusing the existing project and preserving the initial failure receipt.
- The official hash-matched OpenRefine 3.10.1 archive's running version endpoint
  reports `3.10-SNAPSHOT [TRUNK]`, Java 11.0.30. No version label was altered.
  Release archive provenance and runtime self-report are recorded separately.
- SVG is the one verified render format. PDF/PNG/reconciliation/extensions and
  large datasets were not additionally tested. No performance claim is made.

## Preservation, resources and delivery

All four preexisting Web/Desktop home/profile configuration SHA256 values match
the before snapshot. Models/defaults, Low/64K settings, Wigolo, Reddit/Redlib,
XERJ, model_route, LibreOffice and previous application skills were not edited.
Canonical and Desktop fallback bundles match. Halo current configuration,
stack guide, dated implementation record and recovery manifest were synchronized.

OpenRefine intentionally remains available on 127.0.0.1:3333 with its own retained
data folder and owner record; the launcher reuses a healthy server and refuses
an occupied/unready port. draw.io rendering exited normally. No DSH/user jobs
were stopped. Two app downloads total 372,880,892 bytes, plus ~51 MB source ZIP
and small Python dependencies. Binaries, environments, private logs, user data
and backups are not committed.

Native execution: initial Web workflow 17.087s including cold server startup and
the rejected flag; corrected diagram step 1.274s; Desktop completion/export
12.106s. These are tool durations, not total installation time or benchmark
results. Zero chat-model tokens/calls, subagents or benchmarks; coordinator
usage is separate and no exact counter is available from these runtime receipts.
Scoped skills, synthetic artifacts and documentation are committed/pushed on
master; no tag/release was requested.
