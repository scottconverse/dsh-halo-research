#Requires -Version 7.0
<#
.SYNOPSIS
  Model routing for DSH Desktop: self first, local Ollama for free batch,
  external Claude/Codex only when the escalation test says so.

.DESCRIPTION
  Every call appends a line to a JSONL ledger. Acceptance is recorded by
  running a command, not by opinion, so `report` can compute cost per
  accepted item.

.EXAMPLE
  ./route.ps1 probe
  ./route.ps1 call -Route local -Model qwen3.8:27b-q4_K_M -Prompt "summarize this" -Task s1
  ./route.ps1 accept -Task s1 -Cmd "pytest -q"
  ./route.ps1 report
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('probe', 'call', 'batch', 'accept', 'defer', 'report', 'prices', 'settings', 'help')]
    [string]$Verb = 'help',

    [ValidateSet('self', 'local', 'external')]
    [string]$Route = 'local',

    [string]$Model,
    [string]$Prompt,
    [string]$PromptFile,
    [string]$Task = 'adhoc',
    [int]$TimeoutSec = 600,
    [string]$Cmd,
    [string]$Reason,
    [ValidateSet('claude', 'codex', 'ollama')]
    [string]$Provider,
    [int]$Parallel = 2,
    [string]$Out,
    [switch]$Smoke,
    [switch]$DryRun,
    [switch]$Json,
    [switch]$All,
    [string]$Class = 'uncategorized',
    [ValidateSet('default', 'off', 'low', 'medium', 'high', 'xhigh', 'max')]
    [string]$Effort = 'default',
    [int]$MaxTokens = 0,
    [switch]$ByClass,
    [switch]$ByEffort
)

$ErrorActionPreference = 'Stop'
$script:RepoRoot = Split-Path $PSScriptRoot -Parent
$script:LedgerPath = if ($env:DSH_ROUTING_LEDGER) {
    $env:DSH_ROUTING_LEDGER
} else {
    Join-Path $script:RepoRoot '.state/ledger.jsonl'
}
$script:PricesPath = Join-Path $script:RepoRoot 'config/prices.json'
$script:ModelSettingsPath = Join-Path $script:RepoRoot 'config/model-settings.json'
# Cloud models cost Ollama credits; batch is local-only except this one model,
# which the owner has explicitly allowed to run through the same endpoint.
$script:BatchCloudAllowlist = @('deepseek-v4.1-flash:1017-cloud')
$script:OllamaBase = if ($env:OLLAMA_BASE) { $env:OLLAMA_BASE } else { 'http://127.0.0.1:11434' }

# ---------------------------------------------------------------- ledger

function Read-Ledger {
    if (-not (Test-Path $script:LedgerPath)) { return @() }
    $entries = @()
    foreach ($line in Get-Content $script:LedgerPath) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        try { $entries += ($line | ConvertFrom-Json) } catch { Write-Warning "skipping malformed ledger line" }
    }
    return $entries
}

function Save-Ledger([object[]]$Entries) {
    $dir = Split-Path $script:LedgerPath -Parent
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $lines = foreach ($e in $Entries) { ($e | ConvertTo-Json -Compress -Depth 6) }
    Set-Content -Path $script:LedgerPath -Value $lines -Encoding utf8
}

function Add-LedgerEntry([hashtable]$Entry) {
    $dir = Split-Path $script:LedgerPath -Parent
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $obj = [ordered]@{
        id         = [guid]::NewGuid().ToString('N').Substring(0, 12)
        ts         = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        task       = $Task
        class      = $Class
        effort     = $Effort
        effort_source = $null
        max_tokens = $null
        max_tokens_source = $null
        context_handling = $null
        advertised_context = $null
        route      = $Route
        provider   = $null
        execution  = $null
        transport  = $null
        cost_basis = $null
        model      = $Model
        requested_model = $Model
        served_model = $null
        tokens_in  = $null
        tokens_out = $null
        tokens_total = $null
        cost_usd   = $null
        wall_ms    = $null
        done_reason = $null
        accepted   = $false
        retries    = 0
        exit_code  = $null
        note       = $null
    }
    foreach ($k in $Entry.Keys) { $obj[$k] = $Entry[$k] }
    Add-Content -Path $script:LedgerPath -Value ($obj | ConvertTo-Json -Compress -Depth 6) -Encoding utf8
    return $obj
}

# ---------------------------------------------------------------- helpers

function Resolve-Prompt {
    if ($Prompt -and $PromptFile) { throw "Give -Prompt or -PromptFile, not both." }
    if ($PromptFile) {
        if (-not (Test-Path $PromptFile)) { throw "Prompt file not found: $PromptFile" }
        return (Get-Content $PromptFile -Raw)
    }
    if ($Prompt) { return $Prompt }
    throw "This verb needs -Prompt or -PromptFile."
}

function Resolve-Provider([string]$M) {
    if ($Provider) { return $Provider }
    if (-not $M) { throw "-Model is required for a call." }
    if ($M -match '^(haiku|sonnet|opus|fable|claude)') { return 'claude' }
    if ($M -match '^gpt') { return 'codex' }
    return 'ollama'
}

