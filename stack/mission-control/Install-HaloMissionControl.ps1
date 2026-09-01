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

$sourcePath = [IO.Path]::GetFullPath($Source)
$destinationPath = [IO.Path]::GetFullPath($Destination)
$destinationDir = Split-Path -Parent $destinationPath
$testFile = Join-Path $PSScriptRoot 'test\reasoning-contract.test.mjs'
$node = (Get-Command node -ErrorAction Stop).Source
$testsRan = -not [bool] $SkipTests
$testResult = if ($testsRan) { 'Passed' } else { 'Skipped' }
$testCommand = "node --test `"$testFile`""

if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw "Canonical Mission Control source is missing: $sourcePath"
}

& $node --check $sourcePath
if ($LASTEXITCODE -ne 0) {
    throw "Mission Control syntax check failed with exit code $LASTEXITCODE"
}

if (-not $SkipTests) {
    if (-not (Test-Path -LiteralPath $testFile -PathType Leaf)) {
        throw "Mission Control reasoning contract test is missing: $testFile"
    }
    & $node --test $testFile
    if ($LASTEXITCODE -ne 0) {
        throw "Mission Control contract tests failed with exit code $LASTEXITCODE"
    }
}

$sourceHash = Get-Sha256 $sourcePath
if (Test-Path -LiteralPath $destinationPath -PathType Leaf) {
    $installedHash = Get-Sha256 $destinationPath
    if ($installedHash -eq $sourceHash) {
        [pscustomobject]@{
            Action = 'NoOp'
            Source = $sourcePath
            Destination = $destinationPath
            Sha256 = $sourceHash
            RestartRequired = $false
            Backup = $null
            TestsRan = $testsRan
            TestResult = $testResult
            TestCommand = $testCommand
        }
        exit 0
    }
}

New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
$backupDir = Join-Path $destinationDir 'backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$nonce = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$backup = $null

if (Test-Path -LiteralPath $destinationPath -PathType Leaf) {
    $backup = Join-Path $backupDir "mission-control-$stamp-$nonce.mjs"
    Copy-Item -LiteralPath $destinationPath -Destination $backup
    $backupHash = Get-Sha256 $backup
    if ($backupHash -ne $installedHash) {
        throw "Mission Control backup verification failed: expected $installedHash, got $backupHash"
    }
}

$staged = "$destinationPath.installing-$nonce"
try {
    Copy-Item -LiteralPath $sourcePath -Destination $staged
    if ((Get-Sha256 $staged) -ne $sourceHash) {
        throw 'Staged Mission Control hash does not match the canonical source'
    }
    Move-Item -LiteralPath $staged -Destination $destinationPath -Force
} finally {
    if (Test-Path -LiteralPath $staged) {
        Remove-Item -LiteralPath $staged -Force
    }
}

$finalHash = Get-Sha256 $destinationPath
if ($finalHash -ne $sourceHash) {
    throw "Installed Mission Control hash mismatch: expected $sourceHash, got $finalHash"
}

$receipt = [ordered]@{
    InstalledAt = (Get-Date).ToUniversalTime().ToString('o')
    Source = $sourcePath
    Destination = $destinationPath
    Sha256 = $sourceHash
    Backup = $backup
    BackupSha256 = if ($backup) { Get-Sha256 $backup } else { $null }
    TestsRan = $testsRan
    TestResult = $testResult
    TestCommand = $testCommand
}
$receiptPath = Join-Path $backupDir "install-$stamp-$nonce.json"
$receipt | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $receiptPath -Encoding UTF8

[pscustomobject]@{
    Action = 'Installed'
    Source = $sourcePath
    Destination = $destinationPath
    Sha256 = $sourceHash
    RestartRequired = $true
    Backup = $backup
    Receipt = $receiptPath
    TestsRan = $testsRan
    TestResult = $testResult
    TestCommand = $testCommand
}
