# Uses the pinned reddit-search-redlib public installers. The RSS-only step
# installs/verifies the parser without a network content gate. Redlib's lower
# build-only entrypoint verifies its own source pin and does not start a server.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$PackageRoot, [Parameter(Mandatory)][string]$InstallRoot, [int]$Port=18080)
$ErrorActionPreference='Stop'
function Find-Tool([string]$Name,[string[]]$Candidates=@()) {
    foreach($candidate in $Candidates) { if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate } }
    $command=Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
}
function Install-Package([string]$Id,[string]$Override='') {
    $winget=Find-Tool 'winget.exe' @((Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\winget.exe'))
    if (-not $winget) { throw "Windows App Installer/winget is required to install $Id. Install it normally, then resume." }
    $arguments=@('install','--id',$Id,'--exact','--source','winget','--disable-interactivity','--accept-package-agreements','--accept-source-agreements','--silent')
    if ($Override) { $arguments+=@('--override',$Override) }
    & $winget @arguments
    if ($LASTEXITCODE -in @(3010,1641)) { throw "$Id needs a Windows restart. Restart when convenient, then resume setup." }
    if ($LASTEXITCODE -ne 0) { throw "$Id installation failed or elevation was canceled (exit $LASTEXITCODE)." }
}
$root=$PSScriptRoot
$outer=Get-ChildItem -LiteralPath $PackageRoot -Filter install_windows.ps1 -Recurse -File | Select-Object -First 1
if (-not $outer) { throw 'Pinned Reddit package has no parser installer.' }
$config=Join-Path $root 'data\reddit-config.json'
$skill=Join-Path $root 'agents\skills\reddit-search'
& $outer.FullName -RssOnly -SkillDirectory $skill -ConfigPath $config
if ($LASTEXITCODE -ne 0) { throw 'Pinned Reddit parser setup failed.' }
$parserReceipt=Get-Content -Raw -LiteralPath $config | ConvertFrom-Json
$git=Find-Tool 'git.exe' @((Join-Path $env:ProgramFiles 'Git\cmd\git.exe'))
if (-not $git) { Install-Package 'Git.Git'; $git=Find-Tool 'git.exe' @((Join-Path $env:ProgramFiles 'Git\cmd\git.exe')) }
if (-not $git) { throw 'Git was not found after installation. Open a new terminal and resume.' }
$env:PATH=(Split-Path -Parent $git)+';'+$env:PATH
$vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vsRoot=$null
if (Test-Path -LiteralPath $vswhere) { $vsRoot=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Select-Object -First 1 }
if (-not $vsRoot) {
    # A separate normal Build Tools installation avoids modifying an existing
    # IDE workload or global configuration on behalf of this package.
    Install-Package 'Microsoft.VisualStudio.2022.BuildTools' '--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended'
    if (Test-Path -LiteralPath $vswhere) { $vsRoot=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Select-Object -First 1 }
}
if (-not $vsRoot) { throw 'Visual C++ x64 Build Tools were not found. Complete the normal installer and resume.' }
$cargoBin=Join-Path $env:USERPROFILE '.cargo\bin'
$rustup=Find-Tool 'rustup.exe' @((Join-Path $cargoBin 'rustup.exe'))
if (-not $rustup) { Install-Package 'Rustlang.Rustup'; $rustup=Find-Tool 'rustup.exe' @((Join-Path $cargoBin 'rustup.exe')) }
if (-not $rustup) { throw 'Rustup was not found. Open a new terminal and resume.' }
$env:PATH=(Split-Path -Parent $rustup)+';'+$env:PATH
# Select this child process's toolchain; never change the user's Rust default.
& $rustup toolchain install stable-x86_64-pc-windows-msvc
if ($LASTEXITCODE -ne 0) { throw 'MSVC Rust toolchain setup failed.' }
$env:RUSTUP_TOOLCHAIN='stable-x86_64-pc-windows-msvc'
$builder=Join-Path $outer.DirectoryName 'setup_redlib_windows.ps1'
& $builder -InstallRoot $InstallRoot -Port $Port
if ($LASTEXITCODE -ne 0) { throw 'Pinned Redlib build failed.' }
$record=Get-Content -Raw -LiteralPath (Join-Path $InstallRoot 'install.json') | ConvertFrom-Json
$receipt=[ordered]@{
    schemaVersion=1;mode='redlib';installed=$true;skillInstalled=$true;redlibInstalled=$true
    running=$false;usable=$null;parserVerified=$parserReceipt.parserVerified
    skillDirectory=$skill;redlibInstallRoot=$InstallRoot;port=$Port;baseUrl="http://127.0.0.1:$Port"
    python=$parserReceipt.python;pythonLauncher=([IO.Path]::GetFileName($parserReceipt.python) -ieq 'py.exe');pythonVersion=$parserReceipt.pythonVersion;expectedCommit=$record.commit
    details='Parser verified; pinned Redlib built without starting a server. Live Reddit availability has not been tested.'
}
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $config