function Get-Price([string]$M) {
    if (-not (Test-Path $script:PricesPath) -or -not $M) { return $null }
    try { $p = Get-Content $script:PricesPath -Raw | ConvertFrom-Json } catch { return $null }
    $prop = $p.models.PSObject.Properties[$M]
    if ($prop) { return $prop.Value }
    return $null
}

function Get-ModelKind([string]$M) {
    if ($M -match '^(haiku|sonnet|opus|fable|claude)') { return 'claude' }
    if ($M -match '^gpt') { return 'codex' }
    if ($M -match 'cloud$') { return 'cloud' }
    return 'local'
}

function Get-ExecutionInfo([string]$P, [string]$M) {
    # Where the weights run, separately from how the request travels.
    if ($P -eq 'ollama') {
        if ($M -match 'cloud$') {
            return [pscustomobject]@{ Execution = 'cloud'; Transport = 'ollama-http' }
        }
        return [pscustomobject]@{ Execution = 'local-weights'; Transport = 'ollama-http' }
    }
    if ($P -eq 'claude') { return [pscustomobject]@{ Execution = 'external'; Transport = 'claude-cli' } }
    return [pscustomobject]@{ Execution = 'external'; Transport = 'codex-cli' }
}

function Get-EstimatedCost($Provider, $M, $TokensIn, $TokensOut) {
    if ((Get-ModelKind $M) -eq 'local') { return 0.0 }
    if ($null -eq $TokensIn -or $null -eq $TokensOut) { return $null }
    $price = Get-Price $M
    if (-not $price) { return $null }
    return [math]::Round((($TokensIn / 1e6) * $price.in) + (($TokensOut / 1e6) * $price.out), 6)
}

function Get-ModelDefaults([string]$M) {
    if (-not (Test-Path $script:ModelSettingsPath) -or -not $M) { return $null }
    try { $s = Get-Content $script:ModelSettingsPath -Raw | ConvertFrom-Json } catch { return $null }
    $prop = $s.models.PSObject.Properties[$M]
    if ($prop) { return $prop.Value }
    return $null
}

# One resolver for call and batch. Only models present in config/model-settings.json
# get explicit defaults; every other model keeps the provider's own settings.
function Resolve-CallSettings {
    param([string]$M, [string]$P, [string]$EffortOverride = 'default', [int]$MaxTokensOverride = 0)

    $defaults = Get-ModelDefaults $M
    $hasDefaults = $null -ne $defaults

    if ($EffortOverride -ne 'default') {
        $effort = $EffortOverride; $effortSource = 'explicit'
    } elseif ($hasDefaults -and $defaults.effort) {
        $effort = [string]$defaults.effort; $effortSource = 'model-default'
    } else {
        $effort = 'default'; $effortSource = 'unspecified'
    }

    $allowed = switch ($P) {
        'ollama' { @('off', 'low', 'medium', 'high', 'max') }
        'claude' { @('low', 'medium', 'high', 'xhigh', 'max') }
        'codex' { @('low', 'medium', 'high', 'xhigh', 'max') }
        default { @() }
    }
    if ($effort -ne 'default' -and $allowed -notcontains $effort) {
        throw "Effort '$effort' is not valid for provider '$P'. Allowed: $($allowed -join ', ')."
    }

    if ($MaxTokensOverride -gt 0) {
        $maxTokens = $MaxTokensOverride; $maxSource = 'explicit'
    } elseif ($hasDefaults -and $defaults.max_tokens) {
        $maxTokens = [int]$defaults.max_tokens; $maxSource = 'model-default'
    } else {
        $maxTokens = $null; $maxSource = 'unspecified'
    }
    if ($P -ne 'ollama' -and $MaxTokensOverride -gt 0) {
        throw "-MaxTokens is only sent to Ollama; provider '$P' has no equivalent flag."
    }
    $maxTokensSent = if ($P -eq 'ollama') { $maxTokens } else { $null }

    $ctxHandling = 'unknown'; $ctxAdvertised = $null
    if ($hasDefaults -and $defaults.context) {
        $ctxHandling = [string]$defaults.context.handling
        $ctxAdvertised = $defaults.context.advertised
    }

    # "off" is Ollama's boolean false, never the string.
    $think = $null
    if ($effort -ne 'default') { $think = if ($effort -eq 'off') { $false } else { $effort } }

    [pscustomobject]@{
        Model              = $M
        Provider           = $P
        Effort             = $effort
        EffortSource       = $effortSource
        MaxTokens          = $maxTokensSent
        MaxTokensSource    = $maxSource
        ContextHandling    = $ctxHandling
        AdvertisedContext  = $ctxAdvertised
        Think              = $think
        HasModelDefaults   = $hasDefaults
    }
}

