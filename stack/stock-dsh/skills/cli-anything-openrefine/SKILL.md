---
name: cli-anything-openrefine
description: Clean CSV/TSV data with the installed local OpenRefine server; import projects, apply reusable GREL operation histories, inspect rows and export cleaned data through the existing pwsh tool.
---

# OpenRefine for Halo DSH

Use native pwsh with the isolated OpenRefine 3.10.1 and CLI-Anything 1.0.1.
No model/provider changes, new MCP server or additional agent is required.

Start only when needed with the script in this skill's actual resource base:

```powershell
& '<skill-resource-base>\scripts\Start-OpenRefine.ps1'
$refine = "$env:USERPROFILE\.dsh-stock\tools\cli-anything-openrefine\Scripts\cli-anything-openrefine.exe"
& $refine --json --session 'C:\work\cleanup-session.json' project import 'C:\work\messy.csv' --name 'Cleanup'
& $refine --json ops text-transform 'C:\work\trim.json' --column 'Name' --expression 'value.trim()'
& $refine --json --session 'C:\work\cleanup-session.json' data apply 'C:\work\trim.json'
& $refine --json --session 'C:\work\cleanup-session.json' data rows --limit 5
& $refine --json --session 'C:\work\cleanup-session.json' data export 'C:\work\clean.csv' --format csv
```

Replace example paths with the requested workspace. Use absolute paths and an
explicit task-specific --session on every project/data command. Global options
precede command groups. Check $LASTEXITCODE after each call and stop on error.
Do not enter the interactive REPL. Inspect only bounded rows and project metadata.
Verify exported values, not just exit status. Operation histories are ordinary
OpenRefine JSON; applying one changes the selected project. Preserve originals;
do not delete projects or overwrite outputs without task authorization.

Server is loopback-only on 3333, using its own data directory under
.dsh-stock\tools\openrefine-service\data and bundled Java. The launcher reuses a
healthy server and refuses an occupied/unready port. It does not enable login
startup. Logs and owner identity are beside that data folder. Open the app at
http://127.0.0.1:3333 when a UI is wanted. Preserve any active cleaning operation;
use the app's shutdown action, or verify the recorded executable and UTC start
time against the live PID before stopping an owned process. Never stop Java by
name. See README.md for provenance/recovery.
