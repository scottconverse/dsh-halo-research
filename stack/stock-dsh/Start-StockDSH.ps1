[CmdletBinding()]
param(
    [switch] $NoOpen,
    [switch] $KeepMissionControl
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$deploy = $PSScriptRoot
$dshHome = 'C:\Users\scott\.dsh-stock'
$node = 'C:\Program Files\nodejs\node.exe'
$lms = 'C:\Users\scott\.lmstudio\bin\lms.exe'
$wigoloEntry = 'C:\Users\scott\Desktop\Code\wigolo\dist\index.js'
$logs = Join-Path $deploy 'logs'
$missionControlSource = Join-Path $deploy 'mission-control\mission-control.mjs'
$missionControlInstalled = Join-Path $dshHome 'mission-control\mission-control.mjs'
$missionControlData = Join-Path $dshHome 'mission-control'
$missionControlInstaller = Join-Path $deploy 'mission-control\Install-HaloMissionControl.ps1'
$missionControlLauncher = Join-Path $deploy 'mission-control\Launch-Status.ps1'
$dshEntry = Join-Path $deploy 'node_modules\@deepseek-ai\dsh\lib\bin.js'

. (Join-Path $deploy 'Process-Identity.ps1')

New-Item -ItemType Directory -Force -Path $logs | Out-Null
New-Item -ItemType Directory -Force -Path $missionControlData | Out-Null
$env:DSH_HOME = $dshHome

# Profiles and user presets live outside this deployment. Let Node resolve the
# pinned optional stock packages from their normal parent lookup path too.
$homeModules = Join-Path $dshHome 'node_modules'
$deploymentModules = Join-Path $deploy 'node_modules'
if (-not (Test-Path -LiteralPath $homeModules)) {
    if (-not (Test-Path -LiteralPath $deploymentModules -PathType Container)) {
        throw "Install the pinned DSH dependencies first: $deploymentModules is missing."
    }
    New-Item -ItemType Junction -Path $homeModules -Target $deploymentModules | Out-Null
}

function Write-StackLog([string] $Message) {
    Add-Content -LiteralPath (Join-Path $logs 'stack-lifecycle.log') -Value "$(Get-Date -Format o) $Message"
}

function Get-PortListeners([int] $Port) {
    return @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Assert-DshPortOwner([int] $Port) {
    $listeners = @(Get-PortListeners $Port)
    foreach ($listener in $listeners) {
        $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction Stop
        if (-not (Test-ExactProcessCommand $owner $node @($dshEntry, 'web', '--no-open'))) {
            throw "Port $Port is owned by an unexpected process (PID $($listener.OwningProcess))."
        }
    }
    return $listeners.Count -gt 0
}

function Wait-ForWigoloMcpChild([int] $TimeoutSeconds = 60) {
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    do {
        $listeners = @(Get-PortListeners 3080)
        foreach ($listener in $listeners) {
            $dshProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
            if (-not (Test-ExactProcessCommand $dshProcess $node @($dshEntry, 'web', '--no-open'))) {
                throw "Port 3080 changed to an unexpected owner while waiting for Wigolo (PID $($listener.OwningProcess))."
            }
            $snapshot = @(Get-CimInstance Win32_Process)
            foreach ($descendant in @(Get-ProcessDescendants ([int]$dshProcess.ProcessId) $snapshot)) {
                if (Test-ExactProcessCommand $descendant $node @($wigoloEntry, 'mcp')) {
                    return $descendant
                }
            }
        }
        Start-Sleep -Milliseconds 500
    } while ([DateTime]::UtcNow -lt $deadline)

    throw "DSH did not create its verified Wigolo MCP child within $TimeoutSeconds seconds. See the DSH logs in $logs."
}

function Get-LoadedModels {
    $json = & $lms ps --json | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'LM Studio did not return its loaded-model inventory.' }
    return @($json | ConvertFrom-Json)
}

function Unload-Model([object] $Model, [string] $Reason) {
    $target = if ($Model.identifier) { [string]$Model.identifier } else { [string]$Model.modelKey }
    $safeLogName = $target -replace '[^A-Za-z0-9_.-]', '_'
    & $lms unload $target *> (Join-Path $logs "$safeLogName-unload.log")
    if ($LASTEXITCODE -ne 0) { throw "Could not unload $target while $Reason. See $logs." }
}

function Install-MissionControlIfNeeded {
    if (-not (Test-Path -LiteralPath $missionControlSource -PathType Leaf)) {
        throw "Mission Control source is missing: $missionControlSource"
    }
    if (-not (Test-Path -LiteralPath $missionControlInstaller -PathType Leaf)) {
        throw "Mission Control installer is missing: $missionControlInstaller"
    }

    $sourceHash = (Get-FileHash -LiteralPath $missionControlSource -Algorithm SHA256).Hash
    $installedHash = if (Test-Path -LiteralPath $missionControlInstalled -PathType Leaf) {
        (Get-FileHash -LiteralPath $missionControlInstalled -Algorithm SHA256).Hash
    } else { $null }

    if ($sourceHash -eq $installedHash) {
        return $false
    }

    Write-StackLog 'Mission Control source changed; running its required contract gate before promotion.'
    & $missionControlInstaller -Source $missionControlSource -Destination $missionControlInstalled | Out-Null
    return $true
}

if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { throw "Node.js was not found at $node." }
if (-not (Test-Path -LiteralPath $wigoloEntry -PathType Leaf)) {
    throw "Wigolo's MCP entry point is missing: $wigoloEntry"
}
$missionControlChanged = Install-MissionControlIfNeeded

# A cloud default can start without changing LM Studio residency. This also
# keeps a Desktop DSH local run intact when Web DSH is launched alongside it.
$settingsText = Get-Content -LiteralPath (Join-Path $dshHome 'settings.yaml') -Raw
$cloudDefault = [regex]::IsMatch($settingsText, '(?m)^agent-default-model:\s*\r?\n\s+provider:\s*ollama\s*\r?\n\s+model:\s*[^\r\n]+:cloud\s*$')
if ($cloudDefault) {
    Write-StackLog 'Web default is Ollama Cloud; preserving LM Studio resident models.'
} else {
if (-not (Test-Path -LiteralPath $lms -PathType Leaf)) { throw "LM Studio CLI was not found at $lms." }
try { Invoke-RestMethod 'http://127.0.0.1:1234/v1/models' -TimeoutSec 5 | Out-Null }
catch { throw 'Start the LM Studio local server on port 1234, then run this shortcut again.' }

$approved = @(
    [pscustomobject]@{ key='halo/qwen3.6-35b-a3b'; id='halo-brain-35b'; contextLength=131072; parallel=1 },
    [pscustomobject]@{ key='halo/qwen3-coder-30b-a3b-q4km'; id='halo-coder-q4km'; contextLength=131072; parallel=1 }
)
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
    if (-not $resident) {
        $modelLog = Join-Path $logs "$($model.id)-load.log"
        & $lms load $model.key --identifier $model.id --context-length $model.contextLength --parallel $model.parallel --gpu max --no-speculative-draft-mtp -y *> $modelLog
        if ($LASTEXITCODE -ne 0) { throw "Could not load $($model.id). See $modelLog." }
    }
}

$loaded = Get-LoadedModels
if ($loaded.Count -ne $approved.Count) { throw 'LM Studio did not converge to the two approved DSH models.' }
foreach ($model in $approved) {
    $resident = @($loaded | Where-Object { $_.identifier -eq $model.id }) | Select-Object -First 1
    if (-not $resident -or [string]$resident.modelKey -ne $model.key -or [int]$resident.contextLength -ne $model.contextLength -or [int]$resident.parallel -ne $model.parallel) {
        throw "LM Studio model $($model.id) is not loaded with the approved capacity envelope."
    }
}
}

