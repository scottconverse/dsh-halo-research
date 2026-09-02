<#
  Install or roll back the reviewed Halo model-picker package through DSH's
  supported profile-local package-shadow seam. The reviewed tgz and its
  browser bundle are immutable hash-pinned inputs.

  This script never starts or stops a service and never manually edits pnpm's
  global store; pnpm may use its normal content-addressed store. A successful
  install or rollback must be followed by a separately ownership-checked
  restart of the DSH cockpit only.
#>
[CmdletBinding()]
param(
    [string] $DshHome = (Join-Path $env:USERPROFILE '.dsh'),
    [string] $RepoRoot = '',
    [string] $RollbackFrom = '',
    [switch] $ForceReinstall
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($RollbackFrom) -and (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'provider-integration\README.md'))) {
    throw 'This legacy single-picker installer predates the September 2 three-package promotion. Use provider-integration/README.md; refusing to downgrade the current stack.'
}
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = Split-Path $PSScriptRoot -Parent
}

if ($ForceReinstall -and -not [string]::IsNullOrWhiteSpace($RollbackFrom)) {
    throw '-ForceReinstall and -RollbackFrom cannot be used together'
}

$packageName = '@deepseek-ai/dsh-client-ui-model-selection'
$packageVersion = '0.1.1-rc.2'
$artifactName = 'deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz'
$reviewedArtifactSha256 = '148C45AE84FF5539B3EB5509CA5A277544AC48FD91D4E56591E5218A0701BFB9'
$reviewedClientSha256 = '8AD89CED1EB23C241C82E0B3702359696827920AD99F37DE2AA568095533E131'
$reviewedIndexSha256 = '6879BA2C29E67B2AD0E0CAF8FEEEE9C62364D871F7664E10EFA7F14B4E216EB0'
$reviewedInvariantSha256 = 'F3E07C900344FD01FFE798DA2E98FBD55381F2E4BD0FE7467D00CF81A3CAFF78'
$sourceRoot = Join-Path $RepoRoot '_upstream\deepseek-harness'
$packageRoot = Join-Path $sourceRoot 'packages\client\ui-model-selection'
$artifactRoot = Join-Path $PSScriptRoot 'packages'
$artifactPath = Join-Path $artifactRoot $artifactName
$profileRoot = Join-Path $DshHome 'profiles\web'
$canonicalManifest = Join-Path $PSScriptRoot 'web-profile.package.json'
$liveManifest = Join-Path $profileRoot 'package.json'
$liveLock = Join-Path $profileRoot 'pnpm-lock.yaml'
$installedManifest = Join-Path $profileRoot "node_modules\$packageName\package.json"
$installedClient = Join-Path $profileRoot "node_modules\$packageName\lib\client.js"
$installedIndex = Join-Path $profileRoot "node_modules\$packageName\lib\index.js"
$installedInvariant = Join-Path $profileRoot "node_modules\$packageName\lib\invariant.js"
$backupsRoot = Join-Path $DshHome 'backups'
$pnpmCmd = Join-Path (Split-Path (Get-Command pnpm -ErrorAction Stop).Source -Parent) 'pnpm.cmd'
$tarCmd = (Get-Command tar.exe -ErrorAction Stop).Source

function Normalize-FileDependency([string] $Value) {
    return (($Value -replace '\\', '/').TrimEnd('/'))
}

function Assert-Hash([string] $Path, [string] $Expected, [string] $Label) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Label is missing: $Path"
    }
    $actual = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
    if ($actual -ne $Expected) {
        throw "$Label hash $actual does not match reviewed hash $Expected"
    }
    return $actual
}

function Get-Sha512Integrity([string] $Path) {
    $sha512 = [Security.Cryptography.SHA512]::Create()
    try {
        $stream = [IO.File]::OpenRead($Path)
        try {
            return 'sha512-' + [Convert]::ToBase64String($sha512.ComputeHash($stream))
        } finally {
            $stream.Dispose()
        }
    } finally {
        $sha512.Dispose()
    }
}

