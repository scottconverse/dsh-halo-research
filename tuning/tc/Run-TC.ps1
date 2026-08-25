<#
  Run-TC.ps1 — one T-C variant, end to end: workspace, brief, headless agent,
  ownership-checked cleanup, deterministic grade, honest metrics.

  Usage: .\Run-TC.ps1 -Variant tc1 -Ctx 32768 -Port 5151 -CapMin 45 -WriteOnly
         .\Run-TC.ps1 -Variant tc2 -Ctx 32768 -Port 5152 -CapMin 100
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $Variant,
    [Parameter(Mandatory)][int]    $Ctx,
    [Parameter(Mandatory)][int]    $Port,
    [int]    $CapMin = 45,
    [switch] $WriteOnly,
    [string] $VariantInstructionsFile = '',
    [string] $DraftModel = 'unsloth/qwen3-coder-30b-a3b-instruct',
    [string] $DshVer = '@deepseek-ai/dsh@0.1.1-rc.2'
)
$ErrorActionPreference = 'Stop'
$tc   = 'C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc'
$ws   = Join-Path $tc "ws-$Variant"
$rep  = Join-Path $tc 'REPORT-TC.md'
function Log($m){ $line="[$(Get-Date -Format HH:mm:ss)] $m"; Write-Host $line; Add-Content $rep $line }

function Kill-Tree($processId) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId" -EA SilentlyContinue |
        ForEach-Object { Kill-Tree $_.ProcessId }
    Stop-Process -Id $processId -Force -EA SilentlyContinue
}

# ---- 1. ensure the 27B is at the requested context (coder stays resident)
$ps = & lms ps --json 2>$null | ConvertFrom-Json
$b27 = $ps | Where-Object { $_.identifier -eq 'unsloth/qwen3.8-27b' }
if (-not $b27 -or $b27.contextLength -ne $Ctx) {
    Log "$Variant : reloading 27B at ctx=$Ctx (coder stays resident)"
    if ($b27) { & lms unload 'unsloth/qwen3.8-27b' 2>&1 | Out-Null }
    & lms load 'unsloth/qwen3.8-27b' --context-length $Ctx --gpu max -y 2>&1 | Out-Null
    Start-Sleep -Seconds 2
}
$ps = & lms ps --json 2>$null | ConvertFrom-Json
Log ("$Variant : resident = " + (($ps | ForEach-Object { "$($_.identifier)@$($_.contextLength)" }) -join ' + '))

# ---- 2. fresh workspace + brief
if (Test-Path $ws) { Remove-Item $ws -Recurse -Force }
New-Item -ItemType Directory -Force -Path $ws | Out-Null
$brief = Get-Content (Join-Path $tc 'BRIEF-TEMPLATE.md') -Raw
$brief = $brief.Replace('{PORT}', "$Port").Replace('{DRAFT_MODEL}', $DraftModel)
if ($VariantInstructionsFile -and (Test-Path $VariantInstructionsFile)) {
    $vi = Get-Content $VariantInstructionsFile -Raw
} elseif ($WriteOnly) {
    $vi = @"
## Your task in THIS run
Write the complete `app.py` now, matching every contract item above. Do NOT run
it, do not create any other files, do not test it. When `app.py` is fully
written, stop.
"@
} else {
    $vi = @"
## Your task in THIS run
1. Write the complete `app.py` matching every contract item above.
2. RUN it (background it so you can keep working), and TEST it yourself with
   real HTTP requests, end to end: draft one article from
   `sample_transcript.txt` through the real LLM; verify the gate BLOCKS a
   publish missing the source link or verification; verify it PASSES when
   complete; verify search, the board filter, the article page with transcript
   and source link, and the full correction flow (request, accept, public note).
3. Fix whatever fails and re-test. Iterate until every item passes.
4. Write `TEST-RESULTS.md` here listing each contract item with PASS or FAIL
   and one line of evidence each.
5. Stop every process you started, then finish.
"@
}
$brief = $brief.Replace('{VARIANT_INSTRUCTIONS}', $vi)
Set-Content (Join-Path $ws 'AGENTS.md') $brief -Encoding UTF8
Copy-Item 'C:\Users\scott\Desktop\Code\townreporter\sample_transcript.txt' (Join-Path $ws 'sample_transcript.txt')
Log "$Variant : workspace ready ($ws), port $Port, cap ${CapMin}m, writeOnly=$WriteOnly"

# ---- 3. launch the headless agent
$pnpmCmd = Join-Path (Split-Path (Get-Command pnpm).Source -Parent) 'pnpm.cmd'
$task = 'Carry out the TownReporter build specified in AGENTS.md in this directory, exactly as written.'
$logF = Join-Path $tc "headless-$Variant.log"
$env:DSH_PERMISSION_MODE = 'danger-full-access'
$env:LMSTUDIO_API_KEY = 'x'
$startEpoch = [int][double]::Parse((Get-Date -UFormat %s))
$sw = [Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath $pnpmCmd `
        -ArgumentList @('dlx', $DshVer, '--profile', 'headless', $task) `
        -WorkingDirectory $ws -NoNewWindow -PassThru `
        -RedirectStandardOutput $logF -RedirectStandardError "$logF.err"
Log "$Variant : agent launched (pid $($p.Id))"
$finished = $p.WaitForExit($CapMin * 60 * 1000)
$sw.Stop()
if (-not $finished) {
    Log "$Variant : hit ${CapMin}m cap - killing recorded tree (pid $($p.Id) only)"
    Kill-Tree $p.Id
    Start-Sleep -Seconds 3
} else {
    Log ("$Variant : agent exited after {0:N1} min (code {1})" -f $sw.Elapsed.TotalMinutes, $p.ExitCode)
}

# ---- 4. ownership-checked port cleanup (never touch non-mine processes)
$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -EA SilentlyContinue
foreach ($c in $conn) {
    $wp = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)" -EA SilentlyContinue
    if ($wp -and $wp.CommandLine -and $wp.CommandLine.Contains($ws)) {
        Log "$Variant : reaping leftover app server pid $($c.OwningProcess) (cmdline matches my workspace)"
        Stop-Process -Id $c.OwningProcess -Force -EA SilentlyContinue
    } elseif ($wp) {
        Log "$Variant : WARNING port $Port held by pid $($c.OwningProcess) NOT owned by this run - leaving it alone: $($wp.CommandLine)"
    }
}

# ---- 5. grade + metrics
Log "$Variant : grading..."
$smoke = & python (Join-Path $tc 'grade_townreporter.py') $ws $Port 2>&1
$gcode = $LASTEXITCODE
$smoke | ForEach-Object { Write-Host "    $_" }
$smoke -join "`n" | Set-Content (Join-Path $tc "grade-$Variant.txt")
$resLine = ($smoke | Select-String 'RESULT:' | Select-Object -Last 1)
$metrics = & python 'C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\extract_metrics.py' --newest-after $startEpoch 2>&1
$metrics | Set-Content (Join-Path $tc "metrics-$Variant.json")
try { $m = $metrics | ConvertFrom-Json } catch { $m = $null }
Log ("$Variant RESULT: pass=$($gcode -eq 0) | wall={0:N1}m | timedOut=$(-not $finished) | $resLine | peakCtx=$($m.peak_context_tokens) tools=$($m.tool_calls) compactions=$($m.compactions) actionRatio=$($m.action_ratio_by_chars)" -f $sw.Elapsed.TotalMinutes)
exit $(if ($gcode -eq 0) { 0 } else { 1 })
