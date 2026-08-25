<#
  Gate-Build.ps1 — T-29: the external verifier-and-repair gate (spec v2.5 §19.1, §21.15).

  The worker (Coder-30B, Code Mode, 32K) builds in -Workspace. The verdict comes
  ONLY from -TestScript, which lives OUTSIDE the workspace and is re-run by this
  harness after every worker round. The model's own success prose is ignored by
  design. Fail-closed: the default outcome is FAIL; only TestScript exit 0 passes.

  Usage:
    .\Gate-Build.ps1 -Workspace <dir> -TestScript <path> -Task "<one line, no < >>"
    .\Gate-Build.ps1 -Workspace <dir> -TestScript <path> -VerifyOnly   # verdict only
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $Workspace,
    [Parameter(Mandatory)][string] $TestScript,
    [string] $Task = 'Carry out the build specified in AGENTS.md in this directory, exactly as written.',
    [ValidateSet('worker','cockpit')][string] $Lane = 'worker',
    [int]    $MaxRounds = 3,
    [int]    $CapMin = 20,
    [switch] $VerifyOnly,
    [string] $DshVer = '@deepseek-ai/dsh@0.1.1-rc.2'
)
$ErrorActionPreference = 'Stop'
$stack = $PSScriptRoot
$workerHome = Join-Path $stack 'dsh-home-worker'
$log   = Join-Path $Workspace 'gate-log.txt'
function Log($m){ $line="[$(Get-Date -Format HH:mm:ss)] $m"; Write-Host $line; Add-Content $log $line }
function Kill-Tree($processId) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId" -EA SilentlyContinue |
        ForEach-Object { Kill-Tree $_.ProcessId }
    Stop-Process -Id $processId -Force -EA SilentlyContinue
}

