param(
    [string]$Source = "$env:USERPROFILE\.dsh\memory\memory.json",
    [string]$Destination = "$env:USERPROFILE\.dsh\memory\snapshots",
    [int]$Keep = 168
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { exit 0 }
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $Destination "memory-$stamp.json"
Copy-Item -LiteralPath $Source -Destination $target

Get-ChildItem -LiteralPath $Destination -Filter 'memory-*.json' -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep |
    Remove-Item -Force
