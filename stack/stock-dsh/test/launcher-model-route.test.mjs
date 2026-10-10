import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseSelectedRoute, readProviderEnvelope, validateSelectedRoute } from '../launcher-model-route.mjs';

const selected35b = { provider: 'web-fast', model: 'halo/qwen3.6-35b-a3b-q6', reasoningEffort: 'high' };
const provider35b = {
  baseURL: 'http://127.0.0.1:1234/v1',
  defaultContextWindow: 65536,
  defaultParallel: 1,
  models: [{ id: 'halo/qwen3.6-35b-a3b-q6', contextWindow: 65536 }],
};
const resident35b = {
  identifier: 'halo-fast-35b-q6',
  modelKey: 'halo/qwen3.6-35b-a3b-q6',
  contextLength: 65536,
  parallel: 1,
};
const unknownResident = {
  identifier: 'operator-extra',
  modelKey: 'operator/extra-model',
  contextLength: 32768,
  parallel: 2,
};
const cloudDefault = { provider: 'ollama', model: 'deepseek-v4.1-flash:cloud' };

test('production PowerShell JSON serialization preserves zero, one, and multiple residents as arrays', () => {
  const launcher = readFileSync(new URL('../Start-StockDSH.ps1', import.meta.url), 'utf8');
  const expression = launcher.match(/\(ConvertTo-Json -InputObject @\(\$Residents\) -Depth 20 -Compress\)/)?.[0];
  assert.ok(expression, 'inventory must serialize its array as one input object');
  for (const count of [0, 1, 2]) {
    const script = `$Residents = @(${Array.from({ length: count }, (_, i) =>
      `[pscustomobject]@{identifier='model-${i}'}`).join(';')}); ${expression}`;
    const child = spawnSync('powershell.exe', ['-NoProfile', '-Command', script],
      { encoding: 'utf8', windowsHide: true });
    assert.equal(child.status, 0, child.stderr);
    const result = JSON.parse(child.stdout);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, count);
  }
});

test('remote and separate local providers do not depend on LM Studio residency', () => {
  for (const baseURL of ['https://api.example.com/v1', 'http://127.0.0.1:11434/v1', undefined]) {
    assert.equal(validateSelectedRoute({ selected: { provider: 'other', model: 'other-model' },
      providerConfig: { baseURL }, residentModels: [] }).kind, 'provider-managed');
  }
});

test('file-bound CLI handles a large profile without putting configuration or credentials in argv', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-launch-route-'));
  try {
    const settings = join(dir, 'profile.yml'), residents = join(dir, 'residents.json');
    writeFileSync(settings, '- id: agent-default-model\n  config:\n    provider: web-fast\n    model: halo/qwen3.6-35b-a3b-q6\n- id: llm-pi-ai\n  config:\n    providers:\n      web-fast:\n        baseURL: http://127.0.0.1:1234/v1\n        defaultContextWindow: 65536\n        apiKey: fixture-secret-never-in-argv\n' + '# padding\n'.repeat(10000));
    writeFileSync(residents, JSON.stringify([resident35b, unknownResident]));
    const helper = fileURLToPath(new URL('../launcher-model-route.mjs', import.meta.url));
    for (const mode of ['route', 'transport', 'validate']) {
      const args = [helper, mode, '--settings-file', settings];
      if (mode === 'validate') args.push('--residents', residents);
      assert.ok(args.join(' ').length < 1024);
      const child = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
      assert.equal(child.status, 0, child.stderr);
      assert.doesNotMatch(child.stdout, /fixture-secret/);
      const result = JSON.parse(child.stdout);
      if (mode === 'validate') assert.equal(result.resident.identifier, resident35b.identifier);
    }
  } finally { rmSync(dir, { recursive: true }); }
});

test('selected 35B validates when the intentionally unloaded 27B is absent', () => {
  const result = validateSelectedRoute({
    selected: selected35b,
    providerConfig: provider35b,
    residentModels: [resident35b],
  });
  assert.equal(result.kind, 'local');
  assert.equal(result.resident.identifier, 'halo-fast-35b-q6');
  assert.equal(result.residentModels.length, 1);
});

test('unknown resident is preserved and does not affect selected-route validation', () => {
  const result = validateSelectedRoute({
    selected: selected35b,
    providerConfig: provider35b,
    residentModels: [resident35b, unknownResident],
  });
  assert.equal(result.kind, 'local');
  assert.deepEqual(result.residentModels, [resident35b, unknownResident]);
  assert.match(result.message, /preserved/);
});

