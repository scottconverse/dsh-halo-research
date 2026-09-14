[CmdletBinding()]
param(
    [string] $InstalledCopy = (Join-Path $env:USERPROFILE '.dsh-stock\mission-control\mission-control.mjs'),
    [switch] $AllowNotRunning
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$installedPath = [IO.Path]::GetFullPath($InstalledCopy)
$node = 'C:\Program Files\nodejs\node.exe'
. (Join-Path $PSScriptRoot '..\Process-Identity.ps1')
$recognizedPaths = @(
    $installedPath
    [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'mission-control.mjs'))
) | Select-Object -Unique
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort 3090 -ErrorAction SilentlyContinue)
if (-not $listeners.Count) {
    if ($AllowNotRunning) { return }
    throw 'Mission Control is not listening on port 3090.'
}

foreach ($listener in $listeners) {
    $candidate = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction Stop
    if (-not $candidate) {
        throw "Port 3090 is owned by an unexpected process (PID $($listener.OwningProcess))."
    }

    $recognizedOwner = @($recognizedPaths | Where-Object {
        Test-ExactProcessCommand $candidate $node @($_)
    }).Count -gt 0
    if (-not $recognizedOwner) {
        throw "Port 3090 is not owned by a recognized Mission Control build (PID $($candidate.ProcessId))."
    }

    $null = Stop-IdentityCheckedProcess $candidate 'Mission Control'
}

$remaining = @(Get-NetTCPConnection -State Listen -LocalPort 3090 -ErrorAction SilentlyContinue)
if ($remaining.Count) { throw 'A listener remains on port 3090 after Mission Control shutdown.' }

Write-Output 'Mission Control stopped.'
