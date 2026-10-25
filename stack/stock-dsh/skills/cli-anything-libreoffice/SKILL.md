---
name: cli-anything-libreoffice
description: Create and edit Writer, Calc and Impress projects with the installed LibreOffice CLI; export editable documents and real headless LibreOffice PDFs using the existing PowerShell tool.
---

# LibreOffice CLI for Halo DSH

Use the existing pwsh tool. No model/provider change, new plugin, MCP server or
additional agent is needed. Windows Python environment:

    C:\Users\scott\.dsh-stock\tools\cli-anything-libreoffice

CLI package: cli-anything-libreoffice 1.0.0 (HKUDS/CLI-Anything, MIT package
metadata; see upstream repository licensing). LibreOffice is already installed
at C:\Program Files\LibreOffice\program\soffice.exe. Do not reinstall it.

## Commands

Use absolute executable paths; no global PATH change is required:

~~~powershell
$lo = 'C:\Users\scott\.dsh-stock\tools\cli-anything-libreoffice\Scripts\cli-anything-libreoffice.exe'
& $lo --help
& $lo document new --help
& $lo export render --help
~~~

Global --json and --project options come BEFORE the command group. A project
JSON is working state, not an ODT or DOCX. One-shot editing commands do NOT save
their changes automatically. Use this skill's scripts/run_commands.py with a
UTF-8 JSON file containing arrays of CLI argument strings. It calls the actual
installed Click CLI in one process, preserving the same in-memory session;
it does not implement a separate document engine. Include document save before
ending a sequence when you need to retain edits.

Example commands.json (replace paths with the user's requested workspace):

~~~json
[
  ["document", "new", "--type", "writer", "--name", "Briefing", "-o", "C:/work/briefing.json"],
  ["writer", "add-heading", "--text", "Briefing", "--level", "1"],
  ["writer", "add-paragraph", "--text", "Verified reporting text goes here."],
  ["document", "save"],
  ["export", "render", "C:/work/briefing.odt", "--preset", "odt"],
  ["export", "render", "C:/work/briefing.pdf", "--preset", "pdf"]
]
~~~

Run with the dedicated Python, using this skill's actual resource-base path:

~~~powershell
& 'C:\Users\scott\.dsh-stock\tools\cli-anything-libreoffice\Scripts\python.exe' '<skill-resource-base>\scripts\run_commands.py' 'C:\work\commands.json'
~~~

For an existing project, begin with ["document","open","C:/work/briefing.json"].
Use explicit absolute output paths and avoid overwriting user files. --overwrite
requires a task that authorizes replacement. Run only the commands needed.
The CLI generates ODF itself; PDF/DOCX rendering invokes real LibreOffice.
Preserve existing application documents/processes; if conversion fails, report
the actual error rather than killing LibreOffice or changing its settings.
Confirm output files exist and validate actual document/PDF contents before
claiming success. No automatic installs, retries, tests or benchmarks.
