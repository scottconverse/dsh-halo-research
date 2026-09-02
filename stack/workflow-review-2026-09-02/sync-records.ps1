# SCOPE: documentation/evidence copies for this read-only Halo release review.
$ErrorActionPreference='Stop'
$research='C:\Users\scott\Desktop\Halo Stack Research'
$recovery=Join-Path $research 'Current Halo Configuration'
$manifest=Join-Path $recovery 'MANIFEST-SHA256.txt'
$entries=[ordered]@{}
foreach($line in Get-Content -LiteralPath $manifest){if($line.StartsWith('#')){continue};if($line -notmatch '^([a-f0-9]{64})  (.+)$'){throw 'Invalid manifest'};$entries[$Matches[2]]=$Matches[1]}
foreach($relative in $entries.Keys){$p=[IO.Path]::GetFullPath((Join-Path $recovery $relative));if(-not$p.StartsWith($recovery+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe manifest path'};if((Get-FileHash -LiteralPath $p).Hash -ne $entries[$relative]){throw "Prior snapshot mismatch: $relative"}}
foreach($file in Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File){
 $relative='workflow-review-2026-09-02\'+$file.FullName.Substring($PSScriptRoot.Length+1)
 foreach($destination in @((Join-Path $research $relative),(Join-Path $recovery $relative))){New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force|Out-Null;Copy-Item -LiteralPath $file.FullName -Destination $destination -Force;if((Get-FileHash -LiteralPath $destination).Hash -ne (Get-FileHash -LiteralPath $file.FullName).Hash){throw 'Copy mismatch'}}
 $entries[$relative]=(Get-FileHash -LiteralPath $file.FullName).Hash.ToLowerInvariant()
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'REVIEW.md') -Destination (Join-Path $research 'HALO-WORKFLOW-REVIEW-2026-09-02.md') -Force
$lines=@('# Halo recovery snapshot SHA-256 manifest',('# Workflow review added: '+(Get-Date -Format o)))
foreach($relative in $entries.Keys){$lines+="$($entries[$relative])  $relative"}
$lines|Set-Content -LiteralPath $manifest -Encoding utf8
foreach($relative in $entries.Keys){if((Get-FileHash -LiteralPath (Join-Path $recovery $relative)).Hash -ne $entries[$relative]){throw "Post-copy mismatch: $relative"}}
[pscustomobject]@{Entries=$entries.Count;Mismatches=0;ManifestSha256=(Get-FileHash -LiteralPath $manifest).Hash}|ConvertTo-Json
