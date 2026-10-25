# Halo LibreOffice CLI installation

The small DSH skill uses the existing native PowerShell tool and the real
cli-anything-libreoffice 1.0.0 CLI. No additional DSH plugin, model router,
MCP server, global PATH change or application restart is required.

Upstream: https://github.com/HKUDS/CLI-Anything
Published package: https://pypi.org/project/cli-anything-libreoffice/1.0.0/
The published wheel SHA256 is
23fe82db543b4a5384dcf42fd6115a14ad2be68459f6af149a8e092153fb7716.
The installed distribution metadata identifies MIT; the upstream repository
identifies Apache-2.0. This repository does not vendor the third-party engine.

## Existing Halo installation

- Python 3.13.5; dedicated environment at
  C:/Users/scott/.dsh-stock/tools/cli-anything-libreoffice.
- Real LibreOffice at C:/Program Files/LibreOffice/program/soffice.exe.
- Web skill: stack/stock-dsh/skills/cli-anything-libreoffice in this repo.
- Desktop fallback copy: DSH Desktop home/skills/cli-anything-libreoffice.
  The active Desktop catalog currently prefers the identical shared Web source
  via its existing custom skill root. Both copies are synchronized.
- Exact installed dependencies are in requirements.lock.txt.

For recovery, create a dedicated environment and install the locked requirements
using uv pip install --python <venv>/Scripts/python.exe -r requirements.lock.txt.
Copy the skill directory into each configured DSH skill root. The existing
filesystem provider watches those roots; no model/default/profile edits needed.
Do not install development extras or run the upstream suite for ordinary use.

## Why the small runner exists

The published CLI stores edits in memory and does not automatically persist
one-shot writer commands. Its interactive REPL splits input with line.split(),
which is unsuitable for quoted paragraphs. scripts/run_commands.py accepts
argument arrays from JSON and calls the actual Click CLI repeatedly in one
process. It preserves session state, proper argument boundaries and nonzero
failure exits. It contains no document renderer, shell eval or new agent loop.
Use explicit document save and absolute output paths. See SKILL.md for examples.

ODT generation uses the CLI's ODF writer. PDF/DOCX conversion invokes installed
LibreOffice headless. Existing LibreOffice process/profile behavior is inherited;
this integration does not kill user applications or replace their settings.

## Removal

Remove only the cli-anything-libreoffice skill directories from the two configured
roots and the dedicated environment above if no longer needed. Leave LibreOffice,
other skills, DSH profiles, models and integrations intact. No global Python or
PATH modification needs reversal.