function Write-Receipt($Result, $Entry) {
    $tok = if ($null -ne $Result.TokensIn -or $null -ne $Result.TokensOut) {
        "in=$($Result.TokensIn) out=$($Result.TokensOut)"
    } elseif ($null -ne $Result.TokensTotal) { "total=$($Result.TokensTotal)" } else { 'tokens=n/a' }
    $cost = if ($null -ne $Entry.cost_usd) { "cost=`$$($Entry.cost_usd)" } else { 'cost=n/a' }
    $served = if ($Entry.served_model) { "served=$($Entry.served_model)" } else { 'served=unknown' }
    $ctx = if ($Entry.context_handling -eq 'provider-managed') {
        "context=provider-managed(advertised=$($Entry.advertised_context))"
    } else { "context=$($Entry.context_handling)" }
    Write-Host ("[receipt] id=$($Entry.id) $($Result.Provider) requested=$($Entry.requested_model) $served " +
        "execution=$($Entry.execution) transport=$($Entry.transport) " +
        "effort=$($Entry.effort)($($Entry.effort_source)) max_tokens=$($Entry.max_tokens)($($Entry.max_tokens_source)) " +
        "$ctx $tok stop=$($Entry.done_reason) $cost($($Entry.cost_basis)) $($Entry.wall_ms)ms accepted=false task=$Task")
}

function Invoke-Ollama {
    param([string]$M, [string]$Text, [int]$Timeout = 600, $Settings, [switch]$Dry)
    $body = @{
        model    = $M
        messages = @(@{ role = 'user'; content = $Text })
        stream   = $false
    }
    if ($null -ne $Settings.Think) { $body.think = $Settings.Think }
    if ($null -ne $Settings.MaxTokens) {
        $body.options = @{ num_predict = [int]$Settings.MaxTokens }
    }
    $bodyJson = $body | ConvertTo-Json -Depth 6
    if ($Dry) {
        return [pscustomobject]@{
            Provider = 'ollama'; Model = $M; ServedModel = $null
            Text = "(dry run) POST $script:OllamaBase/api/chat"; Body = $bodyJson
            TokensIn = $null; TokensOut = $null; CostUsd = $null; WallMs = 0
            DoneReason = $null; Settings = $Settings
        }
    }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-RestMethod "$script:OllamaBase/api/chat" -Method Post -ContentType 'application/json' -Body $bodyJson -TimeoutSec $Timeout
    $sw.Stop()
    [pscustomobject]@{
        Provider   = 'ollama'
        Model      = $M
        ServedModel = $r.model
        Text       = $r.message.content
        TokensIn   = $r.prompt_eval_count
        TokensOut  = $r.eval_count
        CostUsd    = $null
        WallMs     = [int]$sw.ElapsedMilliseconds
        DoneReason = $r.done_reason
        Settings   = $Settings
    }
}

function Invoke-Claude {
    param([string]$M, [string]$Text, [int]$Timeout = 600, $Settings, [switch]$Dry)
    $argv = @('-p', '--model', $M, '--output-format', 'json')
    if ($Settings.Effort -ne 'default') { $argv += @('--effort', $Settings.Effort) }
    if ($Dry) {
        return [pscustomobject]@{
            Provider = 'claude'; Model = $M; ServedModel = $null
            Text = "claude " + ($argv -join ' ') + "  (prompt via stdin)"; Body = $null
            TokensIn = $null; TokensOut = $null; CostUsd = $null; WallMs = 0
            DoneReason = $null; Settings = $Settings
        }
    }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $raw = $Text | & claude @argv 2>&1 | Out-String
    $code = $LASTEXITCODE
    $sw.Stop()
    if ($code -ne 0) { throw "claude exited $code`: $($raw.Trim())" }

    $obj = $null
    $start = $raw.IndexOf('{')
    if ($start -ge 0) {
        try { $obj = $raw.Substring($start) | ConvertFrom-Json } catch { $obj = $null }
    }
    $reply = if ($obj -and $obj.result) { [string]$obj.result } else { $raw.Trim() }
    [pscustomobject]@{
        Provider  = 'claude'
        Model     = $M
        ServedModel = if ($obj -and $obj.model) { [string]$obj.model } else { $null }
        Text      = $reply
        TokensIn  = if ($obj -and $obj.usage) { $obj.usage.input_tokens } else { $null }
        TokensOut = if ($obj -and $obj.usage) { $obj.usage.output_tokens } else { $null }
        CostUsd   = if ($obj -and $obj.total_cost_usd) { [double]$obj.total_cost_usd } else { $null }
        WallMs    = [int]$sw.ElapsedMilliseconds
        DoneReason = if ($obj -and $obj.stop_reason) { [string]$obj.stop_reason } else { $null }
        Settings  = $Settings
    }
}

