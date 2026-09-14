[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

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
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3090/api/status' -TimeoutSec 5
    if (-not $health.build.sourceFile -or -not $health.build.sourceSha256) {
        throw 'Mission Control answered on port 3090 without a verifiable build identity.'
    }

    $dshOutput = Get-Content -LiteralPath (Join-Path $logs 'dsh.stdout.log') -Raw -ErrorAction Stop
    $dshLaunchMatches = [regex]::Matches($dshOutput, 'http://127\.0\.0\.1:3080/\?token=[\w-]+')
    if ($dshLaunchMatches.Count -eq 0) {
        throw 'DSH is running, but its authenticated Chrome launch URL is unavailable.'
    }
    $dshLaunchUri = $dshLaunchMatches[$dshLaunchMatches.Count - 1].Value

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
    $message = $_.Exception.Message
    Write-LaunchLog "FAILED: $message"
    Add-Content -LiteralPath (Join-Path $logs 'launcher-errors.log') -Value "$(Get-Date -Format o) $message"
    $shell = New-Object -ComObject WScript.Shell
    $shell.Popup($message, 0, 'DSH + Wigolo + Mission Control could not start', 16) | Out-Null
    exit 1
}
