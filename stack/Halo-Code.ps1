<#
  Halo-Code.ps1 — THE public entry point of the Halo Stack.

  One command. A frontier-model coordinator (Claude, Codex, DeepSeek, Kimi, ...)
  hands this a repo, a brief, and an acceptance command. Local models on this
  machine write the code. An external verifier - never the model's own word -
  decides green or red.

  CONTRACT
    in : -Repo, -Brief (file or inline text), -Verify (shell command, exit 0 = pass)
    out: exit 0 GREEN (code passed the verifier)  |  2 ENV_FAILURE (verifier/env broken)
         3 TRIPWIRE (two identical failures, stopped early)  |  1 RED (failed within rounds)
    side effects: on GREEN with -Commit, commits the repo. On RED, worker changes are
         preserved to an evidence dir and the repo is restored to its prior state.
         Evidence for every run (logs, verdict, SHA256SUMS) is written OUTSIDE the repo.

  USAGE
    .\Halo-Code.ps1 -SelfTest
    .\Halo-Code.ps1 -Repo C:\src\myapp -Brief .\unit.md -Verify "npm test" -Frozen "test/unit.test.js"
    .\Halo-Code.ps1 -Repo C:\src\myapp -Brief "Implement X per tests" -Verify "uv run --frozen python -m pytest -q tests/unit/test_x.py" `
                    -Frozen "tests/unit/test_x.py" -Required "test_happy test_forbidden" -Commit

  See HALO-STACK-GUIDE.md for the coordinator's playbook (how to write briefs and
  acceptance tests that this stack converts into shipped code).
#>
[CmdletBinding(DefaultParameterSetName = 'Run')]
param(
    [Parameter(ParameterSetName='Run', Mandatory)][string]   $Repo,
    [Parameter(ParameterSetName='Run', Mandatory)][string]   $Brief,
    [Parameter(ParameterSetName='Run', Mandatory)][string]   $Verify,
    [Parameter(ParameterSetName='Run')][string[]] $Frozen   = @(),
    [Parameter(ParameterSetName='Run')][string[]] $Required = @(),
    [Parameter(ParameterSetName='Run')][string]   $CollectCmd = '',
    [Parameter(ParameterSetName='Run')][ValidateSet('worker','cockpit')][string] $Lane = 'worker',
    [Parameter(ParameterSetName='Run')][int]      $CapMin   = 15,
    [Parameter(ParameterSetName='Run')][int]      $Rounds   = 2,
    [Parameter(ParameterSetName='Run')][string]   $Name     = 'unit',
    [Parameter(ParameterSetName='Run')][switch]   $Commit,
    [Parameter(ParameterSetName='Run')][switch]   $SkipSelfTest,
    [Parameter(ParameterSetName='Run')][switch]   $SkipModelLoad,
    [Parameter(ParameterSetName='Run')][string]   $GateScript = '',
    [Parameter(ParameterSetName='SelfTest', Mandatory)][switch] $SelfTest
)
$ErrorActionPreference = 'Stop'
$stack = $PSScriptRoot
$cond  = Join-Path $stack 'gateway-conductor'
$harness = Join-Path $cond 'test-harness.ps1'

function Say($m) { Write-Host "[halo] $m" }

# ---------- self-test: prove the pipeline before spending model time ----------
if ($env:HALO_IN_HARNESS -and $SelfTest) {
    Say 'nested self-test inside the harness - skipping (would recurse).'
    exit 0
}
if ($SelfTest -or -not $SkipSelfTest) {
    Say 'running pipeline self-test (fake worker, no inference)...'
    & $harness *> $null
    if ($LASTEXITCODE -ne 0) {
        Say "SELF-TEST FAILED ($LASTEXITCODE failed checks). The stack is broken; refusing to spend model time."
        Say "Diagnose: $harness"
        exit 2
    }
    Say 'self-test PASS - pipeline verified.'
    if ($SelfTest) { exit 0 }
}

# ---------- preflight ----------
if (-not (Test-Path $Repo)) { Say "Repo not found: $Repo"; exit 2 }
$repoFull = (Resolve-Path $Repo).Path
if (-not (Test-Path (Join-Path $repoFull '.git'))) { Say "Not a git repo (needed for revert/commit): $repoFull"; exit 2 }
$dirty = git -C $repoFull status --porcelain
if ($dirty -and -not $Commit) { Say 'note: repo has uncommitted changes; they are treated as the starting point.' }

# Model residency: this box cannot hold both local models at once (measured
# 2026-08-26: both loaded -> 1.1 GB free; one loaded -> 32.6 GB free).
$want = if ($Lane -eq 'worker') { 'unsloth/qwen3-coder-30b-a3b-instruct' } else { 'unsloth/qwen3.8-27b' }
$loaded = @()
if ($SkipModelLoad) { $want = '(model load skipped)' } else {
try { $loaded = (& lms ps --json 2>$null | ConvertFrom-Json) | ForEach-Object { $_.identifier } } catch { }
if ($loaded -notcontains $want) {
    Say "loading $want for the $Lane lane (unloading others first)..."
    & lms unload --all *> $null
    & lms load $want --gpu max -y *> $null
    if ($LASTEXITCODE -ne 0) { Say "model load FAILED: $want"; exit 2 }
} elseif ($loaded.Count -gt 1) {
    Say 'unloading the idle model to free memory (one lane at a time)...'
    foreach ($m in $loaded) { if ($m -ne $want) { & lms unload $m *> $null } }
}
}
Say "lane=$Lane model=$want"

# ---------- brief -> AGENTS.md (the worker's instruction seam) ----------
$briefText = if (Test-Path $Brief -PathType Leaf) { Get-Content $Brief -Raw } else { $Brief }
if ($Frozen.Count) {
    $briefText += "`n`n## Frozen files (gate-enforced)`n`nThese files are the specification. Do NOT create, edit, or delete them; any modification fails the gate automatically:`n"
    foreach ($f in $Frozen) { $briefText += "- ``$f```n" }
}
$briefText += @"


