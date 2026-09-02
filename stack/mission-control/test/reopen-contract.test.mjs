import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const launcher = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Launch-Status.ps1');
const source = path.resolve(path.dirname(launcher), 'mission-control.mjs');
const quote = value => `'${value.replaceAll("'", "''")}'`;

// Execute the real launcher; intercept only network and process side effects.
// A duplicate server exits, just as it would when port 3090 is occupied.
function invoke({ noBrowser = false, wrongBuild = false, repeats = 1, defaultSource = false } = {}) {
  const script = `
$global:starts = 0; $global:opens = 0; $global:stops = 0; $global:checks = 0
$script:results = @(); $script:failure = $null
function Start-Process {
  param($FilePath, $ArgumentList, $WindowStyle, [switch]$PassThru)
  if ($FilePath -like 'http:*') { $global:opens++; return }
  $global:starts++
  return [pscustomobject]@{Id=999999; HasExited=$true; ExitCode=1}
}
function Stop-Process { param($Id, [switch]$Force, $ErrorAction); $global:stops++ }
function Invoke-WebRequest {
  param([switch]$UseBasicParsing, $Uri, $TimeoutSec)
  $global:checks++
  return [pscustomobject]@{StatusCode=200; Content=(@{build=@{
    sourceFile=${quote(source)}
    sourceSha256=${wrongBuild ? "'WRONG-BUILD'" : `(Get-FileHash -LiteralPath ${quote(source)} -Algorithm SHA256).Hash`}
  }} | ConvertTo-Json -Compress)}
}
try {
  for ($i=0; $i -lt ${repeats}; $i++) {
    $script:results += & ${quote(launcher)} ${defaultSource ? '' : `-CanonicalSource ${quote(source)}`} -InstalledCopy ${quote(source)} ${noBrowser ? '-NoBrowser' : ''}
  }
} catch { $script:failure = $_.Exception.Message }
@{starts=$global:starts; opens=$global:opens; stops=$global:stops; checks=$global:checks; failure=$script:failure; results=$script:results} | ConvertTo-Json -Depth 5 -Compress
`;
  // Test the same Windows PowerShell host used by Halo Status.lnk.
  const run = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    encoding: 'utf8', timeout: 15000,
    // Do not inherit PowerShell 7's incompatible module search path into 5.1.
    env: { ...process.env, PSModulePath: path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/Modules') },
  });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  return JSON.parse(run.stdout.trim());
}

test('reopening a healthy Mission Control opens the browser without starting a duplicate', () => {
  const result = invoke();
  assert.equal(result.failure, null, 'healthy existing service must reopen successfully');
  assert.equal(result.starts, 0);
  assert.equal(result.stops, 0);
  assert.equal(result.opens, 1);
  assert.equal(result.results[0].Started, false);
  assert.equal(result.results[0].Healthy, true);
});

test('repeated shortcut invocations reuse the existing service each time', () => {
  const result = invoke({ repeats: 2 });
  assert.equal(result.failure, null);
  assert.equal(result.starts, 0);
  assert.equal(result.stops, 0);
  assert.equal(result.opens, 2);
});

test('NoBrowser still checks an existing service without opening or starting anything', () => {
  const result = invoke({ noBrowser: true });
  assert.equal(result.failure, null);
  assert.ok(result.checks >= 1);
  assert.equal(result.starts + result.opens + result.stops, 0);
  assert.equal(result.results[0].BrowserOpened, false);
});

test('an existing wrong-build response is refused without starting or stopping a process', () => {
  const result = invoke({ wrongBuild: true });
  assert.match(result.failure, /build|hash/i);
  assert.equal(result.starts + result.opens + result.stops, 0);
});

test('shortcut default canonical path works in Windows PowerShell 5.1', () => {
  const result = invoke({ defaultSource: true });
  assert.equal(result.failure, null);
  assert.equal(result.starts, 0);
  assert.equal(result.opens, 1);
});

test('Windows PowerShell -File resolves defaults before checking a missing installation', () => {
  const run = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', launcher,
    '-InstalledCopy', `${launcher}.missing-test-copy`, '-NoBrowser'], {
    encoding: 'utf8', timeout: 15000,
    env: { ...process.env, PSModulePath: path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/Modules') },
  });
  assert.notEqual(run.status, 0);
  assert.match(`${run.stdout}\n${run.stderr}`, /Installed Mission Control copy is missing/);
});
