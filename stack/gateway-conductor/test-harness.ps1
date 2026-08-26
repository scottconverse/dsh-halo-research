<# test-harness.ps1 — fake-worker dry-run of the entire conductor pipeline.
   Zero inference. Builds a throwaway uv+git repo, then proves:
     T1-T4  verifier features (missing file / anti-shrinkage / frozen tests / clean pass)
     T5-T9  runner pipeline via fake-gate (green->commit+ledger, red->forensics+revert+ledger, exit code)
   Exit code = number of failed assertions. Run this before ANY real batch. #>
param([string] $Scratch = (Join-Path $env:TEMP ('conductor-dry-' + (Get-Date -Format 'HHmmss'))))
$ErrorActionPreference = 'Stop'
$cond = $PSScriptRoot
$verify = Join-Path $cond 'verify-pytest.ps1'
$fails = 0
function Check([string]$name, [bool]$ok) {
    if ($ok) { Write-Host "PASS  $name" } else { Write-Host "FAIL  $name"; $script:fails++ }
}

# --- throwaway repo -------------------------------------------------------
$repo = Join-Path $Scratch 'dryrepo'
New-Item -ItemType Directory -Force -Path $repo | Out-Null
Push-Location $repo
uv init --name dryrepo --python 3.12 2>&1 | Out-Null
uv add pytest 2>&1 | Out-Null
New-Item -ItemType Directory -Force -Path 'tests\unit' | Out-Null
Set-Content 'tests\unit\test_frozen.py' "def test_frozen_marker():`n    assert True`n"
git init -q; git add -A; git commit -q -m 'base'
Pop-Location

# --- T1-T4: verifier features --------------------------------------------
$env:UNIT_TESTS = 'tests/unit/test_absent.py'; $env:UNIT_REQUIRED = ''; $env:UNIT_FROZEN = ''
& $verify -Workspace $repo *> $null
Check 'T1 verifier fails on missing test file' ($LASTEXITCODE -ne 0)

$env:UNIT_TESTS = 'tests/unit/test_frozen.py'; $env:UNIT_REQUIRED = 'test_frozen_marker test_not_written_yet'
$out = & $verify -Workspace $repo *>&1 | Out-String
Check 'T2 anti-shrinkage: missing required test fails closed' ($LASTEXITCODE -ne 0 -and $out -match 'MISSING REQUIRED TEST: test_not_written_yet' -and $out -notmatch 'MISSING REQUIRED TEST: test_frozen_marker')

$env:UNIT_REQUIRED = ''; $env:UNIT_FROZEN = 'tests/unit/test_frozen.py'
Add-Content (Join-Path $repo 'tests\unit\test_frozen.py') "# worker tampering`n"
$out = & $verify -Workspace $repo *>&1 | Out-String
Check 'T3 frozen tests: modification fails closed' ($LASTEXITCODE -ne 0 -and $out -match 'FROZEN TEST MODIFIED')
Push-Location $repo; git checkout -q -- tests/unit/test_frozen.py; Pop-Location

$out = & $verify -Workspace $repo *>&1 | Out-String
Check 'T4 clean tree + collected tests pass open' ($LASTEXITCODE -eq 0 -and $out -match 'RESULT: PASS')

# --- T5-T9: runner pipeline with fake gate -------------------------------
$env:UNIT_TESTS = ''; $env:UNIT_REQUIRED = ''; $env:UNIT_FROZEN = ''
$ledger = Join-Path $Scratch 'ledger.csv'; $report = Join-Path $Scratch 'report.md'
Set-Content $ledger 'batch,unit,coder,verdict,rounds,minutes,brief_by,fable_code_lines,tests_by'
$before = git -C $repo rev-list --count HEAD
& (Join-Path $cond 'run-batch.ps1') -Repo $repo -Batch DRY -GateScript (Join-Path $cond 'fake-gate.ps1') -Ledger $ledger -Report $report *> $null
$runnerExit = $LASTEXITCODE
$after = git -C $repo rev-list --count HEAD
$rows = Get-Content $ledger

Check 'T5 green unit committed exactly one new commit' (([int]$after) -eq ([int]$before) + 1)
Check 'T6 ledger: DRY-green GREEN row written' (($rows -match '^DRY,DRY-green,.*,GREEN,').Count -eq 1)
Check 'T7 ledger: DRY-red RED row written' (($rows -match '^DRY,DRY-red,.*,RED,').Count -eq 1)
$redDir = Get-ChildItem (Join-Path $cond 'reds') -Directory -Filter 'DRY-red-*' -EA SilentlyContinue | Sort-Object Name | Select-Object -Last 1
Check 'T8 red forensics preserved, repo reverted clean' ($null -ne $redDir -and (Test-Path (Join-Path $redDir.FullName 'src\junk-from-red-round.txt')) -and -not (Test-Path (Join-Path $repo 'src\junk-from-red-round.txt')))
Check 'T9 runner exit code = red count (1)' ($runnerExit -eq 1)
$evDirs = Get-ChildItem (Join-Path $cond 'runs') -Directory -Filter 'DRY-*' -EA SilentlyContinue
$sums = $evDirs | ForEach-Object { Join-Path $_.FullName 'SHA256SUMS.txt' } | Where-Object { (Test-Path $_) -and (Get-Item $_).Length -gt 0 }
Check 'T10 evidence archived outside workspace with hashes (both units)' ($evDirs.Count -eq 2 -and $sums.Count -eq 2)

# --- cleanup --------------------------------------------------------------
Set-Location $cond   # verifier leaks Set-Location into the process; step out before deleting
if ($redDir) { Remove-Item $redDir.FullName -Recurse -Force -Confirm:$false }
$evDirs | ForEach-Object { Remove-Item $_.FullName -Recurse -Force -Confirm:$false -EA SilentlyContinue }
Remove-Item $Scratch -Recurse -Force -Confirm:$false -EA SilentlyContinue
Write-Host "=== dry-run: $((10 - $fails))/10 pass ==="
exit $fails