$dshStarted = $false
if (-not (Assert-DshPortOwner 3080)) {
    & $node (Join-Path $deploy 'start-dsh-detached.mjs') | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'DSH detached launch failed.' }
    $dshStarted = $true
    Write-StackLog 'Started DSH; its Cordis MCP client owns the Wigolo stdio child.'
} else {
    Write-StackLog 'Reused the existing verified DSH process and its Wigolo MCP lifecycle.'
}

$launchUrl = $null
for ($attempt = 0; $attempt -lt 120; $attempt++) {
    $logText = Get-Content -LiteralPath (Join-Path $logs 'dsh.stdout.log') -Raw -ErrorAction SilentlyContinue
    if ($logText) {
        $launchMatches = [regex]::Matches([string]$logText, 'http://127\.0\.0\.1:3080/\?token=[\w-]+')
        if ($launchMatches.Count -gt 0) {
            $launchUrl = $launchMatches[$launchMatches.Count - 1].Value
            break
        }
    }
    Start-Sleep -Milliseconds 500
}
if (-not $launchUrl) { throw "DSH did not publish its secure launch URL. See $logs." }
$wigoloProcess = Wait-ForWigoloMcpChild
Write-StackLog "Verified DSH-owned Wigolo MCP process (PID $($wigoloProcess.ProcessId))."

