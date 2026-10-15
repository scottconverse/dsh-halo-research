[CmdletBinding()]
param([ValidateSet('ExistingQ6','RecommendedQ4')][string]$Variant = 'ExistingQ6')
$ErrorActionPreference = 'Stop'
$node = 'C:\Program Files\nodejs\node.exe'
$preflight = Join-Path $PSScriptRoot '..\stock-dsh\model-startup-preflight.mjs'
$served = if ($Variant -eq 'RecommendedQ4') { 'halo-gufo-qwen38-27b-q4-dflash2' } else { 'halo-gufo-qwen38-27b-q6' }
$result = & $node $preflight --gufo-start $served
if ($LASTEXITCODE -ne 0) { throw 'Gufo residency check failed. No models were unloaded.' }
$checked = $result | ConvertFrom-Json
if ($checked.available) { Write-Output $checked.message; return }
$exe = 'C:\Gufo\gufo-windows-2026-10-03\bin\gufo.exe'
$model = 'C:\Users\scott\.lmstudio\models\lmstudio-community\Qwen3.8-27B-GGUF\Qwen3.8-27B-Q6_K.gguf'
$specArgs = @()
if ($Variant -eq 'RecommendedQ4') {
    $model = 'C:\Gufo\models\qwen3.8-27b\Qwen3.8-27B-UD-Q4_K_XL.gguf'
    $draft = 'C:\Gufo\models\qwen3.8-27b\Qwen3.8-27B-DFlash2-Q4_K_M.gguf'
    if (!(Test-Path -LiteralPath $draft)) { throw 'Recommended DFlash2 draft is missing.' }
    $specArgs = @('--speculative','dflash2','--dflash-model',$draft,'--draft-tokens','7')
    $env:GUFO_QWEN27_LOOKUP = '3'
}
if (!(Test-Path -LiteralPath $exe) -or !(Test-Path -LiteralPath $model)) { throw 'Pinned Gufo executable or existing Q6 model is missing.' }
$logs = Join-Path $env:LOCALAPPDATA 'Gufo'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$process = Start-Process -FilePath $exe -ArgumentList (@('serve','--host','127.0.0.1','--port','8080','--sessions','1','llm','--model',$model,'--served-model-name',$served,'--context','131072','--max-tokens','24576','--think','off') + $specArgs) -WorkingDirectory (Split-Path $exe) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'stdout.log') -RedirectStandardError (Join-Path $logs 'stderr.log') -PassThru
Write-Output ('Gufo started PID '+$process.Id+'. Logs: '+$logs)
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if ($process.HasExited) { throw ('Gufo exited before readiness. See '+$logs) }
    try { $ready = Invoke-RestMethod 'http://127.0.0.1:8080/v1/models' -TimeoutSec 1; if ($ready.data.id -contains $served) { Write-Output 'Gufo is ready in both DSH pickers.'; return } } catch { }
    Start-Sleep -Seconds 1
}
throw ('Gufo has not reported ready after 60 seconds. See '+$logs)
