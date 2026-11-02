[CmdletBinding()]
param([string]$Destination = (Join-Path $env:LOCALAPPDATA 'DSH-Complete'), [switch]$Resume)
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'Run Install-DSH.cmd to provision PowerShell 7, or use pwsh. No execution policy changes are made.' }
$env:DSH_COMPLETE_PWSH=Join-Path $PSHOME 'pwsh.exe'
if ($env:OS -ne 'Windows_NT') { throw 'This package supports Windows x64 only.' }
if (-not [Environment]::Is64BitOperatingSystem -or $env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { throw 'Windows x64 is required.' }
$Destination = [IO.Path]::GetFullPath($Destination)
$localRoot = [IO.Path]::GetFullPath($env:LOCALAPPDATA).TrimEnd('\') + '\'
if (-not $Destination.StartsWith($localRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Choose a new destination beneath LOCALAPPDATA; the pinned native Redlib builder requires this.' }
$marker = Join-Path $Destination '.dsh-complete-owner.json'
if (Test-Path -LiteralPath $Destination) {
    if (-not $Resume -or -not (Test-Path -LiteralPath $marker)) { throw 'Destination exists. No files changed. Use a new folder, or -Resume for this installer-owned partial installation.' }
    $owner = Get-Content -Raw -LiteralPath $marker | ConvertFrom-Json
    if ($owner.kind -ne 'dsh-complete-v1' -or $owner.root -ne $Destination) { throw 'Installation ownership mismatch.' }
} else {
    New-Item -ItemType Directory -Path $Destination | Out-Null
    @{kind='dsh-complete-v1';root=$Destination;createdAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $marker
}
$manifest = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'components.json') | ConvertFrom-Json
$download = Join-Path $Destination 'downloads\node.zip'
$node = Join-Path $Destination 'tools\node\node.exe'
if (-not (Test-Path -LiteralPath $node)) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $download) | Out-Null
    if (-not (Test-Path -LiteralPath $download)) { Invoke-WebRequest -UseBasicParsing -Uri $manifest.node.url -OutFile ($download + '.partial'); Move-Item -LiteralPath ($download + '.partial') -Destination $download }
    if ((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.node.sha256) { throw 'Node archive integrity mismatch.' }
    $stage = Join-Path $Destination 'downloads\node-extracted'
    if (-not (Test-Path -LiteralPath $stage)) { Expand-Archive -LiteralPath $download -DestinationPath $stage }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $node) | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $stage 'node-v24.21.0-win-x64') | Copy-Item -Destination (Split-Path -Parent $node) -Recurse -Force
}
& $node (Join-Path $PSScriptRoot 'stack\complete-windows\install.mjs') --dest $Destination
if ($LASTEXITCODE -ne 0) { throw 'Setup incomplete. Retain this folder and its receipt; rerun with -Resume after resolving the recorded error.' }
