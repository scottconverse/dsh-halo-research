[CmdletBinding()]
param(
    [string]$Source = (Join-Path $env:USERPROFILE '.dsh\memory\memory.json'),
    [string]$Destination = (Join-Path $env:USERPROFILE '.dsh\memory\snapshots'),
    [ValidateRange(1, 8760)]
    [int]$Keep = 168
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$sourcePath = [IO.Path]::GetFullPath($Source)
$destinationPath = [IO.Path]::GetFullPath($Destination)

# Missing memory is an honest no-op. Never create or seed memory.json here.
if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { exit 0 }

New-Item -ItemType Directory -Force -Path $destinationPath | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $destinationPath "memory-$stamp.json"
$nonce = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$staged = Join-Path $destinationPath ".memory-$stamp.json.writing-$nonce"

try {
    Copy-Item -LiteralPath $sourcePath -Destination $staged
    Move-Item -LiteralPath $staged -Destination $target -Force
} finally {
    if (Test-Path -LiteralPath $staged) {
        Remove-Item -LiteralPath $staged -Force
    }
}

Get-ChildItem -LiteralPath $destinationPath -File |
    Where-Object Name -Match '^memory-\d{8}-\d{6}\.json$' |
    Sort-Object Name -Descending |
    Select-Object -Skip $Keep |
    Remove-Item -Force