function Invoke-Codex {
    param([string]$M, [string]$Text, [int]$Timeout = 600, $Settings, [switch]$Dry)
    $lastFile = Join-Path ([IO.Path]::GetTempPath()) ("route-last-" + [guid]::NewGuid().ToString('N') + '.txt')
    $argv = @('exec', '-m', $M, '-s', 'read-only', '--skip-git-repo-check', '-o', $lastFile)
    if ($Settings.Effort -ne 'default') { $argv += @('-c', "model_reasoning_effort=$($Settings.Effort)") }
    if ($Dry) {
        return [pscustomobject]@{
            Provider = 'codex'; Model = $M; ServedModel = $null
            Text = "codex " + ($argv -join ' ') + "  (prompt via stdin)"; Body = $null
            TokensIn = $null; TokensOut = $null; CostUsd = $null; WallMs = 0
            DoneReason = $null; Settings = $Settings
        }
    }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $raw = $Text | & codex @argv 2>&1 | Out-String
    $code = $LASTEXITCODE
    $sw.Stop()
    $reply = if (Test-Path $lastFile) { (Get-Content $lastFile -Raw).Trim() } else { $raw.Trim() }
    $m2 = [regex]::Match($raw, 'tokens used[\s\S]{0,20}?([\d,]+)')
    $total = if ($m2.Success) { [int]($m2.Groups[1].Value -replace ',', '') } else { $null }
    if ($code -ne 0) { throw "codex exited $code`: $($raw.Trim())" }
    [pscustomobject]@{
        Provider    = 'codex'
        Model       = $M
        ServedModel = $null
        Text        = $reply
        TokensIn    = $null
        TokensOut   = $null
        TokensTotal = $total
        CostUsd     = $null
        WallMs      = [int]$sw.ElapsedMilliseconds
        DoneReason  = $null
        Settings    = $Settings
    }
}

function Invoke-Route {
    param([string]$R, [string]$M, [string]$Text, [int]$Timeout = 600, $Settings, [switch]$Dry)
    if (-not $Settings) {
        $p = if ($R -eq 'local') { 'ollama' } else { Resolve-Provider $M }
        $Settings = Resolve-CallSettings -M $M -P $p
    }
    switch ($R) {
        'local' { return Invoke-Ollama -M $M -Text $Text -Timeout $Timeout -Settings $Settings -Dry:$Dry }
        'external' {
            switch (Resolve-Provider $M) {
                'claude' { return Invoke-Claude -M $M -Text $Text -Timeout $Timeout -Settings $Settings -Dry:$Dry }
                'codex' { return Invoke-Codex -M $M -Text $Text -Timeout $Timeout -Settings $Settings -Dry:$Dry }
                default { throw "External route needs a claude-* or gpt-* model (or -Provider)." }
            }
        }
        default { throw "Use -Route local or -Route external. 'self' runs in the session, not this script." }
    }
}

# ---------------------------------------------------------------- verbs

function Invoke-Probe {
    $result = [ordered]@{ self = $null; local = $null; external = [ordered]@{} }

    $result.self = [ordered]@{
        model  = if ($env:DSH_MODEL) { $env:DSH_MODEL } else { 'session model (not exposed to the shell)' }
        status = 'primary'
    }

    try {
        $tags = Invoke-RestMethod "$script:OllamaBase/api/tags" -TimeoutSec 8
        $local = @($tags.models | Where-Object { $_.name -notmatch 'cloud$' })
        $cloud = @($tags.models | Where-Object { $_.name -match 'cloud$' })
        $result.local = [ordered]@{
            status = 'ok'
            models = $local.Count
            cloud  = $cloud.Count
            names  = @($local.name)
        }
    } catch {
        $result.local = [ordered]@{ status = "unreachable: $($_.Exception.Message)" }
    }

    foreach ($cli in @('claude', 'codex')) {
        $cmd = Get-Command $cli -ErrorAction SilentlyContinue
        if (-not $cmd) {
            $result.external[$cli] = [ordered]@{ status = 'not installed' }
            continue
        }
        $version = (& $cli --version 2>&1 | Out-String).Trim().Split("`n")[0]
        $result.external[$cli] = [ordered]@{ status = 'installed'; version = $version }
    }
    if ($result.external.Contains('codex') -and $result.external['codex'].status -eq 'installed' -and (Test-Path "$env:USERPROFILE/.codex/models_cache.json")) {
        try {
            $cache = Get-Content "$env:USERPROFILE/.codex/models_cache.json" -Raw | ConvertFrom-Json
            $result.external['codex'].models = @($cache.models | ForEach-Object { $_.slug })
        } catch { }
    }
    if ($Smoke) {
        foreach ($s in @(@{ cli = 'claude'; model = 'haiku' }, @{ cli = 'codex'; model = 'gpt-6-luna' })) {
            if ($result.external[$s.cli].status -ne 'installed') { continue }
            try {
                $r = Invoke-Route -R 'external' -M $s.model -Text 'Reply with exactly: OK' -Timeout 120
                $result.external[$s.cli].smoke = if ($r.Text -match 'OK') { 'ok' } else { "unexpected: $($r.Text)" }
            } catch {
                $result.external[$s.cli].smoke = "failed: $($_.Exception.Message)"
            }
        }
    }

    if ($Json) { return ($result | ConvertTo-Json -Depth 6) }
    Write-Host "SELF     $($result.self.model)"
    if ($result.local.status -eq 'ok') {
        Write-Host "LOCAL    ok - $($result.local.models) local, $($result.local.cloud) cloud tags (free: local)"
    } else {
        Write-Host "LOCAL    $($result.local.status)"
    }
    foreach ($k in $result.external.Keys) {
        $e = $result.external[$k]
        $line = "EXTERNAL $k - $($e.status)"
        if ($e.version) { $line += " ($($e.version))" }
        if ($e.models) { $line += " models=$($e.models.Count)" }
        if ($e.smoke) { $line += " smoke=$($e.smoke)" }
        Write-Host $line
    }
}

