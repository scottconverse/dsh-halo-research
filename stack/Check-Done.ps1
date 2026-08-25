<#
  Check-Done.ps1 — the records rule, mechanically: NO GATE-LOG, NO DONE.

  Exit 0 only when the workspace's gate-log ends in a PASS verdict written by
  Gate-Build.ps1. A workspace without a gate-log — however finished it looks,
  whatever any model or person claims — is NOT a completed build.

  Usage: .\Check-Done.ps1 -Workspace <dir>
#>
[CmdletBinding()]
param([Parameter(Mandatory)][string] $Workspace)

$log = Join-Path $Workspace 'gate-log.txt'
if (-not (Test-Path $Workspace)) { Write-Host "NOT DONE: workspace not found: $Workspace"; exit 1 }
if (-not (Test-Path $log)) {
    Write-Host "NOT DONE: no gate-log.txt in $Workspace - ungated work is never complete (stack records rule / spec s21.15)."
    exit 1
}
$verdicts = Select-String -Path $log -Pattern 'verdict PASS|verdict FAIL|gate END: FAIL'
if (-not $verdicts) { Write-Host "NOT DONE: gate-log.txt contains no verdict line."; exit 1 }
$last = $verdicts[$verdicts.Count - 1].Line
if ($last -match 'verdict PASS') {
    Write-Host "DONE by test evidence: $last"
    exit 0
}
Write-Host "NOT DONE: $last"
exit 1
