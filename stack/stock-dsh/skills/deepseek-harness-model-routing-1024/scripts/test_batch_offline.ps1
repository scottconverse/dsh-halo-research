#Requires -Version 7.0
# Offline verification of the call and batch request paths.
# Starts a local mock on 127.0.0.1, points OLLAMA_BASE at it, and captures the
# exact request bodies. Makes no model calls and never contacts Ollama.
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$route = Join-Path $PSScriptRoot 'route.ps1'
$pass = 0
$fail = 0

function Assert($Cond, [string]$Name) {
    if ($Cond) { $script:pass++; Write-Host "PASS  $Name" }
    else { $script:fail++; Write-Host "FAIL  $Name" }
}

$tmp = Join-Path $env:TEMP ("route-mock-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
$capture = Join-Path $tmp 'requests.jsonl'
$portFile = Join-Path $tmp 'port.txt'
$ledger = Join-Path $tmp 'ledger.jsonl'
$items1017 = Join-Path $tmp 'items-1017.jsonl'
$itemsQwen = Join-Path $tmp 'items-qwen.jsonl'
$outBatch = Join-Path $tmp 'batch-out.jsonl'

$mock = @'
import json, sys, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

capture, portfile = sys.argv[1], sys.argv[2]
lock = threading.Lock()

class H(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(n).decode('utf-8')
        with lock:
            with open(capture, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"path": self.path, "body": json.loads(body)}) + "\n")
        req = json.loads(body)
        resp = {"model": req.get("model", ""), "message": {"role": "assistant", "content": "MOCK"},
                "done_reason": "stop", "prompt_eval_count": 11, "eval_count": 7}
        raw = json.dumps(resp).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *args):
        pass

srv = ThreadingHTTPServer(('127.0.0.1', 0), H)
with open(portfile, 'w', encoding='utf-8') as f:
    f.write(str(srv.server_address[1]))
srv.serve_forever()
'@
$mockPy = Join-Path $tmp 'mock_ollama.py'
Set-Content -Path $mockPy -Value $mock -Encoding utf8

@('{"id":"a","prompt":"first"}', '{"id":"b","prompt":"second"}') | Set-Content $items1017 -Encoding utf8
@('{"id":"c","prompt":"local"}') | Set-Content $itemsQwen -Encoding utf8

