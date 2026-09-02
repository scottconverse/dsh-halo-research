[CmdletBinding()]
param(
    [string] $Source = (Join-Path $PSScriptRoot 'mission-control.mjs'),
    [string] $Destination = (Join-Path $env:USERPROFILE '.dsh\mission-control\mission-control.mjs'),
    [switch] $SkipTests
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-Sha256([string] $Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Get-OptionalSha256([string] $Path) {
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        return Get-Sha256 $Path
    }
    return $null
}

function Invoke-InstallTestFailure([string] $Point) {
    # Failure injection is fail-only and exists solely to prove rollback. It
    # cannot bypass validation or make an installation succeed.
    if ($env:HALO_MC_INSTALL_TEST_FAILURE_POINT -eq $Point) {
        throw "Injected Mission Control installer failure at $Point"
    }
}

function Restore-PreviousDestination(
    [string] $DestinationPath,
    [AllowNull()][string] $PreviousHash,
    [AllowNull()][string] $BackupPath,
    [AllowNull()][string] $BackupHash,
    [string] $Nonce
) {
    if ($null -eq $PreviousHash) {
        if (Test-Path -LiteralPath $DestinationPath) {
            Remove-Item -LiteralPath $DestinationPath -Force
        }
        if (Test-Path -LiteralPath $DestinationPath) {
            throw 'Rollback could not restore the originally missing destination'
        }
        return
    }

    if (-not $BackupPath -or -not (Test-Path -LiteralPath $BackupPath -PathType Leaf)) {
        throw 'Rollback cannot continue because the verified backup is missing'
    }
    $verifiedBackupHash = Get-Sha256 $BackupPath
    if ($verifiedBackupHash -ne $BackupHash -or $verifiedBackupHash -ne $PreviousHash) {
        throw "Rollback backup verification failed: expected $PreviousHash, got $verifiedBackupHash"
    }

    $rollbackStaged = "$DestinationPath.rollback-$Nonce"
    try {
        Copy-Item -LiteralPath $BackupPath -Destination $rollbackStaged -Force
        if ((Get-Sha256 $rollbackStaged) -ne $PreviousHash) {
            throw 'Rollback staging hash does not match the verified prior destination'
        }
        Move-Item -LiteralPath $rollbackStaged -Destination $DestinationPath -Force
    } finally {
        if (Test-Path -LiteralPath $rollbackStaged) {
            Remove-Item -LiteralPath $rollbackStaged -Force
        }
    }

    $restoredHash = Get-OptionalSha256 $DestinationPath
    if ($restoredHash -ne $PreviousHash) {
        throw "Rollback verification failed: expected $PreviousHash, got $restoredHash"
    }
}

function Write-AtomicJsonReceipt($Value, [string] $Path, [string] $Nonce) {
    $stagedReceipt = "$Path.writing-$Nonce"
    try {
        $Value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $stagedReceipt -Encoding UTF8
        Move-Item -LiteralPath $stagedReceipt -Destination $Path -Force
    } finally {
        if (Test-Path -LiteralPath $stagedReceipt) {
            Remove-Item -LiteralPath $stagedReceipt -Force
        }
    }
    return Get-Sha256 $Path
}

$sourcePath = [IO.Path]::GetFullPath($Source)
$destinationPath = [IO.Path]::GetFullPath($Destination)
$destinationDir = Split-Path -Parent $destinationPath
$node = (Get-Command node -ErrorAction Stop).Source
$contractSuiteNames = @(
    'reasoning-contract.test.mjs'
    'data-contract.test.mjs'
    'ui-contract.test.mjs'
    'installer-contract.test.mjs'
)

if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw "Canonical Mission Control source is missing: $sourcePath"
}

$contractSuites = @(
    foreach ($suiteName in $contractSuiteNames) {
        $suitePath = Join-Path $PSScriptRoot "test\$suiteName"
        if (-not (Test-Path -LiteralPath $suitePath -PathType Leaf)) {
            throw "Required Mission Control contract suite is missing: $suitePath"
        }
        [pscustomobject]@{
            Name = $suiteName
            Path = [IO.Path]::GetFullPath($suitePath)
            SuiteSha256 = Get-Sha256 $suitePath
        }
    }
)

$sourceHash = Get-Sha256 $sourcePath
$installedHash = if (Test-Path -LiteralPath $destinationPath -PathType Leaf) {
    Get-Sha256 $destinationPath
} else {
    $null
}
$installRequired = $installedHash -ne $sourceHash
if ($SkipTests -and $installRequired) {
    throw '-SkipTests cannot install a changed or missing Mission Control destination; all contract suites are required for installation.'
}

