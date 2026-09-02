import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const missionControlDir = path.join(here, '..');
const snapshotPath = path.join(missionControlDir, 'Snapshot-HaloMemory.ps1');
const installerPath = path.join(missionControlDir, 'Install-HaloMemorySnapshotTask.ps1');
const installationPath = path.join(missionControlDir, 'INSTALLATION.md');
const snapshot = fs.readFileSync(snapshotPath, 'utf8');
const installer = fs.existsSync(installerPath) ? fs.readFileSync(installerPath, 'utf8') : '';
const installation = fs.existsSync(installationPath) ? fs.readFileSync(installationPath, 'utf8') : '';

function runPowerShell(script, args) {
  return spawnSync('pwsh.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args,
  ], { encoding: 'utf8' });
}

function runMockedRegistration(mode) {
  // Override every scheduler command, including Import-Module: this fixture must
  // never register or query a real Windows scheduled task.
  const quote = value => `'${value.replaceAll("'", "''")}'`;
  const command = `
$global:RegistrationMode = ${quote(mode)}
$global:ReadBackCalls = 0
$global:RegisteredTask = $null
function Import-Module { param($Name, $ErrorAction) }
function New-ScheduledTaskAction { param($Execute, $Argument, $WorkingDirectory)
  [pscustomobject]@{ Execute=$Execute; Arguments=$Argument; WorkingDirectory=$WorkingDirectory }
}
function New-ScheduledTaskTrigger { param([switch]$Once, $At, $RepetitionInterval, [switch]$AtStartup)
  [pscustomobject]@{ Once=[bool]$Once; AtStartup=[bool]$AtStartup }
}
function New-ScheduledTaskSettingsSet { param([switch]$StartWhenAvailable, $MultipleInstances, $ExecutionTimeLimit, $RestartCount, $RestartInterval)
  [pscustomobject]@{ StartWhenAvailable=[bool]$StartWhenAvailable }
}
function New-ScheduledTaskPrincipal { param($UserId, $LogonType, $RunLevel)
  [pscustomobject]@{ UserId=$UserId; LogonType=$LogonType; RunLevel=$RunLevel }
}
function New-ScheduledTask { param($Action, $Trigger, $Settings, $Principal, $Description)
  [pscustomobject]@{ Actions=@($Action); Triggers=$Trigger; Settings=$Settings; Principal=$Principal }
}
function Register-ScheduledTask {
  [CmdletBinding()] param($TaskName, $TaskPath, $InputObject, [switch]$Force)
  if ($global:RegistrationMode -eq 'denied') {
    # Model module-local nonterminating errors which do not inherit the caller's
    # preference. Only the caller's explicit common parameter can stop them.
    $errorMode = if ($PSBoundParameters.ContainsKey('ErrorAction')) { $PSBoundParameters.ErrorAction } else { 'Continue' }
    Write-Error 'MOCK_ACCESS_DENIED: task registration refused' -ErrorAction $errorMode
    return
  }
  $global:RegisteredTask = [pscustomobject]@{
    TaskName=$TaskName; TaskPath=$TaskPath; Actions=$InputObject.Actions
  }
  if ($global:RegistrationMode -eq 'wrong-action') { $global:RegisteredTask.Actions[0].Arguments = '-File wrong.ps1' }
  if ($global:RegistrationMode -eq 'wrong-executable') { $global:RegisteredTask.Actions[0].Execute = 'wrong.exe' }
  if ($global:RegistrationMode -eq 'wrong-directory') { $global:RegisteredTask.Actions[0].WorkingDirectory = 'C:\\wrong' }
  if ($global:RegistrationMode -eq 'wrong-name') { $global:RegisteredTask.TaskName = 'Other Task' }
  if ($global:RegistrationMode -eq 'wrong-path') { $global:RegisteredTask.TaskPath = '\\Other\\' }
}
function Get-ScheduledTask {
  [CmdletBinding()] param($TaskName, $TaskPath)
  $global:ReadBackCalls++
  if ($TaskName -ne 'HALO Memory Snapshot' -or $TaskPath -ne '\\') { throw 'Read-back queried the wrong task identity.' }
  if ($global:RegistrationMode -eq 'missing') { return }
  if ($global:RegistrationMode -eq 'duplicate') { $global:RegisteredTask }
  if ($global:RegistrationMode -eq 'read-denied') {
    $errorMode = if ($PSBoundParameters.ContainsKey('ErrorAction')) { $PSBoundParameters.ErrorAction } else { 'Continue' }
    Write-Error 'MOCK_READ_DENIED: task query refused' -ErrorAction $errorMode
    return
  }
  $global:RegisteredTask
}
try {
  $result = & ${quote(installerPath)} -SnapshotScript ${quote(snapshotPath)} -UserProfile ${quote(path.join(os.tmpdir(), 'halo-memory-registration-profile'))} -PowerShellExecutable ([Environment]::ProcessPath) -Confirm:$false
  [pscustomobject]@{ Result=$result; ReadBackCalls=$global:ReadBackCalls } | ConvertTo-Json -Depth 8 -Compress
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
`;
  return spawnSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')], { encoding: 'utf8' });
}

