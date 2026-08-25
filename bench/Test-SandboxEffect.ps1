<#
  Test-SandboxEffect.ps1 — does giving the local model a code sandbox make it
  BETTER or WORSE?

  Replicates the comparison in arXiv 2601.16206 ("Computer Environments Elicit
  General Agentic Intelligence in LLMs"). That paper reports up to +15.5 %
  accuracy and up to 8x fewer tokens when a model is given a plain code sandbox
  — but ALSO reports that weak models get WORSE: Qwen3-4B-Instruct drops below
  its own no-tool baseline, uses tools in <3 % of turns, and "wanders".

  The open question this settles: is Qwen3.8-27B on the strong side of that
  line, on THIS box?

  Two arms, identical tasks:
    bare     — one chat call, no tools. Long documents are pasted into the prompt.
    sandbox  — `run_python` tool + an agent loop. Long documents are written to a
               file; the prompt carries only the PATH.

  Every answer is a single integer with a known ground truth, so grading is
  exact and needs no judge — same discipline as Test-ReasoningEffort.ps1.

  Sampling matches the model card / Unsloth thinking mode: temp 1.0, top_p 0.95,
  top_k 20 — identical in both arms so the only variable is the sandbox.

  NOTE: the sandbox arm executes model-written Python. It runs with its working
  directory pinned to a per-run scratch folder and a hard timeout.
#>
[CmdletBinding()]
param(
    [int]      $Reps     = 3,
    [int]      $MaxTurns = 8,
    [int]      $DocLines = 900,
    [string]   $Model    = 'qwen/qwen3.8-27b',
    [string]   $Base     = 'http://localhost:1234/v1',
    [string[]] $Arms     = @('bare','sandbox'),
    [string]   $OutDir   = 'C:\Users\scott\Desktop\Code\dsh-halo-research\evidence',
    [string]   $WorkRoot = 'C:\Users\scott\AppData\Local\Temp\claude\C--Users-scott-Desktop-Code\5fb7f768-980d-4f3b-a82a-bbf3f15d47f1\scratchpad\sandbox-test'
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutDir, $WorkRoot | Out-Null

# ---------------------------------------------------------------- the document
# Deterministic: a fixed seed means both arms see byte-identical content and the
# ground truth is computed from the SAME text the model is given.
function New-FacilityLog {
    param([int] $Lines)
    $sites  = @('Kestrel Ridge','Harrow Flats','Bellow Point','Marlin Reach','Ossary Bend','Trellis Gate')
    $states = @('NOMINAL','NOMINAL','NOMINAL','DEGRADED','FAULT','STANDBY')
    $rows = New-Object System.Collections.Generic.List[object]
    $rnd = [System.Random]::new(20260823)
    for ($i = 1; $i -le $Lines; $i++) {
        $day  = '2026-{0:D2}-{1:D2}' -f $rnd.Next(1,13), $rnd.Next(1,29)
        $site = $sites[$rnd.Next(0,$sites.Count)]
        $st   = $states[$rnd.Next(0,$states.Count)]
        $rd   = $rnd.Next(1000,9999)
        $rows.Add([pscustomobject]@{
            Id = ('SITE-{0:D4}' -f $i); Day = $day; Site = $site; Status = $st; Reading = $rd
        })
    }
    $rows
}

$rows = New-FacilityLog -Lines $DocLines
$docText = ($rows | ForEach-Object {
    '{0} | {1} | {2} | status={3} | reading={4}' -f $_.Day,$_.Id,$_.Site,$_.Status,$_.Reading
}) -join "`n"

$docPathWin = Join-Path $WorkRoot 'facility-log.txt'
Set-Content -Path $docPathWin -Value $docText -Encoding UTF8 -NoNewline

# ground truth, computed from the same rows the model sees
$targetId  = 'SITE-{0:D4}' -f [int]($DocLines * 0.61)          # buried well past the middle
$gtFind    = ($rows | Where-Object Id -eq $targetId).Reading
$gtCount   = ($rows | Where-Object Status -eq 'FAULT').Count
$gtSum     = ($rows | Where-Object Site -eq 'Kestrel Ridge' | Measure-Object Reading -Sum).Sum

Write-Host ("document: {0} lines, {1:N0} bytes -> {2}" -f $DocLines, $docText.Length, $docPathWin)
Write-Host ("ground truth: find({0})={1}  faultCount={2}  kestrelSum={3}`n" -f $targetId,$gtFind,$gtCount,$gtSum)

# ---------------------------------------------------------------------- tasks
# `doc` tasks carry the long document. Compute tasks are pure reasoning load.
$TASKS = @(
    @{ id='modpow';   doc=$false; expect=([bigint]::ModPow(7, 1000, 9973))
       q='What is 7^1000 mod 9973?' }
    @{ id='primes';   doc=$false; expect=5736396
       q='What is the sum of all prime numbers strictly below 10000?' }
    @{ id='collatz';  doc=$false; expect=6171
       q='Considering every starting number under 10000, which starting number produces the longest Collatz sequence? (Collatz: n -> n/2 if even, 3n+1 if odd, until reaching 1.)' }
    @{ id='docfind';  doc=$true;  expect=$gtFind
       q=("In the facility log, what is the reading value for entry {0}?" -f $targetId) }
    @{ id='doccount'; doc=$true;  expect=$gtCount
       q='In the facility log, how many entries have status=FAULT?' }
    @{ id='docsum';   doc=$true;  expect=$gtSum
       q='In the facility log, what is the SUM of the reading values for all entries whose site is Kestrel Ridge?' }
)

$SUFFIX = ' Reply with the integer only, on the last line of your response.'

$RUN_PYTHON = @{
    type = 'function'
    function = @{
        name = 'run_python'
        description = 'Execute Python 3 source in a sandbox and return its stdout and stderr. The working directory contains the task files.'
        parameters = @{
            type = 'object'
            properties = @{ code = @{ type = 'string'; description = 'Python 3 source to execute.' } }
            required = @('code')
        }
    }
}

# ------------------------------------------------------------------ execution
function Invoke-SandboxPython {
    param([string] $Code, [string] $Cwd)
    $f = Join-Path $Cwd ('_snippet_{0}.py' -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
    Set-Content -Path $f -Value $Code -Encoding UTF8
    $so = "$f.out"; $se = "$f.err"
    try {
        $p = Start-Process -FilePath 'python' -ArgumentList @('-I', $f) -WorkingDirectory $Cwd `
                 -NoNewWindow -PassThru -RedirectStandardOutput $so -RedirectStandardError $se
        if (-not $p.WaitForExit(60000)) { try { $p.Kill() } catch {} ; return 'ERROR: execution timed out after 60s.' }
        $out = (Get-Content $so -Raw -EA SilentlyContinue)
        $err = (Get-Content $se -Raw -EA SilentlyContinue)
        $txt = ''
        if ($out) { $txt += $out }
        if ($err) { $txt += "`n[stderr]`n$err" }
        if (-not $txt.Trim()) { $txt = '(no output)' }
        if ($txt.Length -gt 4000) { $txt = $txt.Substring(0,4000) + "`n...[truncated]" }
        return $txt
    } catch { return "ERROR: $($_.Exception.Message)" }
      finally { Remove-Item $f,$so,$se -Force -EA SilentlyContinue }
}

function Get-LastInteger {
    param([string] $Text)
    if (-not $Text) { return $null }
    $clean = $Text -replace '(?s)<think>.*?</think>', ''      # drop inline reasoning if present
    $clean = $clean -replace '(?<=\d),(?=\d)', ''             # join 1,234,567 -> 1234567 (digits only)
    $m = [regex]::Matches($clean, '-?\d+')
    if ($m.Count -eq 0) { return $null }
    return $m[$m.Count-1].Value
}

function Invoke-Chat {
    param($Messages, $Tools)
    $b = @{
        model = $Model; messages = $Messages
        max_tokens = 4000; temperature = 1.0; top_p = 0.95; top_k = 20
    }
    if ($Tools) { $b.tools = $Tools; $b.tool_choice = 'auto' }
    Invoke-RestMethod "$Base/chat/completions" -Method Post -ContentType 'application/json' `
        -Body ($b | ConvertTo-Json -Depth 14) -TimeoutSec 1800
}

# ---------------------------------------------------------------------- arms
function Invoke-Arm {
    param([string] $Arm, $Task, [string] $RunDir)

    $sw = [Diagnostics.Stopwatch]::StartNew()
    $pTok = 0; $cTok = 0; $turns = 0; $toolCalls = 0; $hitCap = $false

    if ($Arm -eq 'bare') {
        $content = if ($Task.doc) { "Here is a facility log.`n`n<log>`n$docText`n</log>`n`n$($Task.q)$SUFFIX" }
                   else            { "$($Task.q)$SUFFIX" }
        $r = Invoke-Chat -Messages @(@{ role='user'; content=$content }) -Tools $null
        $turns = 1
        $pTok = [int]$r.usage.prompt_tokens; $cTok = [int]$r.usage.completion_tokens
        $answer = Get-LastInteger $r.choices[0].message.content
    }
    else {
        $intro = if ($Task.doc) {
            "You have a Python sandbox. The working directory contains 'facility-log.txt', a facility log with one entry per line in the form:`n2026-03-14 | SITE-0417 | Kestrel Ridge | status=NOMINAL | reading=4821`n`n$($Task.q)$SUFFIX"
        } else {
            "You have a Python sandbox available via the run_python tool.`n`n$($Task.q)$SUFFIX"
        }
        $msgs = New-Object System.Collections.Generic.List[object]
        $msgs.Add(@{ role='user'; content=$intro })
        $answer = $null

        for ($t = 1; $t -le $MaxTurns; $t++) {
            $r = Invoke-Chat -Messages $msgs.ToArray() -Tools @($RUN_PYTHON)
            $turns++
            $pTok += [int]$r.usage.prompt_tokens; $cTok += [int]$r.usage.completion_tokens
            $m = $r.choices[0].message

            if ($m.tool_calls -and $m.tool_calls.Count -gt 0) {
                $asst = @{ role='assistant'; content=([string]$m.content); tool_calls=$m.tool_calls }
                $msgs.Add($asst)
                foreach ($tc in $m.tool_calls) {
                    $toolCalls++
                    $code = $null
                    try { $code = ($tc.function.arguments | ConvertFrom-Json).code } catch { }
                    $res = if ($code) { Invoke-SandboxPython -Code $code -Cwd $RunDir }
                           else { 'ERROR: could not parse the "code" argument.' }
                    $msgs.Add(@{ role='tool'; tool_call_id=$tc.id; content=[string]$res })
                }
                continue
            }

            $answer = Get-LastInteger $m.content
            break
        }
        if (-not $answer -and $turns -ge $MaxTurns) { $hitCap = $true }
    }

    $sw.Stop()
    [pscustomobject]@{
        Answer = $answer; PromptTokens = $pTok; CompletionTokens = $cTok
        Turns = $turns; ToolCalls = $toolCalls; HitTurnCap = $hitCap
        Seconds = [math]::Round($sw.Elapsed.TotalSeconds,1)
    }
}

# ---------------------------------------------------------------------- main
$rowsOut = @()
foreach ($arm in $Arms) {
    Write-Host "=== ARM: $arm ==="
    foreach ($task in $TASKS) {
        for ($i = 1; $i -le $Reps; $i++) {
            $runDir = Join-Path $WorkRoot ('run-{0}-{1}-{2}' -f $arm,$task.id,$i)
            New-Item -ItemType Directory -Force -Path $runDir | Out-Null
            if ($task.doc) { Copy-Item $docPathWin (Join-Path $runDir 'facility-log.txt') -Force }

            try { $a = Invoke-Arm -Arm $arm -Task $task -RunDir $runDir }
            catch {
                Write-Host ("  {0,-7} {1,-9} rep{2}  ERROR {3}" -f $arm,$task.id,$i,$_.Exception.Message)
                Remove-Item $runDir -Recurse -Force -EA SilentlyContinue
                continue
            }

            $ok = ($null -ne $a.Answer) -and ([string]$a.Answer -eq [string]$task.expect)
            $rowsOut += [pscustomobject]@{
                Arm=$arm; Task=$task.id; Rep=$i; Answer=$a.Answer; Expected=[string]$task.expect
                Correct=$ok; PromptTokens=$a.PromptTokens; CompletionTokens=$a.CompletionTokens
                Turns=$a.Turns; ToolCalls=$a.ToolCalls; HitTurnCap=$a.HitTurnCap; Seconds=$a.Seconds
            }
            Write-Host ("  {0,-7} {1,-9} rep{2}  ans={3,-12} {4}  ptok={5,-7} ctok={6,-6} tools={7} {8,6}s{9}" -f `
                $arm,$task.id,$i,$a.Answer,$(if($ok){'PASS'}else{'FAIL'}),$a.PromptTokens,$a.CompletionTokens,
                $a.ToolCalls,$a.Seconds,$(if($a.HitTurnCap){'  TURN-CAP'}else{''}))

            Remove-Item $runDir -Recurse -Force -EA SilentlyContinue
        }
    }
    $g = $rowsOut | Where-Object Arm -eq $arm
    Write-Host ("  == {0}: {1}/{2} correct | mean ptok {3:N0} | mean ctok {4:N0} | tool calls {5} | mean {6:N1}s`n" -f `
        $arm, ($g|Where-Object Correct).Count, $g.Count,
        ($g|Measure-Object PromptTokens -Average).Average, ($g|Measure-Object CompletionTokens -Average).Average,
        ($g|Measure-Object ToolCalls -Sum).Sum, ($g|Measure-Object Seconds -Average).Average)
}

# ------------------------------------------------------------------- verdict
Write-Host '=== PER-TASK ==='
Write-Host ('{0,-9} {1,-14} {2,-14} {3}' -f 'task','bare','sandbox','prompt-token ratio')
foreach ($task in $TASKS) {
    $b = $rowsOut | Where-Object { $_.Arm -eq 'bare'    -and $_.Task -eq $task.id }
    $s = $rowsOut | Where-Object { $_.Arm -eq 'sandbox' -and $_.Task -eq $task.id }
    if (-not $b -or -not $s) { continue }
    $bp = ($b | Measure-Object PromptTokens -Average).Average
    $sp = ($s | Measure-Object PromptTokens -Average).Average
    $ratio = if ($sp -gt 0) { '{0:N2}x fewer' -f ($bp/$sp) } else { 'n/a' }
    Write-Host ('{0,-9} {1,-14} {2,-14} {3}' -f $task.id,
        ('{0}/{1} correct' -f ($b|Where-Object Correct).Count, $b.Count),
        ('{0}/{1} correct' -f ($s|Where-Object Correct).Count, $s.Count), $ratio)
}

$bAll = $rowsOut | Where-Object Arm -eq 'bare'
$sAll = $rowsOut | Where-Object Arm -eq 'sandbox'
if ($bAll -and $sAll) {
    $bAcc = ($bAll|Where-Object Correct).Count / $bAll.Count
    $sAcc = ($sAll|Where-Object Correct).Count / $sAll.Count
    $usage = if ($sAll.Count) { ($sAll | Where-Object { $_.ToolCalls -gt 0 }).Count / $sAll.Count } else { 0 }
    Write-Host ("`n=== VERDICT ===")
    Write-Host ("  accuracy      bare {0:P0} -> sandbox {1:P0}   ({2:+0.0;-0.0;0.0} pp)" -f $bAcc,$sAcc,(($sAcc-$bAcc)*100))
    Write-Host ("  prompt tokens bare {0:N0} -> sandbox {1:N0}" -f ($bAll|Measure-Object PromptTokens -Average).Average, ($sAll|Measure-Object PromptTokens -Average).Average)
    Write-Host ("  tool-use rate {0:P0} of sandbox runs used the tool at least once" -f $usage)
    Write-Host ("  (paper's weak-model signature: tool use <3% AND accuracy DOWN vs bare)")
}

$csv = Join-Path $OutDir ('sandbox-effect-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.csv')
$rowsOut | Export-Csv -NoTypeInformation -Encoding UTF8 $csv
Write-Host "`nwrote $csv"