if (-not (Test-Path $Workspace))  { throw "Workspace not found: $Workspace" }
if (-not (Test-Path $TestScript)) { throw "TestScript not found: $TestScript" }
$wsFull = (Resolve-Path $Workspace).Path
$tsFull = (Resolve-Path $TestScript).Path
if ($tsFull.StartsWith($wsFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "REFUSED: TestScript lives inside the workspace - the worker could rewrite it (s21.15)."
}

function Run-Verdict {
    # The only authority on completion. Exit 0 = pass. Everything else = fail.
    if ($tsFull -like '*.py') { $out = & python $tsFull $wsFull 2>&1 }
    else                      { $out = & $tsFull $wsFull 2>&1 }
    $code = $LASTEXITCODE
    return @{ code = $code; text = ($out -join "`n") }
}

function Run-WorkerRound([string]$roundTask, [int]$round) {
    $pnpmCmd = Join-Path (Split-Path (Get-Command pnpm).Source -Parent) 'pnpm.cmd'
    $env:DSH_PERMISSION_MODE = 'danger-full-access'
    $env:LMSTUDIO_API_KEY = 'x'
    if ($Lane -eq 'worker') {
        # Coder-30B in Code Mode. The worker's own DSH_HOME pins the coder: a
        # --patch cannot, because agent-default-model reads the settings USER
        # LAYER live once mounted.
        $env:DSH_TOOLS_MODE = 'code'
        $env:DSH_HOME = $workerHome
    } else {
        # Cockpit lane: 27B, native tool mode, default home (~\.dsh), with the
        # forced-cadence brief stamped into AGENTS.md (spec §12.10 recipe).
        Remove-Item Env:DSH_TOOLS_MODE -EA SilentlyContinue
        Remove-Item Env:DSH_HOME -EA SilentlyContinue
    }
    $rlog = Join-Path $wsFull ("gate-round{0}.log" -f $round)
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $p = Start-Process -FilePath $pnpmCmd `
            -ArgumentList @('dlx', $DshVer, '--profile', 'headless', $roundTask) `
            -WorkingDirectory $wsFull -NoNewWindow -PassThru `
            -RedirectStandardOutput $rlog -RedirectStandardError "$rlog.err"
    $laneDesc = if ($Lane -eq 'worker') { 'Code Mode, coder-30b' } else { 'native + cadence, 27B cockpit' }
    Log "round $round : agent launched (pid $($p.Id), cap ${CapMin}m, $laneDesc)"
    $finished = $p.WaitForExit($CapMin * 60 * 1000)
    $sw.Stop()
    if (-not $finished) {
        Log "round $round : hit ${CapMin}m cap - killing recorded tree (pid $($p.Id))"
        Kill-Tree $p.Id
        Start-Sleep -Seconds 3
    } else {
        Log ("round $round : worker exited after {0:N1} min (code {1})" -f $sw.Elapsed.TotalMinutes, $p.ExitCode)
    }
    # Root-leak guard (s21.16): nothing new may appear at the drive root.
    $leak = Get-ChildItem 'C:\' -Directory -EA SilentlyContinue |
        Where-Object { $_.CreationTime -gt (Get-Date).AddMinutes(-($CapMin+2)) }
    if ($leak) { Log ("round $round : WARNING new top-level dirs created during round: " + (($leak | ForEach-Object Name) -join ', ')) }
}

function Ensure-Cadence {
    # Cockpit builds always carry the forced-cadence brief (the only recipe
    # with a full autonomous pass on record). Appended after any existing
    # contract, never duplicated, never touched on the worker lane.
    $marker = 'HALO-CADENCE-BRIEF'
    $brief  = Join-Path $stack 'cadence-brief.md'
    $agents = Join-Path $wsFull 'AGENTS.md'
    if (-not (Test-Path $brief)) { Log 'WARNING cadence-brief.md missing - cockpit round runs without cadence'; return }
    if ((Test-Path $agents) -and ((Get-Content $agents -Raw) -match $marker)) { return }
    Add-Content $agents ("`n`n" + (Get-Content $brief -Raw))
    Log 'cadence brief stamped into AGENTS.md'
}

# ---------------- gate loop ----------------
"" | Set-Content $log
Log ("gate start | lane=$Lane | workspace=$wsFull | verifier=$tsFull | verifyOnly=$VerifyOnly")
if (-not $VerifyOnly -and $Lane -eq 'cockpit') { Ensure-Cadence }

if ($VerifyOnly) {
    $v = Run-Verdict
    Log ("verdict: exit={0} -> {1}" -f $v.code, $(if ($v.code -eq 0) {'PASS'} else {'FAIL (fail-closed: model prose ignored by design)'}))
    $v.text | Set-Content (Join-Path $wsFull 'gate-verdict.txt')
    exit $(if ($v.code -eq 0) { 0 } else { 1 })
}

for ($r = 1; $r -le $MaxRounds; $r++) {
    if ($r -eq 1) {
        $roundTask = $Task
    } else {
        $roundTask = 'Read GATE-FEEDBACK.md in this directory. The external test gate REJECTED the previous work; the file contains the exact failing output. Fix those exact failures in place, re-run the tests yourself, then stop.'
    }
    Run-WorkerRound $roundTask $r
    $v = Run-Verdict
    $v.text | Set-Content (Join-Path $wsFull 'gate-verdict.txt')
    if ($v.code -eq 0) {
        Log ("round $r : verdict PASS - external tests green. Task complete BY TEST EVIDENCE.")
        exit 0
    }
    Log ("round $r : verdict FAIL (exit {0}) - feeding failures back" -f $v.code)
    $fb = "# GATE FEEDBACK - round $r`n`nThe external verifier rejected the work. Exact output:`n`n" + '```' + "`n" + $v.text + "`n" + '```' + "`n"
    $fb | Set-Content (Join-Path $wsFull 'GATE-FEEDBACK.md')
}
Log ("gate END: FAIL after $MaxRounds rounds. The work is NOT complete, whatever the model said.")
exit 1
