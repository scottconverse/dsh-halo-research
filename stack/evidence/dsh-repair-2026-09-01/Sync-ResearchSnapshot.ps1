# Task-scoped recovery synchronization. No live-service or model operations.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
if ($repo -ne 'C:\Users\scott\Desktop\Code\dsh-halo-research') { throw 'Unexpected repository root' }
$research = 'C:\Users\scott\Desktop\Halo Stack Research'
$recovery = Join-Path $research 'Current Halo Configuration'
$live = 'C:\Users\scott\.dsh'

function Copy-Verified([string]$Source, [string]$Destination) {
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw "Missing source: $Source" }
    New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
    if ((Get-FileHash -LiteralPath $Source).Hash -ne (Get-FileHash -LiteralPath $Destination).Hash) {
        throw "Copy hash mismatch: $Destination"
    }
}

foreach ($name in @('HALO-CURRENT-CONFIGURATION.md','HALO-STACK-GUIDE.md','HALO-DSH-IMPLEMENTATION-2026-09-01.md')) {
    Copy-Verified (Join-Path $repo "stack\$name") (Join-Path $research $name)
    Copy-Verified (Join-Path $repo "stack\$name") (Join-Path $recovery $name)
}
Copy-Verified (Join-Path $repo 'stack\Install-HaloPickerOverride.ps1') (Join-Path $recovery 'operations\Install-HaloPickerOverride.ps1')
Copy-Verified (Join-Path $repo 'stack\packages\deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz') (Join-Path $recovery 'dsh\packages\deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz')
foreach ($name in @('package.json','pnpm-lock.yaml','pnpm-workspace.yaml')) {
    Copy-Verified (Join-Path $live "profiles\web\$name") (Join-Path $recovery "dsh\profile-web\$name")
}
foreach ($name in @('mission-control.mjs','Install-HaloMissionControl.ps1','Launch-Status.ps1','Snapshot-HaloMemory.ps1','Install-HaloMemorySnapshotTask.ps1','Test-HaloMissionControlLive.ps1','INSTALLATION.md')) {
    Copy-Verified (Join-Path $repo "stack\mission-control\$name") (Join-Path $recovery "mission-control\$name")
}
# Canonical snapshot replacement is pending; retain the actual old live script.
Copy-Verified (Join-Path $live 'mission-control\Snapshot-HaloMemory.ps1') (Join-Path $recovery 'mission-control\previous-live\Snapshot-HaloMemory.ps1')
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $repo 'stack\mission-control\test') -File -Filter '*.test.mjs') {
    if ($file.Name -eq 'picker-package-contract.test.mjs') { continue }
    Copy-Verified $file.FullName (Join-Path $recovery "mission-control\test\$($file.Name)")
}
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -File) {
    Copy-Verified $file.FullName (Join-Path $recovery "evidence\dsh-repair-2026-09-01\$($file.Name)")
}

$manifestPath = Join-Path $recovery 'MANIFEST-SHA256.txt'
$lines = @('# Halo recovery snapshot SHA-256 manifest', ('# Generated: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')))
$files = @(Get-ChildItem -LiteralPath $recovery -Recurse -File | Where-Object { $_.FullName -ne $manifestPath } | Sort-Object FullName)
foreach ($file in $files) {
    $relative = [IO.Path]::GetRelativePath($recovery, $file.FullName)
    $lines += ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() + '  ' + $relative)
}
$lines | Set-Content -LiteralPath $manifestPath -Encoding utf8
$verified = 0
foreach ($line in Get-Content -LiteralPath $manifestPath) {
    if ($line.StartsWith('#')) { continue }
    if ($line -notmatch '^([0-9a-f]{64})  (.+)$') { throw 'Malformed manifest line' }
    $expected = $Matches[1]
    $target = [IO.Path]::GetFullPath((Join-Path $recovery $Matches[2]))
    if (-not $target.StartsWith($recovery + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Manifest target outside snapshot' }
    if ((Get-FileHash -LiteralPath $target).Hash -ne $expected) { throw "Manifest mismatch: $target" }
    $verified++
}
if ($verified -ne $files.Count) { throw 'Manifest coverage mismatch' }
[pscustomobject]@{Files=$files.Count;Verified=$verified;MissingOrMismatched=0;Manifest=$manifestPath;ManifestSha256=(Get-FileHash -LiteralPath $manifestPath).Hash}
