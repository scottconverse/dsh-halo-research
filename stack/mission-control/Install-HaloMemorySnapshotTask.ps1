[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [string]$TaskName = 'HALO Memory Snapshot',
    [string]$SnapshotScript = (Join-Path $PSScriptRoot 'Snapshot-HaloMemory.ps1'),
    [string]$UserProfile = $env:USERPROFILE,
    [ValidateRange(1, 8760)]
    [int]$Keep = 168,
    [string]$PowerShellExecutable = [Environment]::ProcessPath,
    [switch]$PlanOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Quote-TaskArgument([string]$Value) {
    if ($Value.Contains('"')) {
        throw "Task argument contains an unsupported quote: $Value"
    }
    return '"' + $Value + '"'
}

$snapshotPath = [IO.Path]::GetFullPath($SnapshotScript)
$profilePath = [IO.Path]::GetFullPath($UserProfile)
$sourcePath = Join-Path $profilePath '.dsh\memory\memory.json'
$destinationPath = Join-Path $profilePath '.dsh\memory\snapshots'
$workingDirectory = Split-Path -Parent $snapshotPath
$powerShellPath = $PowerShellExecutable
$arguments = @(
    '-NoProfile'
    '-NonInteractive'
    '-ExecutionPolicy'
    'Bypass'
    '-File'
    (Quote-TaskArgument $snapshotPath)
    '-Source'
    (Quote-TaskArgument $sourcePath)
    '-Destination'
    (Quote-TaskArgument $destinationPath)
    '-Keep'
    [string]$Keep
) -join ' '

$plan = [ordered]@{
    TaskName = $TaskName
    SnapshotScript = $snapshotPath
    Source = $sourcePath
    Destination = $destinationPath
    WorkingDirectory = $workingDirectory
    PowerShellExecutable = $powerShellPath
    Arguments = $arguments
    Retention = $Keep
    HourlyIntervalMinutes = 60
    StartupTrigger = $true
    StartWhenAvailable = $true
    WillRegister = -not [bool]$PlanOnly
}

if ($PlanOnly) {
    $plan.WillRegister = $false
    $plan | ConvertTo-Json -Compress
    return
}

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'Scheduled-task registration is supported only on Windows.'
}
if (-not (Test-Path -LiteralPath $snapshotPath -PathType Leaf)) {
    throw "Snapshot script is missing: $snapshotPath"
}
if (-not (Test-Path -LiteralPath $powerShellPath -PathType Leaf)) {
    throw "PowerShell executable is missing: $powerShellPath"
}

Import-Module ScheduledTasks -ErrorAction Stop
$action = New-ScheduledTaskAction -Execute $powerShellPath -Argument $arguments -WorkingDirectory $workingDirectory
$hourlyTrigger = New-ScheduledTaskTrigger -Once -At ([datetime]::Today) `
    -RepetitionInterval (New-TimeSpan -Hours 1)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal `
    -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive -RunLevel Limited
$definition = New-ScheduledTask -Action $action -Trigger @($hourlyTrigger, $startupTrigger) `
    -Settings $settings -Principal $principal `
    -Description 'Hourly DSH persistent-memory snapshot with startup catch-up and 168-snapshot retention.'

$registered = $false
if ($PSCmdlet.ShouldProcess($TaskName, 'Register or replace deterministic scheduled task')) {
    # ScheduledTasks is a module boundary: make its errors terminating explicitly
    # rather than relying on the caller's ErrorActionPreference being inherited.
    Register-ScheduledTask -TaskName $TaskName -TaskPath '\' -InputObject $definition -Force -ErrorAction Stop | Out-Null
    $savedTasks = @(Get-ScheduledTask -TaskName $TaskName -TaskPath '\' -ErrorAction Stop)
    if ($savedTasks.Count -ne 1 -or $savedTasks[0].TaskName -ne $TaskName -or $savedTasks[0].TaskPath -ne '\') {
        throw "Scheduled-task verification failed: expected exactly one root task named '$TaskName'."
    }
    $savedActions = @($savedTasks[0].Actions)
    if ($savedActions.Count -ne 1 -or $savedActions[0].Execute -ne $powerShellPath -or
        $savedActions[0].Arguments -cne $arguments -or $savedActions[0].WorkingDirectory -ne $workingDirectory) {
        throw "Scheduled-task verification failed: '$TaskName' does not point at the expected snapshot command."
    }
    $registered = $true
}

[pscustomobject]@{
    TaskName = $TaskName
    Registered = $registered
    SnapshotScript = $snapshotPath
    Source = $sourcePath
    Destination = $destinationPath
    Retention = $Keep
    RestartRequired = $false
}
