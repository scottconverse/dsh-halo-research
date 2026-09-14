[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$logs = Join-Path $PSScriptRoot 'logs'
$node = 'C:\Program Files\nodejs\node.exe'
$dshEntry = Join-Path $PSScriptRoot 'node_modules\@deepseek-ai\dsh\lib\bin.js'
$wigoloEntry = 'C:\Users\scott\Desktop\Code\wigolo\dist\index.js'
$installedMissionControl = 'C:\Users\scott\.dsh-stock\mission-control\mission-control.mjs'

. (Join-Path $PSScriptRoot 'Process-Identity.ps1')
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Write-StopLog([string] $Message) {
    Add-Content -LiteralPath (Join-Path $logs 'stack-lifecycle.log') -Value "$(Get-Date -Format o) $Message"
}

function Get-ExactWigoloProcesses {
    return @(Get-CimInstance Win32_Process | Where-Object {
        Test-ExactProcessCommand $_ $node @($wigoloEntry, 'mcp')
    })
}

# Identify and validate the actual listener owner before stopping any process.
$dshListeners = @(Get-NetTCPConnection -State Listen -LocalPort 3080 -ErrorAction SilentlyContinue)
$dshProcesses = [Collections.Generic.List[object]]::new()
$dshProcessIds = [Collections.Generic.HashSet[int]]::new()
foreach ($listener in $dshListeners) {
    $candidate = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction Stop
    if (-not (Test-ExactProcessCommand $candidate $node @($dshEntry, 'web', '--no-open'))) {
        throw "Port 3080 is owned by an unexpected process (PID $($listener.OwningProcess)); nothing was stopped."
    }
    if ($dshProcessIds.Add([int]$candidate.ProcessId)) { $dshProcesses.Add($candidate) }
}

# Capture only exact Wigolo argv descendants. This proves their relationship to
# the verified DSH listener without granting shutdown authority over siblings.
$snapshot = @(Get-CimInstance Win32_Process)
$verifiedWigolo = [Collections.Generic.List[object]]::new()
$verifiedWigoloIds = [Collections.Generic.HashSet[int]]::new()
foreach ($dshProcess in $dshProcesses) {
    foreach ($descendant in @(Get-ProcessDescendants ([int]$dshProcess.ProcessId) $snapshot)) {
        if ((Test-ExactProcessCommand $descendant $node @($wigoloEntry, 'mcp')) -and
            $verifiedWigoloIds.Add([int]$descendant.ProcessId)) {
            $verifiedWigolo.Add($descendant)
        }
    }
}

& (Join-Path $PSScriptRoot 'mission-control\Stop-MissionControl.ps1') `
    -InstalledCopy $installedMissionControl -AllowNotRunning | Out-Null

foreach ($candidate in $dshProcesses) {
    if (Stop-IdentityCheckedProcess $candidate 'DSH') {
        Write-StopLog "Stopped verified DSH listener process (PID $($candidate.ProcessId))."
    }
}
foreach ($candidate in $verifiedWigolo) {
    if (Stop-IdentityCheckedProcess $candidate 'DSH-owned Wigolo MCP') {
        Write-StopLog "Stopped verified DSH-owned Wigolo MCP process (PID $($candidate.ProcessId))."
    }
}

# A DSH crash can orphan its stdio child. After the listener is gone, stop only
# the one exact node + absolute Wigolo entry + `mcp` argv shape.
foreach ($candidate in @(Get-ExactWigoloProcesses)) {
    if (Stop-IdentityCheckedProcess $candidate 'orphaned Wigolo MCP') {
        Write-StopLog "Stopped exact orphaned Wigolo MCP process (PID $($candidate.ProcessId))."
    }
}

$remainingDsh = @(Get-NetTCPConnection -State Listen -LocalPort 3080 -ErrorAction SilentlyContinue)
if ($remainingDsh.Count) { throw 'A listener remains on port 3080. Inspect its owner before stopping it.' }
$remainingMissionControl = @(Get-NetTCPConnection -State Listen -LocalPort 3090 -ErrorAction SilentlyContinue)
if ($remainingMissionControl.Count) { throw 'A listener remains on port 3090. Inspect its owner before stopping it.' }

Write-Output 'Mission Control, DSH, and Wigolo stopped. LM Studio and its loaded models remain running.'
