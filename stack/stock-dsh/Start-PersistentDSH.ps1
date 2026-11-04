[CmdletBinding()]
param([switch] $NoOpen, [switch] $KeepMissionControl)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'Process-Identity.ps1')
. (Join-Path $PSScriptRoot 'Web-Readiness.ps1')
$taskName = 'DSH Halo Web Host'
$pwsh = 'C:\Program Files\PowerShell\7\pwsh.exe'
$start = Join-Path $PSScriptRoot 'Start-StockDSH.ps1'
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $start + '" -PersistentHost -NoOpen'
if ($KeepMissionControl) { $arguments += ' -KeepMissionControl' }
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task -and (([Security.Principal.NTAccount]::new($task.Principal.UserId).Translate([Security.Principal.SecurityIdentifier]).Value -ne [Security.Principal.WindowsIdentity]::GetCurrent().User.Value) -or $task.Principal.RunLevel -ne 'Limited')) {
    throw "Unexpected owner or privilege level for task $taskName; refusing to replace it."
}
if (-not $task -or $task.State -ne 'Running') {
    $action = New-ScheduledTaskAction -Execute $pwsh -Argument $arguments -WorkingDirectory $PSScriptRoot
    $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings -Description 'On-demand DSH Web and Mission Control host. No login trigger or automatic project retry.' -Force | Out-Null
    Start-ScheduledTask -TaskName $taskName
} elseif ($task.Actions.Execute -ne $pwsh -or $task.Actions.Arguments -notlike ('*"' + $start + '" -PersistentHost -NoOpen*')) {
    throw 'Running DSH task has an unexpected action; nothing was replaced.'
}
$deadline = [DateTime]::UtcNow.AddSeconds(150)
$healthy = $false
while ([DateTime]::UtcNow -lt $deadline) {
    try {
        $web = Get-DshWebReadiness
        $mc = Invoke-RestMethod 'http://127.0.0.1:3090/api/status' -NoProxy -TimeoutSec 10
        if ($web.PageStatus -eq 200 -and $web.AssetStatus -eq 200 -and $mc.build.sourceFile -and $mc.build.sourceSha256) {
            $node = 'C:\Program Files\nodejs\node.exe'
            $mcPath = Join-Path $env:USERPROFILE '.dsh-stock\mission-control\mission-control.mjs'
            foreach ($port in @(3080,3090)) {
                $owner = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction Stop | Select-Object -First 1
                $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($owner.OwningProcess)" -ErrorAction Stop
                $expected = if ($port -eq 3080) { @((Join-Path $PSScriptRoot 'node_modules\@deepseek-ai\dsh\lib\bin.js'),'web','--no-open') } else { @($mcPath) }
                if (-not (Test-ExactProcessCommand $process $node $expected)) { throw "Unexpected listener on port $port." }
            }
            if (-not [StringComparer]::OrdinalIgnoreCase.Equals([string]$mc.build.sourceFile,$mcPath) -or $mc.build.sourceSha256 -ne (Get-FileHash -LiteralPath $mcPath -Algorithm SHA256).Hash) { throw 'Mission Control build identity mismatch.' }
            $healthy = $true; break
        }
    } catch { }
    if ((Get-ScheduledTask -TaskName $taskName).State -ne 'Running') {
        throw 'DSH host task exited during startup. Inspect stack-lifecycle.log and DSH error logs.'
    }
    Start-Sleep -Milliseconds 500
}
if (-not $healthy) { throw 'DSH Web did not return its authenticated page and application script. Startup logs are preserved. No process was restarted. If you intend to end Web work, use Stop DSH + Wigolo, wait for shutdown, then Start DSH Web.' }
if (-not $NoOpen) { Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--new-window','http://127.0.0.1:3090/' -WindowStyle Normal | Out-Null }
Write-Output 'DSH Web and Mission Control ready under the independent, limited user task.'
