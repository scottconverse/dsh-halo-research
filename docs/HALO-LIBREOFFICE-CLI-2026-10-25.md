# LibreOffice CLI in DSH Web and Desktop - October 25, 2026

## Outcome

Installed cli-anything-libreoffice 1.0.0 in an isolated Python environment and
wired the cli-anything-libreoffice skill into both running DSH 0.2.1-rc.3 hosts.
Both hosts loaded the actual skill through their native skill tool without
restarting. One shared real workflow created an editable ODT in Web and rendered
that same saved project to PDF in Desktop. No LLM request or subagent was used.

## What changed

Only a new skill bundle, its small JSON argument-array runner and pinned dependency
record were added. The published CLI edits in memory: separate one-shot writer
commands do not save automatically. The runner therefore invokes the installed
Click CLI in one Python process, then explicitly saves; it does not reimplement
document generation. No vendor package patch or new DSH plugin was required.

The dedicated environment is C:/Users/scott/.dsh-stock/tools/cli-anything-libreoffice,
using Python 3.13.5, click 8.5.0, prompt-toolkit 3.0.53 and wcwidth 0.9.4. LibreOffice
was already installed and was not upgraded. The PDF identifies its producer as
LibreOffice 26.8.1.1 (X86_64). The CLI's Windows version probe returned a path-based
fallback; PDF metadata supplies the version evidence rather than that probe.

Source/provenance: [HKUDS repository](https://github.com/HKUDS/CLI-Anything) and
[published 1.0.0 package](https://pypi.org/project/cli-anything-libreoffice/1.0.0/).
Published package metadata labels its license MIT, while the repository labels
Apache-2.0; no third-party engine source is copied into this repo.

## Actual installed acceptance

| Host | Skill load | Real operation | Native duration | Outcome |
|---|---:|---|---:|---|
| Web | 126 ms | Build/save briefing project and export ODT | 1637 ms | exit 0 |
| Desktop | 142 ms | Open the same project and render PDF via LibreOffice | 24868 ms | exit 0 |

These were native ToolRuntime skill and PowerShell executions in one isolated
session per host, not model-driven chat runs. The two sessions and receipts are
recorded in [acceptance.json](evidence/libreoffice-cli-2026-10-25/acceptance.json).
Both presets retained their existing permissions and tool execution. Desktop's
catalog selected the shared canonical Web skill source through its existing custom
root; the Desktop-local fallback copy has identical content.

The six intended headings/paragraphs were verified in BOTH outputs, rather than
accepting an exit code alone. ODT is a valid ZIP with the correct ODF text MIME;
PDF is a readable, unencrypted one-page document with a PDF header and the complete
expected text. Validation used existing Python ZIP/XML and pypdf libraries; no
additional parser package, benchmark or upstream test suite was installed/run.

- [Editable ODT](evidence/libreoffice-cli-2026-10-25/halo-briefing.odt)
- [Rendered PDF](evidence/libreoffice-cli-2026-10-25/halo-briefing.pdf)
- [Saved working project](evidence/libreoffice-cli-2026-10-25/halo-briefing.json)
- [Installed skill and usage](../stack/stock-dsh/skills/cli-anything-libreoffice/SKILL.md)
- [Recovery/dependencies/removal](../stack/stock-dsh/skills/cli-anything-libreoffice/README.md)

## Preservation, limits and accounting

All four DSH profile hashes and all 70 pre-existing skill-file
hashes match the pre-install snapshot. Models, defaults, Low/64K, provider routing,
plugins, Wigolo, Reddit/Redlib and XERJ configuration were not edited. Global Python
and PATH were unchanged. Temporary inspectors were closed; neither app restarted.

This verifies Writer ODT and PDF production, not every Calc/Impress command, arbitrary
Office-file round trips, complex formatting or interaction with already-open user
documents. ODF generation is the CLI's own implementation; only PDF conversion
here exercised real LibreOffice rendering. No performance claim is made.

Zero DSH/provider model calls or model tokens were used for this acceptance.
Coordinator Codex usage is separate and is not available from these DSH receipts.
The public sample is explicitly a software-verification briefing, not new reporting.
Private session data, environment directories/caches and local diagnostic helpers
are not published. No new tag/release is requested by this task.
