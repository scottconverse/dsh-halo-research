# SCOPE: copy this Halo release to Scott's Research folder; preserve prior hashes.
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$stack=Split-Path $PSScriptRoot -Parent
$research='C:\Users\scott\Desktop\Halo Stack Research'
$recovery=Join-Path $research 'Current Halo Configuration'
$manifest=Join-Path $recovery 'MANIFEST-SHA256.txt'
$entries=[ordered]@{}
foreach($line in Get-Content -LiteralPath $manifest){
 if($line.StartsWith('#')){continue}
 if($line -notmatch '^([0-9a-fA-F]{64})  (.+)$'){throw "Invalid manifest line: $line"}
 $entries[$Matches[2]]=$Matches[1].ToLowerInvariant()
}
# Validate all old expectations BEFORE replacing any files.
foreach($relative in $entries.Keys){
 $p=[IO.Path]::GetFullPath((Join-Path $recovery $relative))
 if(-not $p.StartsWith($recovery+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe manifest path'}
 if(-not(Test-Path -LiteralPath $p) -or (Get-FileHash -LiteralPath $p).Hash -ne $entries[$relative]){throw "Existing snapshot mismatch: $relative; no rebaseline allowed"}
}
$changed=[Collections.Generic.List[string]]::new()
function Copy-Verified($source,$target){
 New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
 Copy-Item -LiteralPath $source -Destination $target -Force
 if((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash){throw "Copy mismatch: $target"}
}
function Save-Recovery($source,$relative){
 Copy-Verified $source (Join-Path $recovery $relative)
 $entries[$relative]=(Get-FileHash -LiteralPath $source).Hash.ToLowerInvariant()
 $changed.Add($relative)
}
foreach($name in @('HALO-CURRENT-CONFIGURATION.md','HALO-STACK-GUIDE.md','HALO-PROVIDER-PROMOTION-2026-09-02.md','HALO-DSH-IMPLEMENTATION-2026-09-02.md','HALO-NATIVE-ACCESS-REPAIR-2026-09-01.md','HALO-LLMSTER-SPEC-v1.0.md','HALO-LLMSTER-IMPLEMENTATION-PLAN-v1.0.md','HALO-MODEL-PROVIDER-RESEARCH-2026-09-02.md','APP-RESTART-HANDOFF-2026-09-02.md')){
 Copy-Verified (Join-Path $stack $name) (Join-Path $research $name)
 Save-Recovery (Join-Path $stack $name) $name
}
$spec=Join-Path (Split-Path $stack -Parent) 'DSH-Strix-Halo-Spec-v3.5.md'
Copy-Verified $spec (Join-Path $research 'DSH-Strix-Halo-Spec-v3.5.md')
Save-Recovery $spec 'DSH-Strix-Halo-Spec-v3.5.md'
$mapping=@{
 'halo-settings.yaml'='dsh\settings.yaml';'web-profile.package.json'='dsh\profile-web\package.json';'web-cockpit.patch.yml'='dsh\profile-web\cordis.patch.yml';
 'Run-HaloCockpit.ps1'='operations\Run-HaloCockpit.ps1';'Install-HaloPickerOverride.ps1'='operations\Install-HaloPickerOverride.ps1';
 'halo-orchestrator\agent.cordis.yml'='dsh\halo-orchestrator\agent.cordis.yml';
 'halo-verified-coder\index.mjs'='dsh\halo-verified-coder\index.mjs';'halo-verified-coder\README.md'='dsh\halo-verified-coder\README.md';'halo-verified-coder\test\plugin.test.mjs'='dsh\halo-verified-coder\test\plugin.test.mjs';
 'mission-control\Launch-Status.ps1'='mission-control\Launch-Status.ps1';'mission-control\INSTALLATION.md'='mission-control\INSTALLATION.md';'mission-control\test\reopen-contract.test.mjs'='mission-control\test\reopen-contract.test.mjs'
}
foreach($name in $mapping.Keys){Save-Recovery (Join-Path $stack $name) $mapping[$name]}
foreach($name in @('pnpm-lock.yaml','pnpm-workspace.yaml')){Save-Recovery (Join-Path $env:USERPROFILE ".dsh\profiles\web\$name") "dsh\profile-web\$name"}
foreach($file in Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File){
 $relative=$file.FullName.Substring($PSScriptRoot.Length+1)
 if($relative -match '(^|\\)(node_modules|package)(\\|$)' -or $relative -match '\.tgz$'){continue}
 if($relative -match '(^|\\)(credentials\.json|\.env)$'){throw 'Private runtime data must not be in source integration'}
 Save-Recovery $file.FullName ('provider-integration\'+$relative)
}
foreach($file in Get-ChildItem -LiteralPath (Join-Path $stack 'packages') -File | Where-Object Name -Match 'halo-(dev-search\.4|native-metrics\.2|selection\.3)\.tgz$'){Save-Recovery $file.FullName ('dsh\packages\'+$file.Name)}
$lines=@('# Halo recovery snapshot SHA-256 manifest',('# Provider promotion update: '+(Get-Date -Format o)))
foreach($relative in $entries.Keys){$lines+="$($entries[$relative])  $relative"}
$lines|Set-Content -LiteralPath $manifest -Encoding utf8
foreach($relative in $entries.Keys){if((Get-FileHash -LiteralPath (Join-Path $recovery $relative)).Hash -ne $entries[$relative]){throw "Post-copy mismatch: $relative"}}
[pscustomobject]@{UpdatedCopies=$changed.Count;ManifestEntries=$entries.Count;Mismatches=0;ManifestSha256=(Get-FileHash -LiteralPath $manifest).Hash}|ConvertTo-Json
