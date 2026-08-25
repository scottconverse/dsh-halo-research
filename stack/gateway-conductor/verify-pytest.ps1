<# External verifier: run the unit's pytest subset (env UNIT_TESTS, space-separated
   paths relative to the workspace). Fail closed: missing files or zero collected
   tests are failures. #>
param([Parameter(Mandatory)][string] $Workspace)
$ErrorActionPreference = 'Continue'
Set-Location $Workspace
if (-not $env:UNIT_TESTS) { Write-Host 'FAIL: UNIT_TESTS not set'; exit 1 }
$targets = $env:UNIT_TESTS -split ' '
$fail = 0
foreach ($t in $targets) { if (-not (Test-Path $t)) { Write-Host "MISSING TEST FILE: $t"; $fail++ } }
if ($fail -gt 0) { Write-Host 'RESULT: FAIL (required test files absent)'; exit 1 }
& uv run --frozen python -m pytest -q @targets 2>&1 | Write-Host
$code = $LASTEXITCODE
if ($code -eq 5) { Write-Host 'RESULT: FAIL (no tests collected - empty tests are not evidence)'; exit 1 }
Write-Host "RESULT: $(if ($code -eq 0) {'PASS'} else {"FAIL (pytest exit $code)"})"
exit $code
