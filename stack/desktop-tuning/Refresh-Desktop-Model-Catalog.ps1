param(
    [string]$ProfilePath = "$PSScriptRoot\home\profiles\desktop\cordis.patch.yml"
)

$ErrorActionPreference = 'Stop'
$modelPolicy = Get-Content -LiteralPath 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack\desktop-tuning\model-policy.json' -Raw | ConvertFrom-Json
$lmsPath = Join-Path $env:USERPROFILE '.lmstudio\bin\lms.exe'
if (-not (Test-Path -LiteralPath $ProfilePath)) { throw "Desktop profile missing: $ProfilePath" }
if (-not (Test-Path -LiteralPath $lmsPath)) { throw "LM Studio CLI missing: $lmsPath" }

function Quote-Yaml([string]$value) {
    return ($value | ConvertTo-Json -Compress -Depth 2)
}

function Replace-Block([string]$text, [string]$begin, [string]$end, [string]$anchor, [string]$block) {
    $start = $text.IndexOf($begin, [StringComparison]::Ordinal)
    if ($start -ge 0) {
        $finish = $text.IndexOf($end, $start, [StringComparison]::Ordinal)
        if ($finish -lt 0) { throw "Missing model catalog end marker: $end" }
        $finish += $end.Length
        if ($text.Substring($finish).StartsWith("`r`n")) { $finish += 2 }
        elseif ($text.Substring($finish).StartsWith("`n")) { $finish += 1 }
        return $text.Substring(0, $start) + $block + $text.Substring($finish)
    }
    $position = $text.IndexOf($anchor, [StringComparison]::Ordinal)
    if ($position -lt 0) { throw "Model catalog anchor missing: $anchor" }
    return $text.Substring(0, $position) + $block + $text.Substring($position)
}

$profile = [IO.File]::ReadAllText($ProfilePath)
$newline = if ($profile.Contains("`r`n")) { "`r`n" } else { "`n" }

$lmsOutput = & $lmsPath ls --json 2>&1
if ($LASTEXITCODE -ne 0) { throw "Could not list LM Studio models: $lmsOutput" }
$lmModels = @($lmsOutput -join "`n" | ConvertFrom-Json | Where-Object { $_.type -eq 'llm' })
# The CLI inventory omits reasoning capabilities. Read the native catalog; no
# model is loaded and no inference request is made by this discovery endpoint.
$lmCapabilities = @{}
$nativeModels = (Invoke-RestMethod -Uri 'http://127.0.0.1:1234/api/v1/models' -TimeoutSec 10).models
foreach ($native in $nativeModels) {
    if ($native.type -eq 'llm') { $lmCapabilities[[string]$native.key] = $native.capabilities.reasoning }
}
$tunedLmKeys = @('halo/qwen3.6-35b-a3b', 'halo/qwen3-coder-30b-a3b-q4km', 'halo/qwen3.8-27b-q6')
$hiddenLmKeys = @('qwen3.8-27b-km', 'halo/qwen3.8-27b', 'unsloth/qwen3.8-27b', 'qwen/qwen3.8-27b', 'halo/qwen3.8-27b-q6-fast', 'halo/qwen3.6-35b-a3b-q6')
$lmExtras = @($lmModels | Where-Object { $_.modelKey -notlike 'study/*' -and $_.modelKey -notin $tunedLmKeys -and $_.modelKey -notin $hiddenLmKeys } | Sort-Object modelKey)

