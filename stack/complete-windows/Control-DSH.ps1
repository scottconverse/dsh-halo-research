[CmdletBinding()]
param([ValidateSet('Web','Desktop','Services','Stop','Models','OllamaSignIn','CodexSignIn','ClaudeSignIn')][string]$Action='Web', [string[]]$Models=@(), [switch]$NoOpen)
$ErrorActionPreference='Stop'
if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'Use PowerShell 7 (pwsh) or the DSH Complete shortcuts.' }
$env:DSH_COMPLETE_PWSH=Join-Path $PSHOME 'pwsh.exe'
$root=$PSScriptRoot
$config=Get-Content -Raw -LiteralPath (Join-Path $root 'complete.json') | ConvertFrom-Json
$owner=Get-Content -Raw -LiteralPath (Join-Path $root '.dsh-complete-owner.json') | ConvertFrom-Json
if ($owner.kind -ne 'dsh-complete-v1' -or [IO.Path]::GetFullPath($owner.root) -ne [IO.Path]::GetFullPath($root)) { throw 'Installation ownership mismatch.' }
$runtime=Join-Path $root 'run'
$logs=Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $runtime,$logs | Out-Null
$env:DSH_HOME=Join-Path $root 'home'
$env:DSH_AGENTS_HOME=Join-Path $root 'agents'
$env:CODEX_HOME=Join-Path $root 'data\codex'
$env:CLAUDE_CONFIG_DIR=Join-Path $root 'data\claude'
$env:DSH_TELEMETRY_DISABLED='1'
$env:DSH_OLLAMA_LOCAL_TOKEN='ollama'
$env:OLLAMA_HOST='127.0.0.1:' + $config.ports.ollama
$env:OLLAMA_MODELS=Join-Path $root 'data\ollama-models'
$env:OLLAMA_MAX_LOADED_MODELS='1'
$env:OLLAMA_NUM_PARALLEL='1'
$env:OLLAMA_CONTEXT_LENGTH='16384'
$env:PLAYWRIGHT_BROWSERS_PATH=Join-Path $root 'tools\browsers'
$env:DSH_WIGOLO=Join-Path $root 'node_modules\wigolo\dist\index.js'
$env:WIGOLO_DATA_DIR=Join-Path $root 'data\wigolo'
$env:WIGOLO_CONFIG_PATH=Join-Path $root 'data\wigolo\config.json'
$env:DSH_REDDIT_PARSER=Join-Path $root 'agents\skills\reddit-search\scripts\reddit_extract.py'
$env:DSH_REDLIB_CONFIG=Join-Path $root 'data\reddit-config.json'
$reddit=Get-Content -Raw -LiteralPath $env:DSH_REDLIB_CONFIG | ConvertFrom-Json
$env:DSH_REDDIT_PYTHON=$reddit.python
$env:DSH_REDDIT_PYTHON_LAUNCHER=if ($reddit.pythonLauncher) {'1'} else {'0'}
$env:HALO_DSH_ROOT=$root
$env:HALO_MC_DIR=Join-Path $root 'home\mission-control'
$env:HALO_START_DSH=Join-Path $root 'Start-StockDSH.ps1'
$env:DSH_MC_OLLAMA_ONLY='1'
$env:DSH_MC_OLLAMA_ORIGIN='http://' + $env:OLLAMA_HOST
$env:DSH_MC_STDOUT_LOG=Join-Path $logs 'web.stdout.log'
$env:PATH=(Join-Path $root 'tools\node') + ';' + (Join-Path $root 'node_modules\.bin') + ';' + $PSHOME + ';' + $env:PATH
$node=Join-Path $root 'tools\node\node.exe'
function Get-OwnedProcess([string]$Name) {
    $recordPath=Join-Path $runtime ($Name+'.json')
    if (-not (Test-Path -LiteralPath $recordPath)) { return $null }
    $record=Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
    $actual=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$record.pid)
    if (-not $actual) { return $null }
    if ($actual.ExecutablePath -ne $record.exe -or $actual.CreationDate.ToUniversalTime() -ne ([datetime]$record.startedAt).ToUniversalTime() -or $actual.CommandLine -ne $record.commandLine) { throw "Process identity changed for $Name; no action taken." }
    return $actual
}
function Start-Owned([string]$Name,[string]$Exe,[string[]]$Arguments,[int]$Port=0) {
    if (Get-OwnedProcess $Name) { return }
    if ($Port -and (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)) { throw "Port $Port is already owned. No existing service will be reused or stopped." }
    # Start-Process joins its array on Windows. JSON quoting is not Windows
    # argv quoting; quote each fixed path/argument and reject embedded quotes.
    $quoted=@($Arguments | ForEach-Object { if ($_ -match '["\r\n]') { throw 'Unsafe launch argument' }; '"'+$_.TrimEnd('\')+'"' })
    $process=Start-Process -FilePath $Exe -ArgumentList $quoted -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs ($Name+'.stdout.log')) -RedirectStandardError (Join-Path $logs ($Name+'.stderr.log'))
    Start-Sleep -Milliseconds 300
    $actual=Get-CimInstance Win32_Process -Filter ('ProcessId='+$process.Id)
    if (-not $actual) { throw "$Name exited at startup. Inspect this installation's logs." }
    @{pid=$actual.ProcessId;exe=$actual.ExecutablePath;startedAt=$actual.CreationDate.ToUniversalTime().ToString('o');commandLine=$actual.CommandLine;sha256=(Get-FileHash -LiteralPath $Exe -Algorithm SHA256).Hash;purpose=$Name;port=$Port} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtime ($Name+'.json'))
    if ($Port) {
        $ready=$false
        for($i=0;$i -lt 120;$i++) {
            if (-not (Get-OwnedProcess $Name)) { throw "$Name exited before readiness. Inspect its logs." }
            $listener=Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
            if ($listener) {
                # Web is a direct Node host; Ollama/XERJ/Redlib own their listener.
                if (@($listener | Where-Object OwningProcess -eq $process.Id).Count -eq 0) { throw "Unexpected owner on $Name port $Port. No process stopped." }
                $ready=$true;break
            }
            Start-Sleep -Milliseconds 500
        }
        if (-not $ready) { throw "$Name did not become ready. Owned process receipt retained; inspect logs before retrying." }
    }
}
if ($Action -eq 'Stop') {
    foreach($name in @('desktop','mission-control','web','xerj','redlib','ollama')) {
        $process=Get-OwnedProcess $name
        if ($process) {
            & (Join-Path $env:SystemRoot 'System32\taskkill.exe') /PID $process.ProcessId /T /F | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "Unable to stop verified owned $name; receipt retained." }
            Remove-Item -LiteralPath (Join-Path $runtime ($name+'.json'))
        }
    }
    Write-Output 'Stopped only this installation. Data, goals, settings, models and recovery files retained.'
    exit
}
if ($Action -in @('CodexSignIn','ClaudeSignIn')) {
    if ($Action -eq 'CodexSignIn') { & (Join-Path $root 'node_modules\.bin\codex.cmd') login }
    else { & (Join-Path $root 'node_modules\.bin\claude.cmd') auth login }
    exit $LASTEXITCODE
}
Start-Owned 'ollama' (Join-Path $root 'tools\ollama\ollama.exe') @('serve') $config.ports.ollama
if ($Action -eq 'OllamaSignIn') { & (Join-Path $root 'tools\ollama\ollama.exe') signin; exit $LASTEXITCODE }
if ($Action -eq 'Models') {
    $manifest=Get-Content -Raw -LiteralPath (Join-Path $root 'components.json') | ConvertFrom-Json
    $allowed=@($manifest.models | ForEach-Object id) + @('deepseek-v4.1-flash:1017-cloud')
    if (-not $Models.Count) { throw 'Specify -Models with one or more IDs from README.md. No weights downloaded.' }
    foreach($model in $Models) {
        if ($model -notin $allowed) { throw "Model $model is outside the installer selection. No call made for it." }
        & (Join-Path $root 'tools\ollama\ollama.exe') pull $model
        if ($LASTEXITCODE -ne 0) { throw "Download failed for $model. Existing data retained." }
    }
    # Metadata only: record actual downloaded digests, never an inference probe.
    Invoke-RestMethod -Uri ('http://'+$env:OLLAMA_HOST+'/api/tags') | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $root 'MODEL-RECEIPT.json')
    exit
}
$redlib=Get-Content -Raw -LiteralPath (Join-Path $root 'redlib.json') | ConvertFrom-Json
Start-Owned 'redlib' (Join-Path $root $redlib.exe) @('--address','127.0.0.1','--port',[string]$config.ports.redlib) $config.ports.redlib
Start-Owned 'xerj' (Join-Path $root 'tools\xerj\xerj.exe') @('--insecure','--bind','127.0.0.1','--port',[string]$config.ports.xerj,'--embed-mode','neural','--data-dir',(Join-Path $root 'data\xerj'),'--disable-feedback') $config.ports.xerj
if ($Action -eq 'Services') { exit }
if ($Action -eq 'Desktop') {
    $desktop=Get-Content -Raw -LiteralPath (Join-Path $root 'desktop.json') | ConvertFrom-Json
    # A separate user-data-dir isolates Electron single-instance ownership,
    # cookies, welcome state and logs in addition to the DSH_HOME override.
    Start-Owned 'desktop' (Join-Path $root $desktop.exe) @(('--user-data-dir='+(Join-Path $root 'data\electron')))
} else {
    Start-Owned 'web' $node @((Join-Path $root 'node_modules\@deepseek-ai\dsh\lib\bin.js'),'--profile','web','--no-open') $config.ports.web
    Start-Owned 'mission-control' $node @((Join-Path $root 'stack\stock-dsh\mission-control\mission-control.mjs')) $config.ports.missionControl
    Write-Output ('Mission Control: http://127.0.0.1:'+$config.ports.missionControl)
    Write-Output ('Authenticated DSH Web launch URL is in '+(Join-Path $logs 'web.stdout.log')+'. Keep its token private.')
    if (-not $NoOpen) { Start-Process ('http://127.0.0.1:'+$config.ports.missionControl) | Out-Null }
}
