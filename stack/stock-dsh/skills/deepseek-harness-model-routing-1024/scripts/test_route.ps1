#Requires -Version 7.0
# Plain-PowerShell tests for route.ps1. No network, no model calls, no quota.
$ErrorActionPreference = 'Continue'
$route = Join-Path $PSScriptRoot 'route.ps1'
$script:pass = 0
$script:fail = 0

function Assert($Condition, [string]$Name) {
    if ($Condition) { $script:pass++; Write-Host "PASS  $Name" }
    else { $script:fail++; Write-Host "FAIL  $Name" }
}

function Run([string[]]$ArgList) {
    $out = & pwsh -NoProfile -File $route @ArgList 2>&1 | Out-String
    [pscustomobject]@{ Out = $out; Code = $LASTEXITCODE }
}

$tmp = Join-Path $env:TEMP ("route-test-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
$env:DSH_ROUTING_LEDGER = Join-Path $tmp 'ledger.jsonl'

try {
    # 1. help
    $r = Run @('help')
    Assert ($r.Code -eq 0) 'help exits 0'
    Assert ($r.Out -match 'probe') 'help lists probe'
    Assert ($r.Out -match 'cost per accepted') 'help lists the cost metric'

    # 2. empty report
    $r = Run @('report')
    Assert ($r.Code -eq 0) 'report on empty ledger exits 0'
    Assert ($r.Out -match 'no entries yet') 'report says no entries'

    # 3. defer writes a valid ledger line
    $r = Run @('defer', '-Task', 't-defer', '-Reason', 'handled in session')
    Assert ($r.Code -eq 0) 'defer exits 0'
    Assert (Test-Path $env:DSH_ROUTING_LEDGER) 'ledger file created'
    $line = Get-Content $env:DSH_ROUTING_LEDGER | Select-Object -Last 1
    $obj = $line | ConvertFrom-Json
    Assert ($obj.route -eq 'defer') 'defer route recorded'
    Assert ($obj.task -eq 't-defer') 'defer task recorded'
    Assert ($null -ne $obj.id -and $null -ne $obj.ts) 'entry has id and timestamp'

    # 4. report sees it
    $r = Run @('report')
    Assert ($r.Out -match 'defer') 'report includes defer row'

    # 5. accept passes
    $r = Run @('defer', '-Task', 't-pass', '-Reason', 'x')
    $r = Run @('accept', '-Task', 't-pass', '-Cmd', 'exit 0')
    Assert ($r.Code -eq 0) 'accept with exit 0 exits 0'
    Assert ($r.Out -match 'accepted=True') 'accept records True'
    $e = Get-Content $env:DSH_ROUTING_LEDGER | Select-Object -Last 1 | ConvertFrom-Json
    Assert ($e.accepted -eq $true) 'ledger accepted flips to true'
    Assert ($e.retries -eq 1) 'retries incremented'

    # 6. accept fails and propagates the code
    $r = Run @('defer', '-Task', 't-fail', '-Reason', 'x')
    $r = Run @('accept', '-Task', 't-fail', '-Cmd', 'exit 3')
    Assert ($r.Code -eq 3) 'accept propagates nonzero exit'
    $e = Get-Content $env:DSH_ROUTING_LEDGER | Select-Object -Last 1 | ConvertFrom-Json
    Assert ($e.accepted -eq $false) 'failed acceptance stays false'

    # 7. accept with no entries errors
    $r = Run @('accept', '-Task', 'nope', '-Cmd', 'exit 0')
    Assert ($r.Code -ne 0 -and $r.Out -match 'No ledger entries') 'accept without task errors'

    # 8. dry-run calls construct the right command and write nothing
    $before = (Get-Content $env:DSH_ROUTING_LEDGER).Count
    $r = Run @('call', '-Route', 'local', '-Model', 'qwen3.8:27b-q4_K_M', '-Prompt', 'hi', '-DryRun')
    Assert ($r.Code -eq 0 -and $r.Out -match 'POST') 'local dry run prints the endpoint'
    $r = Run @('call', '-Route', 'external', '-Model', 'gpt-6.1-sol', '-Prompt', 'hi', '-DryRun')
    Assert ($r.Out -match 'codex exec') 'codex dry run routes to codex'
    $r = Run @('call', '-Route', 'external', '-Model', 'haiku', '-Prompt', 'hi', '-DryRun')
    Assert ($r.Out -match 'claude -p') 'claude dry run routes to claude'
    $after = (Get-Content $env:DSH_ROUTING_LEDGER).Count
    Assert ($after -eq $before) 'dry runs do not write ledger entries'

    # 9. self route refuses and says what to do instead
    $r = Run @('call', '-Route', 'self', '-Model', 'x', '-Prompt', 'hi')
    Assert ($r.Code -ne 0 -and $r.Out -match 'in-session') 'self route explains the correct path'

    # 10. batch dry run
    $items = Join-Path $tmp 'items.jsonl'
    @('{"id":"a","prompt":"one"}', '{"id":"b","prompt":"two"}') | Set-Content $items -Encoding utf8
    $r = Run @('batch', '-Model', 'qwen3.8:27b-q4_K_M', '-PromptFile', $items, '-DryRun')
    Assert ($r.Out -match 'would send 2 items') 'batch dry run counts items'

    # 11. batch refuses a paid route
    $r = Run @('batch', '-Route', 'external', '-Model', 'haiku', '-PromptFile', $items)
    Assert ($r.Code -ne 0 -and $r.Out -match 'free lane') 'batch refuses external route'

    # 11b. batch keeps refusing every other cloud tag, but allows the 1017 model
    $r = Run @('batch', '-Model', 'kimi-k3:cloud', '-PromptFile', $items)
    Assert ($r.Code -ne 0 -and $r.Out -match 'cloud tags') 'batch refuses other cloud tags'
    $r = Run @('batch', '-Model', 'deepseek-v4.1-flash:1017-cloud', '-PromptFile', $items, '-DryRun', '-Json')
    $j = $r.Out | ConvertFrom-Json
    Assert ($r.Code -eq 0 -and $j.settings.Effort -eq 'low' -and $j.settings.MaxTokens -eq 65536) '1017 is allowed in batch with its settings'
    Assert ($j.batchBodyPreview -match '"think":\s*"low"' -and $j.batchBodyPreview -match '"num_predict":\s*65536') 'batch preview carries think low and num_predict'

    # 12. every ledger line is valid JSON with the core fields
    $bad = 0
    foreach ($l in Get-Content $env:DSH_ROUTING_LEDGER) {
        try { $o = $l | ConvertFrom-Json } catch { $bad++; continue }
        foreach ($f in @('id', 'ts', 'task', 'route', 'accepted', 'retries')) {
            if ($null -eq $o.$f) { $bad++ }
        }
    }
    Assert ($bad -eq 0) 'all ledger lines are valid and complete'

    # 13. report json parses
    $r = Run @('report', '-Json')
    $parsed = $r.Out | ConvertFrom-Json
    Assert ($r.Code -eq 0 -and $parsed.Count -ge 1) 'report -Json returns rows'

    # 14. pricing classifies models correctly (the -cloud suffix is not local)
    $r = Run @('prices', '-Model', 'qwen3.8:27b-q4_K_M', '-Json')
    $p = $r.Out | ConvertFrom-Json
    Assert ($p.free -eq $true -and $p.kind -eq 'local') 'local weights are free'
    $r = Run @('prices', '-Model', 'deepseek-v4.1-flash:1017-cloud', '-Json')
    $p = $r.Out | ConvertFrom-Json
    Assert ($p.free -eq $false -and $p.in -eq 0.15) 'cloud tag is priced, not free'
    $r = Run @('prices', '-Model', 'gpt-6.1-sol', '-Json')
    $p = $r.Out | ConvertFrom-Json
    Assert ($p.kind -eq 'codex' -and $p.in -eq 2 -and $p.out -eq 10) 'external model reads its rate'
    $r = Run @('prices', '-Model', 'unknown-model', '-Json')
    $p = $r.Out | ConvertFrom-Json
    Assert ($p.priced -eq $false) 'unknown model is unpriced, not zero'

    # 15. effort is passed through per provider
    $r = Run @('call', '-Route', 'local', '-Model', 'qwen3.8:27b-q4_K_M', '-Prompt', 'hi', '-Effort', 'high', '-DryRun', '-Json')
    $j = $r.Out | ConvertFrom-Json
    Assert ($j.settings.Think -eq 'high' -and $j.bodyPreview -match '"think":\s*"high"') 'ollama dry run sends think=high'
    $r = Run @('call', '-Route', 'external', '-Model', 'gpt-6.1-sol', '-Prompt', 'hi', '-Effort', 'high', '-DryRun')
    Assert ($r.Out -match 'model_reasoning_effort=high') 'codex dry run passes model_reasoning_effort'
    $r = Run @('call', '-Route', 'external', '-Model', 'haiku', '-Prompt', 'hi', '-Effort', 'high', '-DryRun')
    Assert ($r.Out -match '--effort high') 'claude dry run passes --effort'
    $r = Run @('call', '-Route', 'local', '-Model', 'qwen3.8:27b-q4_K_M', '-Prompt', 'hi', '-DryRun', '-Json')
    $j = $r.Out | ConvertFrom-Json
    Assert ($j.settings.Effort -eq 'default' -and $j.bodyPreview -notmatch '"think"') 'effort omitted sends no think field'

    # 16. effort is recorded and report can group on it
    $r = Run @('defer', '-Task', 't-effort', '-Effort', 'high', '-Reason', 'x')
    $e = Get-Content $env:DSH_ROUTING_LEDGER | Select-Object -Last 1 | ConvertFrom-Json
    Assert ($e.effort -eq 'high') 'effort recorded on the entry'
    $r = Run @('report', '-ByEffort', '-Json')
    $parsed = $r.Out | ConvertFrom-Json
    Assert ($r.Code -eq 0 -and @($parsed | Where-Object { $_.effort -eq 'high' }).Count -ge 1) 'report -ByEffort groups by effort'

    # 17. -Class is recorded and -ByClass groups on it
    $r = Run @('defer', '-Task', 't-class', '-Class', 'demo', '-Reason', 'x')
    $e = Get-Content $env:DSH_ROUTING_LEDGER | Select-Object -Last 1 | ConvertFrom-Json
    Assert ($e.class -eq 'demo') 'class recorded on the entry'
    $r = Run @('report', '-ByClass', '-Json')
    $parsed = $r.Out | ConvertFrom-Json
    Assert ($r.Code -eq 0 -and @($parsed | Where-Object { $_.class -eq 'demo' }).Count -ge 1) 'report -ByClass groups by class'
    # 18. per-model settings resolver: 1017 gets explicit low + 64K + provider-managed context
    $r = Run @('settings', '-Model', 'deepseek-v4.1-flash:1017-cloud', '-Json')
    $j = $r.Out | ConvertFrom-Json
    $s = $j.settings
    Assert ($s.Effort -eq 'low' -and $s.EffortSource -eq 'model-default') '1017 resolves effort low as model-default'
    Assert ($s.MaxTokens -eq 65536 -and $s.MaxTokensSource -eq 'model-default') '1017 resolves 65536 output tokens as model-default'
    Assert ($s.ContextHandling -eq 'provider-managed' -and $s.AdvertisedContext -eq 1048576) '1017 records provider-managed 1M context'
    Assert ($s.Think -eq 'low') '1017 sends think low'
    Assert ($j.bodyPreview -match '"num_predict":\s*65536' -and $j.bodyPreview -match '"think":\s*"low"') '1017 body carries think and num_predict'
    Assert ($j.bodyPreview -notmatch 'num_ctx') '1017 body does not send num_ctx'

    # 18b. explicit overrides win and are labelled
    $r = Run @('settings', '-Model', 'deepseek-v4.1-flash:1017-cloud', '-Effort', 'high', '-MaxTokens', '8192', '-Json')
    $s = ($r.Out | ConvertFrom-Json).settings
    Assert ($s.Effort -eq 'high' -and $s.EffortSource -eq 'explicit') 'explicit effort override recorded as explicit'
    Assert ($s.MaxTokens -eq 8192 -and $s.MaxTokensSource -eq 'explicit') 'explicit max-tokens override recorded as explicit'

    # 18c. off is a boolean, and invalid efforts are rejected per provider
    $r = Run @('settings', '-Model', 'deepseek-v4.1-flash:1017-cloud', '-Effort', 'off', '-Json')
    $s = ($r.Out | ConvertFrom-Json).settings
    Assert ($s.Think -eq $false) 'off maps to boolean false, not the string'
    $r = Run @('settings', '-Model', 'deepseek-v4.1-flash:1017-cloud', '-Effort', 'xhigh')
    Assert ($r.Code -ne 0 -and $r.Out -match 'not valid for provider') 'xhigh rejected for ollama'
    $r = Run @('settings', '-Model', 'haiku', '-Effort', 'off')
    Assert ($r.Code -ne 0) 'off rejected for claude'

    # 18d. unlisted models keep the provider's own settings
    $r = Run @('settings', '-Model', 'qwen3.8:27b-q4_K_M', '-Json')
    $s = ($r.Out | ConvertFrom-Json).settings
    Assert ($s.Effort -eq 'default' -and $s.EffortSource -eq 'unspecified') 'unlisted model keeps provider default effort'
    Assert ($null -eq $s.MaxTokens -and $s.ContextHandling -eq 'unknown') 'unlisted model gets no cap and unknown context'

    # 18e. the call row preview records the same resolved values
    $r = Run @('call', '-Route', 'local', '-Model', 'deepseek-v4.1-flash:1017-cloud', '-Prompt', 'hi', '-DryRun', '-Json')
    $row = ($r.Out | ConvertFrom-Json).rowPreview
    Assert ($row.effort -eq 'low' -and $row.effort_source -eq 'model-default') 'call row records resolved effort and source'
    Assert ($row.max_tokens -eq 65536 -and $row.max_tokens_source -eq 'model-default') 'call row records cap and source'
    Assert ($row.context_handling -eq 'provider-managed' -and $row.advertised_context -eq 1048576) 'call row separates advertised context from enforcement'

    # 18f. batch shares the resolver and leaves unlisted models alone
    $r = Run @('batch', '-Model', 'qwen3.8:27b-q4_K_M', '-PromptFile', $items, '-DryRun', '-Json')
    $j = $r.Out | ConvertFrom-Json
    Assert ($j.settings.EffortSource -eq 'unspecified' -and $null -eq $j.settings.MaxTokens) 'batch uses the shared resolver'
    Assert ($j.batchBodyPreview -notmatch '"think"' -and $j.batchBodyPreview -notmatch 'num_predict') 'batch sends no settings for unlisted models'
} finally {
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item Env:DSH_ROUTING_LEDGER -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host ("{0} passed, {1} failed" -f $script:pass, $script:fail)
if ($script:fail -gt 0) { exit 1 }

