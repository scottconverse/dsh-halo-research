<#
  verify-generic.ps1 — the Halo Stack's language-agnostic external verifier.

  Lives OUTSIDE any workspace (the worker must never be able to rewrite its own
  examiner). Driven by environment variables set by Halo-Code.ps1:

    HALO_VERIFY_CMD   (required) shell command; exit 0 = pass. e.g. "npm test"
    HALO_FROZEN       (optional) space-separated repo-relative paths the worker
                                 may not modify (the specification files)
    HALO_REQUIRED     (optional) space-separated test names that must appear in
                                 HALO_COLLECT_CMD output (anti-shrinkage)
    HALO_COLLECT_CMD  (optional) command that lists tests; required only when
                                 HALO_REQUIRED is set

  Contract: prints a 'RESULT:' line on EVERY exit path. A verdict with no
  RESULT line is classified by the gate as ENV_FAILURE (spec v2.9 rule 10).
#>
param([Parameter(Mandatory)][string] $Workspace)
$ErrorActionPreference = 'Continue'
Set-Location $Workspace

if (-not $env:HALO_VERIFY_CMD) { Write-Host 'RESULT: FAIL (HALO_VERIFY_CMD not set)'; exit 1 }
$fail = 0

# 1. Frozen specification files must be untouched.
if ($env:HALO_FROZEN) {
    foreach ($f in ($env:HALO_FROZEN -split ' ' | Where-Object { $_ })) {
        if (-not (Test-Path $f)) { Write-Host "MISSING FROZEN FILE: $f"; $fail++; continue }
        if (git status --porcelain -- $f 2>$null) { Write-Host "FROZEN FILE MODIFIED: $f"; $fail++ }
    }
    if ($fail) { Write-Host 'RESULT: FAIL (frozen specification files were modified or removed)'; exit 1 }
}

# 2. Anti-shrinkage: every named test must still be collected.
if ($env:HALO_REQUIRED) {
    if (-not $env:HALO_COLLECT_CMD) { Write-Host 'RESULT: FAIL (HALO_REQUIRED set without HALO_COLLECT_CMD)'; exit 1 }
    $collected = (& cmd /c $env:HALO_COLLECT_CMD 2>&1 | Out-String)
    foreach ($r in ($env:HALO_REQUIRED -split ' ' | Where-Object { $_ })) {
        if ($collected -notmatch [regex]::Escape($r)) { Write-Host "MISSING REQUIRED TEST: $r"; $fail++ }
    }
    if ($fail) { Write-Host 'RESULT: FAIL (required tests absent - the test list may not be shrunk)'; exit 1 }
}

# 3. The acceptance command is the only authority on completion.
$out = & cmd /c $env:HALO_VERIFY_CMD 2>&1 | Out-String
$code = $LASTEXITCODE
Write-Host $out
if ($code -eq 5) { Write-Host 'RESULT: FAIL (no tests collected - an empty suite is not evidence)'; exit 1 }
if ($code -eq 0) { Write-Host 'RESULT: PASS'; exit 0 }
Write-Host "RESULT: FAIL (acceptance command exit $code)"
exit $code
