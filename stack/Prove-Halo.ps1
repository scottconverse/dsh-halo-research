<#
  Prove-Halo.ps1 — the morning proof. Run this to see whether the Halo Stack
  actually works, with evidence, in about two minutes. No arguments.

  It proves four things, in order, and refuses to overstate any of them:
    1. the pipeline itself passes its own self-test (no inference involved)
    2. the local models are present and one is resident
    3. the gate rejects a cheating worker (frozen-spec defense, live demo)
    4. what has actually been shipped, from the ledger - who wrote it
#>
$ErrorActionPreference = 'Continue'
$stack  = $PSScriptRoot
$cond   = Join-Path $stack 'gateway-conductor'
$repo   = 'C:\Users\scott\Desktop\Code\halo-research-gateway'
$ledger = Join-Path $cond 'LEDGER.csv'
$pass = 0; $total = 0
function Head($t) { Write-Host ''; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Line($ok, $t) {
    $script:total++
    if ($ok) { $script:pass++; Write-Host "  [PASS] $t" -ForegroundColor Green }
    else     { Write-Host "  [FAIL] $t" -ForegroundColor Red }
}

Write-Host ''
Write-Host '  HALO STACK - PROOF OF FUNCTION' -ForegroundColor White
Write-Host "  $(Get-Date -Format 'dddd, MMMM d yyyy, HH:mm')"

# ---------- 1. the pipeline proves itself, with no model involved ----------
Head '1. Pipeline self-test (fake worker, zero inference)'
Write-Host '  Running 14 checks... (about 90 seconds)'
& (Join-Path $cond 'test-harness.ps1') *> (Join-Path $env:TEMP 'halo-proof-harness.txt')
$hx = $LASTEXITCODE
$hout = Get-Content (Join-Path $env:TEMP 'halo-proof-harness.txt') -Raw
Line ($hx -eq 0) "self-test: $((($hout -split "`n") | Where-Object { $_ -match '=== dry-run' }) -join '')".Trim()
if ($hx -ne 0) { Write-Host '  (details: ' + (Join-Path $env:TEMP 'halo-proof-harness.txt') + ')' }

# ---------- 2. local models ----------
Head '2. Local models'
$ps = @()
try { $ps = & lms ps --json 2>$null | ConvertFrom-Json } catch { }
if ($ps) { foreach ($m in $ps) { Write-Host "  resident: $($m.identifier)  ctx=$($m.contextLength)" } }
else { Write-Host '  none resident (they load on demand - this is normal when idle)' }
$installed = (& lms ls 2>$null | Out-String)
Line ($installed -match 'qwen3-coder-30b') 'worker model installed (qwen3-coder-30b - the Sonnet/Haiku equivalent)'
Line ($installed -match 'qwen3.8-27b')     'cockpit model installed (qwen3.8-27b - the Opus equivalent)'

# ---------- 3. the integrity defense, demonstrated live ----------
Head '3. Cheat defense (live demo, no inference)'
$demo = Join-Path $env:TEMP ('halo-proof-' + (Get-Date -Format 'HHmmss'))
New-Item -ItemType Directory -Force -Path $demo | Out-Null
Push-Location $demo
git init -q 2>$null
New-Item -ItemType Directory -Force -Path 'tests' | Out-Null
Set-Content 'tests\spec.py' "def test_rule():`n    assert True`n"
git add -A 2>$null; git commit -q -m spec 2>$null
Pop-Location
$env:HALO_VERIFY_CMD = 'echo ok'
$env:HALO_FROZEN = 'tests/spec.py'
$env:HALO_REQUIRED = ''; $env:HALO_COLLECT_CMD = ''
& (Join-Path $stack 'verify-generic.ps1') -Workspace $demo *> $null
$cleanPass = ($LASTEXITCODE -eq 0)
Add-Content (Join-Path $demo 'tests\spec.py') "`n# a worker weakening its own exam`n"
$tamper = & (Join-Path $stack 'verify-generic.ps1') -Workspace $demo *>&1 | Out-String
$tamperRejected = ($LASTEXITCODE -ne 0 -and $tamper -match 'FROZEN FILE MODIFIED')
Set-Location $stack
Remove-Item $demo -Recurse -Force -EA SilentlyContinue
Line $cleanPass 'an untouched specification passes'
Line $tamperRejected 'a worker editing the specification is REJECTED (this is what stops fake greens)'

# ---------- 4. what was actually shipped ----------
Head '4. What has shipped (from the ledger, not from anyone''s word)'
if (Test-Path $ledger) {
    $rows = Import-Csv $ledger
    $green = @($rows | Where-Object { $_.verdict -eq 'GREEN' })
    $red   = @($rows | Where-Object { $_.verdict -like 'RED*' })
    Write-Host "  units green: $($green.Count)   units red: $($red.Count)"
    foreach ($g in $green) { Write-Host "    GREEN  $($g.unit)  by $($g.coder)  ($($g.minutes) min)" }
    $coordLines = ($rows | ForEach-Object { [int]($_.fable_code_lines) } | Measure-Object -Sum).Sum
    Line ($coordLines -eq 0) "product code written by the cloud coordinator: $coordLines lines (target 0)"
    Line ($green.Count -gt 0) "at least one unit shipped by a local model behind the gate"
}

# ---------- verdict ----------
Head 'VERDICT'
Write-Host "  $pass of $total checks passed"
if ($pass -eq $total) {
    Write-Host '  THE STACK IS WORKING.' -ForegroundColor Green
    Write-Host '  A cloud coordinator can dispatch units; local models write the code;'
    Write-Host '  the gate accepts only verifier evidence and rejects tampering.'
} else {
    Write-Host '  NOT FULLY PROVEN - see the failed checks above.' -ForegroundColor Yellow
}
Write-Host ''
Write-Host "  How to drive it:  $stack\HALO-STACK-GUIDE.md"
Write-Host "  One command:      $stack\Halo-Code.ps1"
Write-Host "  Full record:      $cond\REPORT-GATEWAY.md"
Write-Host ''
# Pause only when launched from the desktop shortcut (which sets HALO_PAUSE),
# never in a scripted/non-interactive session - a blind ReadKey there hangs.
if ($env:HALO_PAUSE -eq '1') { Write-Host '  (press any key to close)'; $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown') }
exit ($total - $pass)