function Assert-ReviewedManifest([string] $Path, [string] $Label) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Label is missing: $Path"
    }
    $identity = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    if ($identity.name -ne $packageName -or
        $identity.version -ne $packageVersion -or
        $identity.type -ne 'module' -or
        $identity.main -ne 'lib/index.js' -or
        $identity.exports.'./client'.default -ne './lib/client.js' -or
        $identity.dsh.client.platform -ne 'web') {
        throw "$Label does not match the reviewed picker runtime contract: $Path"
    }
}

function Assert-ReviewedInstalledPackage {
    Assert-ReviewedManifest -Path $installedManifest -Label 'Installed picker manifest'
    Assert-Hash -Path $installedClient -Expected $reviewedClientSha256 -Label 'Installed picker client' | Out-Null
    Assert-Hash -Path $installedIndex -Expected $reviewedIndexSha256 -Label 'Installed picker index' | Out-Null
    Assert-Hash -Path $installedInvariant -Expected $reviewedInvariantSha256 -Label 'Installed picker invariant' | Out-Null
}

function Assert-ReviewedLock([string] $DependencySpec) {
    $lockText = Get-Content -LiteralPath $liveLock -Raw
    $forwardSpec = Normalize-FileDependency $DependencySpec
    $backwardSpec = $forwardSpec -replace '/', '\'
    $integrity = Get-Sha512Integrity $artifactPath
    foreach ($needle in @(
        "specifier: $backwardSpec",
        "version: $forwardSpec",
        "'$packageName@$forwardSpec':",
        "integrity: $integrity",
        "tarball: $forwardSpec"
    )) {
        if ($lockText.IndexOf($needle, [StringComparison]::Ordinal) -lt 0) {
            throw "DSH web profile lockfile is not bound to the reviewed picker artifact; missing: $needle"
        }
    }
}

