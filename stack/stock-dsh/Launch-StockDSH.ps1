[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'Web-Readiness.ps1')

$logs = Join-Path $PSScriptRoot 'logs'
$launchLog = Join-Path $logs 'launcher.log'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Write-LaunchLog([string] $Message) {
    Add-Content -LiteralPath $launchLog -Value "$(Get-Date -Format o) $Message"
}

try {
    Write-LaunchLog 'Unified DSH launcher invoked.'
    & (Join-Path $PSScriptRoot 'Start-StockDSH.ps1') -NoOpen | Out-Null

    $missionControlUri = 'http://127.0.0.1:3090/'
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3090/api/status' -NoProxy -TimeoutSec 5
    if (-not $health.build.sourceFile -or -not $health.build.sourceSha256) {
        throw 'Mission Control answered on port 3090 without a verifiable build identity.'
    }

    $ready = Get-DshWebReadiness
    $dshLaunchUri = $ready.LaunchUrl

    $chromeCandidates = @(
        'C:\Program Files\Google\Chrome\Application\chrome.exe'
        'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    )
    $chrome = @($chromeCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }) | Select-Object -First 1
    if (-not $chrome) {
        throw 'Google Chrome is required but was not found in a standard installation location.'
    }

    $browser = Start-Process -FilePath $chrome -ArgumentList @('--new-window', $missionControlUri, $dshLaunchUri) -WindowStyle Normal -PassThru
    Write-LaunchLog "Opened Mission Control and DSH in Google Chrome (PID $($browser.Id))."
} catch {
    $message = $_.Exception.Message -replace '(?i)(token=)[\w-]+', '$1[REDACTED]'
    Write-LaunchLog "FAILED: $message"
    Add-Content -LiteralPath (Join-Path $logs 'launcher-errors.log') -Value "$(Get-Date -Format o) $message"
    $shell = New-Object -ComObject WScript.Shell
    $shell.Popup($message, 0, 'DSH + Wigolo + Mission Control could not start', 16) | Out-Null
    exit 1
}
