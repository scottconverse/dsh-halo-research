# Halo Status — launches Mission Control at :3090 then opens browser
$mc = Join-Path $PSScriptRoot 'mission-control' 'mission-control.mjs'
Start-Process node -ArgumentList $mc -WindowStyle Hidden
Start-Sleep 2
Start-Process "http://localhost:3090"
