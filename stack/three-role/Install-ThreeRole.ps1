param(
    [Parameter(Mandatory)][string]$DshHome,
    [Parameter(Mandatory)][string]$Profile,
    [switch]$Apply,
    [switch]$IdleConfirmed
)
$ErrorActionPreference = 'Stop'
$homePath = (Resolve-Path -LiteralPath $DshHome).Path
$profilePath = Join-Path $homePath "profiles\$Profile\cordis.patch.yml"
if (!(Test-Path -LiteralPath $profilePath -PathType Leaf)) { throw "Profile not found: $profilePath" }
$entry = [Uri]::new((Join-Path $PSScriptRoot 'index.mjs')).AbsoluteUri
$statePath = (Join-Path $homePath 'storages\three-role\projects.json').Replace('\', '/')
$existing = [IO.File]::ReadAllText($profilePath)
if ($existing -match '(?m)^\s*-?\s*id:\s*halo-three-role\s*$') {
    Write-Output "Already configured; inspect the existing row rather than replacing it: $profilePath"
    return
}
$addition = @"

# Bounded Coder / Coordinator / Auditor. Does not change model or preset defaults.
- insert:
    - id: halo-three-role
      name: $entry
      config:
        stateFile: $statePath
"@
if (!$Apply) { Write-Output "Preview for $profilePath"; Write-Output $addition; return }
if (!$IdleConfirmed) { throw 'Confirm this DSH host and its jobs are idle before using -Apply -IdleConfirmed. This installer never restarts a host.' }
if (Test-Path -LiteralPath $statePath) {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if (@($state.projects.PSObject.Properties.Value | Where-Object status -eq 'running').Count) {
        throw 'This home has a running three-role project; pause it and verify quiescence first.'
    }
}
$backupDir = Join-Path $homePath 'backups\three-role'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backup = Join-Path $backupDir "$Profile-$(Get-Date -Format yyyyMMdd-HHmmss-ffff).yml"
Copy-Item -LiteralPath $profilePath -Destination $backup
$bytes = [IO.File]::ReadAllBytes($profilePath)
if ($bytes.Length -ge 2 -and (($bytes[0] -eq 255 -and $bytes[1] -eq 254) -or ($bytes[0] -eq 254 -and $bytes[1] -eq 255))) {
    throw 'This installer supports UTF-8 DSH profiles only; no profile change was made.'
}
[IO.File]::AppendAllText($profilePath, "`r`n" + $addition + "`r`n", [Text.UTF8Encoding]::new($false))
Write-Output "Configured $profilePath. Backup: $backup. Load at the next idle host restart. Other settings retained."
