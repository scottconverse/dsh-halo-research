<# fake-gate.ps1 — no-LLM stand-in for Gate-Build.ps1 with the same call surface.
   Reads FAKEMODE from the workspace AGENTS.md:
     FAKEMODE: green  -> creates the unit's test file(s) with a passing test
     FAKEMODE: red    -> creates junk product work, never the test files
   Then runs the real external verifier and exits with its code, so the entire
   runner pipeline (env plumbing, verdicts, ledger, commit/revert/forensics)
   is exercised in seconds with zero inference. #>
param(
    [Parameter(Mandatory)][string] $Workspace,
    [Parameter(Mandatory)][string] $TestScript,
    [string] $Lane = 'worker',
    [int] $MaxRounds = 1,
    [int] $CapMin = 1,
    [string] $Task = ''
)
$ErrorActionPreference = 'Stop'
$agents = Join-Path $Workspace 'AGENTS.md'
$mode = if ((Test-Path $agents) -and ((Get-Content $agents -Raw) -match 'FAKEMODE:\s*(green|red|frozen)')) { $Matches[1] } else { 'red' }
Add-Content (Join-Path $Workspace 'gate-log.txt') "[$(Get-Date -Format 'HH:mm:ss')] round 1 : agent launched (pid 0, cap ${CapMin}m, FAKE lane=$Lane mode=$mode)"

if ($mode -eq 'frozen') {
    # Simulate a worker tampering with the frozen specification files.
    foreach ($f in ($env:HALO_FROZEN -split ' ' | Where-Object { $_ })) {
        Add-Content (Join-Path $Workspace $f) "`n# worker tampering`n"
    }
} elseif ($mode -eq 'green') {
    foreach ($t in ($env:UNIT_TESTS -split ' ' | Where-Object { $_ })) {
        $p = Join-Path $Workspace $t
        New-Item -ItemType Directory -Force -Path (Split-Path $p -Parent) | Out-Null
        Set-Content $p "def test_dry():`n    assert True`n"
    }
} else {
    $junk = Join-Path $Workspace 'src\junk-from-red-round.txt'
    New-Item -ItemType Directory -Force -Path (Split-Path $junk -Parent) | Out-Null
    Set-Content $junk 'red-round work product that forensics must preserve'
}
& $TestScript -Workspace $Workspace
Add-Content (Join-Path $Workspace 'gate-log.txt') "[$(Get-Date -Format 'HH:mm:ss')] round 1 : verdict $(if ($LASTEXITCODE -eq 0) {'PASS'} else {'FAIL'}) (FAKE)"
exit $LASTEXITCODE

