<# run-batch.ps1 — conductor queue: sequential gated units against the gateway repo.
   Worker lane only (coder-30b, Code Mode). Commits on green. Continues past
   independent reds; stops on foundational reds. One notification at the end. #>
[CmdletBinding()]
param(
    [string] $Repo = 'C:\Users\scott\Desktop\Code\halo-research-gateway',
    [string] $Batch = 'A'
)
$ErrorActionPreference = 'Stop'
$cond = $PSScriptRoot
$gate = 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Gate-Build.ps1'
$ledger = Join-Path $cond 'LEDGER.csv'
$report = Join-Path $cond 'REPORT-GATEWAY.md'
function Rep($m){ $l="[$(Get-Date -Format 'MM-dd HH:mm:ss')] $m"; Write-Host $l; Add-Content $report $l }

$batches = @{
  'A' = @(
    @{ n='A-scaffold';        brief='A-scaffold.md';        verifier='verify-scaffold.ps1'; tests='';                                                        cap=20; rounds=3; stop=$true  },
    @{ n='B1-config-logging'; brief='B1-config-logging.md'; verifier='verify-pytest.ps1';   tests='tests/unit/test_config.py tests/unit/test_redaction.py'; cap=25; rounds=3; stop=$true  },
    @{ n='B2-cache';          brief='B2-cache-migrations.md';verifier='verify-pytest.ps1';  tests='tests/unit/test_cache.py tests/unit/test_migrations.py'; cap=30; rounds=3; stop=$false },
    @{ n='B5-reddit-parser';  brief='B5-reddit-parser.md';  verifier='verify-pytest.ps1';   tests='tests/unit/test_reddit.py';                              cap=25; rounds=3; stop=$false }
  )
  'A4' = @(
    @{ n='B2-v3';            brief='B2-cache-migrations-v3.md';  verifier='verify-pytest.ps1'; tests='tests/unit/test_cache.py tests/unit/test_migrations.py'; cap=30; rounds=2; stop=$false },
    @{ n='B3-v2';            brief='B3-security-v2.md';          verifier='verify-pytest.ps1'; tests='tests/unit/test_security.py';                            cap=30; rounds=2; stop=$false },
    @{ n='B5-cockpit';       brief='B5-reddit-parser-v2.md';     verifier='verify-pytest.ps1'; tests='tests/unit/test_reddit.py';                              cap=35; rounds=2; stop=$false; lane='cockpit' }
  )
  'A3' = @(
    @{ n='B2-retry';         brief='B2-cache-migrations-v2.md'; verifier='verify-pytest.ps1'; tests='tests/unit/test_cache.py tests/unit/test_migrations.py'; cap=30; rounds=3; stop=$false },
    @{ n='B5-retry';         brief='B5-reddit-parser-v2.md';    verifier='verify-pytest.ps1'; tests='tests/unit/test_reddit.py';                              cap=25; rounds=3; stop=$false },
    @{ n='B3-security';      brief='B3-security.md';            verifier='verify-pytest.ps1'; tests='tests/unit/test_security.py';                            cap=30; rounds=3; stop=$false }
  )
  'A2' = @(
    @{ n='B1-retry';          brief='B1-config-logging-v2.md'; verifier='verify-pytest.ps1'; tests='tests/unit/test_config.py tests/unit/test_redaction.py'; cap=25; rounds=3; stop=$false },
    @{ n='B2-cache';          brief='B2-cache-migrations.md';  verifier='verify-pytest.ps1'; tests='tests/unit/test_cache.py tests/unit/test_migrations.py'; cap=30; rounds=3; stop=$false },
    @{ n='B5-reddit-parser';  brief='B5-reddit-parser.md';     verifier='verify-pytest.ps1'; tests='tests/unit/test_reddit.py';                              cap=25; rounds=3; stop=$false }
  )
}
$units = $batches[$Batch]
if (-not $units) { throw "unknown batch $Batch" }

Rep "=== batch $Batch start: $($units.Count) units, repo=$Repo ==="
$green = 0; $red = 0
foreach ($u in $units) {
    $briefSrc = Join-Path $cond ("briefs\" + $u.brief)
    Copy-Item $briefSrc (Join-Path $Repo 'AGENTS.md') -Force
    $env:UNIT_TESTS = $u.tests
    $lane = if ($u.lane) { $u.lane } else { 'worker' }
    $t0 = Get-Date
    & $gate -Workspace $Repo -TestScript (Join-Path $cond $u.verifier) -Lane $lane `
        -MaxRounds $u.rounds -CapMin $u.cap `
        -Task 'Carry out the unit specified in AGENTS.md in this directory, exactly as written. Touch only the files that unit names.'
    $ok = ($LASTEXITCODE -eq 0)
    $mins = [Math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
    $rounds = (Select-String -Path (Join-Path $Repo 'gate-log.txt') -Pattern 'round \d+ : agent launched' -EA SilentlyContinue).Count
    Add-Content $ledger "$Batch,$($u.n),worker-coder30b,$(if($ok){'GREEN'}else{'RED'}),$rounds,$mins,fable-brief,0"
    if ($ok) {
        $green++
        Push-Location $Repo
        git add -A 2>&1 | Out-Null
        git commit -q -m "unit $($u.n): authored by DSH worker lane (coder-30b, Code Mode) via external gate; verifier green in $rounds round(s)" 2>&1 | Out-Null
        Pop-Location
        Rep "unit $($u.n): GREEN in $rounds round(s), $mins min - committed"
    } else {
        $red++
        Rep "unit $($u.n): RED after $rounds round(s), $mins min - preserving work for forensics, then reverting repo"
        $redDir = Join-Path $cond ("reds\" + $u.n + '-' + (Get-Date -Format 'HHmmss'))
        New-Item -ItemType Directory -Force -Path $redDir | Out-Null
        Push-Location $Repo
        git status --porcelain | ForEach-Object { $f = $_.Substring(3); if (Test-Path $f -PathType Leaf) { $d = Join-Path $redDir (Split-Path $f -Parent); New-Item -ItemType Directory -Force -Path $d -EA SilentlyContinue | Out-Null; Copy-Item $f (Join-Path $redDir $f) -Force -EA SilentlyContinue } }
        git checkout -q -- . 2>&1 | Out-Null; git clean -qfd -e AGENTS.md -e gate-log.txt -e 'gate-round*' -e gate-verdict.txt -e GATE-FEEDBACK.md 2>&1 | Out-Null
        Pop-Location
        if ($u.stop) { Rep "unit $($u.n) is foundational - stopping batch"; break }
    }
}
Rep "=== batch $Batch end: $green green, $red red ==="
exit $red
