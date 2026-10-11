param([string]$ProfilePath = "$PSScriptRoot\home\profiles\desktop\cordis.patch.yml", [string]$InventoryJson)
$ErrorActionPreference = 'Stop'
# Preserve the user's saved provider/model. Startup is not a model-selection
# action, and must not replace a cloud route or load a competing local model.
$profile = [IO.File]::ReadAllText($ProfilePath)
$pattern = '(?ms)(^- id: agent-default-model\r?\n.*?  config:\r?\n).*?(?=^- id:)'
if ([regex]::Matches($profile,$pattern).Count -ne 1) { throw 'Expected one Desktop default block; unchanged.' }
$block = [regex]::Match($profile,$pattern).Value
$provider = [regex]::Match($block,'(?m)^    provider:\s*(.+)$').Groups[1].Value.Trim()
$model = [regex]::Match($block,'(?m)^    model:\s*(.+)$').Groups[1].Value.Trim()
if (-not $provider -or -not $model) { throw 'Desktop saved default is incomplete; no configuration or residency changed.' }
$node = 'C:\Program Files\nodejs\node.exe'
$preflightScript = 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh\model-startup-preflight.mjs'
$preflight = & $node $preflightScript --settings-file $ProfilePath 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { throw "Desktop model startup check failed: $preflight" }
$checked = $preflight | ConvertFrom-Json
Write-Output $checked.message
Write-Output "Desktop saved default preserved: $provider / $model. Model residency unchanged."
