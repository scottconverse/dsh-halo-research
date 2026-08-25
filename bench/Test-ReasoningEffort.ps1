<#
  Test-ReasoningEffort.ps1 — does `reasoning_effort` change anything measurable,
  and what does each level cost?

  Prompted by two claims worth settling:
    (a) that Qwen3.8 exposes only none/low/medium/xhigh (no `high`);
    (b) that reasoning effort materially changes output quality.

  Tasks are chosen so a FAST, shallow answer is reliably WRONG — the classic
  intuition traps. A model that does not reason gets the trap answer; one that
  does gets the right one. Answers are single integers, so grading is exact and
  needs no judge.

  Sampling follows the model card / Unsloth (they agree): thinking mode
  temperature 1.0, top_p 0.95, top_k 20.
#>
[CmdletBinding()]
param(
    [string[]] $Levels = @('none','low','medium','xhigh'),
    [int]      $Reps   = 3,
    [string]   $Model  = 'qwen/qwen3.8-27b',
    [string]   $Base   = 'http://localhost:1234/v1',
    [string]   $OutDir = 'C:\Users\scott\Desktop\Code\dsh-halo-research\evidence'
)

$TASKS = @(
    @{ id='ball';    expect=5;  trap=10;  q='A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How many CENTS does the ball cost? Reply with the integer only.' }
    @{ id='letters'; expect=8;  trap=6;   q='How many times does the letter r appear in total across these three words: strawberry raspberry blueberry? Reply with the integer only.' }
    @{ id='modpow';  expect=9;  trap=7;   q='What is 7^100 mod 13? Reply with the integer only.' }
    @{ id='widgets'; expect=5;  trap=100; q='If 5 machines take 5 minutes to make 5 widgets, how many MINUTES do 100 machines take to make 100 widgets? Reply with the integer only.' }
    @{ id='snail';   expect=8;  trap=10;  q='A snail is at the bottom of a 10 metre well. Each day it climbs 3 metres; each night it slips back 2 metres. On which DAY NUMBER does it first reach the top? Reply with the integer only.' }
)

function Ask($level, $question) {
    $body = @{
        model    = $Model
        messages = @(@{ role='user'; content=$question })
        max_tokens = 4000
        temperature = 1.0
        top_p = 0.95
        top_k = 20
        chat_template_kwargs = @{ reasoning_effort = $level }
    } | ConvertTo-Json -Depth 6

    $sw = [Diagnostics.Stopwatch]::StartNew()
    $r  = Invoke-RestMethod "$Base/chat/completions" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 900
    $sw.Stop()

    $txt = ($r.choices[0].message.content) -replace '[^0-9\-]', ' '
    $num = ($txt -split '\s+' | Where-Object { $_ -match '^-?\d+$' } | Select-Object -Last 1)

    [pscustomobject]@{
        Answer    = if ($num -ne $null) { [int]$num } else { $null }
        Reasoning = $r.usage.completion_tokens_details.reasoning_tokens
        Completion= $r.usage.completion_tokens
        Seconds   = [math]::Round($sw.Elapsed.TotalSeconds,1)
        Truncated = ($r.choices[0].finish_reason -eq 'length')
    }
}

$rows = @()
foreach ($lvl in $Levels) {
    foreach ($t in $TASKS) {
        for ($i=1; $i -le $Reps; $i++) {
            try   { $a = Ask $lvl $t.q }
            catch { Write-Host ("  {0,-6} {1,-8} rep{2} ERROR {3}" -f $lvl,$t.id,$i,$_.Exception.Message); continue }
            $ok   = ($a.Answer -eq $t.expect)
            $trap = ($a.Answer -eq $t.trap)
            $rows += [pscustomobject]@{
                Level=$lvl; Task=$t.id; Rep=$i; Answer=$a.Answer; Expected=$t.expect
                Correct=$ok; FellForTrap=$trap; ReasoningTokens=$a.Reasoning
                CompletionTokens=$a.Completion; Seconds=$a.Seconds; Truncated=$a.Truncated
            }
            Write-Host ("  {0,-6} {1,-8} rep{2}  ans={3,-5} {4}  rtok={5,-5} {6,5}s{7}" -f `
                $lvl,$t.id,$i,$a.Answer,$(if($ok){'PASS'}elseif($trap){'TRAP'}else{'FAIL'}),$a.Reasoning,$a.Seconds,$(if($a.Truncated){'  TRUNCATED'}else{''}))
        }
    }
    $g = $rows | Where-Object Level -eq $lvl
    Write-Host ("  == {0}: {1}/{2} correct, {3} trap answers, mean rtok {4:N0}, mean {5:N1}s" -f `
        $lvl, ($g|Where-Object Correct).Count, $g.Count, ($g|Where-Object FellForTrap).Count,
        ($g|Measure-Object ReasoningTokens -Average).Average, ($g|Measure-Object Seconds -Average).Average)
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$csv = Join-Path $OutDir ('reasoning-effort-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.csv')
$rows | Export-Csv -NoTypeInformation -Encoding UTF8 $csv
Write-Host "`nwrote $csv"