function Remove-ScratchDirectory([string] $Path, [string] $ExpectedParent) {
    $resolvedPath = [IO.Path]::GetFullPath($Path)
    $resolvedParent = [IO.Path]::GetFullPath($ExpectedParent).TrimEnd('\') + '\'
    if (-not $resolvedPath.StartsWith($resolvedParent, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove scratch path outside expected parent: $resolvedPath"
    }
    if (Test-Path -LiteralPath $resolvedPath) {
        Remove-Item -LiteralPath $resolvedPath -Recurse -Force
    }
}

function Assert-ReviewedArtifact([string] $Path) {
    Assert-Hash -Path $Path -Expected $reviewedArtifactSha256 -Label 'Picker tgz' | Out-Null
    $verifyRoot = Join-Path $artifactRoot ('verify-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $verifyRoot | Out-Null
    try {
        & $tarCmd -xf $Path -C $verifyRoot
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to inspect picker tgz $Path (tar exit $LASTEXITCODE)"
        }
        $packedManifest = Join-Path $verifyRoot 'package\package.json'
        $packedLicense = Join-Path $verifyRoot 'package\LICENSE'
        $packedClient = Join-Path $verifyRoot 'package\lib\client.js'
        $packedIndex = Join-Path $verifyRoot 'package\lib\index.js'
        $packedInvariant = Join-Path $verifyRoot 'package\lib\invariant.js'
        if (-not (Test-Path -LiteralPath $packedLicense -PathType Leaf)) {
            throw "Packed picker license is missing: $packedLicense"
        }
        $packedManifestText = Get-Content -LiteralPath $packedManifest -Raw
        if ($packedManifestText.IndexOf('workspace:', [StringComparison]::OrdinalIgnoreCase) -ge 0) {
            throw 'Packed picker manifest contains workspace: dependency ranges and is not standalone-installable'
        }
        Assert-ReviewedManifest -Path $packedManifest -Label 'Packed picker manifest'
        Assert-Hash -Path $packedClient -Expected $reviewedClientSha256 -Label 'Packed picker client' | Out-Null
        Assert-Hash -Path $packedIndex -Expected $reviewedIndexSha256 -Label 'Packed picker index' | Out-Null
        Assert-Hash -Path $packedInvariant -Expected $reviewedInvariantSha256 -Label 'Packed picker invariant' | Out-Null
    } finally {
        Remove-ScratchDirectory -Path $verifyRoot -ExpectedParent $artifactRoot
    }
}

function New-ProfileBackup([string] $Label) {
    foreach ($required in @($liveManifest, $liveLock)) {
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
            throw "Cannot create a complete profile backup; required file is missing: $required"
        }
    }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    New-Item -ItemType Directory -Path $backupsRoot -Force | Out-Null
    $backupRoot = Join-Path $backupsRoot ("halo-picker-$Label-$stamp-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
    New-Item -ItemType Directory -Path $backupRoot | Out-Null
    $backupManifest = Join-Path $backupRoot 'package.json'
    $backupLock = Join-Path $backupRoot 'pnpm-lock.yaml'
    Copy-Item -LiteralPath $liveManifest -Destination $backupManifest
    Copy-Item -LiteralPath $liveLock -Destination $backupLock

    $manifestHash = (Get-FileHash -LiteralPath $liveManifest -Algorithm SHA256).Hash
    $lockHash = (Get-FileHash -LiteralPath $liveLock -Algorithm SHA256).Hash
    Assert-Hash -Path $backupManifest -Expected $manifestHash -Label 'Backed-up profile manifest' | Out-Null
    Assert-Hash -Path $backupLock -Expected $lockHash -Label 'Backed-up profile lockfile' | Out-Null
    [ordered]@{
        schema = 1
        createdUtc = (Get-Date).ToUniversalTime().ToString('o')
        packageJsonSha256 = $manifestHash
        pnpmLockSha256 = $lockHash
        installedManifestSha256 = if (Test-Path -LiteralPath $installedManifest -PathType Leaf) {
            (Get-FileHash -LiteralPath $installedManifest -Algorithm SHA256).Hash
        } else { $null }
        installedClientSha256 = if (Test-Path -LiteralPath $installedClient) {
            (Get-FileHash -LiteralPath $installedClient -Algorithm SHA256).Hash
        } else { $null }
        installedIndexSha256 = if (Test-Path -LiteralPath $installedIndex -PathType Leaf) {
            (Get-FileHash -LiteralPath $installedIndex -Algorithm SHA256).Hash
        } else { $null }
        installedInvariantSha256 = if (Test-Path -LiteralPath $installedInvariant -PathType Leaf) {
            (Get-FileHash -LiteralPath $installedInvariant -Algorithm SHA256).Hash
        } else { $null }
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupRoot 'backup.json') -Encoding utf8
    return $backupRoot
}

function Assert-Backup([string] $Path) {
    $resolved = [IO.Path]::GetFullPath($Path)
    $allowed = [IO.Path]::GetFullPath($backupsRoot).TrimEnd('\') + '\'
    if (-not $resolved.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Rollback backup must be beneath $backupsRoot"
    }
    $metadataPath = Join-Path $resolved 'backup.json'
    $metadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
    Assert-Hash -Path (Join-Path $resolved 'package.json') -Expected $metadata.packageJsonSha256 -Label 'Rollback manifest backup' | Out-Null
    Assert-Hash -Path (Join-Path $resolved 'pnpm-lock.yaml') -Expected $metadata.pnpmLockSha256 -Label 'Rollback lockfile backup' | Out-Null
    return [pscustomobject]@{ Path = $resolved; Metadata = $metadata }
}

function Restore-ProfileBackup([object] $Backup) {
    Copy-Item -LiteralPath (Join-Path $Backup.Path 'package.json') -Destination $liveManifest -Force
    Copy-Item -LiteralPath (Join-Path $Backup.Path 'pnpm-lock.yaml') -Destination $liveLock -Force
    Assert-Hash -Path $liveManifest -Expected $Backup.Metadata.packageJsonSha256 -Label 'Restored profile manifest' | Out-Null
    Assert-Hash -Path $liveLock -Expected $Backup.Metadata.pnpmLockSha256 -Label 'Restored profile lockfile' | Out-Null
}

function Assert-InstalledPackageMatchesBackup([object] $Metadata, [string] $Label) {
    foreach ($identity in @(
        [pscustomobject]@{ Path = $installedManifest; Hash = $Metadata.installedManifestSha256; Name = 'manifest' },
        [pscustomobject]@{ Path = $installedClient; Hash = $Metadata.installedClientSha256; Name = 'client' },
        [pscustomobject]@{ Path = $installedIndex; Hash = $Metadata.installedIndexSha256; Name = 'index' },
        [pscustomobject]@{ Path = $installedInvariant; Hash = $Metadata.installedInvariantSha256; Name = 'invariant' }
    )) {
        if (-not [string]::IsNullOrWhiteSpace([string] $identity.Hash)) {
            Assert-Hash -Path $identity.Path -Expected $identity.Hash -Label "$Label installed picker $($identity.Name)" | Out-Null
        }
    }
}

function Invoke-OfflineFrozenInstall {
    Push-Location $profileRoot
    try {
        & $pnpmCmd install --offline --frozen-lockfile --ignore-scripts
        if ($LASTEXITCODE -ne 0) {
            throw "Offline frozen profile install failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
}

foreach ($required in @($profileRoot, $liveManifest, $liveLock, $pnpmCmd)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Required Halo picker path is missing: $required"
    }
}

if (-not [string]::IsNullOrWhiteSpace($RollbackFrom)) {
    $rollback = Assert-Backup -Path $RollbackFrom
    $safetyBackup = New-ProfileBackup -Label 'before-rollback'
    try {
        Restore-ProfileBackup -Backup $rollback
        Invoke-OfflineFrozenInstall
        Assert-Hash -Path $liveManifest -Expected $rollback.Metadata.packageJsonSha256 -Label 'Rolled-back profile manifest' | Out-Null
        Assert-Hash -Path $liveLock -Expected $rollback.Metadata.pnpmLockSha256 -Label 'Rolled-back profile lockfile' | Out-Null
        Assert-InstalledPackageMatchesBackup -Metadata $rollback.Metadata -Label 'Rolled-back'
    } catch {
        $rollbackError = $_.Exception.Message
        $safety = Assert-Backup -Path $safetyBackup
        Restore-ProfileBackup -Backup $safety
        Invoke-OfflineFrozenInstall
        Assert-InstalledPackageMatchesBackup -Metadata $safety.Metadata -Label 'Restored pre-rollback'
        throw "Picker rollback failed; the pre-rollback profile was restored. Original error: $rollbackError"
    }
    [pscustomobject]@{
        Action = 'Rollback'
        RestoredFrom = $rollback.Path
        SafetyBackup = $safetyBackup
        RestartRequired = $true
        RestartScope = 'DSH cockpit only; use stack\Launch-Halo.ps1 -NoBrowser after ownership checks'
    }
    return
}

foreach ($required in @($sourceRoot, $packageRoot, $canonicalManifest, $tarCmd)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Required Halo picker path is missing: $required"
    }
}

$canonical = Get-Content -LiteralPath $canonicalManifest -Raw | ConvertFrom-Json
$live = Get-Content -LiteralPath $liveManifest -Raw | ConvertFrom-Json
$canonicalSpec = $canonical.dependencies.$packageName
if ([string]::IsNullOrWhiteSpace($canonicalSpec) -or -not $canonicalSpec.StartsWith('file:', [StringComparison]::OrdinalIgnoreCase)) {
    throw "Canonical picker dependency must be a file: reference"
}
$defaultProfileRoot = Join-Path (Join-Path $env:USERPROFILE '.dsh') 'profiles\web'
$expectedArtifactPath = [IO.Path]::GetFullPath((Join-Path $defaultProfileRoot (($canonicalSpec.Substring(5)) -replace '/', '\')))
if ($expectedArtifactPath -ne [IO.Path]::GetFullPath($artifactPath)) {
    throw "Canonical profile dependency does not point at the reviewed artifact: $canonicalSpec"
}
# The canonical manifest describes the normal live home; an explicitly selected
# DshHome needs its own relative dependency to the same reviewed archive.
$expectedSpec = 'file:' + (Normalize-FileDependency ([IO.Path]::GetRelativePath($profileRoot, $artifactPath)))
foreach ($dependency in @('@deepseek-ai/dsh-subagent-claude-code', '@deepseek-ai/dsh-subagent-codex')) {
    if ($live.dependencies.$dependency -ne $canonical.dependencies.$dependency) {
        throw "Live profile dependency drift for $dependency; refusing to overwrite it"
    }
}

if (-not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
    throw "Reviewed picker artifact is missing. Restore the versioned binary from Git instead of repacking non-reproducible tgz bytes: $artifactPath"
}
Assert-ReviewedArtifact -Path $artifactPath

$liveAlreadyUsesReviewedSpec = (Normalize-FileDependency $live.dependencies.$packageName) -eq (Normalize-FileDependency $expectedSpec)
$deploymentIsReviewed = $false
if ($liveAlreadyUsesReviewedSpec) {
    try {
        Assert-ReviewedInstalledPackage
        Assert-ReviewedLock -DependencySpec $expectedSpec
        $deploymentIsReviewed = $true
    } catch {
        Write-Verbose "Existing picker deployment requires repair: $($_.Exception.Message)"
    }
}
if (-not $ForceReinstall -and $deploymentIsReviewed) {
    [pscustomobject]@{
        Action = 'NoOp'
        Package = "$packageName@$packageVersion"
        Artifact = $artifactPath
        ArtifactSha256 = $reviewedArtifactSha256
        ClientSha256 = $reviewedClientSha256
        RestartRequired = $false
    }
    return
}

$backupRoot = New-ProfileBackup -Label 'before-install'
try {
    Push-Location $profileRoot
    try {
        # pnpm may retain a same-name/version hoisted package after a local
        # archive changes. Remove just the picker using pnpm before re-adding
        # it; do not force every dependency or edit the content-addressed store.
        if (Test-Path -LiteralPath $installedManifest -PathType Leaf) {
            & $pnpmCmd --config.offline=true --config.ignore-scripts=true remove $packageName
            if ($LASTEXITCODE -ne 0) {
                throw "Offline picker removal failed with exit code $LASTEXITCODE"
            }
        }
        & $pnpmCmd add --offline --ignore-scripts --save-exact "$packageName@$expectedSpec"
        if ($LASTEXITCODE -ne 0) {
            throw "Offline profile install failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
    Assert-ReviewedArtifact -Path $artifactPath
    Assert-ReviewedInstalledPackage
    $liveAfter = Get-Content -LiteralPath $liveManifest -Raw | ConvertFrom-Json
    if ((Normalize-FileDependency $liveAfter.dependencies.$packageName) -ne (Normalize-FileDependency $expectedSpec)) {
        throw "Profile did not retain expected picker spec $expectedSpec"
    }
    Assert-ReviewedLock -DependencySpec $expectedSpec
} catch {
    $installError = $_.Exception.Message
    $backup = Assert-Backup -Path $backupRoot
    Restore-ProfileBackup -Backup $backup
    Invoke-OfflineFrozenInstall
    Assert-InstalledPackageMatchesBackup -Metadata $backup.Metadata -Label 'Restored pre-install'
    throw "Picker installation failed; the byte-for-byte manifest and lockfile backup was restored. Original error: $installError"
}

[pscustomobject]@{
    Action = 'Install'
    Package = "$packageName@$packageVersion"
    Dependency = $expectedSpec
    Artifact = $artifactPath
    ArtifactSha256 = $reviewedArtifactSha256
    ClientSha256 = $reviewedClientSha256
    Backup = $backupRoot
    RollbackCommand = "& '$PSCommandPath' -DshHome '$DshHome' -RepoRoot '$RepoRoot' -RollbackFrom '$backupRoot'"
    RestartRequired = $true
    RestartScope = 'DSH cockpit only; use stack\Launch-Halo.ps1 -NoBrowser after ownership checks'
}
