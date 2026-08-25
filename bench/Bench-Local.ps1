<#
  Bench-Local.ps1 — repeatable inference benchmark against an OpenAI-compatible
  local server. Measures TTFT, prefill throughput and decode throughput across a
  ladder of prompt sizes.

  Non-destructive: uses whatever model the caller names; does not load/unload.
#>
[CmdletBinding()]
param(
    [string]   $BaseUrl   = 'http://localhost:1234/v1',
    [string]   $Model     = 'qwen/qwen3.8-27b',
    [int[]]    $PromptKb  = @(1, 8, 32, 64),
    [int]      $MaxTokens = 192,
    [string]   $Label     = 'vulkan',
    [string]   $OutDir    = 'C:\Users\scott\Desktop\Code\dsh-halo-research\evidence'
)

$ErrorActionPreference = 'Stop'

# A filler that is real prose rather than a repeated token, so the prefill is
# not artificially cheap. ~1 token per 3.6 chars for this tokenizer family.
$sentence = 'The quick brown fox jumps over the lazy dog while seventeen ' +
            'engineers argue about whether the cache should be invalidated ' +
            'before or after the write barrier completes its fence. '

# A unique nonce is prepended to every prompt so that no run can be served from
# a previous run's prefix cache. Without this the ladder measures cache hits
# rather than prefill, and the later (larger) rungs look artificially fast.
function New-Prompt([int]$targetChars) {
    $nonce = "Session marker {0}. Ignore this line. " -f (New-Guid).Guid
    $sb = [System.Text.StringBuilder]::new()
    [void]$sb.Append($nonce)
    while ($sb.Length -lt $targetChars) { [void]$sb.Append($sentence) }
    return $sb.ToString(0, $targetChars)
}

function Invoke-Streamed {
    param([string]$Url, [string]$Body)

    $handler = [System.Net.Http.HttpClientHandler]::new()
    $client  = [System.Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromMinutes(30)

    $req = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, $Url)
    $req.Content = [System.Net.Http.StringContent]::new($Body, [System.Text.Encoding]::UTF8, 'application/json')

    $sw = [Diagnostics.Stopwatch]::StartNew()
    $resp = $client.SendAsync($req, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    $stream = $resp.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
    $reader = [System.IO.StreamReader]::new($stream)

    $ttft = $null; $chunks = 0; $lastUsage = $null
    while (-not $reader.EndOfStream) {
        $line = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if (-not $line.StartsWith('data:')) { continue }
        $payload = $line.Substring(5).Trim()
        if ($payload -eq '[DONE]') { break }
        try { $j = $payload | ConvertFrom-Json } catch { continue }
        if ($j.usage) { $lastUsage = $j.usage }
        $delta = $j.choices[0].delta
        if ($delta -and ($delta.content -or $delta.reasoning_content)) {
            if ($null -eq $ttft) { $ttft = $sw.Elapsed.TotalSeconds }
            $chunks++
        }
    }
    $sw.Stop()
    $reader.Dispose(); $client.Dispose()

    return [pscustomobject]@{
        TtftSec  = $ttft
        TotalSec = $sw.Elapsed.TotalSeconds
        Chunks   = $chunks
        Usage    = $lastUsage
    }
}

# --- Warm-up -------------------------------------------------------------
# LM Studio lets an idle model fall out of residency. The first request after
# an idle period pays a full reload (21 GB from NVMe for the 27B), which lands
# entirely inside TTFT and destroys the first rung. Burn one small request and
# discard it so the ladder measures inference, not paging.
Write-Host '-> warm-up (discarded) ...' -NoNewline
$warm = @{
    model = $Model
    messages = @(@{ role = 'user'; content = 'Say OK.' })
    max_tokens = 16; temperature = 0; stream = $true
} | ConvertTo-Json -Depth 6 -Compress
try {
    $w = Invoke-Streamed -Url "$BaseUrl/chat/completions" -Body $warm
    Write-Host (" done in {0}s" -f [math]::Round($w.TotalSec,1))
} catch { Write-Host " warm-up failed: $($_.Exception.Message)" }

$results = @()
foreach ($kb in $PromptKb) {
    $chars  = $kb * 1024
    $prompt = New-Prompt $chars
    Write-Host ("-> {0,4} KB prompt ..." -f $kb) -NoNewline

    $body = @{
        model       = $Model
        messages    = @(
            @{ role = 'system'; content = 'You are a terse assistant.' },
            @{ role = 'user';   content = ($prompt + "`n`nIn one sentence, what was the animal in the text above?") }
        )
        max_tokens  = $MaxTokens
        temperature = 0
        stream      = $true
        stream_options = @{ include_usage = $true }
    } | ConvertTo-Json -Depth 6 -Compress

    try {
        $r = Invoke-Streamed -Url "$BaseUrl/chat/completions" -Body $body
    } catch {
        Write-Host (" FAILED: {0}" -f $_.Exception.Message)
        $results += [pscustomobject]@{ Label=$Label; Model=$Model; PromptKb=$kb; Error=$_.Exception.Message }
        continue
    }

    $pt = if ($r.Usage) { $r.Usage.prompt_tokens }     else { $null }
    $ct = if ($r.Usage) { $r.Usage.completion_tokens } else { $null }

    $prefill = if ($pt -and $r.TtftSec -and $r.TtftSec -gt 0) { [math]::Round($pt / $r.TtftSec, 1) } else { $null }
    $decode  = if ($ct -and $r.TotalSec -and $r.TtftSec -and ($r.TotalSec - $r.TtftSec) -gt 0) {
                   [math]::Round($ct / ($r.TotalSec - $r.TtftSec), 1)
               } else { $null }

    $row = [pscustomobject]@{
        Label          = $Label
        Model          = $Model
        PromptKb       = $kb
        PromptTokens   = $pt
        CompletionTok  = $ct
        TtftSec        = if ($r.TtftSec)  { [math]::Round($r.TtftSec, 3) }  else { $null }
        TotalSec       = [math]::Round($r.TotalSec, 3)
        PrefillTokPerS = $prefill
        DecodeTokPerS  = $decode
    }
    $results += $row
    Write-Host (" ptok={0} ttft={1}s prefill={2} tok/s decode={3} tok/s" -f $pt, $row.TtftSec, $prefill, $decode)
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$csv   = Join-Path $OutDir ("bench-{0}-{1}.csv" -f $Label, $stamp)
$results | Export-Csv -NoTypeInformation -Encoding UTF8 $csv
Write-Host "`nwrote $csv"
$results | Format-Table -AutoSize
