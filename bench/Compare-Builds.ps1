<#
  Compare-Builds.ps1 — Unsloth Q5_K_XL (incumbent) vs bartowski Q5_K_M.

  Two vendors, nominally the same bit-depth, different imatrix calibration and
  different per-tensor type selection. The question is whether the incumbent in
  §12.3 is the right choice.

  Measures both dimensions, because a quantisation can trade one for the other:
    SPEED   — TTFT, prefill, decode on an ~8 KB prompt with a unique nonce so the
              prompt cache cannot be measured by accident.
    QUALITY — the five intuition traps from Test-ReasoningEffort.ps1, where a
              shallow answer is reliably wrong. Exact integer grading, no judge.

  Hygiene, per §17: one model resident at a time, a discarded warm-up before any
  timed work, no concurrent access. The incumbent is reloaded in `finally` so the
  machine is left as found even if this fails.
#>
[CmdletBinding()]
param(
    [int]    $Reps      = 3,
    [int]    $Ctx       = 16384,
    [string] $Incumbent = 'unsloth/qwen3.8-27b',
    [string] $Challenger= 'bartowski/qwen3.8-27b',
    [string] $Base      = 'http://localhost:1234/v1',
    [string] $OutDir    = 'C:\Users\scott\Desktop\Code\dsh-halo-research\evidence'
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$TASKS = @(
    @{ id='ball';    expect=5;  trap=10;  q='A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How many CENTS does the ball cost? Reply with the integer only.' }
    @{ id='letters'; expect=8;  trap=6;   q='How many times does the letter r appear in total across these three words: strawberry raspberry blueberry? Reply with the integer only.' }
    @{ id='modpow';  expect=9;  trap=7;   q='What is 7^100 mod 13? Reply with the integer only.' }
    @{ id='widgets'; expect=5;  trap=100; q='If 5 machines take 5 minutes to make 5 widgets, how many MINUTES do 100 machines take to make 100 widgets? Reply with the integer only.' }
    @{ id='snail';   expect=8;  trap=10;  q='A snail is at the bottom of a 10 metre well. Each day it climbs 3 metres; each night it slips back 2 metres. On which DAY NUMBER does it first reach the top? Reply with the integer only.' }
)

function Get-LastInteger {
    param([string] $Text)
    if (-not $Text) { return $null }
    $c = $Text -replace '(?s)<think>.*?</think>', ''
    $c = $c -replace '(?<=\d),(?=\d)', ''
    $m = [regex]::Matches($c, '-?\d+')
    if ($m.Count -eq 0) { return $null }
    $m[$m.Count-1].Value
}

function Get-LoadedId {
    $ps = & lms ps --json 2>$null | ConvertFrom-Json
    if ($ps -and $ps.Count -gt 0) { return $ps[0].identifier }
    elseif ($ps) { return $ps.identifier }
    $null
}

function Invoke-Chat {
    param([string] $Model, [string] $Prompt, [int] $MaxTokens = 4000)
    $body = @{
        model = $Model
        messages = @(@{ role='user'; content=$Prompt })
        max_tokens = $MaxTokens; temperature = 1.0; top_p = 0.95; top_k = 20
    } | ConvertTo-Json -Depth 8
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-RestMethod "$Base/chat/completions" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 1800
    $sw.Stop()
    [pscustomobject]@{
        Text = $r.choices[0].message.content
        Prompt = [int]$r.usage.prompt_tokens
        Completion = [int]$r.usage.completion_tokens
        Reasoning = [int]$r.usage.completion_tokens_details.reasoning_tokens
        Seconds = $sw.Elapsed.TotalSeconds
        Truncated = ($r.choices[0].finish_reason -eq 'length')
    }
}

function Measure-Build {
    param([string] $Key)

    Write-Host "`n=== $Key ===" -ForegroundColor Cyan
    Write-Host '  unloading all ...' -NoNewline
    & lms unload --all 2>&1 | Out-Null
    Write-Host ' ok'
    Write-Host "  loading (ctx $Ctx) ..." -NoNewline
    & lms load $Key --context-length $Ctx --gpu max -y 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    $id = Get-LoadedId
    if (-not $id) { throw "nothing resident after loading $Key" }
    Write-Host " ok -> $id"

    # ---- warm-up, discarded: the first call includes lazy init
    Write-Host '  warm-up (discarded) ...' -NoNewline
    $null = Invoke-Chat -Model $id -Prompt 'Reply with the single digit 1.' -MaxTokens 32
    Write-Host ' done'

    # ---- SPEED: ~8 KB prompt, unique nonce defeats the prompt cache
    $nonce = "Session marker {0}. Ignore this line. " -f (New-Guid).Guid
    $filler = ($nonce + ('The facility log records routine telemetry. ' * 180))
    $speedPrompt = $filler + "`n`nSummarise the paragraph above in exactly one sentence."
    Write-Host '  speed probe ...' -NoNewline
    $s = Invoke-Chat -Model $id -Prompt $speedPrompt -MaxTokens 220
    $decode = if ($s.Seconds -gt 0) { [math]::Round($s.Completion / $s.Seconds, 2) } else { 0 }
    Write-Host (" ptok={0} ctok={1} {2:N1}s decode~{3} tok/s" -f $s.Prompt, $s.Completion, $s.Seconds, $decode)

    # ---- QUALITY: the intuition traps
    $rows = @()
    foreach ($t in $TASKS) {
        for ($i = 1; $i -le $Reps; $i++) {
            try { $a = Invoke-Chat -Model $id -Prompt $t.q }
            catch { Write-Host ("    {0,-8} rep{1} ERROR {2}" -f $t.id,$i,$_.Exception.Message); continue }
            $ans  = Get-LastInteger $a.Text
            $ok   = ($null -ne $ans) -and ([int]$ans -eq $t.expect)
            $trap = ($null -ne $ans) -and ([int]$ans -eq $t.trap)
            $rows += [pscustomobject]@{
                Build=$Key; Task=$t.id; Rep=$i; Answer=$ans; Expected=$t.expect
                Correct=$ok; FellForTrap=$trap; ReasoningTokens=$a.Reasoning
                CompletionTokens=$a.Completion; Seconds=[math]::Round($a.Seconds,1); Truncated=$a.Truncated
            }
            Write-Host ("    {0,-8} rep{1}  ans={2,-6} {3}  rtok={4,-5} {5,5:N1}s{6}" -f `
                $t.id,$i,$ans,$(if($ok){'PASS'}elseif($trap){'TRAP'}else{'FAIL'}),$a.Reasoning,$a.Seconds,$(if($a.Truncated){'  TRUNC'}else{''}))
        }
    }

    [pscustomobject]@{
        Build = $Key; Resident = $id
        SpeedPromptTokens = $s.Prompt; SpeedCompletionTokens = $s.Completion
        SpeedSeconds = [math]::Round($s.Seconds,2); DecodeTokPerSec = $decode
        Correct = ($rows | Where-Object Correct).Count; Total = $rows.Count
        Traps = ($rows | Where-Object FellForTrap).Count
        Truncations = ($rows | Where-Object Truncated).Count
        MeanReasoningTokens = [math]::Round((($rows | Measure-Object ReasoningTokens -Average).Average),0)
        MeanSeconds = [math]::Round((($rows | Measure-Object Seconds -Average).Average),1)
        Rows = $rows
    }
}

$results = @()
try {
    foreach ($b in @($Challenger, $Incumbent)) { $results += Measure-Build -Key $b }
}
finally {
    Write-Host "`n=== restoring the incumbent (runs even on failure) ===" -ForegroundColor Yellow
    & lms unload --all 2>&1 | Out-Null
    & lms load $Incumbent --context-length 131072 --gpu max -y 2>&1 | Out-Null
    Write-Host "  resident: $(Get-LoadedId)"
}

if ($results.Count -eq 2) {
    Write-Host "`n=== COMPARISON ===" -ForegroundColor Green
    "{0,-26} {1,>14} {2,>14}" -f 'metric', 'bartowski', 'unsloth'
    $c,$i = $results[0],$results[1]
    "{0,-26} {1,14} {2,14}" -f 'quality (traps)', "$($c.Correct)/$($c.Total)", "$($i.Correct)/$($i.Total)"
    "{0,-26} {1,14} {2,14}" -f 'trap answers',    $c.Traps, $i.Traps
    "{0,-26} {1,14} {2,14}" -f 'truncations',     $c.Truncations, $i.Truncations
    "{0,-26} {1,14} {2,14}" -f 'mean reasoning tok', $c.MeanReasoningTokens, $i.MeanReasoningTokens
    "{0,-26} {1,14} {2,14}" -f 'mean seconds/task', $c.MeanSeconds, $i.MeanSeconds
    "{0,-26} {1,14} {2,14}" -f 'decode tok/s',    $c.DecodeTokPerSec, $i.DecodeTokPerSec
    "{0,-26} {1,14} {2,14}" -f 'prefill prompt tok', $c.SpeedPromptTokens, $i.SpeedPromptTokens
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$results | Select-Object * -ExcludeProperty Rows | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $OutDir "build-compare-summary-$stamp.csv")
$results.Rows | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $OutDir "build-compare-detail-$stamp.csv")
Write-Host "`nwrote build-compare-summary-$stamp.csv and build-compare-detail-$stamp.csv"
