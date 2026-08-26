<# night-run.ps1 — dispatch the remaining units through the PUBLIC entry point
   (Halo-Code.ps1), exactly as any frontier coordinator would. Sequential,
   one lane, micro-units, surgical briefs. This doubles as the end-to-end
   proof that the documented interface works. #>
$ErrorActionPreference = 'Continue'
$stack = 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack'
$halo  = Join-Path $stack 'Halo-Code.ps1'
$briefs = Join-Path $stack 'gateway-conductor\briefs'
$repo  = 'C:\Users\scott\Desktop\Code\halo-research-gateway'
$ledger = Join-Path $stack 'gateway-conductor\LEDGER.csv'
$rep    = Join-Path $stack 'gateway-conductor\REPORT-GATEWAY.md'
function Rep($m){ $l="[$(Get-Date -Format 'MM-dd HH:mm:ss')] $m"; Write-Host $l; Add-Content $rep $l }

# Restore the best preserved B2 implementation (8/12 tests passing) as the
# starting point for the two surgical split units.
$src = Join-Path $stack 'gateway-conductor\reds\B2-v6-021515\src\halo_research_gateway'
Copy-Item "$src\cache.py","$src\cache_errors.py" (Join-Path $repo 'src\halo_research_gateway\') -Force
Copy-Item "$src\migrations\__init__.py" (Join-Path $repo 'src\halo_research_gateway\migrations\__init__.py') -Force
Rep 'night-run: restored B2-v6 forensic implementation (8/12) as the seed for B2a/B2b'

$units = @(
  @{ n='B2a-migrations'; brief='B2a-migrations-fix.md'; verify='uv run --frozen python -m pytest -q tests/unit/test_migrations.py'; frozen='tests/unit/test_migrations.py'; cap=12; rounds=2 },
  @{ n='B2b-cache';      brief='B2b-cache-fix.md';      verify='uv run --frozen python -m pytest -q tests/unit/test_cache.py';      frozen='tests/unit/test_cache.py';      cap=12; rounds=2 },
  @{ n='B8-envelope';    brief='B8-envelope.md';        verify='uv run --frozen python -m pytest -q tests/unit/test_envelope.py';   frozen='tests/unit/test_envelope.py';   cap=15; rounds=2 },
  @{ n='B3-security';    brief='B3-security-fix.md';    verify='uv run --frozen python -m pytest -q tests/unit/test_security.py';  frozen='tests/unit/test_security.py';   cap=15; rounds=2 }
)

$first = $true
foreach ($u in $units) {
    $args = @{
        Repo = $repo; Brief = (Join-Path $briefs $u.brief); Verify = $u.verify
        Frozen = $u.frozen; Name = $u.n; CapMin = $u.cap; Rounds = $u.rounds
        Commit = $true
    }
    if (-not $first) { $args['SkipSelfTest'] = $true }   # self-test once per session
    $t0 = Get-Date
    & $halo @args
    $code = $LASTEXITCODE
    $mins = [Math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
    $verdict = switch ($code) { 0 {'GREEN'} 2 {'RED-ENV'} 3 {'RED-TRIPWIRE'} default {'RED'} }
    Add-Content $ledger "NIGHT,$($u.n),worker-coder30b,$verdict,,$mins,fable-brief,0,gate-authored-frozen,via-Halo-Code"
    Rep "night-run unit $($u.n): $verdict in $mins min"
    $first = $false
    if ($code -eq 2) { Rep 'ENV_FAILURE - stopping the night run; the stack needs repair, not more rounds'; break }
}
Rep 'night-run complete'
