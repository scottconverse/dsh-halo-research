<#
  Launch-Halo.ps1 — the operator's point-and-click cockpit launcher.

  Double-clicked via the "Halo Cockpit" desktop shortcut. Idempotent:
    1. ensures both standing models are resident at 32,768 (spec v2.5 §19.1),
    2. starts `dsh web` hidden if port 3080 is not already serving
       (reaping only a dead DSH orphan that holds the port — §21.9),
    3. opens the default browser at the cockpit.
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
function Ensure-Model([string]$id, [int]$ctx) {
    $ps = & lms ps --json 2>$null | ConvertFrom-Json
    $m = $ps | Where-Object { $_.identifier -eq $id }
    if ($m -and $m.contextLength -eq $ctx) { return }
    if ($m) { & lms unload $id 2>&1 | Out-Null }
    & lms load $id --context-length $ctx --gpu max -y 2>&1 | Out-Null
}

# ---- 1. standing models (idempotent)
Ensure-Model 'unsloth/qwen3.8-27b' 32768
Ensure-Model 'unsloth/qwen3-coder-30b-a3b-instruct' 32768

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
    $env:LMSTUDIO_API_KEY = 'x'
    $env:DSH_PERMISSION_MODE = 'danger-full-access'
    Remove-Item Env:DSH_TOOLS_MODE -EA SilentlyContinue   # cockpit = native mode
    Remove-Item Env:DSH_HOME -EA SilentlyContinue         # cockpit = default home
    $pnpmCmd = Join-Path (Split-Path (Get-Command pnpm).Source -Parent) 'pnpm.cmd'
    Start-Process -FilePath $pnpmCmd -ArgumentList @('dlx', $DshVer, 'web') `
        -WorkingDirectory $WorkRoot -WindowStyle Hidden | Out-Null
    $deadline = (Get-Date).AddSeconds(150)
    while ((Get-Date) -lt $deadline) {
        if (Test-Cockpit) { $healthy = $true; break }
        Start-Sleep -Milliseconds 1500
    }
}

# ---- 3. open the operator's browser
if ($healthy) {
    if (-not $NoBrowser) { Start-Process "http://localhost:$Port" }
} else {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "Halo cockpit did not come up on port $Port within 150 seconds.`nCheck that LM Studio is running, then double-click again.",
        'Halo Cockpit') | Out-Null
    exit 1
}
