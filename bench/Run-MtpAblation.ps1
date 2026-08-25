<#
  Run-MtpAblation.ps1 — measure what MTP (multi-token prediction / speculative
  decoding) is actually worth on THIS machine, by loading the same model with it
  disabled and then restoring it.

  Prompted by the DFlash-2 analysis, whose central practical claim is that many
  people never enabled MTP and are comparing against a baseline nobody runs.
  On a bandwidth-bound APU the uplift may differ sharply from a discrete GPU,
  because speculation spends spare COMPUTE to save memory traffic.

  Always restores MTP-on, even on failure.
#>
param(
    [string]$Bench = 'C:\Users\scott\Desktop\Code\dsh-halo-research\bench\Bench-Local.ps1'
)
$ErrorActionPreference = 'Continue'

function Reload($mtpOn) {
    & lms unload qwen/qwen3.8-27b 2>&1 | Out-Null
    $flag = if ($mtpOn) { '--speculative-draft-mtp' } else { '--no-speculative-draft-mtp' }
    & lms load unsloth/qwen3.8-27b --identifier qwen/qwen3.8-27b `
        --context-length 131072 --parallel 1 --ttl 86400 $flag -y 2>&1 | Select-Object -Last 1
}

function DraftStats {
    $b = @{ model='qwen/qwen3.8-27b'; messages=@(@{role='user';content='Count to twenty, digits only.'});
            max_tokens=120; temperature=0 } | ConvertTo-Json -Depth 5
    try {
        $r = Invoke-RestMethod 'http://localhost:1234/v1/chat/completions' -Method Post `
             -ContentType 'application/json' -Body $b -TimeoutSec 300
        if ($r.stats) { "$($r.stats.accepted_draft_tokens_count)/$($r.stats.total_draft_tokens_count) accepted" }
        else { 'no draft stats reported (speculation off)' }
    } catch { "probe failed: $($_.Exception.Message)" }
}

try {
    Write-Host '=== MTP DISABLED ==='
    Reload $false
    Write-Host ("     draft probe: {0}" -f (DraftStats))
    & $Bench -Label 'vulkan-mtp-off' -Model 'qwen/qwen3.8-27b' -PromptKb 8,32 2>&1 |
        Where-Object { $_ -match 'ptok=' }
}
finally {
    Write-Host '=== restoring MTP (runs even on failure) ==='
    Reload $true
    Write-Host ("     draft probe: {0}" -f (DraftStats))
}
