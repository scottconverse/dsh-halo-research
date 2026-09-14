$ErrorActionPreference = 'Stop'
$logs = Join-Path $PSScriptRoot 'logs'
$launchLog = Join-Path $logs 'launcher.log'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Write-LaunchLog([string]$Message) {
    Add-Content -LiteralPath $launchLog -Value "$(Get-Date -Format o) $Message"
}

try {
    Write-LaunchLog 'Desktop launcher invoked.'
    & (Join-Path $PSScriptRoot 'Start-StockDSH.ps1') -NoOpen

    $stdout = Get-Content -LiteralPath (Join-Path $logs 'dsh.stdout.log') -Raw -ErrorAction Stop
    $matches = [regex]::Matches($stdout, 'http://127\.0\.0\.1:3080/\?token=[\w-]+')
    if ($matches.Count -eq 0) { throw 'DSH is running, but its secure launch URL is unavailable.' }
    $launchUrl = $matches[$matches.Count - 1].Value

    $edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    if (Test-Path -LiteralPath $edge) {
        $browser = Start-Process -FilePath $edge -ArgumentList @('--new-window', $launchUrl) -WindowStyle Normal -PassThru
        Write-LaunchLog "Opened DSH in a new Microsoft Edge window (PID $($browser.Id))."
    } else {
        Start-Process -FilePath $launchUrl
        Write-LaunchLog 'Opened DSH with the Windows default browser.'
    }
} catch {
    $message = $_.Exception.Message
    Write-LaunchLog "FAILED: $message"
    Add-Content -LiteralPath (Join-Path $PSScriptRoot 'logs\launcher-errors.log') -Value "$(Get-Date -Format o) $message"
    $shell = New-Object -ComObject WScript.Shell
    $shell.Popup($message,0,'DSH + Wigolo could not start',16) | Out-Null
    exit 1
}
