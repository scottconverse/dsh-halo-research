param(
    [Parameter(Mandatory = $true)][string]$DesktopProfilePath,
    [Parameter(Mandatory = $true)][string]$WebSettingsPath
)

$ErrorActionPreference = 'Stop'
$desktop = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $DesktopProfilePath).Path)
$web = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $WebSettingsPath).Path)

$source = [regex]::Match($desktop, '(?ms)^- id: llm-pi-ai\r?\n  name: [^\r\n]+\r?\n  config:\r?\n(?<providers>    providers:\r?\n.*?)(?=^- id: ui-settings-general)')
if (-not $source.Success) { throw 'Expected exactly one Desktop llm-pi-ai provider block.' }
$providers = [regex]::Replace($source.Groups['providers'].Value, '(?m)^  ', '')
# Existing Web sessions address these loaded-instance names. Keep the routes
# until those sessions are retired; new chats use the Desktop model keys.
$coderAnchor = '        - id: halo/qwen3-coder-30b-a3b-q4km'
$brainAnchor = '        - id: halo/qwen3.6-35b-a3b'
if (-not $providers.Contains($coderAnchor) -or -not $providers.Contains($brainAnchor)) {
    throw 'Desktop model keys changed; inspect saved Web aliases before syncing.'
}
$coderAlias = @'
        - id: halo-coder-q4km
          name: Qwen3 Coder 30B-A3B - saved Web sessions
          contextWindow: 131072
          maxTokens: 8192
          input: [ text ]
          reasoningEfforts: false
'@
$brainAlias = @'
        - id: halo-brain-35b
          name: Qwen3.6 35B-A3B - saved Web sessions
          contextWindow: 131072
          maxTokens: 8192
          input: [ text, image ]
          reasoningEfforts: { off: none, high: high }
'@
$providers = $providers.Replace($coderAnchor, $coderAlias + "`n" + $coderAnchor)
$providers = $providers.Replace($brainAnchor, $brainAlias + "`n" + $brainAnchor)
# Keep the Web-only main/fallback envelopes and budgets across Desktop refreshes.
$webSpecific = [regex]::Matches($web, '(?ms)^    web-(?:fast|fallback):\r?\n.*?(?=^    [a-zA-Z][\w-]*:|^subagent-model-selection:|\z)')
$webRows = ($webSpecific | ForEach-Object { $_.Value.TrimEnd("`r", "`n") }) -join "`n"
$catalog = "llm-pi-ai:`n" + $providers.TrimEnd("`r", "`n") + "`n" + $webRows + "`n"

$webBlock = '(?ms)^llm-pi-ai:\r?\n.*?(?=^subagent-model-selection:)'
if ([regex]::Matches($web, $webBlock).Count -ne 1) { throw 'Expected exactly one Web llm-pi-ai block.' }
$updated = [regex]::Replace($web, $webBlock, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $catalog })

$defaultBlock = '(?ms)^agent-default-model:\r?\n.*?(?=^agent-presets:)'
if ([regex]::Matches($updated, $defaultBlock).Count -ne 1) { throw 'Expected exactly one Web default model block.' }
# Catalog refresh is not a default-model decision. Preserve the chosen Web default.

if ($updated -ne $web) {
    [IO.File]::WriteAllText($WebSettingsPath, $updated, [Text.UTF8Encoding]::new($false))
}
Write-Output 'Shared provider catalog refreshed; Web-only routes and default preserved. No model was loaded.'