& $node --check $sourcePath
if ($LASTEXITCODE -ne 0) {
    throw "Mission Control syntax check failed with exit code $LASTEXITCODE"
}

$testsRan = -not [bool] $SkipTests
$testResult = if ($testsRan) { 'Passed' } else { 'Skipped' }
$testCommands = @($contractSuites | ForEach-Object { "node --test `"$($_.Path)`"" })
$testCommand = $testCommands -join '; '
$contractEvidence = @()

if ($testsRan) {
    $hadSourceOverride = Test-Path Env:HALO_MC_SOURCE_UNDER_TEST
    $previousSourceOverride = $env:HALO_MC_SOURCE_UNDER_TEST
    try {
        # Every contract suite reads this exact file. This keeps the public
        # -Source parameter honest instead of testing the default source while
        # installing a different file.
        $env:HALO_MC_SOURCE_UNDER_TEST = $sourcePath
        foreach ($suite in $contractSuites) {
            $suiteHashBefore = Get-Sha256 $suite.Path
            & $node --test $suite.Path
            if ($LASTEXITCODE -ne 0) {
                throw "Mission Control contract suite '$($suite.Name)' failed with exit code $LASTEXITCODE"
            }
            $suiteHashAfter = Get-Sha256 $suite.Path
            if ($suiteHashAfter -ne $suiteHashBefore) {
                throw "Mission Control contract suite changed while it was running: $($suite.Path)"
            }
            if ((Get-Sha256 $sourcePath) -ne $sourceHash) {
                throw 'Mission Control source changed after its hash was captured; refusing to install unverified bytes'
            }
            $contractEvidence += [ordered]@{
                Name = $suite.Name
                Path = $suite.Path
                SuiteSha256 = $suiteHashBefore
                TestCommand = "node --test `"$($suite.Path)`""
                TestResult = 'Passed'
            }
        }
    } finally {
        if ($hadSourceOverride) {
            $env:HALO_MC_SOURCE_UNDER_TEST = $previousSourceOverride
        } else {
            Remove-Item Env:HALO_MC_SOURCE_UNDER_TEST -ErrorAction SilentlyContinue
        }
    }
} else {
    $contractEvidence = @($contractSuites | ForEach-Object {
        [ordered]@{
            Name = $_.Name
            Path = $_.Path
            SuiteSha256 = $_.SuiteSha256
            TestCommand = "node --test `"$($_.Path)`""
            TestResult = 'Skipped'
        }
    })
}

foreach ($suiteEvidence in $contractEvidence) {
    if ((Get-Sha256 $suiteEvidence.Path) -ne $suiteEvidence.SuiteSha256) {
        throw "Mission Control contract suite changed after validation; refusing to emit a stale receipt: $($suiteEvidence.Path)"
    }
}
if ((Get-Sha256 $sourcePath) -ne $sourceHash) {
    throw 'Mission Control source changed after validation; refusing to install unverified bytes'
}

New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
$backupDir = Join-Path $destinationDir 'backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$nonce = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$backup = $null
$backupHash = $null
$staged = "$destinationPath.installing-$nonce"
$lockPath = "$destinationPath.install.lock"
$lockHandle = $null
$promotionStarted = $false
$receiptPath = Join-Path $backupDir "install-$stamp-$nonce.json"
$resultObject = $null

try {
    try {
        # The open handle, not the presence of the file, is the lock. FileShare
        # None makes concurrent installers fail closed; a stale unlocked file is
        # harmless and can be reused.
        $lockHandle = [IO.File]::Open(
            $lockPath,
            [IO.FileMode]::OpenOrCreate,
            [IO.FileAccess]::ReadWrite,
            [IO.FileShare]::None
        )
    } catch [IO.IOException] {
        throw "Could not acquire Mission Control install lock '$lockPath'; another installer may be active. $($_.Exception.Message)"
    }

    # The tests can take minutes. Re-observe the destination after acquiring the
    # lock so bytes changed during validation are never overwritten.
    $lockedDestinationHash = Get-OptionalSha256 $destinationPath
    if ($lockedDestinationHash -ne $installedHash) {
        throw "Mission Control destination changed after validation; expected $installedHash, got $lockedDestinationHash. Refusing to install."
    }

    # Source and suite evidence must still identify the bytes about to be
    # promoted and receipted, including time spent waiting for the lock.
    foreach ($suiteEvidence in $contractEvidence) {
        if ((Get-Sha256 $suiteEvidence.Path) -ne $suiteEvidence.SuiteSha256) {
            throw "Mission Control contract suite changed while waiting for the install lock: $($suiteEvidence.Path)"
        }
    }
    if ((Get-Sha256 $sourcePath) -ne $sourceHash) {
        throw 'Mission Control source changed while waiting for the install lock'
    }

    if ($installRequired -and (Test-Path -LiteralPath $destinationPath -PathType Leaf)) {
        $backup = Join-Path $backupDir "mission-control-$stamp-$nonce.mjs"
        Copy-Item -LiteralPath $destinationPath -Destination $backup
        $backupHash = Get-Sha256 $backup
        if ($backupHash -ne $installedHash) {
            throw "Mission Control backup verification failed: expected $installedHash, got $backupHash"
        }
    }

    $finalHash = $installedHash
    if ($installRequired) {
        Copy-Item -LiteralPath $sourcePath -Destination $staged
        if ((Get-Sha256 $staged) -ne $sourceHash) {
            throw 'Staged Mission Control hash does not match the canonical source'
        }

        # CAS immediately before promotion. The exclusive lock serializes this
        # installer; this second hash also catches editors that do not honor it.
        $promotionDestinationHash = Get-OptionalSha256 $destinationPath
        if ($promotionDestinationHash -ne $installedHash) {
            throw "Mission Control destination changed after validation and backup; expected $installedHash, got $promotionDestinationHash. Refusing to promote."
        }
        if ((Get-Sha256 $sourcePath) -ne $sourceHash) {
            throw 'Mission Control source changed immediately before promotion'
        }

        $promotionStarted = $true
        Move-Item -LiteralPath $staged -Destination $destinationPath -Force
        Invoke-InstallTestFailure 'AfterPromotion'

        $finalHash = Get-Sha256 $destinationPath
        if ($finalHash -ne $sourceHash) {
            throw "Installed Mission Control hash mismatch: expected $sourceHash, got $finalHash"
        }
    }

    $action = if ($installRequired) { 'Installed' } else { 'NoOp' }
    $receipt = [ordered]@{
        SchemaVersion = 1
        ReceiptType = 'HaloMissionControlInstall'
        RecordedAt = (Get-Date).ToUniversalTime().ToString('o')
        Action = $action
        Source = $sourcePath
        Destination = $destinationPath
        Sha256 = $sourceHash
        SourceSha256 = $sourceHash
        PreviousDestinationSha256 = $installedHash
        InstalledSha256 = $finalHash
        Backup = $backup
        BackupSha256 = $backupHash
        SyntaxCheck = [ordered]@{
            Command = "node --check `"$sourcePath`""
            Result = 'Passed'
        }
        TestsRan = $testsRan
        TestResult = $testResult
        TestCommand = $testCommand
        ContractSuites = $contractEvidence
    }
    $receiptHash = Write-AtomicJsonReceipt $receipt $receiptPath $nonce
    if ($installRequired) {
        Invoke-InstallTestFailure 'AfterReceipt'
    }

    $resultObject = [pscustomobject]@{
        Action = $action
        Source = $sourcePath
        Destination = $destinationPath
        Sha256 = $sourceHash
        RestartRequired = [bool] $installRequired
        Backup = $backup
        Receipt = $receiptPath
        ReceiptSha256 = $receiptHash
        TestsRan = $testsRan
        TestResult = $testResult
        TestCommand = $testCommand
        ContractSuites = $contractEvidence
    }
} catch {
    $installFailure = $_
    if ($promotionStarted) {
        try {
            Restore-PreviousDestination `
                -DestinationPath $destinationPath `
                -PreviousHash $installedHash `
                -BackupPath $backup `
                -BackupHash $backupHash `
                -Nonce $nonce
            if (Test-Path -LiteralPath $receiptPath) {
                Remove-Item -LiteralPath $receiptPath -Force
            }
        } catch {
            throw "Mission Control installation failed after promotion: $($installFailure.Exception.Message) Automatic rollback also failed: $($_.Exception.Message)"
        }
    }
    throw $installFailure
} finally {
    if (Test-Path -LiteralPath $staged) {
        Remove-Item -LiteralPath $staged -Force -ErrorAction SilentlyContinue
    }
    if ($null -ne $lockHandle) {
        try { $lockHandle.Dispose() } catch { }
        Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
    }
}

$resultObject
