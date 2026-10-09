[CmdletBinding()]
param(
    [string] $CanonicalSource,
    [string] $InstalledCopy = (Join-Path $env:USERPROFILE '.dsh-stock\mission-control\mission-control.mjs'),
    [string] $HealthUri = 'http://127.0.0.1:3090/api/status',
    [string] $BrowserUri = 'http://127.0.0.1:3090',
    [string] $DshLaunchUrl = $env:HALO_DSH_LAUNCH_URL,
    [string] $DshRoot,
    [string] $MissionControlDataDir,
    [string] $StartDshScript,
    [ValidateRange(1, 300)]
    [int] $HealthTimeoutSeconds = 30,
    [switch] $NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Windows PowerShell -File can evaluate parameter defaults before PSScriptRoot
# is populated. Resolve the script-relative default in the script body instead.
if (-not $CanonicalSource) {
    $CanonicalSource = Join-Path $PSScriptRoot 'mission-control.mjs'
}
if (-not $DshRoot) {
    $DshRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
}
if (-not $MissionControlDataDir) {
    $MissionControlDataDir = Join-Path $env:USERPROFILE '.dsh-stock\mission-control'
}
if (-not $StartDshScript) {
    $StartDshScript = Join-Path $DshRoot 'Start-StockDSH.ps1'
}
if ($DshLaunchUrl -and $DshLaunchUrl -notmatch '^http://127\.0\.0\.1:3080/\?token=[A-Za-z0-9_-]+$') {
    throw 'DshLaunchUrl must be the secure loopback URL emitted by DSH on port 3080.'
}

function Get-Sha256([string] $Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Assert-LoopbackHttpUri([string] $Value, [string] $Name) {
    $parsed = $null
    if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref] $parsed) -or
        $parsed.Scheme -ne 'http' -or
        $parsed.Host -notin @('127.0.0.1', 'localhost')) {
        throw "$Name must be an absolute loopback HTTP URI (127.0.0.1 or localhost): $Value"
    }
}

$canonicalPath = [IO.Path]::GetFullPath($CanonicalSource)
$installedPath = [IO.Path]::GetFullPath($InstalledCopy)

if (-not (Test-Path -LiteralPath $canonicalPath -PathType Leaf)) {
    throw "Canonical Mission Control source is missing: $canonicalPath"
}
if (-not (Test-Path -LiteralPath $installedPath -PathType Leaf)) {
    throw "Installed Mission Control copy is missing: $installedPath. Run Install-HaloMissionControl.ps1 first."
}

$canonicalHash = Get-Sha256 $canonicalPath
$installedHash = Get-Sha256 $installedPath
if ($installedHash -ne $canonicalHash) {
    throw "Installed Mission Control hash does not match canonical source. Canonical=$canonicalHash Installed=$installedHash. Run Install-HaloMissionControl.ps1 before launch."
}

Assert-LoopbackHttpUri $HealthUri 'HealthUri'
if (-not $NoBrowser) {
    Assert-LoopbackHttpUri $BrowserUri 'BrowserUri'
}

# Reopening the desktop shortcut must reuse an already-running installed build.
# Never start a duplicate or stop the existing process just to open its page.
$existingResponse = $null
try {
    $existingResponse = Invoke-WebRequest -UseBasicParsing -Uri $HealthUri -TimeoutSec $HealthTimeoutSeconds
} catch { } # An unavailable service proceeds to the normal cold-start path.
if ($null -ne $existingResponse) {
    for ($sample = 0; $sample -lt 2; $sample++) {
        if ($sample -gt 0) {
            Start-Sleep -Milliseconds 200
            $existingResponse = Invoke-WebRequest -UseBasicParsing -Uri $HealthUri -TimeoutSec $HealthTimeoutSeconds
        }
        $existingStatus = $existingResponse.Content | ConvertFrom-Json
        $existingSource = [IO.Path]::GetFullPath([string] $existingStatus.build.sourceFile)
        $existingHash = [string] $existingStatus.build.sourceSha256
        if ($existingResponse.StatusCode -ne 200 -or
            -not [StringComparer]::OrdinalIgnoreCase.Equals($existingSource, $installedPath) -or
            -not [StringComparer]::OrdinalIgnoreCase.Equals($existingHash, $installedHash)) {
            throw 'Existing Mission Control health build identity mismatch. No process was started or stopped.'
        }
    }
    if (-not $NoBrowser) {
        $chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
        if (-not (Test-Path -LiteralPath $chrome -PathType Leaf)) { throw "Google Chrome was not found at $chrome." }
        Start-Process -FilePath $chrome -ArgumentList @('--new-window', $BrowserUri) -WindowStyle Normal | Out-Null
    }
    [pscustomobject]@{
        Started = $false
        Healthy = $true
        InstalledCopy = $installedPath
        Sha256 = $installedHash
        ProcessId = $null # Health identity does not report the process ID.
        HealthUri = $HealthUri
        BrowserOpened = (-not $NoBrowser)
    }
    return
}