test('absent selected model reports an actionable error without a fixed pair requirement', () => {
  assert.throws(
    () => validateSelectedRoute({
      selected: selected35b,
      providerConfig: provider35b,
      residentModels: [unknownResident],
    }),
    error => {
      assert.match(error.message, /not resident in LM Studio/);
      assert.match(error.message, /operator-extra/);
      assert.match(error.message, /will not load, unload, or replace/);
      return true;
    },
  );
});

test('wrong selected-route envelope reports manual remediation without mutation', () => {
  assert.throws(
    () => validateSelectedRoute({
      selected: selected35b,
      providerConfig: provider35b,
      residentModels: [{ ...resident35b, contextLength: 32768 }],
    }),
    /contextLength=32768, but the selected profile expects 65536/,
  );
  assert.throws(
    () => validateSelectedRoute({
      selected: selected35b,
      providerConfig: provider35b,
      residentModels: [{ ...resident35b, parallel: 2 }],
    }),
    /parallel=2, but the selected profile expects 1/,
  );
  assert.throws(
    () => validateSelectedRoute({
      selected: selected35b,
      providerConfig: provider35b,
      residentModels: [{ ...resident35b, modelKey: 'wrong/model' }],
    }),
    /not resident in LM Studio/,
  );
});

test('cloud default bypasses LM Studio residency checks and leaves residents untouched', () => {
  const result = validateSelectedRoute({
    selected: cloudDefault,
    providerConfig: null,
    residentModels: [resident35b, unknownResident],
  });
  assert.equal(result.kind, 'cloud');
  assert.deepEqual(result.residentModels, [resident35b, unknownResident]);
  assert.match(result.message, /cloud/);
  assert.match(result.message, /not inspected or changed/);
});

test('selected route and provider envelope parse from the live DSH profile schema', () => {
  const yaml = [
    '- id: agent-default-model',
    '  name: "@deepseek-ai/dsh-agent-default-model"',
    '  config:',
    '    provider: web-fast',
    '    model: halo/qwen3.6-35b-a3b-q6',
    '    reasoningEffort: high',
    '- id: llm-pi-ai',
    '  config:',
    '    providers:',
    '      web-fast:',
    '        baseURL: http://127.0.0.1:1234/v1',
    '        defaultContextWindow: 65536',
    '        models:',
    '          - id: halo/qwen3.6-35b-a3b-q6',
    '            contextWindow: 65536',
    '',
  ].join('\n');
  assert.deepEqual(parseSelectedRoute(yaml), selected35b);
  const provider = readProviderEnvelope(yaml, 'web-fast');
  assert.equal(provider.baseURL, 'http://127.0.0.1:1234/v1');
  assert.equal(provider.models[0].contextWindow, 65536);
});

test('legacy flat agent-default-model YAML remains readable', () => {
  const yaml = 'agent-default-model:\n  provider: lmstudio\n  model: halo-coder-q4km\n  reasoningEffort: off\n';
  assert.deepEqual(parseSelectedRoute(yaml), {
    provider: 'lmstudio',
    model: 'halo-coder-q4km',
    reasoningEffort: 'off',
  });
});