function Invoke-Call {
    $text = Resolve-Prompt
    if ($Route -eq 'self') {
        throw "Route 'self' is this session. Do the work in-session and record it with: ./route.ps1 defer -Task $Task -Reason 'handled in-session'."
    }
    $prov = if ($Route -eq 'local') { 'ollama' } else { Resolve-Provider $Model }
    $settings = Resolve-CallSettings -M $Model -P $prov -EffortOverride $Effort -MaxTokensOverride $MaxTokens
    $r = Invoke-Route -R $Route -M $Model -Text $text -Timeout $TimeoutSec -Settings $settings -Dry:$DryRun

    $rowPreview = [ordered]@{
        requested_model     = $Model
        served_model        = $r.ServedModel
        provider            = $prov
        effort              = $settings.Effort
        effort_source       = $settings.EffortSource
        max_tokens          = $settings.MaxTokens
        max_tokens_source   = $settings.MaxTokensSource
        context_handling    = $settings.ContextHandling
        advertised_context  = $settings.AdvertisedContext
        done_reason         = $r.DoneReason
    }
    if ($DryRun) {
        if ($Json) {
            [pscustomobject]@{
                settings    = $settings
                command     = $r.Text
                bodyPreview = $r.Body
                rowPreview  = $rowPreview
            } | ConvertTo-Json -Depth 6
        } else {
            Write-Host $r.Text
            if ($r.Body) { Write-Host $r.Body }
            Write-Host ("[dry-run] effort=$($settings.Effort)($($settings.EffortSource)) " +
                "max_tokens=$($settings.MaxTokens)($($settings.MaxTokensSource)) " +
                "context=$($settings.ContextHandling) advertised=$($settings.AdvertisedContext)")
        }
        return
    }

    $cost = if ($r.CostUsd -ne $null) { $r.CostUsd } else { Get-EstimatedCost -Provider $r.Provider -M $Model -TokensIn $r.TokensIn -TokensOut $r.TokensOut }
    $exec = Get-ExecutionInfo -P $r.Provider -M $Model
    $costBasis = if ($r.CostUsd -ne $null) { 'provider-reported' }
        elseif ($exec.Execution -eq 'local-weights') { 'free-local' }
        elseif ($null -ne $cost) { 'estimated-api-equivalent' }
        else { 'unknown' }
    $entry = Add-LedgerEntry @{
        route             = $Route
        provider          = $r.Provider
        execution         = $exec.Execution
        transport         = $exec.Transport
        cost_basis        = $costBasis
        model             = $Model
        requested_model   = $Model
        served_model      = $r.ServedModel
        effort            = $settings.Effort
        effort_source     = $settings.EffortSource
        max_tokens        = $settings.MaxTokens
        max_tokens_source = $settings.MaxTokensSource
        context_handling  = $settings.ContextHandling
        advertised_context = $settings.AdvertisedContext
        tokens_in         = $r.TokensIn
        tokens_out        = $r.TokensOut
        tokens_total      = if ($r.PSObject.Properties['TokensTotal']) { $r.TokensTotal } else { $null }
        done_reason       = $r.DoneReason
        cost_usd          = $cost
        wall_ms           = $r.WallMs
        exit_code         = 0
        note              = if ($r.TokensTotal) { "tokens_total=$($r.TokensTotal)" } else { $null }
    }
    if ($Json) {
        [pscustomobject]@{
            id = $entry.id
            requested_model = $Model; served_model = $r.ServedModel
            effort = $settings.Effort; effort_source = $settings.EffortSource
            max_tokens = $settings.MaxTokens; max_tokens_source = $settings.MaxTokensSource
            context_handling = $settings.ContextHandling; advertised_context = $settings.AdvertisedContext
            done_reason = $r.DoneReason
            tokens_in = $r.TokensIn; tokens_out = $r.TokensOut
            cost_usd = $cost; wall_ms = $r.WallMs; text = $r.Text
        } | ConvertTo-Json -Depth 5
        return
    }
    Write-Output $r.Text
    Write-Receipt $r $entry
}

