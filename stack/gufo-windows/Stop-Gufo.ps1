[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$expected = 'C:\Gufo\gufo-windows-2026-10-03\bin\gufo.exe'
$owners = @(Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
if (!$owners.Count) { Write-Output 'Gufo is already stopped.'; return }
foreach ($ownerId in $owners) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId"
    if ($process.ExecutablePath -ne $expected -or $process.CommandLine -notmatch 'halo-gufo-qwen38-27b-(q6|q4-dflash2)(?:\s|$)' ) { throw 'Port 8080 belongs to a different process; nothing was stopped.' }
    Stop-Process -Id $ownerId
    Wait-Process -Id $ownerId -Timeout 10 -ErrorAction SilentlyContinue
    Write-Output "Stopped Gufo PID $ownerId and released its model. DSH, Ollama and LM Studio remain running."
}
