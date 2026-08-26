<# night-run-2.ps1 — final surgical pass. Each unit is restored from its own
   preserved worker output (so it resumes from 6/8, 8/11, 9/11 rather than
   from scratch) and re-dispatched with a brief naming only the remaining
   defects. Ordered most-complete-first so the best odds land earliest. #>
$ErrorActionPreference = 'Continue'
$stack  = 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack'
$halo   = Join-Path $stack 'Halo-Code.ps1'
$briefs = Join-Path $stack 'gateway-conductor\briefs'
$runs   = Join-Path $stack 'gateway-conductor\runs'
$repo   = 'C:\Users\scott\Desktop\Code\halo-research-gateway'
$ledger = Join-Path $stack 'gateway-conductor\LEDGER.csv'
$rep    = Join-Path $stack 'gateway-conductor\REPORT-GATEWAY.md'
function Rep($m){ $l="[$(Get-Date -Format 'MM-dd HH:mm:ss')] $m"; Write-Host $l; Add-Content $rep $l }

$units = @(
  @{ n='B3-security';  prev='B3-security';  brief='B3-security-final.md'; verify='uv run --frozen python -m pytest -q tests/unit/test_security.py'; frozen='tests/unit/test_security.py'; file='src/halo_research_gateway/security.py'; cap=15 },
  @{ n='B8-envelope';  prev='B8-envelope';  brief='B8-envelope-final.md'; verify='uv run --frozen python -m pytest -q tests/unit/test_envelope.py'; frozen='tests/unit/test_envelope.py'; file='src/halo_research_gateway/envelope.py'; cap=15 },
  @{ n='B2b-cache';    prev='B2b-cache';    brief='B2b-cache-final.md';   verify='uv run --frozen python -m pytest -q tests/unit/test_cache.py';    frozen='tests/unit/test_cache.py';    file='src/halo_research_gateway/cache.py';    cap=15 }
)

foreach ($u in $units) {
    # restore this unit's own best preserved implementation as the starting point
    $ev = Get-ChildItem $runs -Directory -Filter "$($u.prev)-*" -EA SilentlyContinue | Sort-Object Name | Select-Object -Last 1
    $src = if ($ev) { Join-Path $ev.FullName ("worktree\" + ($u.file -replace '/','\')) } else { $null }
    if ($src -and (Test-Path $src)) {
        Copy-Item $src (Join-Path $repo ($u.file -replace '/','\')) -Force
        Rep "night-run-2: restored $($u.file) from $($ev.Name) as the seed"
    } else {
        Rep "night-run-2: no preserved seed for $($u.n) - starting from repo HEAD"
    }

    $t0 = Get-Date
    & $halo -Repo $repo -Brief (Join-Path $briefs $u.brief) -Verify $u.verify `
            -Frozen $u.frozen -Name $u.n -CapMin $u.cap -Rounds 2 -Commit -SkipSelfTest
    $code = $LASTEXITCODE
    $mins = [Math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
    $verdict = switch ($code) { 0 {'GREEN'} 2 {'RED-ENV'} 3 {'RED-TRIPWIRE'} default {'RED'} }
    Add-Content $ledger "NIGHT2,$($u.n),worker-coder30b,$verdict,,$mins,fable-brief,0,gate-authored-frozen,via-Halo-Code"
    Rep "night-run-2 unit $($u.n): $verdict in $mins min"
    if ($code -eq 2) { Rep 'ENV_FAILURE - stopping'; break }
}
Rep 'night-run-2 complete'