function Invoke-Batch {
    if ($Route -ne 'local') { throw "batch is the free lane: use -Route local with an Ollama model." }
    if ($Model -match 'cloud$' -and $script:BatchCloudAllowlist -notcontains $Model) {
        throw "batch refuses cloud tags ('$Model'): they cost Ollama credits. Only deepseek-v4.1-flash:1017-cloud is allowed in batch; use call for other cloud one-offs."
    }
    if (-not $PromptFile) { throw "batch needs -PromptFile, a JSONL of {id, prompt}." }
    if (-not $Model) { throw "batch needs -Model." }
    # Same resolver as call: a model with explicit defaults gets them here too.
    $settings = Resolve-CallSettings -M $Model -P 'ollama' -EffortOverride $Effort -MaxTokensOverride $MaxTokens
    $items = @()
    $i = 0
    foreach ($line in Get-Content $PromptFile) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $o = $line | ConvertFrom-Json
        $i++
        $items += [pscustomobject]@{ index = $i; id = if ($o.id) { [string]$o.id } else { "$i" }; prompt = [string]$o.prompt }
    }
    if ($items.Count -eq 0) { throw "No items in $PromptFile." }
    $outPath = if ($Out) { $Out } else { Join-Path $script:RepoRoot ".state/batch-$Task.jsonl" }
    $sampleBody = @{ model = $Model; messages = @(@{ role = 'user'; content = '<item prompt>' }); stream = $false }
    if ($null -ne $settings.Think) { $sampleBody.think = $settings.Think }
    if ($null -ne $settings.MaxTokens) { $sampleBody.options = @{ num_predict = [int]$settings.MaxTokens } }
    $sampleJson = $sampleBody | ConvertTo-Json -Depth 6
    if ($DryRun) {
        if ($Json) {
            [pscustomobject]@{
                settings = $settings; items = $items.Count; batchBodyPreview = $sampleJson; out = $outPath
            } | ConvertTo-Json -Depth 6
        } else {
            Write-Host "would send $($items.Count) items to $Model, parallel=$Parallel, out=$outPath"
            Write-Host ("[dry-run] effort=$($settings.Effort)($($settings.EffortSource)) " +
                "max_tokens=$($settings.MaxTokens)($($settings.MaxTokensSource)) " +
                "context=$($settings.ContextHandling) advertised=$($settings.AdvertisedContext)")
            Write-Host $sampleJson
        }
        return
    }
    $ollamaBase = $script:OllamaBase
    $results = $items | ForEach-Object -Parallel {
        $m = $using:Model
        $base = $using:ollamaBase
        $s = $using:settings
        $body = @{ model = $m; messages = @(@{ role = 'user'; content = $_.prompt }); stream = $false }
        if ($null -ne $s.Think) { $body.think = $s.Think }
        if ($null -ne $s.MaxTokens) { $body.options = @{ num_predict = [int]$s.MaxTokens } }
        $body = $body | ConvertTo-Json -Depth 6
        $sw = [Diagnostics.Stopwatch]::StartNew()
        try {
            $r = Invoke-RestMethod "$base/api/chat" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 600
            $sw.Stop()
            [pscustomobject]@{
                call_id = [guid]::NewGuid().ToString('N').Substring(0, 12)
                id = $_.id; index = $_.index; text = $r.message.content
                served_model = $r.model; done_reason = $r.done_reason
                tokens_in = $r.prompt_eval_count; tokens_out = $r.eval_count
                wall_ms = [int]$sw.ElapsedMilliseconds; error = $null
            }
        } catch {
            $sw.Stop()
            [pscustomobject]@{
                call_id = [guid]::NewGuid().ToString('N').Substring(0, 12)
                id = $_.id; index = $_.index; text = $null
                served_model = $null; done_reason = $null
                tokens_in = $null; tokens_out = $null
                wall_ms = [int]$sw.ElapsedMilliseconds; error = $_.Exception.Message
            }
        }
    } -ThrottleLimit $Parallel
    $results = $results | Sort-Object index
    $dir = Split-Path $outPath -Parent
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $exec = Get-ExecutionInfo -P 'ollama' -M $Model
    $enriched = foreach ($r in $results) {
        $cost = if ($r.error) { $null } else {
            Get-EstimatedCost -Provider 'ollama' -M $Model -TokensIn $r.tokens_in -TokensOut $r.tokens_out
        }
        $basis = if ($r.error) { 'unknown' }
            elseif ($exec.Execution -eq 'local-weights') { 'free-local' }
            elseif ($null -ne $cost) { 'estimated-api-equivalent' }
            else { 'unknown' }
        [pscustomobject]@{
            call_id           = $r.call_id
            item_id           = $r.id
            requested_model   = $Model
            served_model      = $r.served_model
            provider          = 'ollama'
            execution         = $exec.Execution
            transport         = $exec.Transport
            effort            = $settings.Effort
            effort_source     = $settings.EffortSource
            max_tokens        = $settings.MaxTokens
            max_tokens_source = $settings.MaxTokensSource
            context_handling  = $settings.ContextHandling
            advertised_context = $settings.AdvertisedContext
            tokens_in         = $r.tokens_in
            tokens_out        = $r.tokens_out
            done_reason       = $r.done_reason
            cost_usd          = $cost
            cost_basis        = $basis
            wall_ms           = $r.wall_ms
            text              = $r.text
            error             = $r.error
        }
    }
    $enriched | ForEach-Object { ($_ | ConvertTo-Json -Compress -Depth 5) } | Set-Content -Path $outPath -Encoding utf8
    $ok = @($enriched | Where-Object { -not $_.error }).Count
    foreach ($r in $enriched) {
        Add-LedgerEntry @{
            id                = $r.call_id
            route             = 'local'
            provider          = 'ollama'
            execution         = $r.execution
            transport         = $r.transport
            cost_basis        = $r.cost_basis
            model             = $Model
            requested_model   = $Model
            served_model      = $r.served_model
            effort            = $r.effort
            effort_source     = $r.effort_source
            max_tokens        = $r.max_tokens
            max_tokens_source = $r.max_tokens_source
            context_handling  = $r.context_handling
            advertised_context = $r.advertised_context
            tokens_in         = $r.tokens_in
            tokens_out        = $r.tokens_out
            done_reason       = $r.done_reason
            cost_usd          = $r.cost_usd
            wall_ms           = $r.wall_ms
            exit_code         = if ($r.error) { 1 } else { 0 }
            note              = if ($r.error) { "error: $($r.error)" } else { "item=$($r.item_id)" }
        } | Out-Null
    }
    Write-Host "[batch] $ok/$($enriched.Count) ok -> $outPath"
}

