<#
  Launch-Halo.ps1 — the operator's point-and-click cockpit launcher.

  Double-clicked via the "Halo Cockpit" desktop shortcut. Idempotent:
    1. starts `dsh web` hidden if port 3080 is not already serving
       (reaping only a dead DSH orphan that holds the port — §21.9),
    2. refreshes the available LM Studio model catalog without removing choices,
    3. on a fresh server start, selects and preloads the tuned pair,
    4. opens the default browser at the cockpit.
  The operator surface is THIS. CLI/headless stays reserved for agent lanes.
#>
[CmdletBinding()]
param(
    [string] $WorkRoot = 'C:\Users\scott\Desktop\Code',
    [int]    $Port = 3080,
    [switch] $NoBrowser,
    [string] $DshVer = '@deepseek-ai/dsh@0.1.1-rc.2'
)
$ErrorActionPreference = 'Stop'
function Kill-Tree($processId) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId" -EA SilentlyContinue |
        ForEach-Object { Kill-Tree $_.ProcessId }
    Stop-Process -Id $processId -Force -EA SilentlyContinue
}
function Test-Cockpit {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 5
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
    } catch { return $false }
}
# Reopening an existing server preserves the operator's selected model and
# residency. Only a fresh server start preloads the daily pair.
$launchMutex = [Threading.Mutex]::new($false, "Local\HaloCockpitStartup-$Port")
$launchHeld = $false
try {
    try { $launchHeld = $launchMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $launchHeld = $true }
    if (-not $launchHeld) { Write-Output 'Halo startup is already in progress.'; return }
$startedThisLaunch = $false

# ---- 2. cockpit server
$healthy = Test-Cockpit
if (-not $healthy) {
    # If something holds the port but does not answer, reap ONLY a DSH orphan
    # (ownership check on the recorded owner's command line — never by name).
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -EA SilentlyContinue
    foreach ($c in $conn) {
        $wp = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)" -EA SilentlyContinue
        if ($wp -and $wp.CommandLine -and $wp.CommandLine -match 'deepseek-ai[/\\@]dsh|dsh[\\ /"]') {
            Kill-Tree $wp.ProcessId
            Start-Sleep -Seconds 2
        }
    }
    $supervisor = Join-Path $PSScriptRoot 'Run-HaloCockpit.ps1'
    $logRoot = Join-Path $env:USERPROFILE '.dsh\logs'
    New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
    $supervisorOut = Join-Path $logRoot 'halo-supervisor.stdout.log'
    $supervisorErr = Join-Path $logRoot 'halo-supervisor.stderr.log'
    $supervisorProcess = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $supervisor,
        '-WorkRoot', $WorkRoot, '-Port', $Port, '-DshVer', $DshVer
    ) -WorkingDirectory $WorkRoot -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $supervisorOut -RedirectStandardError $supervisorErr
    $startedThisLaunch = $true
    $deadline = (Get-Date).AddSeconds(150)
    while ((Get-Date) -lt $deadline) {
        if (Test-Cockpit) { $healthy = $true; break }
        if ($supervisorProcess.HasExited) { break }
        Start-Sleep -Milliseconds 1500
    }
}

# ---- 3. open the operator's browser
if ($healthy) {
    # Serialize repeated shortcut clicks; never run two preload sequences.
    $modelMutex = [Threading.Mutex]::new($false, "Local\HaloModelStartup-$Port")
    $held = $false
    try {
        try { $held = $modelMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $held = $true }
        if ($held) {
            $startupArgs = @((Join-Path $PSScriptRoot 'startup\halo-startup.mjs'), '--port', "$Port")
            if ($startedThisLaunch) { $startupArgs += @('--warm', '--select-brain') }
            & node @startupArgs
            if ($LASTEXITCODE -ne 0) { throw 'Model startup/catalog refresh failed. See .dsh\logs\halo-startup-*.log; the cockpit remains available.' }
        }
    } catch {
        Write-Warning $_.Exception.Message
        if (-not $NoBrowser) {
            Add-Type -AssemblyName PresentationFramework
            [System.Windows.MessageBox]::Show($_.Exception.Message, 'Halo model startup') | Out-Null
        } else { throw }
    } finally {
        if ($held) { $modelMutex.ReleaseMutex() }
        $modelMutex.Dispose()
    }
    if (-not $NoBrowser) { Start-Process "http://localhost:$Port" }
} else {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "Halo cockpit did not come up on port $Port.`nCheck C:\Users\scott\.dsh\logs for preserved supervisor, stdout, stderr, PID, health, and exit evidence.",
        'Halo Cockpit') | Out-Null
    exit 1
}
} finally {
    if ($launchHeld) { $launchMutex.ReleaseMutex() }
    $launchMutex.Dispose()
}