$library = [Collections.Generic.List[string]]::new()
$library.Add('      # BEGIN generated Desktop model library')
$library.Add('      lmstudio-library:')
$library.Add('        displayName: LM Studio downloaded')
$library.Add('        apiKeyEnv: LMSTUDIO_API_KEY')
$library.Add('        api: openai-completions')
$library.Add('        baseURL: http://127.0.0.1:1234/v1')
$library.Add('        defaultInput: [text]')
$library.Add('        defaultContextWindow: 131072')
$library.Add('        defaultMaxTokens: 8192')
$library.Add('        streamIdleTimeoutMs: 600000')
$library.Add($(if ($lmExtras.Count -gt 0) { '        models:' } else { '        models: []' }))
foreach ($item in $lmExtras) {
    $context = [Math]::Min(131072, [int]$item.maxContextLength)
    if ($context -lt 8192) { $context = 8192 }
    $quant = if ($item.quantization.name) { " $($item.quantization.name)" } else { '' }
    $library.Add("          - id: $(Quote-Yaml $item.modelKey)")
    $label = if ($item.modelKey -eq 'halo/qwen3.8-27b-q4km') { 'Qwen3.8 27B Q4_K_M - Halo tuned (startup default)' } else { "$($item.displayName)$quant [$($item.modelKey)]" }
    $library.Add("            name: $(Quote-Yaml $label)")
    $library.Add("            contextWindow: $context")
    $maxOutput = if ($item.modelKey -eq 'halo/qwen3.8-27b-q4km') { $modelPolicy.desktopQ4.maxTokens } else { 8192 }
    $library.Add("            maxTokens: $maxOutput")
    $inputTypes = if ($item.vision) { '[text, image]' } else { '[text]' }
    $library.Add("            input: $inputTypes")
    if ($item.modelKey -in @('halo/qwen3.8-27b-q4km', 'qwen/qwen3.8-27b')) {
        $library.Add('            reasoningEfforts: { off: none, low: low, medium: medium, xhigh: xhigh }')
    } elseif ($item.modelKey -eq 'qwen/qwen3.6-35b-a3b') {
        $library.Add('            reasoningEfforts: { off: none, high: high }')
    } else {
        $options = @($lmCapabilities[[string]$item.modelKey].allowed_options | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
        if ($options.Count -gt 0) {
            $library.Add('            reasoningEfforts:')
            foreach ($option in $options) {
                # LM Studio native metadata uses off/on, while Chat Completions
                # accepts none/medium. "On" is a toggle, not a claimed Medium
                # budget. Keep real graduated options under their real names.
                # This transport alias also exists in Hermes' LMS integration:
                # github.com/NousResearch/hermes-agent/blob/main/agent/lmstudio_reasoning.py
                switch ($option) {
                    'off' { $library.Add('              off: none') }
                    'on' {
                        if (-not ($options | Where-Object { $_ -in @('minimal','low','medium','high','xhigh','max') })) {
                            $library.Add('              on: medium')
                        }
                    }
                    { $_ -in @('minimal','low','medium','high','xhigh','max') } {
                        $library.Add("              ${option}: $option")
                    }
                    default { throw "Unsupported LM Studio reasoning metadata for $($item.modelKey): $option" }
                }
            }
        } else { $library.Add('            reasoningEfforts: false') }
    }

}

# Ollama's local tags include cloud pointers; remote_model distinguishes them.
# Keep five curated cloud rows; discover local models only.
$ollamaTags = $null
try { $ollamaTags = @( (Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 10).models ) }
catch { Write-Warning "Ollama catalog unavailable; preserving its existing Desktop entries: $($_.Exception.Message)" }

if ($null -ne $ollamaTags) {
    $cloudKnown = @('deepseek-v4.1-flash:cloud', 'glm-5.3:cloud', 'kimi-k3:cloud', 'minimax-m3:cloud', 'glm-5.3-flash:cloud')
    $cloudExtras = [Collections.Generic.List[string]]::new()
    $cloudExtras.Add('          # BEGIN generated Ollama Cloud models')
    $localModels = [Collections.Generic.List[string]]::new()
    foreach ($item in ($ollamaTags | Sort-Object name)) {
        $name = [string]$item.name
        if (-not $name) { continue }
        $remote = -not [string]::IsNullOrWhiteSpace([string]$item.remote_model) -or $name.EndsWith(':cloud')
        if ($remote) { continue } # Only the five curated cloud rows are offered.
        $details = $null
        $capabilities = @()
        $context = if ($remote) { 131072 } else { 32768 }
        try {
            $body = @{ model = $name } | ConvertTo-Json -Compress
            $details = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/show' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 10
            $capabilities = @($details.capabilities)
            $contextField = $details.model_info.PSObject.Properties | Where-Object { $_.Name -like '*.context_length' } | Select-Object -First 1
            if ($contextField -and [int64]$contextField.Value -gt 0) {
                $context = [int][Math]::Min([int64]$contextField.Value, $(if ($remote) { 1048576 } else { 131072 }))
            }
        } catch {
            Write-Warning "Could not read Ollama metadata for ${name}; using text-only defaults."
        }
        if ($remote) { $target = $cloudExtras } else { $target = $localModels }
        $label = if ($remote) { 'Ollama Cloud' } else { 'Ollama local' }
        $target.Add("          - id: $(Quote-Yaml $name)")
        $target.Add("            name: $(Quote-Yaml "$name ($label)")")
        $target.Add("            contextWindow: $context")
        $target.Add('            maxTokens: 8192')
        $inputTypes = if ('vision' -in $capabilities) { '[text, image]' } else { '[text]' }
        $target.Add("            input: $inputTypes")
        $values = @($details.thinking.values)
        if ($values.Count -gt 1) {
            $target.Add('            reasoningEfforts:')
            foreach ($value in $values) {
                if ($value -is [bool]) {
                    if ($value) { $target.Add('              high: high') }
                    else { $target.Add('              off: none') }
                } elseif ($value -in @('minimal','low','medium','high','xhigh','max')) {
                    $target.Add("              ${value}: $value")
                } else { throw "Unsupported thinking metadata for $name" }
            }
        } else { $target.Add('            reasoningEfforts: false') }

    }
    $cloudExtras.Add('          # END generated Ollama Cloud models')
    $cloudBlock = ($cloudExtras -join $newline) + $newline
    $profile = Replace-Block $profile '          # BEGIN generated Ollama Cloud models' '          # END generated Ollama Cloud models' '      lmstudio-brain:' $cloudBlock

    $library.Add('      ollama-local:')
    $library.Add('        displayName: Ollama local')
    $library.Add('        apiKeyEnv: LMSTUDIO_API_KEY')
    $library.Add('        api: openai-completions')
    $library.Add('        baseURL: http://127.0.0.1:11434/v1')
    $library.Add('        defaultInput: [text]')
    $library.Add('        defaultContextWindow: 32768')
    $library.Add('        defaultMaxTokens: 8192')
    $library.Add($(if ($localModels.Count -gt 0) { '        models:' } else { '        models: []' }))
    foreach ($line in $localModels) { $library.Add($line) }
    $library.Add('      # END generated Desktop model library')
    $libraryBlock = ($library -join $newline) + $newline
    $profile = Replace-Block $profile '      # BEGIN generated Desktop model library' '      # END generated Desktop model library' '- id: ui-settings-general' $libraryBlock
} else {
    # An offline Ollama must not remove its last known catalog.
    if ($profile.Contains('      # BEGIN generated Desktop model library')) {
        $start = $profile.IndexOf('      # BEGIN generated Desktop model library', [StringComparison]::Ordinal)
        $end = $profile.IndexOf('      # END generated Desktop model library', $start, [StringComparison]::Ordinal)
        if ($end -lt 0) { throw 'Incomplete generated Desktop model library block' }
        $oldBlock = $profile.Substring($start, $end - $start)
        $oldOllamaStart = $oldBlock.IndexOf('      ollama-local:', [StringComparison]::Ordinal)
        if ($oldOllamaStart -ge 0) {
            $library.AddRange(@($oldBlock.Substring($oldOllamaStart).TrimEnd("`r", "`n").Split("`n") | ForEach-Object { $_.TrimEnd("`r") }))
        }
    }
    $library.Add('      # END generated Desktop model library')
    $libraryBlock = ($library -join $newline) + $newline
    $profile = Replace-Block $profile '      # BEGIN generated Desktop model library' '      # END generated Desktop model library' '- id: ui-settings-general' $libraryBlock
}

$profile = $profile.Replace('Qwen3 Coder 30B-A3B Q4_K_M - default', 'Qwen3 Coder 30B-A3B Q4_K_M')
$original = [IO.File]::ReadAllText($ProfilePath)
if ($profile -ne $original) {
    $tempPath = "$ProfilePath.catalog-tmp"
    try {
        [IO.File]::WriteAllText($tempPath, $profile, [Text.UTF8Encoding]::new($false))
        [IO.File]::Move($tempPath, $ProfilePath, $true)
    } finally {
        if ([IO.File]::Exists($tempPath)) { [IO.File]::Delete($tempPath) }
    }
}
Write-Output "Desktop catalog: $($lmModels.Count) LM Studio chat models; $($(if ($null -ne $ollamaTags) { $ollamaTags.Count } else { 'cached' })) Ollama tags discovered; only five curated cloud rows offered."
