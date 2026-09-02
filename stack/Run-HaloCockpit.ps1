<#
  Supervised DSH cockpit host. Launch-Halo starts this hidden helper; this
  process preserves the child PID, stdout, stderr, health state, and exit code.
  One unexpected exit is restarted. A second exit remains down with evidence.
#>
[CmdletBinding()]
param(
    [string] $WorkRoot = 'C:\Users\scott\Desktop\Code',
    [int]    $Port = 3080,
    [string] $DshVer = '@deepseek-ai/dsh@0.1.1-rc.2',
    [int]    $MaxRestarts = 1
)
$ErrorActionPreference = 'Stop'
$logRoot = Join-Path $env:USERPROFILE '.dsh\logs'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$pidPath = Join-Path $logRoot 'halo-cockpit.pid.json'
$pnpmCmd = Join-Path (Split-Path (Get-Command pnpm).Source -Parent) 'pnpm.cmd'
$allowedBuilds = @('@deepseek-ai/dsh-subprocess-local', '@google/genai', 'koffi', 'node-pty', 'protobufjs')
$dlxArgs = @('dlx')
foreach ($package in $allowedBuilds) { $dlxArgs += "--allow-build=$package" }
$dlxArgs += @($DshVer, 'web', '--no-open')

# The provider is independently owned; its failure must not take local/native
# CLI coding offline. Never print its credential or copy user CLI auth files.
try {
    & (Join-Path $PSScriptRoot 'provider-integration\Start-Provider.ps1') | Out-Null
    $credentialFile = Join-Path $env:USERPROFILE '.dsh\provider-runtime\credentials.json'
    if (Test-Path -LiteralPath $credentialFile) {
        $providerCredential = Get-Content -LiteralPath $credentialFile -Raw | ConvertFrom-Json
        if ($providerCredential.origin -ne 'http://127.0.0.1:20130') { throw 'Provider credential origin mismatch' }
        $env:HALO_PROVIDER_KEY = $providerCredential.apiKey
    }
} catch { Write-Warning "Halo cloud router startup needs attention: $($_.Exception.Message). Local and native CLI routes remain available." }

function Test-Health {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 5
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
    } catch { return $false }
}

function Stop-ProcessTree([int] $ProcessId) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$ProcessId" -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-ProcessTree $_.ProcessId }
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

for ($attempt = 0; $attempt -le $MaxRestarts; $attempt++) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $stdoutPath = Join-Path $logRoot "halo-cockpit-$stamp.stdout.log"
    $stderrPath = Join-Path $logRoot "halo-cockpit-$stamp.stderr.log"
    $env:LMSTUDIO_API_KEY = 'x'
    $env:DSH_PERMISSION_MODE = 'danger-full-access'
    Remove-Item Env:DSH_TOOLS_MODE -EA SilentlyContinue
    Remove-Item Env:DSH_HOME -EA SilentlyContinue
    $startedAt = Get-Date
    $process = Start-Process -FilePath $pnpmCmd -ArgumentList $dlxArgs `
        -WorkingDirectory $WorkRoot -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    $record = [ordered]@{
        Pid = $process.Id
        SupervisorPid = $PID
        Attempt = $attempt + 1
        StartedAt = $startedAt.ToString('o')
        HealthUrl = "http://localhost:$Port"
        HealthyAt = $null
        ExitedAt = $null
        ExitCode = $null
        Stdout = $stdoutPath
        Stderr = $stderrPath
        Command = "$pnpmCmd $($dlxArgs -join ' ')"
    }
    $record | ConvertTo-Json | Set-Content -LiteralPath $pidPath -Encoding UTF8

    $healthDeadline = (Get-Date).AddSeconds(150)
    while (-not $process.HasExited -and (Get-Date) -lt $healthDeadline) {
        if (Test-Health) {
            $record.HealthyAt = (Get-Date).ToString('o')
            $record | ConvertTo-Json | Set-Content -LiteralPath $pidPath -Encoding UTF8
            break
        }
        Start-Sleep -Milliseconds 1000
        $process.Refresh()
    }

    if ($null -eq $record.HealthyAt -and -not $process.HasExited) {
        Add-Content -LiteralPath $stderrPath -Value "HALO supervisor: health deadline expired; terminating owned DSH tree."
        Stop-ProcessTree $process.Id
    }

    $process.WaitForExit()
    $record.ExitedAt = (Get-Date).ToString('o')
    $record.ExitCode = $process.ExitCode
    $record | ConvertTo-Json | Set-Content -LiteralPath $pidPath -Encoding UTF8
    if ($attempt -ge $MaxRestarts) { break }
    Start-Sleep -Seconds 2
}
