$ErrorActionPreference='Stop'
$appRoot="$env:USERPROFILE/.dsh-stock/tools/patentforge"
$privatePath=Join-Path $appRoot 'config/dsh-connection.private.json'
if(!(Test-Path -LiteralPath $privatePath)){
 @{token=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32));internalSecret=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32));port=4320;installRoot=$appRoot}|ConvertTo-Json|Set-Content -LiteralPath $privatePath
}
$config=Get-Content -LiteralPath $privatePath -Raw|ConvertFrom-Json
$env:DATABASE_URL='file:'+($appRoot.Replace('\','/')+'/data/patentforge.db')
$env:INTERNAL_SERVICE_SECRET=$config.internalSecret;$env:PATENTFORGE_TOKEN=$config.token
$env:PATENTFORGE_CONFIG_DIR=Join-Path $appRoot 'config';$env:NODE_ENV='production';$env:PORT='4320'
$env:ALLOWED_ORIGINS='http://127.0.0.1:4320';$env:FRONTEND_DIST_PATH=Join-Path $appRoot 'frontend/dist'
$env:PRISMA_QUERY_ENGINE_LIBRARY=Join-Path $appRoot 'patentforgelocal-backend-prisma/query_engine-windows.dll.node'
$env:FEASIBILITY_URL='http://127.0.0.1:4321';$env:CLAIM_DRAFTER_URL='http://127.0.0.1:4322';$env:APPLICATION_GENERATOR_URL='http://127.0.0.1:4323';$env:COMPLIANCE_CHECKER_URL='http://127.0.0.1:4324'
$owned=@();$ownershipPath=Join-Path $appRoot 'config/dsh-owned-processes.json';if(Test-Path -LiteralPath $ownershipPath){$owned=@(Get-Content -LiteralPath $ownershipPath -Raw|ConvertFrom-Json)}
$services=@(@{name='backend';exe='patentforgelocal-backend.exe';port=4320;args=@();cwd=$appRoot;health='/api/health'},@{name='feasibility';exe='patentforgelocal-feasibility.exe';port=4321;args=@();cwd=$appRoot;health='/health'})
foreach($item in @(@('claim-drafter',4322),@('application-generator',4323),@('compliance-checker',4324))){$services+=@{name=$item[0];exe='runtime/python/python.exe';port=$item[1];args=@('-m','uvicorn','src.server:app','--host','127.0.0.1','--port',[string]$item[1]);cwd=(Join-Path $appRoot ('services/'+$item[0]));health='/health'}}
foreach($svc in $services){
 $prior=$owned|Where-Object port -eq $svc.port|Select-Object -Last 1
 $live=if($prior){Get-Process -Id $prior.pid -ErrorAction SilentlyContinue}else{$null}
 $ownedLive=$live -and [string]::Equals([IO.Path]::GetFullPath($live.Path),[IO.Path]::GetFullPath($prior.executable),[StringComparison]::OrdinalIgnoreCase) -and $live.StartTime.ToUniversalTime().Ticks -eq ([DateTimeOffset]$prior.startedAt).UtcTicks

 try {$health=Invoke-RestMethod -Uri ('http://127.0.0.1:'+$svc.port+$svc.health) -Headers @{Authorization=('Bearer '+$config.token)} -TimeoutSec 1;if($svc.name -eq 'backend' -and $health.service -ne 'patentforge-backend'){throw 'Unexpected listener'};if(!$ownedLive){throw 'Healthy listener has no ownership record'};Write-Output "$($svc.name) already ready on $($svc.port)";continue}catch{}

 if($ownedLive){throw "$($svc.name) is still starting (PID $($prior.pid)); wait and rerun start, do not launch a duplicate"}
 $listener=[Net.Sockets.TcpClient]::new();try{$listener.Connect('127.0.0.1',$svc.port);throw "Port $($svc.port) is already occupied; no process was stopped"}catch [Net.Sockets.SocketException]{}finally{$listener.Dispose()}
 $env:PORT=[string]$svc.port
 if($svc.name -eq 'feasibility'){$env:BETTER_SQLITE3_BINDING=Join-Path $appRoot 'patentforgelocal-feasibility-native/better_sqlite3.node'}
 $params=@{FilePath=(Join-Path $appRoot $svc.exe);WorkingDirectory=$svc.cwd;WindowStyle='Hidden';PassThru=$true;RedirectStandardOutput=(Join-Path $appRoot ('logs/dsh-'+$svc.name+'.out.log'));RedirectStandardError=(Join-Path $appRoot ('logs/dsh-'+$svc.name+'.err.log'))}
 if($svc.args.Count){$params.ArgumentList=$svc.args}
 $p=Start-Process @params;$owned+=@{pid=$p.Id;executable=$params.FilePath;startedAt=$p.StartTime.ToUniversalTime().ToString('o');port=$svc.port;name=$svc.name}
 $owned|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $appRoot 'config/dsh-owned-processes.json')
 $ready=$false;$deadline=(Get-Date).AddSeconds(120);while((Get-Date) -lt $deadline){try{$h=Invoke-RestMethod -Uri ('http://127.0.0.1:'+$svc.port+$svc.health) -Headers @{Authorization=('Bearer '+$config.token)} -TimeoutSec 1;$ready=$true;break}catch{if($p.HasExited){throw "$($svc.name) exited $($p.ExitCode); see its dsh error log"};Start-Sleep -Milliseconds 250}}
 if(!$ready){throw "$($svc.name) startup timed out; ownership retained in config/dsh-owned-processes.json"}
 Write-Output "$($svc.name) ready on $($svc.port) (PID $($p.Id))"
}