$proc = Start-Process -FilePath 'python' -ArgumentList @($mockPy, $capture, $portFile) -PassThru -WindowStyle Hidden
$env:DSH_ROUTING_LEDGER = $ledger
try {
    $port = $null
    for ($i = 0; $i -lt 50 -and -not $port; $i++) {
        Start-Sleep -Milliseconds 200
        if (Test-Path $portFile) { $port = (Get-Content $portFile -Raw).Trim() }
    }
    if (-not $port) { throw "mock server did not start" }
    $env:OLLAMA_BASE = "http://127.0.0.1:$port"

    function Run([string[]]$ArgList) {
        $out = & pwsh -NoProfile -File $route @ArgList 2>&1 | Out-String
        [pscustomobject]@{ Out = $out; Code = $LASTEXITCODE }
    }

    # 1. one call through the exact DeepSeek id
    $r = Run @('call', '-Route', 'local', '-Model', 'deepseek-v4.1-flash:1017-cloud',
        '-Prompt', 'hello', '-Task', 'mock-call')
    Assert ($r.Code -eq 0) 'call to 1017 succeeds against the mock'

    # 2. two batch items, same exact model
    $r = Run @('batch', '-Model', 'deepseek-v4.1-flash:1017-cloud', '-PromptFile', $items1017,
        '-Task', 'mock-batch', '-Out', $outBatch)
    Assert ($r.Code -eq 0) 'batch to 1017 succeeds against the mock'

    # 3. another cloud model is still blocked, and must not reach the mock
    $before = @(Get-Content $capture | Where-Object { $_ }).Count
    $r = Run @('batch', '-Model', 'kimi-k3:cloud', '-PromptFile', $items1017, '-Task', 'mock-blocked')
    $after = @(Get-Content $capture | Where-Object { $_ }).Count
    Assert ($r.Code -ne 0 -and $r.Out -match 'refuses cloud tags') 'other cloud model is blocked'
    Assert ($after -eq $before) 'blocked model sends no HTTP request'

    # 4. a local model keeps its own settings (no imposed defaults)
    $r = Run @('batch', '-Model', 'qwen3.8:27b-q4_K_M', '-PromptFile', $itemsQwen,
        '-Task', 'mock-local', '-Out', (Join-Path $tmp 'batch-local.jsonl'))
    Assert ($r.Code -eq 0) 'local batch still works'

    # 5. inspect captured requests
    $caps = @(Get-Content $capture | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json })
    Assert ($caps.Count -eq 4) "four requests captured (got $($caps.Count))"
    $deep = @($caps | Where-Object { $_.body.model -eq 'deepseek-v4.1-flash:1017-cloud' })
    Assert ($deep.Count -eq 3) 'one call plus two batch items used the exact DeepSeek id'
    $bad = @($deep | Where-Object {
        $_.body.think -ne 'low' -or $_.body.options.num_predict -ne 65536 -or $_.body.PSObject.Properties.Name -contains 'num_ctx'
    })
    Assert ($bad.Count -eq 0) 'every DeepSeek request carries think low and num_predict 65536, and no num_ctx'
    $localReq = @($caps | Where-Object { $_.body.model -eq 'qwen3.8:27b-q4_K_M' })
    Assert ($localReq.Count -eq 1) 'local model request captured'
    Assert (-not $localReq[0].body.PSObject.Properties.Name.Contains('think') -and
            -not $localReq[0].body.PSObject.Properties.Name.Contains('options')) 'local model gets no imposed settings'

    # 6. ledger rows keep the resolved values and identities
    $rows = @(Get-Content $ledger | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json })
    $batchRows = @($rows | Where-Object { $_.task -eq 'mock-batch' })
    Assert ($batchRows.Count -eq 2) 'two batch ledger rows'
    Assert (@($batchRows | Where-Object { $_.effort -eq 'low' -and $_.effort_source -eq 'model-default' }).Count -eq 2) 'batch rows record effort low as model-default'
    Assert (@($batchRows | Where-Object { $_.max_tokens -eq 65536 -and $_.max_tokens_source -eq 'model-default' }).Count -eq 2) 'batch rows record 65536 as model-default'
    Assert (@($batchRows | Where-Object { $_.context_handling -eq 'provider-managed' -and $_.advertised_context -eq 1048576 }).Count -eq 2) 'batch rows record provider-managed 1M context'
    Assert (@($batchRows | Where-Object { $_.execution -eq 'cloud' -and $_.transport -eq 'ollama-http' }).Count -eq 2) 'batch rows distinguish cloud execution from local transport'
    Assert (@($batchRows | Where-Object { $_.cost_basis -eq 'estimated-api-equivalent' -and $_.cost_usd -gt 0 }).Count -eq 2) 'batch rows price the cloud model as an estimate, not zero'
    Assert (@($batchRows | Where-Object { $_.requested_model -eq 'deepseek-v4.1-flash:1017-cloud' -and $_.served_model -eq 'deepseek-v4.1-flash:1017-cloud' }).Count -eq 2) 'batch rows keep requested and returned model'
    Assert (@($batchRows | Where-Object { $_.tokens_in -eq 11 -and $_.tokens_out -eq 7 -and $_.done_reason -eq 'stop' }).Count -eq 2) 'batch rows keep tokens and stop reason'
    Assert (@($batchRows | ForEach-Object { $_.id } | Sort-Object -Unique).Count -eq 2) 'batch rows have unique call ids'
    $callRow = @($rows | Where-Object { $_.task -eq 'mock-call' })[0]
    Assert ($callRow.effort -eq 'low' -and $callRow.max_tokens -eq 65536 -and $callRow.execution -eq 'cloud') 'call row records the same resolved values'
    $localRow = @($rows | Where-Object { $_.task -eq 'mock-local' })[0]
    Assert ($localRow.cost_basis -eq 'free-local' -and $localRow.execution -eq 'local-weights') 'local batch row is labelled free local inference'
    Assert ($null -eq $localRow.max_tokens -and $localRow.effort_source -eq 'unspecified') 'local batch row has no imposed settings'
} finally {
    if ($proc -and -not $proc.HasExited) { $proc.Kill() }
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item Env:DSH_ROUTING_LEDGER -ErrorAction SilentlyContinue
    Remove-Item Env:OLLAMA_BASE -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host ("{0} passed, {1} failed" -f $pass, $fail)
if ($fail -gt 0) { exit 1 }
