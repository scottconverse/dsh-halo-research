---
name: cli-anything-drawio
description: Create and edit genuine editable draw.io diagrams and render SVG, PNG or PDF using the installed Windows draw.io app and CLI-Anything through the existing pwsh tool.
---

# draw.io for Halo DSH

Use native pwsh. Installed app 32.6.1 and CLI-Anything 1.0.0 are isolated under
.dsh-stock\tools. Set PATH only in the child PowerShell command so the CLI's
native renderer finds draw.io; do not change the user's or machine's PATH.

```powershell
$env:PATH = "$env:USERPROFILE\.dsh-stock\tools\drawio-32.6.1;" + $env:PATH
$draw = "$env:USERPROFILE\.dsh-stock\tools\cli-anything-drawio\Scripts\cli-anything-drawio.exe"
& $draw --json project new -o 'C:\work\workflow.drawio'
$source = (& $draw --json --project 'C:\work\workflow.drawio' shape add rounded --label 'Source records' --x 60 --y 80 --width 180) | ConvertFrom-Json
if ($LASTEXITCODE) { throw 'Source shape failed' }
$verified = (& $draw --json --project 'C:\work\workflow.drawio' shape add rounded --label 'Verified briefing' --x 360 --y 80 --width 180) | ConvertFrom-Json
if ($LASTEXITCODE) { throw 'Briefing shape failed' }
& $draw --json --project 'C:\work\workflow.drawio' connect add $source.id $verified.id --label 'Read and verify'
& $draw --json --project 'C:\work\workflow.drawio' export render 'C:\work\workflow.svg' --format svg
```

Replace paths/labels with the requested work. Global --json and --project options
go before the command group. Always pass --project for edits: the installed CLI
auto-saves modifications on command exit when that option is used. A .drawio
file contains real editable mxGraph XML, not a working JSON placeholder. Use
the IDs returned by shape add; PyPI 1.0.0 does not have upstream main's --id flag.

Check $LASTEXITCODE after each call and stop on error. Use --help for a specific
command when needed, not the interactive REPL. Preserve existing files/windows;
avoid --overwrite unless replacement is authorized. Export invokes the actual
draw.io desktop executable. Verify output files and labels before claiming
success. The renderer can briefly create an Electron process/window; do not kill
unrelated draw.io processes. No model call, global settings edit or extra server
is needed. See README.md for provenance/recovery.
