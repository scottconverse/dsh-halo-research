[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$stack = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$research = 'C:\Users\scott\Desktop\Halo Stack Research'
$recovery = Join-Path $research 'Current Halo Configuration'
$changed = [Collections.Generic.List[string]]::new()
function Copy-Verified($source, $destination) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
    if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $destination).Hash) {
        throw "Copy mismatch: $destination"
    }
}
foreach ($name in @('HALO-CURRENT-CONFIGURATION.md','HALO-STACK-GUIDE.md','HALO-DSH-IMPLEMENTATION-2026-09-02.md')) {
    Copy-Verified (Join-Path $stack $name) (Join-Path $research $name)
    Copy-Verified (Join-Path $stack $name) (Join-Path $recovery $name)
    $changed.Add($name)
}
foreach ($name in @('mission-control\Launch-Status.ps1','mission-control\INSTALLATION.md','mission-control\test\reopen-contract.test.mjs')) {
    Copy-Verified (Join-Path $stack $name) (Join-Path $recovery $name)
    $changed.Add($name)
}
foreach ($name in @('Launch-Status.before.ps1','Sync-Recovery.ps1')) {
    $relative = "evidence\mission-control-reopen-2026-09-02\$name"
    Copy-Verified (Join-Path $PSScriptRoot $name) (Join-Path $recovery $relative)
    $changed.Add($relative)
}
$manifest = Join-Path $recovery 'MANIFEST-SHA256.txt'
$entries = [ordered]@{}
foreach ($line in Get-Content -LiteralPath $manifest) {
    if ($line.StartsWith('#')) { continue }
    if ($line -notmatch '^([0-9a-f]{64})  (.+)$') { throw "Malformed manifest: $line" }
    $entries[$Matches[2]] = $Matches[1]
}
foreach ($relative in $changed) {
    $entries[$relative] = (Get-FileHash -LiteralPath (Join-Path $recovery $relative)).Hash.ToLowerInvariant()
}
# Preserve unrelated expected hashes rather than refreshing them from disk.
$lines = @('# Halo recovery snapshot SHA-256 manifest', ('# Launcher-only update: ' + (Get-Date -Format o)))
foreach ($relative in $entries.Keys) { $lines += "$($entries[$relative])  $relative" }
$lines | Set-Content -LiteralPath $manifest -Encoding utf8
$mismatches = @()
foreach ($relative in $entries.Keys) {
    $target = [IO.Path]::GetFullPath((Join-Path $recovery $relative))
    if (-not $target.StartsWith($recovery + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe manifest path' }
    if (-not (Test-Path -LiteralPath $target) -or (Get-FileHash -LiteralPath $target).Hash -ne $entries[$relative]) {
        $mismatches += $relative
    }
}
[pscustomobject]@{ChangedCopies=$changed.Count;ManifestEntries=$entries.Count;Mismatches=$mismatches;ManifestSha256=(Get-FileHash $manifest).Hash} | ConvertTo-Json
if ($mismatches.Count) { throw 'Preserved snapshot contains mismatches; inspect without silently rebaselining.' }