function Invoke-Accept {
    if (-not $Cmd) { throw "accept needs -Cmd, the command that decides success." }
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("route-accept-" + [guid]::NewGuid().ToString('N') + '.ps1')
    Set-Content -Path $tmp -Value $Cmd -Encoding utf8
    $p = Start-Process pwsh -ArgumentList @('-NoProfile', '-File', $tmp) -Wait -PassThru -NoNewWindow
    $code = $p.ExitCode
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue

    $entries = @(Read-Ledger)
    $targets = @($entries | Where-Object { $_.task -eq $Task })
    if ($targets.Count -eq 0) { throw "No ledger entries for task '$Task'." }
    $picked = if ($All) { $targets } else { @($targets[-1]) }
    foreach ($t in $picked) {
        $t.accepted = ($code -eq 0)
        $t.exit_code = $code
        $t.retries = [int]$t.retries + 1
        $t | Add-Member -NotePropertyName acceptance_cmd -NotePropertyValue $Cmd -Force
    }
    Save-Ledger $entries
    Write-Host "[accept] task=$Task exit=$code accepted=$($code -eq 0) entries=$($picked.Count)"
    if ($code -ne 0) { exit $code }
}

function Invoke-Defer {
    if (-not $Reason) { throw "defer needs -Reason, why the work stays in-session." }
    $e = Add-LedgerEntry @{ route = 'defer'; provider = $null; note = $Reason }
    Write-Host "[defer] task=$Task id=$($e.id) reason=$Reason"
}

function Invoke-Report {
    $entries = @(Read-Ledger)
    if ($entries.Count -eq 0) {
        if ($Json) { '[]' } else { Write-Host 'no entries yet' }
        return
    }
    $rows = $entries | Group-Object {
        $c = if ($_.PSObject.Properties['class'] -and $_.class) { $_.class } else { 'uncategorized' }
        $ef = if ($_.PSObject.Properties['effort'] -and $_.effort) { $_.effort } else { 'default' }
        $parts = @()
        if ($ByClass) { $parts += $c }
        if ($ByEffort) { $parts += $ef }
        $parts += @($_.route, $_.provider, $_.model)
        ($parts -join '|')
    } | ForEach-Object {
        $g = $_.Group
        $acc = @($g | Where-Object { $_.accepted }).Count
        $known = @($g | Where-Object { $null -ne $_.cost_usd })
        $cost = if ($known.Count) { ($known | Measure-Object cost_usd -Sum).Sum } else { $null }
        $tok = @($g | Where-Object { $null -ne $_.tokens_in -or $null -ne $_.tokens_out -or $null -ne $_.tokens_total })
        $tokenSum = 0
        foreach ($e in $tok) {
            if ($null -ne $e.tokens_in -or $null -ne $e.tokens_out) {
                $tokenSum += [int]$e.tokens_in + [int]$e.tokens_out
            } else {
                $tokenSum += [int]$e.tokens_total
            }
        }
        $tokens = if ($tok.Count) { $tokenSum } else { $null }
        [pscustomobject]@{
            class       = if ($g[0].PSObject.Properties['class'] -and $g[0].class) { $g[0].class } else { 'uncategorized' }
            effort      = if ($g[0].PSObject.Properties['effort'] -and $g[0].effort) { $g[0].effort } else { 'default' }
            route       = $g[0].route
            provider    = $g[0].provider
            model       = $g[0].model
            attempts    = $g.Count
            accepted    = $acc
            accept_rate = if ($g.Count) { [math]::Round(100 * $acc / $g.Count, 0) } else { 0 }
            avg_wall_ms = [int](($g | Where-Object { $_.wall_ms } | Measure-Object wall_ms -Average).Average)
            tokens      = $tokens
            cost_usd    = if ($null -ne $cost) { [math]::Round($cost, 4) } else { $null }
            cost_per_accepted = if ($null -ne $cost -and $acc -gt 0) { [math]::Round($cost / $acc, 4) } else { $null }
        }
    }
    if ($Json) { return ($rows | ConvertTo-Json -Depth 4) }
    $cols = @()
    if ($ByClass) { $cols += 'class' }
    if ($ByEffort) { $cols += 'effort' }
    $cols += @('route', 'provider', 'model', 'attempts', 'accepted', 'accept_rate', 'avg_wall_ms', 'tokens', 'cost_usd', 'cost_per_accepted')
    $sort = @($cols | Where-Object { $_ -in @('class', 'effort', 'route', 'provider', 'model') })
    $rows | Sort-Object $sort | Format-Table -Property $cols -AutoSize
}