function snapshotName(date) {
  const part = value => String(value).padStart(2, '0');
  return `memory-${date.getUTCFullYear()}${part(date.getUTCMonth() + 1)}${part(date.getUTCDate())}-${part(date.getUTCHours())}${part(date.getUTCMinutes())}${part(date.getUTCSeconds())}.json`;
}

test('snapshot script never fabricates an absent memory store', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-memory-missing-'));
  const source = path.join(dir, 'memory.json');
  const destination = path.join(dir, 'snapshots');
  try {
    const result = runPowerShell(snapshotPath, ['-Source', source, '-Destination', destination, '-Keep', '168']);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(fs.existsSync(source), false, 'the snapshot path must not create memory.json');
    assert.equal(fs.existsSync(destination), false, 'an absent source should not create an empty snapshot directory');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('snapshot retention is bounded to 168 and ordered by canonical filenames', () => {
  assert.match(snapshot, /Sort-Object\s+(?:-Property\s+)?Name\s+-Descending/i);
  assert.match(snapshot, /memory-\\d\{8\}-\\d\{6\}\\\.json/);
  assert.match(snapshot, /\.writing-/i, 'snapshot publication is staged before the final filename');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-memory-retention-'));
  const source = path.join(dir, 'memory.json');
  const destination = path.join(dir, 'snapshots');
  fs.mkdirSync(destination, { recursive: true });
  fs.writeFileSync(source, '{"type":"entity","name":"HALO","entityType":"system","observations":[]}\n');
  const names = [];
  const base = Date.UTC(2026, 0, 1, 0, 0, 0);
  for (let index = 0; index < 169; index += 1) {
    const name = snapshotName(new Date(base + index * 3600000));
    const file = path.join(destination, name);
    fs.writeFileSync(file, `${index}\n`);
    // Deliberately reverse mtimes: retention must use canonical names, not mutable metadata.
    const reversed = new Date(base + (169 - index) * 3600000);
    fs.utimesSync(file, reversed, reversed);
    names.push(name);
  }
  try {
    const result = runPowerShell(snapshotPath, ['-Source', source, '-Destination', destination, '-Keep', '168']);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const retained = fs.readdirSync(destination).filter(name => /^memory-\d{8}-\d{6}\.json$/.test(name)).sort();
    assert.equal(retained.length, 168);
    assert.equal(retained.includes(names[0]), false, 'oldest canonical snapshot is pruned');
    assert.equal(retained.includes(names.at(-1)), true, 'newest canonical snapshot survives reversed mtimes');
    const newest = retained.at(-1);
    assert.equal(fs.readFileSync(path.join(destination, newest), 'utf8'), fs.readFileSync(source, 'utf8'));
    assert.equal(fs.readdirSync(destination).some(name => name.includes('.writing-')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('installer exposes an inert deterministic plan for the HALO Memory Snapshot task', () => {
  assert.equal(fs.existsSync(installerPath), true, 'Install-HaloMemorySnapshotTask.ps1 exists');
  assert.match(installer, /SupportsShouldProcess\s*=\s*\$true/i);
  assert.match(installer, /\[switch\]\s*\$PlanOnly/i);
  const planAt = installer.indexOf('if ($PlanOnly)');
  const registerAt = installer.indexOf('Register-ScheduledTask');
  assert.ok(planAt >= 0 && registerAt > planAt, 'PlanOnly returns before task registration');

  const profile = path.join(os.tmpdir(), 'halo-memory-plan-profile');
  const fakePowerShell = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
  const result = runPowerShell(installerPath, [
    '-PlanOnly', '-UserProfile', profile, '-PowerShellExecutable', fakePowerShell,
  ]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const plan = JSON.parse(result.stdout.trim());
  assert.equal(plan.TaskName, 'HALO Memory Snapshot');
  assert.equal(plan.Retention, 168);
  assert.equal(plan.HourlyIntervalMinutes, 60);
  assert.equal(plan.StartupTrigger, true);
  assert.equal(plan.StartWhenAvailable, true);
  assert.equal(plan.WillRegister, false);
  assert.equal(plan.PowerShellExecutable, fakePowerShell);
  assert.equal(plan.Source, path.join(profile, '.dsh', 'memory', 'memory.json'));
  assert.equal(plan.Destination, path.join(profile, '.dsh', 'memory', 'snapshots'));
  assert.equal(plan.WorkingDirectory, missionControlDir);
  assert.match(plan.Arguments, /Snapshot-HaloMemory\.ps1/);
  assert.match(plan.Arguments, /-Keep\s+168/);
});

test('installer definition is hourly, startup-resilient, idempotent, and never reboots', () => {
  assert.match(installer, /New-ScheduledTaskTrigger[\s\S]{0,200}-Once[\s\S]{0,200}-RepetitionInterval[\s\S]{0,200}Hours\s+1/i);
  assert.match(installer, /New-ScheduledTaskTrigger[\s\S]{0,100}-AtStartup/i);
  assert.match(installer, /New-ScheduledTaskSettingsSet[\s\S]{0,300}-StartWhenAvailable/i);
  assert.match(installer, /-MultipleInstances\s+IgnoreNew/i);
  assert.match(installer, /-RestartCount\s+3/i);
  assert.match(installer, /New-ScheduledTaskAction[\s\S]{0,400}-WorkingDirectory\s+\$workingDirectory/i);
  assert.match(installer, /Register-ScheduledTask[\s\S]{0,300}-TaskName\s+\$TaskName[\s\S]{0,300}-Force/i);
  assert.doesNotMatch(installer, /Restart-Computer|shutdown\.exe|Start-ScheduledTask/i);
});

test('installer cannot report registered after a nonterminating registration denial', () => {
  const result = runMockedRegistration('denied');
  assert.notEqual(result.status, 0, `registration denial must fail the process; stdout=${result.stdout}; stderr=${result.stderr}`);
  assert.match(result.stderr, /MOCK_ACCESS_DENIED/);
  assert.doesNotMatch(result.stdout, /"Registered":true/);
});

test('installer confirms the expected saved task before reporting registration success', () => {
  const result = runMockedRegistration('success');
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const response = JSON.parse(result.stdout.trim());
  assert.equal(response.ReadBackCalls, 1, 'success requires reading the saved task back');
  assert.equal(response.Result.Registered, true);
  assert.equal(response.Result.TaskName, 'HALO Memory Snapshot');
});

test('installer refuses success when read-back is missing or points at a different action', () => {
  for (const mode of ['missing', 'duplicate', 'wrong-name', 'wrong-path', 'wrong-action', 'wrong-executable', 'wrong-directory']) {
    const result = runMockedRegistration(mode);
    assert.notEqual(result.status, 0, `${mode} must fail; stdout=${result.stdout}; stderr=${result.stderr}`);
    assert.match(result.stderr, /verification failed/i);
    assert.doesNotMatch(result.stdout, /"Registered":true/);
  }
});

test('installer cannot report registered when the saved-task query is denied', () => {
  const result = runMockedRegistration('read-denied');
  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /MOCK_READ_DENIED/);
  assert.doesNotMatch(result.stdout, /"Registered":true/);
});

test('installation guide separates dry-run verification from explicit registration', () => {
  assert.match(installation, /HALO Memory Snapshot/);
  assert.match(installation, /Install-HaloMemorySnapshotTask\.ps1[^\n]*-PlanOnly/i);
  assert.match(installation, /hourly/i);
  assert.match(installation, /startup/i);
  assert.match(installation, /168/);
  assert.match(installation, /does not create|never creates|will not create/i);
  assert.match(installation, /does not reboot|no reboot/i);
  assert.match(installation, /register/i);
});
