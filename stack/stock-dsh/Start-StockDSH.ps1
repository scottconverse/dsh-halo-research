[CmdletBinding()]
param([switch]$NoOpen)
$ErrorActionPreference = 'Stop'
$deploy = $PSScriptRoot
$dshHome = 'C:\Users\scott\.dsh-stock'
$node = 'C:\Program Files\nodejs\node.exe'
$lms = 'C:\Users\scott\.lmstudio\bin\lms.exe'
$logs = Join-Path $deploy 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$env:DSH_HOME = $dshHome
function Assert-PortOwner([int]$Port, [string]$Expected) {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    foreach ($listener in $listeners) {
        $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
        if (!$owner -or $owner.CommandLine -notlike "*$Expected*") { throw "Port $Port is owned by another process. See PID $($listener.OwningProcess)." }
    }
    return $listeners.Count -gt 0
}
try { Invoke-RestMethod 'http://127.0.0.1:1234/v1/models' -TimeoutSec 5 | Out-Null }
catch { throw 'Start the LM Studio local server on port 1234, then run this shortcut again.' }
$approved = @(
    [pscustomobject]@{key='halo/qwen3.6-35b-a3b';id='halo-brain-35b';contextLength=32768;parallel=1},
    [pscustomobject]@{key='halo/qwen3-coder-30b-a3b-q4km';id='halo-coder-q4km';contextLength=32768;parallel=1}
)
function Get-LoadedModels {
    $json = & $lms ps --json | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'LM Studio did not return its loaded-model inventory.' }
    return @($json | ConvertFrom-Json)
}
function Unload-Model([object]$model, [string]$reason) {
    $target = if ($model.identifier) { [string]$model.identifier } else { [string]$model.modelKey }
    & $lms unload $target *> (Join-Path $logs "$target-unload.log")
    if ($LASTEXITCODE -ne 0) { throw "Could not unload $target while $reason. See $logs." }
}
$approvedIds = @($approved | ForEach-Object { $_.id })
$loaded = Get-LoadedModels
foreach ($resident in $loaded) {
    if ($approvedIds -notcontains [string]$resident.identifier) {
        Unload-Model $resident 'enforcing the approved DSH model set'
    }
}
foreach ($model in $approved) {
    $loaded = Get-LoadedModels
    $resident = @($loaded | Where-Object { $_.identifier -eq $model.id }) | Select-Object -First 1
    $wrongEnvelope = $resident -and (
        [string]$resident.modelKey -ne $model.key -or
        [int]$resident.contextLength -ne $model.contextLength -or
        [int]$resident.parallel -ne $model.parallel
    )
    if ($wrongEnvelope) {
        Unload-Model $resident 'correcting its model key, context window, or parallel slots'
        $resident = $null
    }
    if (!$resident) {
        & $lms load $model.key --identifier $model.id --context-length $model.contextLength --parallel $model.parallel --gpu max --no-speculative-draft-mtp -y *> (Join-Path $logs "$($model.id)-load.log")
        if ($LASTEXITCODE -ne 0) { throw "Could not load $($model.id). See $logs." }
    }
}
$loaded = Get-LoadedModels
if ($loaded.Count -ne $approved.Count) { throw 'LM Studio did not converge to the two approved DSH models.' }
foreach ($model in $approved) {
    $resident = @($loaded | Where-Object { $_.identifier -eq $model.id }) | Select-Object -First 1
    if (!$resident -or [string]$resident.modelKey -ne $model.key -or [int]$resident.contextLength -ne $model.contextLength -or [int]$resident.parallel -ne $model.parallel) {
        throw "LM Studio model $($model.id) is not loaded with the approved capacity envelope."
    }
}
if (!(Assert-PortOwner 3080 'stock-dsh\node_modules')) {
    $entry = Join-Path $deploy 'node_modules\@deepseek-ai\dsh\lib\bin.js'
    & $node (Join-Path $deploy 'start-dsh-detached.mjs') | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'DSH detached launch failed' }
}
$launchUrl = $null
for ($attempt=0; $attempt -lt 120; $attempt++) {
    $logText = Get-Content -LiteralPath (Join-Path $logs 'dsh.stdout.log') -Raw -ErrorAction SilentlyContinue
    if (!$logText) { Start-Sleep -Milliseconds 500; continue }
    $launchMatches = [regex]::Matches([string]$logText, 'http://127\.0\.0\.1:3080/\?token=[\w-]+')
    if ($launchMatches.Count -gt 0) { $launchUrl=$launchMatches[$launchMatches.Count-1].Value; break }
    Start-Sleep -Milliseconds 500
}
if (!$launchUrl) { throw "DSH did not publish its launch URL. See $logs." }
if (!$NoOpen) { Start-Process $launchUrl }
Write-Output 'Stock DSH is running on port 3080 with Wigolo available through MCP stdio.'
