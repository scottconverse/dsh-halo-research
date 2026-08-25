<# External verifier: unit A (scaffold). Fail closed. #>
param([Parameter(Mandatory)][string] $Workspace)
$ErrorActionPreference = 'Continue'
Set-Location $Workspace
$fail = 0
foreach ($p in @('pyproject.toml','uv.lock','.python-version','src\halo_research_gateway\__init__.py','src\halo_research_gateway\__main__.py','tests\unit','config\config.example.toml','BUILD-MANIFEST.json')) {
    if (-not (Test-Path $p)) { Write-Host "MISSING: $p"; $fail++ } else { Write-Host "OK: $p" }
}
$pv = (Get-Content '.python-version' -Raw -EA SilentlyContinue).Trim()
if ($pv -ne '3.12') { Write-Host "BAD .python-version: '$pv' (want 3.12)"; $fail++ }
& uv run --frozen python -c "import halo_research_gateway; print('import ok')" 2>&1 | Write-Host
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL: package does not import under uv --frozen'; $fail++ }
& uv run --frozen python -m pytest -q tests 2>&1 | Write-Host
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: pytest exit $LASTEXITCODE (5 = no tests collected; a scaffold must ship at least one real test)"; $fail++ }
Write-Host "RESULT: $(if ($fail -eq 0) {'PASS'} else {"FAIL ($fail)"})"
exit $(if ($fail -eq 0) { 0 } else { 1 })
