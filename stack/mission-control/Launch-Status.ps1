[CmdletBinding()]
param(
    [string] $CanonicalSource = (Join-Path $PSScriptRoot 'mission-control.mjs'),
    [string] $InstalledCopy = (Join-Path $env:USERPROFILE '.dsh\mission-control\mission-control.mjs'),
    [string] $HealthUri = 'http://127.0.0.1:3090/api/status',
    [string] $BrowserUri = 'http://localhost:3090',
    [ValidateRange(1, 300)]
    [int] $HealthTimeoutSeconds = 30,
    [switch] $NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

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

$node = (Get-Command node -ErrorAction Stop).Source
$missionControlProcess = Start-Process -FilePath $node -ArgumentList "`"$installedPath`"" -WindowStyle Hidden -PassThru
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
    Start-Process $BrowserUri
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
