$ErrorActionPreference = 'Stop'

$DevRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DevHome = Join-Path $DevRoot 'home'
$DshBinary = [IO.Path]::GetFullPath((Join-Path $DevRoot 'node_modules\@deepseek-ai\dsh\lib\bin.js'))
$PidPath = Join-Path $DevHome 'runtime\halo-router-dev.pid.json'
$Port = 3085

if (-not (Test-Path -LiteralPath $PidPath -PathType Leaf)) {
    Write-Output 'Halo Router DEV has no owned PID record; nothing stopped.'
    exit 0
}

$record = Get-Content -Raw -LiteralPath $PidPath | ConvertFrom-Json
$devProcessId = 0
if (-not [int]::TryParse([string]$record.pid, [ref]$devProcessId) -or $devProcessId -le 0) {
    throw "DEV PID record is invalid; refusing to terminate any process: $PidPath"
}
if ([IO.Path]::GetFullPath([string]$record.dshHome) -ine [IO.Path]::GetFullPath($DevHome) -or [int]$record.port -ne $Port -or [IO.Path]::GetFullPath([string]$record.executable) -ine $DshBinary) {
    throw "DEV PID record ownership metadata does not match this launcher; refusing to terminate PID $devProcessId."
}

$process = Get-CimInstance Win32_Process -Filter "ProcessId = $devProcessId" -ErrorAction SilentlyContinue
if (-not $process) {
    Remove-Item -LiteralPath $PidPath -Force
    Write-Output "Removed stale Halo Router DEV PID record for PID $devProcessId; no process was running."
    exit 0
}

$commandLine = [string]$process.CommandLine
$nodePath = [IO.Path]::GetFullPath((Get-Process -Id $devProcessId).Path)
$createdUtc = if ($process.CreationDate -is [DateTime]) {
    ([DateTime]$process.CreationDate).ToUniversalTime()
} else {
    [Management.ManagementDateTimeConverter]::ToDateTime([string]$process.CreationDate).ToUniversalTime()
}
$recordedUtc = ([DateTime]$record.processStartTime).ToUniversalTime()
if ($nodePath -ine [IO.Path]::GetFullPath([string]$record.node) -or $commandLine -notlike "*$DshBinary*" -or $commandLine -notlike '*--profile web*' -or $commandLine -notlike "*--port $Port*" -or ($createdUtc - $recordedUtc).Duration() -gt [TimeSpan]::FromSeconds(10)) {
    throw "PID $devProcessId is not the recorded Halo Router DEV process; refusing to terminate it."
}

Stop-Process -Id $devProcessId -Force
Remove-Item -LiteralPath $PidPath -Force
Write-Output "Stopped owned Halo Router DEV process PID $devProcessId on port $Port."
