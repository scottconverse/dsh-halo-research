$ErrorActionPreference = 'Stop'
$base = 'C:\Users\scott\AppData\Local\XERJ'
$exe = 'C:\Users\scott\AppData\Local\Programs\xerj\xerj.exe'
if (-not (Test-Path -LiteralPath "$base\server.pid")) { Write-Output 'No recorded XERJ service process.'; exit 0 }
$serviceId = [int](Get-Content -LiteralPath "$base\server.pid" -Raw)
$p = Get-CimInstance Win32_Process -Filter "ProcessId=$serviceId"
if (-not $p) { Write-Output 'Recorded XERJ service is already stopped.'; exit 0 }
if ($p.ExecutablePath -ne $exe -or $p.CommandLine.Replace('/', '\') -notlike "*--data-dir*$base\data*") { throw 'Recorded PID does not match this XERJ installation; refusing to stop it.' }
Stop-Process -Id $serviceId
Write-Output 'XERJ service stopped. DSH will start it again when its XERJ connection starts.'
