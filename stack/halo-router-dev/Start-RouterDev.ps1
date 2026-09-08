$ErrorActionPreference = 'Stop'

$DevRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DevHome = Join-Path $DevRoot 'home'
$DshBinary = Join-Path $DevRoot 'node_modules\@deepseek-ai\dsh\lib\bin.js'
$ModuleIdentityCheck = Join-Path $DevRoot 'repair-profile-module-identity.mjs'
$NodeBinary = (Get-Command node.exe -ErrorAction Stop).Source
$PidPath = Join-Path $DevHome 'runtime\halo-router-dev.pid.json'
$StdoutPath = Join-Path $DevHome 'runtime\halo-router-dev.stdout.log'
$StderrPath = Join-Path $DevHome 'runtime\halo-router-dev.stderr.log'
$Port = 3085

if (-not (Test-Path -LiteralPath $DshBinary -PathType Leaf)) {
    throw "DEV DSH binary is missing: $DshBinary"
}
if (-not (Test-Path -LiteralPath $ModuleIdentityCheck -PathType Leaf)) {
    throw "DEV module identity check is missing: $ModuleIdentityCheck"
}
$moduleIdentityOutput = & $NodeBinary $ModuleIdentityCheck --check 2>&1
$moduleIdentityExitCode = $LASTEXITCODE
if ($moduleIdentityExitCode -ne 0) {
    $details = $moduleIdentityOutput -join [Environment]::NewLine
    throw "DEV module identity preflight failed. Run 'node .\repair-profile-module-identity.mjs --repair', inspect its receipt, then retry. Check output:`n$details"
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $PidPath) | Out-Null

if (Test-Path -LiteralPath $PidPath -PathType Leaf) {
    $record = Get-Content -Raw -LiteralPath $PidPath | ConvertFrom-Json
    $existing = Get-Process -Id ([int]$record.pid) -ErrorAction SilentlyContinue
    if ($existing) {
        throw "Halo Router DEV already has a recorded process (PID $($record.pid)); run Stop-RouterDev.ps1 after ownership validation."
    }
    Remove-Item -LiteralPath $PidPath -Force
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    $owners = ($listener | Select-Object -ExpandProperty OwningProcess -Unique) -join ', '
    throw "Port $Port is already listening (PID $owners); refusing to touch the existing process."
}

$oldDshHome = [Environment]::GetEnvironmentVariable('DSH_HOME', 'Process')
$oldPermission = [Environment]::GetEnvironmentVariable('DSH_PERMISSION_MODE', 'Process')
$oldLmStudioApiKey = [Environment]::GetEnvironmentVariable('LMSTUDIO_API_KEY', 'Process')
try {
    $env:DSH_HOME = $DevHome
    $env:DSH_PERMISSION_MODE = 'danger-full-access'
    if ([string]::IsNullOrWhiteSpace($oldLmStudioApiKey)) {
        # The DEV settings contract names this variable. Use a non-secret
        # placeholder only for this child process when the parent has none.
        $env:LMSTUDIO_API_KEY = 'x'
    }
    $dshArguments = @($DshBinary, '--profile', 'web', '--no-open', '--port', [string]$Port)
    $process = Start-Process -FilePath $NodeBinary -ArgumentList $dshArguments -WorkingDirectory $DevRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $StdoutPath -RedirectStandardError $StderrPath
} finally {
    [Environment]::SetEnvironmentVariable('DSH_HOME', $oldDshHome, 'Process')
    [Environment]::SetEnvironmentVariable('DSH_PERMISSION_MODE', $oldPermission, 'Process')
    [Environment]::SetEnvironmentVariable('LMSTUDIO_API_KEY', $oldLmStudioApiKey, 'Process')
}

Start-Sleep -Milliseconds 250
if ($process.HasExited) {
    throw "Halo Router DEV exited during launch; inspect $StderrPath"
}

$record = [ordered]@{
    pid = $process.Id
    port = $Port
    executable = [IO.Path]::GetFullPath($DshBinary)
    node = [IO.Path]::GetFullPath($NodeBinary)
    dshHome = [IO.Path]::GetFullPath($DevHome)
    arguments = $dshArguments
    startedAt = [DateTime]::UtcNow.ToString('o')
    processStartTime = $process.StartTime.ToUniversalTime().ToString('o')
}
$record | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $PidPath -Encoding UTF8
Write-Output ($record | ConvertTo-Json -Compress)
