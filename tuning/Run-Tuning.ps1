<#
  Run-Tuning.ps1 — T-A: does the local model complete a real coding task when
  the CONTEXT WINDOW is tuned down from 131K?

  For each context size it:
    1. reloads LM Studio at that context length (verified via lms ps),
    2. gives the agent a FRESH empty workspace,
    3. runs `dsh --profile headless "<canary task>"` unattended, danger-full-access,
       with a hard wall-clock cap (a spiral cannot run forever),
    4. grades the result with the deterministic smoke_test.py,
    5. pulls honest metrics (peak context, tool calls, wall time, compactions,
       action ratio) from the actual session log.

  Nothing here favors any outcome: same task, same grader, same cap for every
  config. The only thing that changes is the context window.

  Usage:  .\Run-Tuning.ps1 -Sizes 16384,32768 -TimeoutMin 30
#>
[CmdletBinding()]
param(
    [int[]]  $Sizes      = @(16384, 32768),
    [int]    $TimeoutMin = 30,
    [string] $Model      = 'unsloth/qwen3.8-27b',
    [string] $DshVer     = '@deepseek-ai/dsh@0.1.1-rc.2',
    [string] $Root       = 'C:\Users\scott\Desktop\Code\dsh-halo-research\tuning'
)

$ErrorActionPreference = 'Stop'
# flatten to a single line so newlines can't break argument passing to the launcher
$task    = ((Get-Content (Join-Path $Root 'canary-task.txt') -Raw).Trim() -replace '\s*\r?\n\s*', ' ')
$pnpmCmd = Join-Path (Split-Path (Get-Command pnpm).Source -Parent) 'pnpm.cmd'
if (-not (Test-Path $pnpmCmd)) { throw "pnpm.cmd not found next to $((Get-Command pnpm).Source)" }
$runsDir = Join-Path $Root 'runs'
New-Item -ItemType Directory -Force -Path $runsDir | Out-Null
$results = @()

function Kill-Tree($processId) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId" -EA SilentlyContinue |
        ForEach-Object { Kill-Tree $_.ProcessId }
    Stop-Process -Id $processId -Force -EA SilentlyContinue
}

function Load-Model($ctx) {
    & lms unload --all 2>&1 | Out-Null
    & lms load $Model --context-length $ctx --gpu max -y 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    $ps = & lms ps --json 2>$null | ConvertFrom-Json
    $got = if ($ps) { ($ps | Select-Object -First 1).contextLength } else { 0 }
    return $got
}

function Clear-Port($portNum) {
    $conns = Get-NetTCPConnection -LocalPort $portNum -State Listen -EA SilentlyContinue
    foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -EA SilentlyContinue }
}

foreach ($ctx in $Sizes) {
  $tag = "ctx$([math]::Round($ctx/1024))k"
  Write-Host "`n===== CONFIG: $tag (context $ctx) =====" -ForegroundColor Cyan
  try {
    $loaded = Load-Model $ctx
    Write-Host "  model reloaded — lms ps reports contextLength=$loaded"
    if ($loaded -ne $ctx) { Write-Host "  WARNING: requested $ctx but got $loaded" -ForegroundColor Yellow }

    $ws = Join-Path $runsDir "ws-$tag"
    if (Test-Path $ws) { Remove-Item $ws -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $ws | Out-Null

    $logFile = Join-Path $runsDir "headless-$tag.log"
    $startEpoch = [int][double]::Parse((Get-Date -UFormat %s))
    $sw = [Diagnostics.Stopwatch]::StartNew()

    $env:DSH_PERMISSION_MODE = 'danger-full-access'
    $env:LMSTUDIO_API_KEY    = 'x'
    Write-Host "  launching headless agent (cap ${TimeoutMin}m) ..." -NoNewline
    $p = Start-Process -FilePath $pnpmCmd `
            -ArgumentList @('dlx', $DshVer, '--profile', 'headless', $task) `
            -WorkingDirectory $ws -NoNewWindow -PassThru `
            -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err"

    $finished = $p.WaitForExit($TimeoutMin * 60 * 1000)
    $sw.Stop()
    $timedOut = -not $finished
    if ($timedOut) {
        Write-Host " TIMED OUT after ${TimeoutMin}m — killing." -ForegroundColor Yellow
        Kill-Tree $p.Id
        Start-Sleep -Seconds 3
    } else {
        Write-Host (" exited after {0:N1} min (code {1})" -f ($sw.Elapsed.TotalMinutes), $p.ExitCode)
    }

    # ---- grade: deterministic smoke test against the produced app.py
    Clear-Port 5099   # ensure no lingering server from a prior config answers
    Start-Sleep -Seconds 1
    $smoke = & python (Join-Path $Root 'smoke_test.py') $ws 2>&1
    $smokePass = ($LASTEXITCODE -eq 0)
    $sl = $smoke | Select-String 'RESULT:' | Select-Object -Last 1
    $smokeLine = if ($sl) { $sl.ToString().Trim() } else { (($smoke | Select-Object -Last 1) -join '').Trim() }

    # ---- honest metrics from the actual session log
    $metricsJson = & python (Join-Path $Root 'extract_metrics.py') --newest-after $startEpoch 2>&1
    try { $m = $metricsJson | ConvertFrom-Json } catch { $m = $null }

    $row = [pscustomobject]@{
        config           = $tag
        context_len      = $loaded
        completed        = $smokePass
        smoke            = $smokeLine
        wall_min         = [math]::Round($sw.Elapsed.TotalMinutes, 1)
        timed_out        = $timedOut
        peak_context_tok = if ($m) { $m.peak_context_tokens } else { $null }
        tool_calls       = if ($m) { $m.tool_calls } else { $null }
        compactions      = if ($m) { $m.compactions } else { $null }
        action_ratio     = if ($m) { $m.action_ratio_by_chars } else { $null }
        output_tokens    = if ($m) { $m.total_output_tokens } else { $null }
        app_py_bytes     = if (Test-Path (Join-Path $ws 'app.py')) { (Get-Item (Join-Path $ws 'app.py')).Length } else { 0 }
    }
    $results += $row
    Write-Host ("  RESULT: completed={0}  wall={1}m  peakCtx={2}  tools={3}  {4}" -f `
        $row.completed, $row.wall_min, $row.peak_context_tok, $row.tool_calls, $row.smoke)
    ($smoke -join "`n") | Set-Content (Join-Path $runsDir "smoke-$tag.txt")
    $metricsJson | Set-Content (Join-Path $runsDir "metrics-$tag.json")
  }
  catch {
    Write-Host ("  CONFIG $tag ERRORED: {0}" -f $_.Exception.Message) -ForegroundColor Red
    $results += [pscustomobject]@{
        config=$tag; context_len=$ctx; completed=$false
        smoke="ERROR: $($_.Exception.Message)"; wall_min=$null; timed_out=$null
        peak_context_tok=$null; tool_calls=$null; compactions=$null
        action_ratio=$null; output_tokens=$null; app_py_bytes=0
    }
  }
}

Write-Host "`n================ T-A SUMMARY ================" -ForegroundColor Green
$results | Format-Table config, completed, wall_min, timed_out, peak_context_tok, tool_calls, compactions, action_ratio, app_py_bytes -AutoSize
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$results | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $runsDir "SUMMARY-$stamp.json")
Write-Host "saved runs/ artifacts + SUMMARY-$stamp.json"
