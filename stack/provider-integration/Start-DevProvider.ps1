# SCOPE: DSH Halo DEVELOPMENT provider only. Never starts or stops production.
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)][int]$Port = 20129,
    [switch]$PlanOnly
)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ((Split-Path $repo -Leaf) -ne 'dsh-halo-dev') { throw 'This launcher must remain in the dsh-halo-dev repository.' }
$state = Join-Path $repo '.runtime\omniroute'
$entry = Join-Path $PSScriptRoot 'tools\node_modules\omniroute\bin\omniroute.mjs'
$node = Join-Path $repo '.runtime\node\node-v24.20.0-win-x64\node.exe'
if (-not (Test-Path -LiteralPath $node)) { throw 'The verified portable development Node 24.20.0 runtime is missing. No server started.' }
$userProfilePath = [Environment]::GetFolderPath('UserProfile')
# OmniRoute's CLI reads this legacy .env even with explicit DATA_DIR.
# Refuse shared configuration rather than import its credentials/settings.
if (Test-Path -LiteralPath (Join-Path $userProfilePath '.omniroute\.env')) {
    throw 'Shared legacy .omniroute/.env exists. Use a reviewed standalone startup path; no shared settings were read.'
}
if (@([Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
        Where-Object Port -eq $Port).Count -gt 0) { throw "Development provider port $Port is already in use; no process was stopped." }

# A fresh environment avoids accidentally inheriting production provider keys,
# routing, proxy/tunnel settings or NODE_OPTIONS. This is deployment isolation,
# not a restriction on the model's Windows filesystem/tool permissions.
$childEnvironment = @{}
foreach ($name in @('PATH','SystemRoot','WINDIR','COMSPEC','PATHEXT','TEMP','TMP',
        'USERPROFILE','USERNAME','USERDOMAIN','PROCESSOR_ARCHITECTURE','NUMBER_OF_PROCESSORS')) {
    $value = [Environment]::GetEnvironmentVariable($name, 'Process')
    if ($null -ne $value) { $childEnvironment[$name] = $value }
}
$childEnvironment['DATA_DIR'] = $state
$childEnvironment['OMNIROUTE_DATA_DIR'] = $state
$childEnvironment['APPDATA'] = Join-Path $state 'appdata'
$childEnvironment['LOCALAPPDATA'] = Join-Path $state 'localappdata'
$childEnvironment['XDG_CONFIG_HOME'] = Join-Path $state 'config'
$childEnvironment['XDG_CACHE_HOME'] = Join-Path $state 'cache'
$childEnvironment['OMNIROUTE_SERVER_HOST'] = '127.0.0.1'
$childEnvironment['OMNIROUTE_CLI_SKIP_REPO_ENV'] = '1'
$childEnvironment['OMNIROUTE_NO_UPDATE_NOTIFIER'] = '1'
$childEnvironment['NEXT_TELEMETRY_DISABLED'] = '1'
foreach ($name in @('PORT','API_PORT','DASHBOARD_PORT','OMNIROUTE_PORT')) { $childEnvironment[$name] = [string]$Port }
$arguments = @($entry, 'serve', '--port', [string]$Port, '--no-open', '--no-tray', '--no-recovery')
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$stdout = Join-Path $state "logs\provider-$stamp.stdout.log"
$stderr = Join-Path $state "logs\provider-$stamp.stderr.log"
$plan = [ordered]@{ executable = $node; arguments = $arguments; port = $Port; environment = $childEnvironment; stdout = $stdout; stderr = $stderr }
if ($PlanOnly) { $plan | ConvertTo-Json -Depth 5; return }
if (-not (Test-Path -LiteralPath $entry)) { throw 'Install the pinned development dependency in dev/tools first. No server started.' }
$package = Get-Content -LiteralPath (Join-Path (Split-Path (Split-Path $entry -Parent) -Parent) 'package.json') -Raw | ConvertFrom-Json
if ($package.version -ne '3.8.50') { throw "Expected OmniRoute 3.8.50; found $($package.version). Review the new version before launching." }
foreach ($directory in @($state, (Join-Path $state 'logs'), $childEnvironment.APPDATA,
        $childEnvironment.LOCALAPPDATA, $childEnvironment.XDG_CONFIG_HOME, $childEnvironment.XDG_CACHE_HOME)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
}

$previousEnvironment = [Environment]::GetEnvironmentVariables('Process')
try {
    foreach ($name in @($previousEnvironment.Keys)) { [Environment]::SetEnvironmentVariable([string]$name, $null, 'Process') }
    foreach ($name in $childEnvironment.Keys) { [Environment]::SetEnvironmentVariable($name, $childEnvironment[$name], 'Process') }
    # Start-Process joins ArgumentList; quote the absolute entry path explicitly.
    $quotedArguments = @(('"{0}"' -f $entry)) + $arguments[1..($arguments.Count - 1)]
    $ownedProcess = Start-Process -FilePath $node -ArgumentList $quotedArguments -WorkingDirectory $state `
        -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
} finally {
    foreach ($name in @([Environment]::GetEnvironmentVariables('Process').Keys)) { [Environment]::SetEnvironmentVariable([string]$name, $null, 'Process') }
    foreach ($name in $previousEnvironment.Keys) { [Environment]::SetEnvironmentVariable([string]$name, [string]$previousEnvironment[$name], 'Process') }
}
$receipt = [ordered]@{
    owner = 'dsh-halo-dev'; pid = $ownedProcess.Id; startedUtc = $ownedProcess.StartTime.ToUniversalTime().ToString('o')
    executable = $node; entry = $entry; port = $Port; state = $state; stdout = $stdout; stderr = $stderr
    status = 'started-not-yet-health-verified'
}
$receipt | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $state 'launcher.json') -Encoding utf8
$receipt | ConvertTo-Json