## Definition of done

Run EXACTLY this command to check your work:

``````
$Verify
``````

Working rules (these decide whether you finish in time):
- This command is the ONLY check that counts. Do NOT write extra scripts,
  debug files, validation harnesses, or scratch test runners - they waste the
  clock and are deleted. Edit the source file, run the command, read the
  error, edit again.
- Change the smallest thing that fixes the reported error, then re-run.
- When the command passes, STOP immediately and say you are done.
- You have $CapMin minutes. If time is short, make the most failing test pass
  first rather than refactoring.
"@
Set-Content (Join-Path $repoFull 'AGENTS.md') $briefText

# ---------- external verifier (static, outside the repo; worker cannot reach it) ----------
$runId  = "$Name-" + (Get-Date -Format 'MMdd-HHmmss')
$evDir  = Join-Path $cond ("runs\" + $runId)
New-Item -ItemType Directory -Force -Path $evDir | Out-Null
$vScript = Join-Path $stack 'verify-generic.ps1'
$env:HALO_VERIFY_CMD = $Verify
$env:HALO_FROZEN     = ($Frozen -join ' ')
$env:HALO_REQUIRED   = ($Required -join ' ')
$env:HALO_COLLECT_CMD = if (-not $Required.Count) { '' }
                        elseif ($CollectCmd)     { $CollectCmd }
                        elseif ($Verify -match 'pytest') { "$Verify --collect-only -q" }
                        else { Say 'ERROR: -Required needs -CollectCmd for a non-pytest runner.'; exit 2 }

# ---------- run the gate ----------
Say "unit '$Name': up to $Rounds round(s), ${CapMin}m cap each. Evidence -> $evDir"
$t0 = Get-Date
$gate = if ($GateScript) { $GateScript } else { Join-Path $stack 'Gate-Build.ps1' }
& $gate -Workspace $repoFull -TestScript $vScript -Lane $Lane `
    -MaxRounds $Rounds -CapMin $CapMin `
    -Task 'Carry out the unit specified in AGENTS.md in this directory, exactly as written. Touch only the files that unit names.'
$gexit = $LASTEXITCODE
$mins = [Math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
$verdict = switch ($gexit) { 0 {'GREEN'} 2 {'RED-ENV'} 3 {'RED-TRIPWIRE'} default {'RED'} }

# ---------- evidence (authoritative copy lives here, outside the repo) ----------
foreach ($f in 'gate-log.txt','gate-verdict.txt','GATE-FEEDBACK.md','AGENTS.md') {
    $s = Join-Path $repoFull $f; if (Test-Path $s) { Copy-Item $s $evDir -Force }
}
$hashSet = @(Get-ChildItem $evDir -File)
$hashSet += @($Frozen | ForEach-Object { Join-Path $repoFull $_ } | Where-Object { Test-Path $_ } | Get-Item)
$hashSet | Get-FileHash -Algorithm SHA256 | ForEach-Object { "$($_.Hash)  $($_.Path)" } | Set-Content (Join-Path $evDir 'SHA256SUMS.txt')

if ($gexit -eq 0) {
    if ($Commit) {
        git -C $repoFull add -A *>$null
        git -C $repoFull commit -q -m "${Name}: authored by local model ($want) via Halo gate; verifier green" *>$null
        Say "GREEN in $mins min - committed."
    } else { Say "GREEN in $mins min - changes left uncommitted (pass -Commit to auto-commit)." }
} else {
    Say "$verdict after $mins min - preserving worker output, restoring repo."
    git -C $repoFull status --porcelain | ForEach-Object {
        $f = $_.Substring(3)
        if (Test-Path (Join-Path $repoFull $f) -PathType Leaf) {
            $d = Join-Path $evDir (Split-Path "worktree\$f" -Parent)
            New-Item -ItemType Directory -Force -Path $d -EA SilentlyContinue | Out-Null
            Copy-Item (Join-Path $repoFull $f) (Join-Path $evDir "worktree\$f") -Force -EA SilentlyContinue
        }
    }
    git -C $repoFull checkout -q -- . *>$null
    git -C $repoFull clean -qfd -e AGENTS.md -e gate-log.txt -e 'gate-round*' -e gate-verdict.txt -e GATE-FEEDBACK.md *>$null
}
Say "verdict=$verdict evidence=$evDir"
exit $gexit