function Invoke-Prices {
    if (-not $Model) { throw "prices needs -Model." }
    $kind = Get-ModelKind $Model
    $price = Get-Price $Model
    $isFree = ($kind -eq 'local')
    $obj = [pscustomobject]@{
        model  = $Model
        kind   = $kind
        free   = $isFree
        priced = [bool]$price
        in     = if ($price) { $price.in } else { $null }
        out    = if ($price) { $price.out } else { $null }
        note   = if ($price -and $price.note) { $price.note } else { $null }
    }
    if ($Json) { return ($obj | ConvertTo-Json -Depth 4) }
    $desc = if ($isFree) { 'free (local weights)' } elseif ($price) { "`$$($price.in)/M in, `$$($price.out)/M out" } else { 'unpriced - cost will be n/a' }
    Write-Host "$Model : $kind; $desc"
}

function Invoke-Settings {
    if (-not $Model) { throw "settings needs -Model." }
    $prov = Resolve-Provider $Model
    $s = Resolve-CallSettings -M $Model -P $prov -EffortOverride $Effort -MaxTokensOverride $MaxTokens
    $body = $null
    if ($prov -eq 'ollama') {
        $b = @{ model = $Model; messages = @(@{ role = 'user'; content = '<prompt>' }); stream = $false }
        if ($null -ne $s.Think) { $b.think = $s.Think }
        if ($null -ne $s.MaxTokens) { $b.options = @{ num_predict = [int]$s.MaxTokens } }
        $body = $b | ConvertTo-Json -Depth 6
    }
    if ($Json) {
        [pscustomobject]@{ settings = $s; bodyPreview = $body } | ConvertTo-Json -Depth 6
        return
    }
    Write-Host "$Model ($prov)"
    Write-Host "  effort:     $($s.Effort) [$($s.EffortSource)]"
    Write-Host "  max_tokens: $(if ($null -ne $s.MaxTokens) { $s.MaxTokens } else { 'not sent' }) [$($s.MaxTokensSource)]"
    Write-Host "  context:    $($s.ContextHandling); advertised capacity: $(if ($s.AdvertisedContext) { $s.AdvertisedContext } else { 'unknown' })"
    if ($body) { Write-Host "  body:       $body" }
}

function Show-Help {
    @"
route.ps1 - DSH model routing

  probe   [-Smoke] [-Json]                  what is reachable now
  call    -Route local|external -Model M -Prompt P|-PromptFile F [-Task T]
          [-Effort off|low|medium|high|xhigh|max] [-MaxTokens N]
          [-TimeoutSec N] [-DryRun] [-Json]  one call, one ledger line, one receipt
  batch   -Model M -PromptFile items.jsonl [-Parallel 2] [-Effort L] [-MaxTokens N]
          [-Out F]                           free local fan-out, JSONL in and out
  accept  -Task T -Cmd "pytest -q" [-All]   run the check, record the result
  defer   -Task T -Reason "..."             work that stays in-session
  report  [-ByClass] [-ByEffort] [-Json]    attempts, acceptance, cost per accepted
                                            group by class and/or effort
  prices  -Model M [-Json]                  kind and rate for a model (is it treated as free?)
  settings -Model M [-Effort L] [-MaxTokens N] [-Json]
                                            resolved effort, output allowance and context handling

Models listed in config/model-settings.json get explicit request settings;
every other model keeps the provider's own defaults.
Ledger: .state/ledger.jsonl (override with DSH_ROUTING_LEDGER)
Prices: config/prices.json (API-equivalent list rates; informational)
Docs:   references/decision-rubric.md, external-calls.md, worktree-protocol.md
"@ | Write-Host
}

switch ($Verb) {
    'probe' { Invoke-Probe }
    'call' { Invoke-Call }
    'batch' { Invoke-Batch }
    'accept' { Invoke-Accept }
    'defer' { Invoke-Defer }
    'report' { Invoke-Report }
    'prices' { Invoke-Prices }
    'settings' { Invoke-Settings }
    'help' { Show-Help }
}
