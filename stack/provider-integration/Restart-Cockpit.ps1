# SCOPE: ownership-checked Halo cockpit restart only; no model warming/unloading.
[CmdletBinding()]
param([ValidateSet('Stop','Start')][string]$Action)
$ErrorActionPreference='Stop'
$stack=Split-Path $PSScriptRoot -Parent
$logRoot=Join-Path $env:USERPROFILE '.dsh\logs'
if($Action -eq 'Stop'){
 $payload=@{type='client-request';rpcId=[guid]::NewGuid().ToString();method='session.list';payload=@{}}|ConvertTo-Json -Depth 4
 $state=Invoke-RestMethod -Uri 'http://127.0.0.1:3080/api/session.list' -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 30
 if(-not $state.result.ok -or @($state.result.value.items|Where-Object running).Count){throw 'DSH activity unknown or active. No process stopped.'}
 $record=Get-Content -LiteralPath (Join-Path $logRoot 'halo-cockpit.pid.json') -Raw|ConvertFrom-Json
 $supervisor=Get-CimInstance Win32_Process -Filter "ProcessId=$($record.SupervisorPid)"
 $child=Get-CimInstance Win32_Process -Filter "ProcessId=$($record.Pid)"
 if($supervisor.CommandLine -notlike '*dsh-halo-research*Run-HaloCockpit.ps1*' -or $child.ParentProcessId -ne $supervisor.ProcessId){throw 'Cockpit ownership mismatch'}
 Stop-Process -Id $supervisor.ProcessId -Force
 & "$env:SystemRoot\System32\taskkill.exe" /PID $record.Pid /T /F
 if($LASTEXITCODE -ne 0){throw 'Owned DSH tree stop failed; inspect before starting'}
}else{
 if(@([Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()|Where-Object Port -eq 3080).Count){throw 'Port 3080 is occupied; no duplicate started'}
 $stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
 $args=@('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+(Join-Path $stack 'Run-HaloCockpit.ps1')+'"'),'-WorkRoot','C:\Users\scott\Desktop\Code','-Port','3080')
 $p=Start-Process -FilePath powershell.exe -ArgumentList $args -WorkingDirectory 'C:\Users\scott\Desktop\Code' -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot "promotion-supervisor-$stamp.stdout.log") -RedirectStandardError (Join-Path $logRoot "promotion-supervisor-$stamp.stderr.log")
 [pscustomobject]@{SupervisorPid=$p.Id;Status='Started; health not yet verified';ModelsTouched=$false}|ConvertTo-Json
}
