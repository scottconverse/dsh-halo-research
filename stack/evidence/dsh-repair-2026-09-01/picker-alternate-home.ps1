# Disposable integration check. Never starts DSH or alters the live profile.
$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\scott\Desktop\Code\dsh-halo-research'
$sourceProfile = Join-Path $env:USERPROFILE '.dsh\profiles\web'
$scratch = Join-Path ([IO.Path]::GetTempPath()) ('halo-picker-integration-' + [guid]::NewGuid().ToString('N'))
$profile = Join-Path $scratch 'profiles\web'
$installer = Join-Path $repo 'stack\Install-HaloPickerOverride.ps1'
$liveBefore = @{}
foreach ($name in @('package.json','pnpm-lock.yaml','pnpm-workspace.yaml')) {
    $liveBefore[$name] = (Get-FileHash (Join-Path $sourceProfile $name)).Hash
}
New-Item -ItemType Directory -Path $profile -Force | Out-Null
foreach ($name in @('package.json','pnpm-lock.yaml','pnpm-workspace.yaml')) {
    Copy-Item -LiteralPath (Join-Path $sourceProfile $name) -Destination (Join-Path $profile $name)
}
Write-Output "Disposable DshHome: $scratch"
$result = $null
& $installer -DshHome $scratch -RepoRoot $repo | ForEach-Object {
    if ($_.PSObject.Properties.Name -contains 'Action') { $script:result = $_ }
    else { Write-Output $_ }
}
if ($result.Action -ne 'Install') { throw 'First install did not return Install' }
$noop = & $installer -DshHome $scratch -RepoRoot $repo
if ($noop.Action -ne 'NoOp') { throw 'Repeated install did not return NoOp' }
$manifest = Get-Content (Join-Path $profile 'package.json') -Raw | ConvertFrom-Json
$spec = $manifest.dependencies.'@deepseek-ai/dsh-client-ui-model-selection'
$resolved = [IO.Path]::GetFullPath((Join-Path $profile $spec.Substring(5)))
if ($resolved -ne $result.Artifact) { throw 'Installed file dependency resolves to the wrong archive' }
foreach ($name in $liveBefore.Keys) {
    if ((Get-FileHash (Join-Path $sourceProfile $name)).Hash -ne $liveBefore[$name]) { throw "Live profile changed: $name" }
}
[pscustomobject]@{
    Passed = $true
    InstallAction = $result.Action
    RepeatAction = $noop.Action
    Dependency = $spec
    ArtifactSha256 = $result.ArtifactSha256
    LiveProfileUnchanged = $true
    ScratchDirectory = $scratch
} | ConvertTo-Json
# Retain a failed scratch profile for diagnosis; remove only this proven-owned
# GUID directory after every check succeeds.
$resolvedScratch = [IO.Path]::GetFullPath($scratch)
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
if (-not $resolvedScratch.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -or
    (Split-Path $resolvedScratch -Leaf) -notmatch '^halo-picker-integration-[a-f0-9]{32}$') {
    throw "Refusing scratch cleanup: $resolvedScratch"
}
Remove-Item -LiteralPath $resolvedScratch -Recurse -Force