$node = 'C:\Program Files\nodejs\node.exe'
if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { throw "Node.js was not found at $node." }
$logDir = Join-Path ([IO.Path]::GetFullPath($DshRoot)) 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$stdoutLog = Join-Path $logDir 'mission-control.stdout.log'
$stderrLog = Join-Path $logDir 'mission-control.stderr.log'

$savedEnvironment = @{}
foreach ($name in @('HALO_DSH_LAUNCH_URL', 'DSH_HOME', 'HALO_DSH_ROOT', 'HALO_MC_DIR', 'HALO_START_DSH')) {
    $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
try {
    if ($DshLaunchUrl) {
        $env:HALO_DSH_LAUNCH_URL = $DshLaunchUrl
    } else {
        Remove-Item Env:HALO_DSH_LAUNCH_URL -ErrorAction SilentlyContinue
    }
    $env:DSH_HOME = Join-Path $env:USERPROFILE '.dsh-stock'
    $env:HALO_DSH_ROOT = [IO.Path]::GetFullPath($DshRoot)
    $env:HALO_MC_DIR = [IO.Path]::GetFullPath($MissionControlDataDir)
    $env:HALO_START_DSH = [IO.Path]::GetFullPath($StartDshScript)
    $missionControlProcess = Start-Process `
        -FilePath $node `
        -ArgumentList "`"$installedPath`"" `
        -WorkingDirectory (Split-Path -Parent $installedPath) `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru
} finally {
    foreach ($name in $savedEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
    }
}
$deadline = [DateTime]::UtcNow.AddSeconds($HealthTimeoutSeconds)
$healthySamples = 0
$lastHealthError = 'no response received'

try {
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($missionControlProcess.HasExited) {
            throw "Installed Mission Control exited before becoming healthy (exit code $($missionControlProcess.ExitCode))."
        }

        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $HealthUri -TimeoutSec 1
            if ($response.StatusCode -eq 200) {
                $status = $response.Content | ConvertFrom-Json
                $reportedSource = [IO.Path]::GetFullPath([string] $status.build.sourceFile)
                $reportedHash = [string] $status.build.sourceSha256
                $sourceMatches = [StringComparer]::OrdinalIgnoreCase.Equals($reportedSource, $installedPath)
                $hashMatches = [StringComparer]::OrdinalIgnoreCase.Equals($reportedHash, $installedHash)
                if ($sourceMatches -and $hashMatches) {
                    $healthySamples++
                    if ($healthySamples -ge 2) {
                        break
                    }
                } else {
                    $healthySamples = 0
                    $lastHealthError = "health build identity mismatch: expected $installedPath ($installedHash), got $reportedSource ($reportedHash)"
                }
            } else {
                $healthySamples = 0
                $lastHealthError = "HTTP $($response.StatusCode)"
            }
        } catch {
            $healthySamples = 0
            $lastHealthError = $_.Exception.Message
        }
        Start-Sleep -Milliseconds 200
    }

    if ($healthySamples -lt 2) {
        throw "Installed Mission Control did not become healthy at $HealthUri within $HealthTimeoutSeconds seconds. Last error: $lastHealthError"
    }
    if ($missionControlProcess.HasExited) {
        throw "Installed Mission Control exited after its health response (exit code $($missionControlProcess.ExitCode))."
    }
} catch {
    if (-not $missionControlProcess.HasExited) {
        Stop-Process -Id $missionControlProcess.Id -Force -ErrorAction SilentlyContinue
    }
    throw
}

$browserOpened = $false
if (-not $NoBrowser) {
    $chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
    if (-not (Test-Path -LiteralPath $chrome -PathType Leaf)) { throw "Google Chrome was not found at $chrome." }
    Start-Process -FilePath $chrome -ArgumentList @('--new-window', $BrowserUri) -WindowStyle Normal | Out-Null
    $browserOpened = $true
}

[pscustomobject]@{
    Started = $true
    Healthy = $true
    InstalledCopy = $installedPath
    Sha256 = $installedHash
    ProcessId = $missionControlProcess.Id
    HealthUri = $HealthUri
    BrowserOpened = $browserOpened
}
