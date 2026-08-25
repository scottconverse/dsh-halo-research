<# Install-Shortcut.ps1 — creates/repairs the "Halo Cockpit" desktop shortcut. #>
$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot 'Launch-Halo.ps1'
if (-not (Test-Path $launcher)) { throw "launcher not found: $launcher" }
$pwsh = (Get-Command pwsh).Source
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Halo Cockpit.lnk")
$lnk.TargetPath = $pwsh
$lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
$lnk.WorkingDirectory = 'C:\Users\scott\Desktop\Code'
$lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
$lnk.Description = 'Halo v1 - DSH cockpit (web UI). Double-click; the browser opens when ready.'
$lnk.Save()
Write-Host "shortcut written: $env:USERPROFILE\Desktop\Halo Cockpit.lnk"