test('launcher and helper expose no unload or forced-pair controls', () => {
  const launcher = readFileSync(new URL('../Start-StockDSH.ps1', import.meta.url), 'utf8');
  const helper = readFileSync(new URL('../launcher-model-route.mjs', import.meta.url), 'utf8');
  const combined = launcher + '\n' + helper;
  assert.doesNotMatch(combined, /\blms\s+unload\b/i);
  assert.doesNotMatch(launcher, /['"]unload['"]/i);
  assert.doesNotMatch(combined, /\bUnload-Model\b/i);
  assert.doesNotMatch(combined, /approved\s+(?:set|pair|models)/i);
  assert.match(launcher, /Ensure-SelectedModel/);
  assert.match(launcher, /Get-ResidentModels/);
  assert.match(launcher, /Assert-SelectedResidency/);
});

test('effective selected-model URL overrides classify both directions through production CLI', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-transport-'));
  const helper = fileURLToPath(new URL('../launcher-model-route.mjs', import.meta.url));
  try {
    for (const [baseURL, override, kind] of [
      ['https://api.example.com/v1', 'http://127.0.0.1:1234/v1', 'lmstudio'],
      ['http://127.0.0.1:1234/v1', 'https://api.example.com/v1', 'provider-managed']
    ]) {
      const provider = { ...provider35b, baseURL, models: [{ id: selected35b.model, baseURL: override }] };
      const settings = join(dir, 'profile.yml');
      writeFileSync(settings, JSON.stringify([{ id: 'agent-default-model', config: selected35b },
        { id: 'llm-pi-ai', config: { providers: { 'web-fast': provider } } }]));
      const child = spawnSync(process.execPath, [helper, 'transport', '--settings-file', settings], { encoding: 'utf8', windowsHide: true });
      assert.equal(child.status, 0, child.stderr);
      assert.equal(JSON.parse(child.stdout).kind, kind);
      if (kind === 'lmstudio') assert.throws(() => validateSelectedRoute({ selected: selected35b, providerConfig: provider }), /not resident/);
      else assert.equal(validateSelectedRoute({ selected: selected35b, providerConfig: provider }).kind, kind);
    }
    const settings = join(dir, 'profile.yml');
    writeFileSync(settings, JSON.stringify([{ id: 'agent-default-model', config: { provider: 'external-adapter', model: 'model' } }]));
    const child = spawnSync(process.execPath, [helper, 'transport', '--settings-file', settings], { encoding: 'utf8', windowsHide: true });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(JSON.parse(child.stdout).kind, 'provider-managed');
  } finally { rmSync(dir, { recursive: true }); }
});

test('production launcher prefers active Web profile over a stale legacy file', () => {
  const launcher = readFileSync(new URL('../Start-StockDSH.ps1', import.meta.url), 'utf8');
  const expression = launcher.match(/\$settingsPath = (if \(Test-Path[^\r\n]+)/)?.[1];
  assert.ok(expression);
  const dir = mkdtempSync(join(tmpdir(), 'dsh-settings-'));
  try {
    const profile = join(dir, 'profile.yml'), legacy = join(dir, 'settings.yaml');
    writeFileSync(profile, 'active'); writeFileSync(legacy, 'stale');
    const script = `$profileSettings='${profile}'; $legacySettings='${legacy}'; $settingsPath = ${expression}; $settingsPath`;
    const child = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', windowsHide: true });
    assert.equal(child.status, 0, child.stderr); assert.equal(child.stdout.trim(), profile);
  } finally { rmSync(dir, { recursive: true }); }
});


// Extract the real startup functions without executing the launcher top level.
// The fixture LMS script cannot contact a service or load weights.
function runStartupResidency({ residents = [], provider = provider35b, selected = selected35b,
  loadFailure = false, loadResult } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-autoload-'));
  const psQuote = value => "'" + String(value).replaceAll("'", "''") + "'";
  try {
    const fixture = join(dir, 'fixture.json');
    const calls = join(dir, 'calls.json');
    const state = join(dir, 'residents.json');
    const mockLms = join(dir, 'mock-lms.ps1');
    const settings = join(dir, 'profile.yml');
    writeFileSync(fixture, JSON.stringify({ loadFailure, loadResult: loadResult ?? resident35b }));
    writeFileSync(calls, '[]');
    writeFileSync(state, JSON.stringify(residents));
    writeFileSync(settings, JSON.stringify([{ id: 'agent-default-model', config: selected },
      { id: 'llm-pi-ai', config: { providers: { [selected.provider]: provider } } }]));
    writeFileSync(mockLms, `param([Parameter(ValueFromRemainingArguments=$true)][string[]] $CliArgs)
$fixture=Get-Content -LiteralPath ${psQuote(fixture)} -Raw|ConvertFrom-Json
$global:LASTEXITCODE=0
if($CliArgs[0] -eq 'ps'){Get-Content -LiteralPath ${psQuote(state)} -Raw;return}
if($CliArgs[0] -ne 'load'){throw 'Unexpected mock command'}
$prior=Get-Content -LiteralPath ${psQuote(calls)} -Raw|ConvertFrom-Json
$prior+=,[object[]]$CliArgs
ConvertTo-Json -InputObject @($prior) -Depth 20 -Compress|Set-Content -LiteralPath ${psQuote(calls)}
if($fixture.loadFailure){$global:LASTEXITCODE=7;return}
ConvertTo-Json -InputObject @($fixture.loadResult) -Depth 20 -Compress|Set-Content -LiteralPath ${psQuote(state)}
`);
    const launcher = fileURLToPath(new URL('../Start-StockDSH.ps1', import.meta.url));
    const deploy = fileURLToPath(new URL('..', import.meta.url));
    const script = `$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$ast=[System.Management.Automation.Language.Parser]::ParseFile(${psQuote(launcher)},[ref]$null,[ref]$null)
$names=@('Get-ResidentModels','Resolve-SelectedRoute','Resolve-SelectedTransport','Resolve-SelectedProvider','Assert-SelectedResidency','Ensure-SelectedModel')
$defs=$ast.FindAll({param($item) $item -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $names -contains $item.Name},$false)
. ([scriptblock]::Create(($defs.Extent.Text -join [Environment]::NewLine)))
$deploy=${psQuote(deploy)};$node=${psQuote(process.execPath)};$lms=${psQuote(mockLms)};$logs=${psQuote(dir)}
try{$selection=Resolve-SelectedRoute ${psQuote(settings)};$transport=Resolve-SelectedTransport ${psQuote(settings)}
$result=Ensure-SelectedModel ${psQuote(settings)} $selection $transport
[pscustomobject]@{ok=$true;result=$result}|ConvertTo-Json -Depth 20 -Compress
}catch{[pscustomobject]@{ok=$false;error=$_.Exception.Message}|ConvertTo-Json -Compress}
`;
    const child = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { encoding: 'utf8', windowsHide: true });
    assert.equal(child.status, 0, child.stderr);
    const result = JSON.parse(child.stdout.trim());
    result.calls = JSON.parse(readFileSync(calls, 'utf8').replace(/^\uFEFF/, ''));
    result.residents = JSON.parse(readFileSync(state, 'utf8').replace(/^\uFEFF/, ''));
    return result;
  } finally { rmSync(dir, { recursive: true }); }
}

test('production startup autoloads only the saved model when residency is empty', () => {
  const result = runStartupResidency();
  assert.equal(result.ok, true, result.error);
  assert.equal(result.calls.length, 1);
  assert.deepEqual(result.calls[0], ['load', selected35b.model, '--identifier', selected35b.model,
    '--context-length', '65536', '--parallel', '1', '--gpu', 'max', '--yes']);
  assert.equal(result.residents.length, 1);
});

test('production startup reuses selected residency and preserves other models without loading', () => {
  for (const residents of [[resident35b], [resident35b, unknownResident]]) {
    const result = runStartupResidency({ residents });
    assert.equal(result.ok, true, result.error);
    assert.deepEqual(result.calls, []);
    assert.deepEqual(result.residents, residents);
  }
});

test('production startup refuses another resident or wrong envelope without loading or unloading', () => {
  for (const residents of [[unknownResident], [{ ...resident35b, contextLength: 32768 }]]) {
    const result = runStartupResidency({ residents });
    assert.equal(result.ok, false);
    assert.match(result.error, /Selected local route/);
    assert.deepEqual(result.calls, []);
    assert.deepEqual(result.residents, residents);
  }
});

test('production startup cloud bypass never invokes LMS even when local residency is empty', () => {
  const result = runStartupResidency({ selected: cloudDefault,
    provider: { baseURL: 'http://127.0.0.1:11434/v1' } });
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(result.calls, []);
  assert.deepEqual(result.residents, []);
});

test('production startup stops after a failed load and validates the returned capacity', () => {
  const failed = runStartupResidency({ loadFailure: true });
  assert.equal(failed.ok, false);
  assert.match(failed.error, /Could not automatically load selected model/);
  assert.equal(failed.calls.length, 1);
  assert.deepEqual(failed.residents, []);
  const wrongCapacity = runStartupResidency({ loadResult: { ...resident35b, contextLength: 32768 } });
  assert.equal(wrongCapacity.ok, false);
  assert.match(wrongCapacity.error, /expects 65536/);
  assert.equal(wrongCapacity.calls.length, 1);
});

test('production startup uses model context override and requires positive capacity before loading', () => {
  const overridden = runStartupResidency({ provider: { ...provider35b, defaultContextWindow: 131072 },
    loadResult: resident35b });
  assert.equal(overridden.ok, true, overridden.error);
  assert.equal(overridden.calls[0][5], '65536');
  const inherited = runStartupResidency({ provider: { baseURL: provider35b.baseURL, defaultContextWindow: 32768, defaultParallel: 2 },
    loadResult: { ...resident35b, contextLength: 32768, parallel: 2 } });
  assert.equal(inherited.ok, true, inherited.error);
  assert.equal(inherited.calls[0][5], '32768');
  assert.equal(inherited.calls[0][7], '2');
  const defaultParallel = runStartupResidency({ provider: { baseURL: provider35b.baseURL, defaultContextWindow: 65536 } });
  assert.equal(defaultParallel.ok, true, defaultParallel.error);
  assert.equal(defaultParallel.calls[0][7], '1');
  const invalid = runStartupResidency({ provider: { ...provider35b,
    models: [{ id: selected35b.model, contextWindow: 0 }] } });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /requires a positive context window/);
  assert.deepEqual(invalid.calls, []);
});
