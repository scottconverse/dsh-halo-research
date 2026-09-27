param([string]$ProfilePath = "$PSScriptRoot\home\profiles\desktop\cordis.patch.yml", [string]$InventoryJson)
$ErrorActionPreference = 'Stop'
# Scott's explicit Desktop default. Does not load/unload any model.
$profile = [IO.File]::ReadAllText($ProfilePath)
$pattern = '(?ms)(^- id: agent-default-model\r?\n.*?  config:\r?\n).*?(?=^- id:)'
$replacement = '${1}    provider: lmstudio-library' + "`n" + '    model: halo/qwen3.8-27b-q4km' + "`n" + '    reasoningEffort: medium' + "`n"
if ([regex]::Matches($profile,$pattern).Count -ne 1) { throw 'Expected one Desktop default block; unchanged.' }
$updated = [regex]::Replace($profile,$pattern,$replacement)
if ($updated -ne $profile) { [IO.File]::WriteAllText($ProfilePath,$updated,[Text.UTF8Encoding]::new($false)) }
Write-Output 'Desktop default: halo/qwen3.8-27b-q4km. Model residency unchanged.'
