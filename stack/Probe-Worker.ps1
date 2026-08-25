<#
  Probe-Worker.ps1 — UNGATED diagnostic probe of the worker lane.

  For debugging and config checks ONLY. It runs the same lane as a real build
  (worker DSH_HOME, Code Mode, coder-30b) but with no verifier and no repair
  loop — so by the records rule its output is never evidence and never a
  completed build. Every probe workspace is stamped to say so.

  Usage: .\Probe-Worker.ps1 -Task "<one line, no < >>" [-Workspace <dir>] [-CapMin 10]
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $Task,
    [string] $Workspace = '',
    [int]    $CapMin = 10,
    [string] $DshVer = '@deepseek-ai/dsh@0.1.1-rc.2'
)
$ErrorActionPreference = 'Stop'
$stack = $PSScriptRoot
function Kill-Tree($processId) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId" -EA SilentlyContinue |
        ForEach-Object { Kill-Tree $_.ProcessId }
    Stop-Process -Id $processId -Force -EA SilentlyContinue
}

if (-not $Workspace) { $Workspace = Join-Path $stack ("ws-probe-{0}" -f (Get-Date -Format 'yyyyMMdd-HHmmss')) }
New-Item -ItemType Directory -Force -Path $Workspace | Out-Null
$ws = (Resolve-Path $Workspace).Path

$stamp = 'UNGATED PROBE - NOT EVIDENCE. No gate-log exists for this run; nothing in this workspace counts as a completed build (stack records rule / spec s21.15).'
$plog = Join-Path $ws 'probe-log.txt'
"[$(Get-Date -Format s)] $stamp" | Set-Content $plog
"[$(Get-Date -Format s)] task: $Task" | Add-Content $plog

$pnpmCmd = Join-Path (Split-Path (Get-Command pnpm).Source -Parent) 'pnpm.cmd'
$env:DSH_PERMISSION_MODE = 'danger-full-access'
$env:DSH_TOOLS_MODE = 'code'
$env:LMSTUDIO_API_KEY = 'x'
$env:DSH_HOME = Join-Path $stack 'dsh-home-worker'

$p = Start-Process -FilePath $pnpmCmd `
        -ArgumentList @('dlx', $DshVer, '--profile', 'headless', $Task) `
        -WorkingDirectory $ws -NoNewWindow -PassThru `
        -RedirectStandardOutput (Join-Path $ws 'probe-headless.log') `
        -RedirectStandardError  (Join-Path $ws 'probe-headless.err')
Write-Host "probe launched (pid $($p.Id), cap ${CapMin}m) in $ws"
if (-not $p.WaitForExit($CapMin * 60 * 1000)) {
    Write-Host "probe hit ${CapMin}m cap - killing recorded tree"
    Kill-Tree $p.Id
    Start-Sleep -Seconds 2
    Add-Content $plog "[$(Get-Date -Format s)] probe hit cap and was killed."
} else {
    Add-Content $plog "[$(Get-Date -Format s)] probe ended (exit $($p.ExitCode))."
}
Add-Content $plog "[$(Get-Date -Format s)] $stamp"
Write-Host $stamp