$restartMissionControl = -not $KeepMissionControl -and ($dshStarted -or $missionControlChanged)
if (-not $KeepMissionControl -and -not $restartMissionControl) {
    $dshListener = @(Get-PortListeners 3080) | Select-Object -First 1
    $missionControlListener = @(Get-PortListeners 3090) | Select-Object -First 1
    if ($dshListener -and $missionControlListener) {
        $dshProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($dshListener.OwningProcess)" -ErrorAction SilentlyContinue
        $missionControlProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($missionControlListener.OwningProcess)" -ErrorAction SilentlyContinue
        if ($dshProcess -and $missionControlProcess -and $missionControlProcess.CreationDate -lt $dshProcess.CreationDate) {
            $restartMissionControl = $true
            Write-StackLog 'Mission Control predates the current DSH process; restarting it with current authentication.'
        }
    }
}
# An offline installation can leave the prior build running even when both
# files already match today. Compare the process's startup hash with the file.
if (-not $KeepMissionControl -and -not $restartMissionControl) {
    $runningStatus = $null
    try { $runningStatus = Invoke-RestMethod 'http://127.0.0.1:3090/api/status' -TimeoutSec 5 }
    catch { } # Launch-Status retains its normal unavailable-service handling.
    if ($null -ne $runningStatus -and $runningStatus.PSObject.Properties['build']) {
        $runningBuild = $runningStatus.build
        if ($runningBuild -and $runningBuild.PSObject.Properties['sourceFile'] -and
            $runningBuild.PSObject.Properties['sourceSha256'] -and
            [StringComparer]::OrdinalIgnoreCase.Equals([string]$runningBuild.sourceFile, $missionControlInstalled) -and
            [string]$runningBuild.sourceSha256 -match '^[A-Fa-f0-9]{64}$') {
            $installedHash = (Get-FileHash -LiteralPath $missionControlInstalled -Algorithm SHA256).Hash
            if (-not [StringComparer]::OrdinalIgnoreCase.Equals([string]$runningBuild.sourceSha256, $installedHash)) {
                $restartMissionControl = $true
                Write-StackLog 'Mission Control is running the prior installed build; restarting it to use the current file.'
            }
        }
    }
}
if ($restartMissionControl) {
    & (Join-Path $deploy 'mission-control\Stop-MissionControl.ps1') -InstalledCopy $missionControlInstalled -AllowNotRunning | Out-Null
}

& $missionControlLauncher `
    -CanonicalSource $missionControlSource `
    -InstalledCopy $missionControlInstalled `
    -DshLaunchUrl $launchUrl `
    -DshRoot $deploy `
    -MissionControlDataDir $missionControlData `
    -StartDshScript (Join-Path $deploy 'Start-StockDSH.ps1') `
    -NoBrowser | Out-Null

if (-not $NoOpen) {
    $chromeCandidates = @(
        'C:\Program Files\Google\Chrome\Application\chrome.exe'
        'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    )
    $chrome = @($chromeCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }) | Select-Object -First 1
    if (-not $chrome) { throw 'Google Chrome was not found in a standard installation location.' }
    Start-Process -FilePath $chrome -ArgumentList @('--new-window', 'http://127.0.0.1:3090/') -WindowStyle Normal | Out-Null
}

Write-Output 'DSH, its Wigolo MCP child, and Mission Control are ready. LM Studio retains the two approved models.'
