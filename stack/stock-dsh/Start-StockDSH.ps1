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

function Get-ResidentModels {
    # Read-only inventory; only Ensure-SelectedModel may load into an empty inventory.
    $json = & $lms ps --json | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'LM Studio did not return its loaded-model inventory.' }
    $parsed = $json | ConvertFrom-Json
    foreach ($resident in $parsed) { if ($null -ne $resident) { Write-Output $resident } }
}

function Resolve-SelectedRoute([string] $SettingsPath) {
    $helper = Join-Path $deploy 'launcher-model-route.mjs'
    $selectedJson = & $node $helper route --settings-file $SettingsPath
    if ($LASTEXITCODE -ne 0) { throw 'Could not parse the selected agent-default-model route from the DSH configuration.' }
    try { return ($selectedJson | ConvertFrom-Json) }
    catch { throw 'The DSH selected-route helper returned invalid JSON.' }
}

function Assert-SelectedResidency([string] $SettingsPath, [object[]] $Residents) {
    $helper = Join-Path $deploy 'launcher-model-route.mjs'
    $residentsFile = Join-Path ([System.IO.Path]::GetTempPath()) ("dsh-residents-{0}.json" -f [guid]::NewGuid())
    try {
        [System.IO.File]::WriteAllText($residentsFile, (ConvertTo-Json -InputObject @($Residents) -Depth 20 -Compress), [System.Text.UTF8Encoding]::new($false))
        $resultJson = (& $node $helper validate --settings-file $SettingsPath --residents $residentsFile 2>&1 | Out-String).Trim()
        if ($LASTEXITCODE -ne 0) { throw "Selected route validation failed: $resultJson" }
        try { return ($resultJson | ConvertFrom-Json) }
        catch { throw 'The DSH selected-route helper returned invalid JSON.' }
    }
    finally {
        if (Test-Path -LiteralPath $residentsFile) { [System.IO.File]::Delete($residentsFile) }
    }
}

function Resolve-SelectedTransport([string] $SettingsPath) {
    $helper = Join-Path $deploy 'launcher-model-route.mjs'
    $providerJson = & $node $helper transport --settings-file $SettingsPath
    if ($LASTEXITCODE -ne 0) { throw 'Could not resolve the selected route transport from the DSH configuration.' }
    try { return ($providerJson | ConvertFrom-Json) }
    catch { throw 'The DSH selected-route helper returned invalid provider JSON.' }
}

function Resolve-SelectedProvider([string] $SettingsPath, [string] $Provider) {
    $helper = Join-Path $deploy 'launcher-model-route.mjs'
    $providerJson = (& $node $helper provider --settings-file $SettingsPath --provider $Provider 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Could not read the selected provider capacity: $providerJson" }
    try { return ($providerJson | ConvertFrom-Json) }
    catch { throw 'The DSH selected-route helper returned invalid provider JSON.' }
}

function Ensure-SelectedModel([string] $SettingsPath, [object] $Selected, [object] $Transport) {
    $route = "$($Selected.provider)/$($Selected.model)"
    if ($Transport.kind -ne 'lmstudio') {
        return [pscustomobject]@{ message = "Selected provider-managed route $route; LM Studio residency was not inspected or changed." }
    }
    if (-not (Test-Path -LiteralPath $lms -PathType Leaf)) { throw "LM Studio CLI was not found at $lms." }
    $residents = @(Get-ResidentModels)
    if ($residents.Count -gt 0) {
        # Reuse the selected resident, or report a mismatch. Never add a second model.
        return (Assert-SelectedResidency $SettingsPath $residents)
    }
    $provider = Resolve-SelectedProvider $SettingsPath $Selected.provider
    if (-not $provider) { throw "The selected local provider $($Selected.provider) has no capacity configuration." }
    $models = if ($provider.PSObject.Properties['models']) { @($provider.models) } else { @() }
    $configuredModel = @($models | Where-Object { $_.id -eq $Selected.model }) | Select-Object -First 1
    $context = if ($configuredModel -and $configuredModel.PSObject.Properties['contextWindow']) { [int]$configuredModel.contextWindow }
        elseif ($provider.PSObject.Properties['defaultContextWindow']) { [int]$provider.defaultContextWindow } else { 0 }
    $parallel = if ($provider.PSObject.Properties['defaultParallel']) { [int]$provider.defaultParallel } else { 1 }
    if ($context -le 0 -or $parallel -le 0) { throw "Selected route $route requires a positive context window and parallel count before automatic loading." }
    # The saved route is the exact model key and serving identifier. LM Studio's
    # saved alias retains its tuning; no speculative-decoding override is imposed.
    $safeLogName = [string]$Selected.model -replace '[^A-Za-z0-9_.-]', '_'
    $modelLog = Join-Path $logs "$safeLogName-load.log"
    $loadArgs = @('load', [string]$Selected.model, '--identifier', [string]$Selected.model,
        '--context-length', [string]$context, '--parallel', [string]$parallel, '--gpu', 'max', '--yes')
    & $lms @loadArgs *> $modelLog
    if ($LASTEXITCODE -ne 0) { throw "Could not automatically load selected model $route. See $modelLog." }
    $residents = @(Get-ResidentModels)
    if ($residents.Count -ne 1) { throw "Expected only the selected model after automatic loading; LM Studio returned $($residents.Count) residents. No models were unloaded. Inspect LM Studio before restarting." }
    return (Assert-SelectedResidency $SettingsPath $residents)
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
# Optional Wigolo CLI is checked only when invoked.
$missionControlChanged = Install-MissionControlIfNeeded

# Preserve the saved route. Load it only when LM Studio has no resident models;
# otherwise reuse it or report a mismatch without loading or unloading anything.
$legacySettings = Join-Path $dshHome 'settings.yaml'
$profileSettings = Join-Path $dshHome 'profiles\web\cordis.patch.yml'
$settingsPath = if (Test-Path -LiteralPath $profileSettings -PathType Leaf) { $profileSettings } else { $legacySettings }
if (-not (Test-Path -LiteralPath $settingsPath -PathType Leaf)) { throw "DSH configuration was not found at $settingsPath." }
$selectedRoute = Resolve-SelectedRoute $settingsPath
$transport = Resolve-SelectedTransport $settingsPath
$routeSummary = "$($selectedRoute.provider)/$($selectedRoute.model)"
$residency = Ensure-SelectedModel $settingsPath $selectedRoute $transport
Write-StackLog $residency.message

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
Write-StackLog 'Wigolo is on demand; no eager MCP process required.'

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

Write-Output "DSH and Mission Control are ready; Wigolo is available on demand. Selected route: $routeSummary."
