$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$deploy = 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh'
$mc = Join-Path $deploy 'mission-control'
$evidencePath = Join-Path $PSScriptRoot 'live-recovery.json'
$results = [ordered]@{ startedAt = (Get-Date).ToString('o'); checks = @() }
function Read-Models { return @((& 'C:\Users\scott\.lmstudio\bin\lms.exe' ps --json | Out-String | ConvertFrom-Json)) }
function Refresh-ActionToken {
    $page = (Invoke-WebRequest -Uri 'http://127.0.0.1:3090/' -TimeoutSec 15).Content
    $match = [regex]::Match($page, "var MC_TOKEN='([a-f0-9]+)'")
    if (-not $match.Success) { throw 'Mission Control action token was not found' }
    $script:actionHeaders = @{ 'x-mc-token' = $match.Groups[1].Value; Origin = 'http://127.0.0.1:3090' }
}
function Action([string] $Name, $Body = @{}) {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:3090/api/action/$Name" -Method Post -Headers $script:actionHeaders -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Compress) -TimeoutSec 600
}
function Restart-MissionControl {
    & (Join-Path $mc 'Stop-MissionControl.ps1') | Out-Null
    $logText = Get-Content -LiteralPath (Join-Path $deploy 'logs\dsh.stdout.log') -Raw
    $matches = [regex]::Matches($logText, 'http://127\.0\.0\.1:3080/\?token=[\w-]+')
    if ($matches.Count -eq 0) { throw 'DSH launch URL missing from private local log' }
    & (Join-Path $mc 'Launch-Status.ps1') -DshLaunchUrl $matches[$matches.Count - 1].Value -NoBrowser | Out-Null
    Refresh-ActionToken
}
function Check([string] $Name, [bool] $Passed) {
    $results.checks += [ordered]@{ name = $Name; passed = $Passed; at = (Get-Date).ToString('o') }
    if (-not $Passed) { throw "Failed: $Name" }
    Write-Output "PASS: $Name"
}
Refresh-ActionToken
$models = Read-Models
$worker = @($models | Where-Object identifier -eq 'halo-coder-q4km')
Check 'Both approved models are resident before checking Unload' ($models.Count -eq 2 -and $worker.Count -eq 1)
if ($worker[0].status -ne 'idle' -or $worker[0].queued -ne 0) { throw 'Coder is in use; live Unload check deferred to avoid interrupting work' }
try {
    Action 'unload-model' @{ identifier = 'halo-coder-q4km' }
    Start-Sleep -Seconds 32
    Check 'Intentional Unload remains unloaded across two recovery ticks' (@(Read-Models | Where-Object identifier -eq 'halo-coder-q4km').Count -eq 0)
    Restart-MissionControl
    Start-Sleep -Seconds 17
    Check 'Intentional Unload survives Mission Control restart' (@(Read-Models | Where-Object identifier -eq 'halo-coder-q4km').Count -eq 0)
} finally {
    Refresh-ActionToken
    Action 'load-worker'
}
Start-Sleep -Seconds 17
$models = Read-Models
Check 'Both models restored with approved context and parallel settings' ($models.Count -eq 2 -and @($models | Where-Object { $_.identifier -notin @('halo-brain-35b','halo-coder-q4km') -or $_.contextLength -ne 131072 -or $_.parallel -ne 1 }).Count -eq 0)
$status = Invoke-RestMethod -Uri 'http://127.0.0.1:3090/api/status' -TimeoutSec 30
$results.completedAt = (Get-Date).ToString('o')
$results.models = @($models | Select-Object identifier, modelKey, contextLength, parallel, ttlMs, status)
$results.modelRecovery = $status.modelRecovery
$results.build = $status.build
$results.gpu = $status.gpu
$results | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $evidencePath -Encoding utf8
Write-Output "Evidence: $evidencePath"
