import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const liveScriptPath = path.join(here, '..', 'Test-HaloMissionControlLive.ps1');
const liveScript = fs.readFileSync(liveScriptPath, 'utf8');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function runPowerShell(args, envOverrides = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('pwsh.exe', [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', liveScriptPath, ...args,
    ], {
      env: { ...process.env, ...envOverrides },
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', status => resolve({ status, stdout, stderr }));
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

function sendJson(res, body, status = 200) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

async function makeFixture(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-live-'));
  const now = Date.now();
  const snapshotDate = new Date(now - (overrides.oldSnapshotFilename ? 7_200_000 : 10_000));
  const pad = value => String(value).padStart(2, '0');
  const snapshotStamp = `${snapshotDate.getFullYear()}${pad(snapshotDate.getMonth() + 1)}${pad(snapshotDate.getDate())}-${pad(snapshotDate.getHours())}${pad(snapshotDate.getMinutes())}${pad(snapshotDate.getSeconds())}`;
  const receiptDate = new Date(now);
  const receiptStamp = `${receiptDate.getFullYear()}${pad(receiptDate.getMonth() + 1)}${pad(receiptDate.getDate())}-${pad(receiptDate.getHours())}${pad(receiptDate.getMinutes())}${pad(receiptDate.getSeconds())}-000`;
  const installedCopy = path.join(dir, 'installed', 'mission-control.mjs');
  const sourceFile = path.join(dir, 'source', 'mission-control.mjs');
  const settingsFile = path.join(dir, 'settings.yaml');
  const memoryFile = path.join(dir, 'memory', 'memory.json');
  const snapshotFile = path.join(dir, 'memory', 'snapshots', `memory-${snapshotStamp}.json`);
  const suiteFiles = [
    'reasoning-contract.test.mjs',
    'data-contract.test.mjs',
    'ui-contract.test.mjs',
    'installer-contract.test.mjs',
  ].map(name => path.join(dir, 'source', 'test', name));
  const receiptFile = path.join(dir, 'installed', 'backups', `install-${receiptStamp}-abcdef12.json`);
  for (const file of [installedCopy, sourceFile, settingsFile, memoryFile, snapshotFile, ...suiteFiles, receiptFile]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  fs.writeFileSync(installedCopy, 'export const candidate = "fixture";\n');
  fs.copyFileSync(installedCopy, sourceFile);
  fs.writeFileSync(settingsFile, 'agent-default-model:\n  provider: lmstudio\n  model: brain\n');
  fs.writeFileSync(memoryFile, JSON.stringify({ type: 'entity', name: 'fixture', entityType: 'test', observations: ['ok'] }));
  fs.copyFileSync(memoryFile, snapshotFile);
  if (overrides.corruptMemory) fs.writeFileSync(memoryFile, '{broken json');
  if (overrides.corruptSnapshot) fs.writeFileSync(snapshotFile, '{broken json');
  for (const suiteFile of suiteFiles) {
    fs.writeFileSync(suiteFile, 'import test from "node:test"; test("fixture", () => {});\n');
  }

  const candidateHash = sha256(installedCopy);
  const receipt = {
    SchemaVersion: 1,
    ReceiptType: 'HaloMissionControlInstall',
    RecordedAt: new Date().toISOString(),
    Action: 'Installed',
    Source: sourceFile,
    Destination: installedCopy,
    Sha256: candidateHash,
    SourceSha256: candidateHash,
    PreviousDestinationSha256: null,
    InstalledSha256: candidateHash,
    Backup: null,
    BackupSha256: null,
    SyntaxCheck: { Command: `node --check "${sourceFile}"`, Result: 'Passed' },
    TestsRan: true,
    TestResult: 'Passed',
    TestCommand: 'node --test contract.test.mjs',
    ContractSuites: suiteFiles.map(suiteFile => ({
      Name: path.basename(suiteFile),
      Path: suiteFile,
      SuiteSha256: sha256(suiteFile),
      TestCommand: `node --test "${suiteFile}"`,
      TestResult: 'Passed',
    })),
    ...(overrides.receipt || {}),
  };
  if (typeof overrides.mutateReceipt === 'function') overrides.mutateReceipt(receipt);
  fs.writeFileSync(receiptFile, JSON.stringify(receipt));

  const receiptHash = sha256(receiptFile);
  const token = 'a'.repeat(48);
  let lastValidation = { when: null, ok: null, warnings: [], freshness: { state: 'never', ageMs: null } };
  const requests = [];
  const pluginEntry = {
    entryId: 'web:memory-mcp-reference',
    moduleName: 'memory-mcp-reference',
    enabled: true,
    fiberPhase: 'active',
    bucket: 'active',
    stuck: false,
  };
  const pluginSummary = {
    total: 1, active: 1, disabled: 0, waiting: 0, transitioning: 0, failed: 0, stuck: 0,
    failedList: [], waitingList: [], stuckList: [],
    stale: false, cacheState: 'current',
  };
  const pluginPayload = {
    error: false,
    entries: [pluginEntry],
    summary: pluginSummary,
    stale: false,
    cacheState: 'current',
    sampledAt: now,
    sourceAgeMs: 0,
    refreshError: null,
    ...(overrides.plugins || {}),
  };
  const snapshots = {
    ok: true,
    error: null,
    count: 1,
    lastSnapshotAt: snapshotDate.toISOString(),
    nextExpectedAt: new Date(snapshotDate.getTime() + 3_600_000).toISOString(),
    ageMs: now - snapshotDate.getTime(),
    overdue: false,
    file: snapshotFile,
    ...(overrides.snapshots || {}),
  };
  const snapshotScript = path.join(path.dirname(sourceFile), 'Snapshot-HaloMemory.ps1');
  const snapshotDirectory = path.dirname(snapshotFile);
  const powerShellExecutable = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
  const snapshotArguments = `-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${snapshotScript}" -Source "${memoryFile}" -Destination "${snapshotDirectory}" -Keep 168`;
  const snapshotTask = {
    taskName: 'HALO Memory Snapshot',
    configured: true,
    definitionValid: true,
    definitionIssues: [],
    state: 'Ready',
    lastRunTime: new Date(now - 10_000).toISOString(),
    nextRunTime: new Date(now + 3_590_000).toISOString(),
    lastTaskResult: 0,
    action: { execute: powerShellExecutable, arguments: snapshotArguments, workingDirectory: path.dirname(snapshotScript) },
    triggers: [
      { type: 'MSFT_TaskTimeTrigger', enabled: true, repetitionInterval: 'PT1H' },
      { type: 'MSFT_TaskBootTrigger', enabled: true, repetitionInterval: null },
    ],
    startWhenAvailable: true,
    multipleInstances: 'IgnoreNew',
    expected: {
      powerShellExecutable,
      snapshotScript,
      workingDirectory: path.dirname(snapshotScript),
      source: memoryFile,
      destination: snapshotDirectory,
      retention: 168,
      arguments: snapshotArguments,
    },
    error: null,
    ...(overrides.snapshotTask || {}),
  };
  const writer = {
    configured: true,
    active: true,
    entryId: pluginEntry.entryId,
    cacheState: 'current',
    error: null,
    ...(overrides.writer || {}),
  };
  const gpu = {
    ok: true,
    dedicatedGiB: 12,
    sharedGiB: 1.5,
    carveoutGiB: 64,
    sampledAt: now,
    error: null,
    ...(overrides.gpu || {}),
  };

  const statusPayload = () => {
    const payload = {
    build: { sourceFile: installedCopy, sourceSha256: candidateHash, ...(overrides.statusBuild || {}) },
    time: new Date().toISOString(),
    services: { cockpit: true, lmstudio: true, lmsCli: true },
    models: [{ identifier: 'brain', modelKey: 'brain', context: 32768, parallel: 1, status: 'idle', originKind: 'local', deviceId: null }],
    sessionsSource: 'dsh api',
    stalledSessions: { inventoryCount: 0, count: 0, items: [] },
    routeRuntime: { configured: 'lmstudio/brain', exactResident: true, warning: null },
    ram: { totalGiB: 64, freeGiB: 32, usedGiB: 32 },
    gpu,
    disk: { ok: true, totalGB: 1000, freeGB: 500, usedGB: 500 },
    plugins: pluginSummary,
    dshData: { available: true, cacheState: pluginPayload.cacheState, stale: pluginPayload.stale },
    memory: {
      ok: true,
      error: null,
      file: memoryFile,
      entities: 1,
      relations: 0,
      totalRecords: 1,
      invalidRecords: 0,
      malformedRecords: 0,
      duplicateEntities: 0,
      danglingRelations: 0,
      writer,
      snapshots,
      snapshotTask,
    },
    validation: lastValidation,
    };
    if (typeof overrides.mutateStatus === 'function') overrides.mutateStatus(payload);
    if (lastValidation.when && overrides.statusBuildAfterValidation) Object.assign(payload.build, overrides.statusBuildAfterValidation);
    return payload;
  };

  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, headers: { ...req.headers } });
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
      res.end(overrides.pageBody || `<script>var MC_TOKEN='${token}';</script>`);
      return;
    }
    if (req.method === 'POST' && req.url === '/api/validate-config') {
      const expectedOrigin = `http://127.0.0.1:${server.address().port}`;
      if (overrides.rejectAuth || (!overrides.ignoreAuth && (req.headers['x-mc-token'] !== token || req.headers.origin !== expectedOrigin))) {
        res.writeHead(403, { 'cache-control': 'no-store' });
        res.end(overrides.echoTokenOnAuthFailure ? token : 'unauthorized');
        return;
      }
      if (overrides.redirectValidation) {
        res.writeHead(307, { location: overrides.redirectValidation, 'cache-control': 'no-store' });
        res.end();
        return;
      }
      lastValidation = { when: Date.now(), ok: true, warnings: [], freshness: { state: 'current', ageMs: 0 } };
      if (typeof overrides.mutateValidation === 'function') overrides.mutateValidation(lastValidation);
      sendJson(res, lastValidation);
      return;
    }
    if (req.method === 'GET' && req.url === '/api/status') return sendJson(res, statusPayload());
    if (req.method === 'GET' && req.url === '/api/catalog') return sendJson(res, {
      error: false,
      catalog: [{ loaded: true, identifier: 'brain', modelKey: 'brain', residentModelKey: 'brain', originKind: 'local', deviceId: null, ...(overrides.catalogRow || {}) }],
    });
    if (req.method === 'GET' && req.url === '/api/sessions?all=1') return sendJson(res, { sessions: [], source: 'dsh api' });
    if (req.method === 'GET' && req.url === '/api/plugins') return sendJson(res, pluginPayload);
    if (req.method === 'GET' && req.url === '/api/memory-graph') return sendJson(res, {
      ok: true, error: null, file: memoryFile,
      entities: [{ name: 'fixture' }], relations: [], relationCount: 0,
      invalidRecords: 0, malformedRecords: 0, duplicateEntities: 0, danglingRelations: 0,
    });
    if (req.method === 'GET' && req.url === '/api/history?hours=6') return sendJson(res, { hours: 6, rows: [] });
    if (req.method === 'GET' && req.url === '/api/settings') {
      if (overrides.driftFile === 'installed') fs.appendFileSync(installedCopy, '// changed during acceptance\n');
      if (overrides.driftFile === 'receipt') fs.appendFileSync(receiptFile, ' ');
      return sendJson(res, { file: settingsFile, rows: [] });
    }
    res.writeHead(404, { 'cache-control': 'no-store' });
    res.end('not found');
  });
  const port = await listen(server);

  const lmsCmd = path.join(dir, 'lms.cmd');
  fs.writeFileSync(lmsCmd, [
    '@echo off',
    'if "%1"=="ps" echo [{"identifier":"brain","modelKey":"brain","contextLength":32768,"parallel":1,"status":"idle"}]',
  ].join('\r\n'));
  const args = [
    '-BaseUri', `http://127.0.0.1:${port}`,
    '-ExpectedSourceSha256', candidateHash,
    '-ExpectedReceiptSha256', receiptHash,
    '-InstalledCopy', installedCopy,
    '-InstallReceipt', receiptFile,
    '-SettingsFile', settingsFile,
    '-MemoryFile', memoryFile,
  ];
  return {
    dir, server, requests, args, candidateHash, receiptHash, installedCopy, receiptFile,
    env: { PATH: `${dir}${path.delimiter}${process.env.PATH}` },
  };
}

async function useFixture(overrides, action) {
  const fixture = await makeFixture(overrides);
  try {
    return await action(fixture);
  } finally {
    await close(fixture.server);
    fs.rmSync(fixture.dir, { recursive: true, force: true });
  }
}

test('live acceptance requires explicit expected build, installed-copy, and receipt identity', () => {
  for (const name of ['ExpectedSourceSha256', 'ExpectedReceiptSha256', 'InstalledCopy', 'InstallReceipt']) {
    assert.match(liveScript, new RegExp(`Parameter\\s*\\(\\s*Mandatory[^)]*\\)\\s*\\][\\s\\S]{0,180}\\$${name}`, 'i'), `${name} is mandatory`);
  }
  assert.match(liveScript, /Get-FileHash[\s\S]*InstalledCopy/i);
  assert.match(liveScript, /SourceSha256[\s\S]*InstalledSha256/i);
  assert.match(liveScript, /status\.build\.sourceFile[\s\S]*status\.build\.sourceSha256/i);
});

test('fresh healthy live acceptance authenticates validation and emits candidate-bound evidence', async () => {
  await useFixture({}, async fixture => {
    const result = await runPowerShell(fixture.args, fixture.env);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const output = JSON.parse(result.stdout);
    assert.equal(output.Passed, true);
    assert.equal(output.Health, 'Healthy');
    assert.equal(output.Candidate.SourceSha256, fixture.candidateHash);
    assert.equal(output.Candidate.ReceiptSha256, fixture.receiptHash);
    assert.equal(path.resolve(output.Candidate.InstalledCopy), path.resolve(fixture.installedCopy));
    assert.equal(path.resolve(output.Candidate.InstallReceipt), path.resolve(fixture.receiptFile));
    const post = fixture.requests.find(request => request.method === 'POST' && request.url === '/api/validate-config' && request.headers['x-mc-token'] === 'a'.repeat(48) && request.headers.origin === new URL(fixture.args[1]).origin);
    assert.ok(post, 'the live gate invokes POST /api/validate-config');
    assert.equal(post.headers['x-mc-token'], 'a'.repeat(48));
    assert.equal(post.headers.origin, new URL(fixture.args[1]).origin);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp('a'.repeat(48)), 'token must never enter evidence output');
  });
});

test('candidate mismatch fails before any live endpoint is trusted', async () => {
  await useFixture({}, async fixture => {
    const args = [...fixture.args];
    args[args.indexOf('-ExpectedSourceSha256') + 1] = 'F'.repeat(64);
    const result = await runPowerShell(args, fixture.env);
    assert.notEqual(result.status, 0, 'mismatched expected candidate unexpectedly passed');
    assert.match(`${result.stdout}\n${result.stderr}`, /installed.*sha-?256|candidate.*mismatch/i);
    assert.equal(fixture.requests.length, 0, 'identity mismatch must fail before network evidence is collected');
  });
});

test('wrong runtime build identity fails before authenticated validation is invoked', async () => {
  await useFixture({ statusBuild: { sourceSha256: 'E'.repeat(64) } }, async fixture => {
    const result = await runPowerShell(fixture.args, fixture.env);
    assert.notEqual(result.status, 0, 'wrong runtime build unexpectedly passed');
    assert.match(`${result.stdout}\n${result.stderr}`, /runtime build sha-?256.*expected candidate/i);
    assert.equal(fixture.requests.some(request => request.method === 'POST'), false,
      'a wrong runtime build must be rejected before the token-bearing POST');
  });
});

test('receipt booleans are type-checked instead of accepting a truthy string', async () => {
  await useFixture({ receipt: { TestsRan: 'false' } }, async fixture => {
    const result = await runPowerShell(fixture.args, fixture.env);
    assert.notEqual(result.status, 0, 'string "false" unexpectedly satisfied TestsRan');
    assert.match(`${result.stdout}\n${result.stderr}`, /receipt contract tests ran.*TestsRan=false/i);
    assert.equal(fixture.requests.length, 0, 'invalid receipt evidence must fail before network probing');
  });
});

test('receipt requires a successful action, nonfuture timestamp, and each canonical suite exactly once', async () => {
  const cases = [
    [{ receipt: { Action: 'Pretended' } }, /receipt action.*Installed.*NoOp/i],
    [{ receipt: { RecordedAt: new Date(Date.now() + 86_400_000).toISOString() } }, /receipt timestamp.*future/i],
    [{ mutateReceipt(receipt) { receipt.ContractSuites[3] = { ...receipt.ContractSuites[0] }; } }, /receipt.*suite.*(?:exact|duplicate|missing)/i],
  ];
  for (const [overrides, expected] of cases) {
    await useFixture(overrides, async fixture => {
      const result = await runPowerShell(fixture.args, fixture.env);
      assert.notEqual(result.status, 0, `invalid receipt unexpectedly passed: ${JSON.stringify(overrides.receipt || {})}`);
      assert.match(`${result.stdout}\n${result.stderr}`, expected);
      assert.equal(fixture.requests.length, 0, 'invalid receipt evidence must fail before network probing');
    });
  }
});

test('ambiguous duplicate action tokens are rejected before any POST', async () => {
  const token = 'a'.repeat(48);
  await useFixture({ pageBody: `<script>var MC_TOKEN='${token}'; var MC_TOKEN='${token}';</script>` }, async fixture => {
    const result = await runPowerShell(fixture.args, fixture.env);
    assert.notEqual(result.status, 0, 'duplicate action tokens unexpectedly passed');
    assert.match(`${result.stdout}\n${result.stderr}`, /exactly one.*action token|action token.*count=2/i);
    assert.equal(fixture.requests.some(request => request.method === 'POST'), false);
  });
});

test('a retained but stale plugin inventory cannot pass as current evidence', async () => {
  await useFixture({
    plugins: { stale: true, cacheState: 'stale', sourceAgeMs: 120_000, refreshError: 'refresh failed' },
  }, async fixture => {
    const result = await runPowerShell(fixture.args, fixture.env);
    assert.notEqual(result.status, 0, 'stale plugin inventory unexpectedly passed');
    assert.match(`${result.stdout}\n${result.stderr}`, /plugin.*(?:current|stale|refresh)/i);
  });
});

test('memory writer, scheduled task, and snapshot must all be corroborated', async () => {
  for (const [overrides, expected] of [
    [{ writer: { active: false } }, /memory writer.*active/i],
    [{ snapshotTask: { configured: false, state: null } }, /snapshot task.*configured/i],
    [{ snapshots: { overdue: true, ageMs: 7_200_000 } }, /snapshot.*(?:fresh|overdue)/i],
  ]) {
    await useFixture(overrides, async fixture => {
      const result = await runPowerShell(fixture.args, fixture.env);
      assert.notEqual(result.status, 0, `uncorroborated memory state unexpectedly passed: ${JSON.stringify(overrides)}`);
      assert.match(`${result.stdout}\n${result.stderr}`, expected);
    });
  }
});

test('unavailable GPU counters are degraded and cannot be reported as a healthy pass', async () => {
  await useFixture({
    gpu: { ok: false, dedicatedGiB: null, sharedGiB: null, sampledAt: null, error: 'counter read failed' },
  }, async fixture => {
    const result = await runPowerShell(fixture.args, fixture.env);
    assert.notEqual(result.status, 0, 'degraded GPU telemetry unexpectedly passed');
    assert.match(`${result.stdout}\n${result.stderr}`, /GPU.*degraded.*counter read failed/i);
  });
});

test('JSON health booleans and measurements reject string coercion', async () => {
  const cases = [
    [{ receipt: { SchemaVersion: '1' } }, /receipt schema/i],
    [{ mutateStatus(status) { status.services.cockpit = 'false'; } }, /cockpit connection/i],
    [{ gpu: { dedicatedGiB: '12' } }, /GPU.*(?:number|numeric)/i],
    [{ plugins: { summary: { total: '1', active: 1, disabled: 0, waiting: 0, transitioning: 0, failed: 0, stuck: 0, failedList: [], waitingList: [], stuckList: [], stale: false, cacheState: 'current' } } }, /plugin.*(?:number|numeric)/i],
    [{ mutateStatus(status) { status.memory.entities = '1'; } }, /memory.*(?:number|numeric)/i],
    [{ snapshotTask: { lastTaskResult: '0' } }, /snapshot task.*(?:number|numeric)/i],
    [{ mutateValidation(validation) { validation.when = String(validation.when); } }, /validation.*(?:number|numeric)/i],
  ];
  for (const [overrides, expected] of cases) {
    await useFixture(overrides, async fixture => {
      const result = await runPowerShell(fixture.args, fixture.env);
      assert.notEqual(result.status, 0, `string-coerced health unexpectedly passed: ${JSON.stringify(overrides)}`);
      assert.match(`${result.stdout}\n${result.stderr}`, expected);
    });
  }
});

test('receipt suite paths and names cannot escape their exact canonical set', async () => {
  for (const [mutateReceipt, expected] of [
    [receipt => { receipt.ContractSuites[0].Path = '\\\\other-host\\share\\reasoning-contract.test.mjs'; }, /suite path is local/i],
    [receipt => { receipt.ContractSuites[0].Path = path.join(path.dirname(receipt.Source), 'reasoning-contract.test.mjs'); }, /suite path identity/i],
    [receipt => { receipt.ContractSuites.push({ ...receipt.ContractSuites[0], Name: 'unexpected.test.mjs' }); }, /suite set is exact/i],
  ]) {
    await useFixture({ mutateReceipt }, async fixture => {
      const result = await runPowerShell(fixture.args, fixture.env);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}\n${result.stderr}`, expected);
      assert.equal(fixture.requests.length, 0);
    });
  }
});

test('absent or invalid page token and rejected authentication fail without leaking the token', async () => {
  for (const overrides of [{ pageBody: '<html>No token</html>' }, { pageBody: '<script>var MC_TOKEN="invalid";</script>' }, { rejectAuth: true, echoTokenOnAuthFailure: true }]) {
    await useFixture(overrides, async fixture => {
      const result = await runPowerShell(fixture.args, fixture.env);
      assert.notEqual(result.status, 0);
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp('a'.repeat(48)));
      if (overrides.pageBody) assert.equal(fixture.requests.some(request => request.method === 'POST'), false);
    });
  }
});

test('validation redirects are not followed and cannot forward the action token', async () => {
  let redirectedRequests = 0;
  const destination = http.createServer((req, res) => { redirectedRequests++; sendJson(res, { ok: true }); });
  const port = await listen(destination);
  try {
    await useFixture({ redirectValidation: `http://127.0.0.1:${port}/capture` }, async fixture => {
      const result = await runPowerShell(fixture.args, fixture.env);
      assert.notEqual(result.status, 0);
      assert.equal(redirectedRequests, 0);
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp('a'.repeat(48)));
    });
  } finally { await close(destination); }
});

test('origin parsing rejects lookalike hosts and authority credentials before network access', async () => {
  await useFixture({}, async fixture => {
    for (const base of ['http://127.0.0.1.evil.example:3090', 'http://localhost@evil.example:3090', 'http://127.0.0.1:3090/path']) {
      const args = [...fixture.args];
      args[args.indexOf('-BaseUri') + 1] = base;
      const result = await runPowerShell(args, fixture.env);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}\n${result.stderr}`, /origin-only loopback/i);
    }
    assert.equal(fixture.requests.length, 0);
  });
});

test('build or receipt drift during acceptance invalidates the result', async () => {
  for (const overrides of [
    { driftFile: 'installed' }, { driftFile: 'receipt' },
    { statusBuildAfterValidation: { sourceSha256: 'C'.repeat(64) } },
  ]) {
    await useFixture(overrides, async fixture => {
      const result = await runPowerShell(fixture.args, fixture.env);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}\n${result.stderr}`, /unchanged during live acceptance|remains expected candidate/i);
    });
  }
});

test('plugin counters must match each entry classification, not merely sum to total', async () => {
  await useFixture({ plugins: { summary: { total: 1, active: 0, disabled: 1, waiting: 0, transitioning: 0, failed: 0, stuck: 0, failedList: [], waitingList: [], stuckList: [], stale: false, cacheState: 'current' } } }, async fixture => {
    const result = await runPowerShell(fixture.args, fixture.env);
    assert.notEqual(result.status, 0, 'misclassified inventory unexpectedly passed');
    assert.match(`${result.stdout}\n${result.stderr}`, /plugin.*(?:classification|bucket.*parity)/i);
  });
});

test('catalog residency must match exact resident origin and model key with Boolean loaded state', async () => {
  for (const catalogRow of [
    { originKind: 'remote', deviceId: 'peer' }, { residentModelKey: 'different-model' }, { loaded: 'true' },
  ]) {
    await useFixture({ catalogRow }, async fixture => {
      const result = await runPowerShell(fixture.args, fixture.env);
      assert.notEqual(result.status, 0, `wrong catalog identity unexpectedly passed: ${JSON.stringify(catalogRow)}`);
      assert.match(`${result.stdout}\n${result.stderr}`, /catalog.*resident.*(?:identity|parity)/i);
    });
  }
});

test('a server that accepts unauthenticated validation cannot pass the acceptance gate', async () => {
  await useFixture({ ignoreAuth: true }, async fixture => {
    const result = await runPowerShell(fixture.args, fixture.env);
    assert.notEqual(result.status, 0, 'server without token authorization unexpectedly passed');
    assert.match(`${result.stdout}\n${result.stderr}`, /unauthenticated|missing.token/i);
  });
});

test('memory and snapshot bytes cannot be certified healthy by matching API claims alone', async () => {
  for (const [overrides, expected] of [
    [{ corruptMemory: true }, /memory store.*(?:JSON|record|parse)/i],
    [{ corruptSnapshot: true }, /memory snapshot.*(?:JSON|record|parse)/i],
    [{ oldSnapshotFilename: true, snapshots: { lastSnapshotAt: new Date().toISOString(), ageMs: 0, overdue: false } }, /snapshot.*filename.*time/i],
  ]) {
    await useFixture(overrides, async fixture => {
      const result = await runPowerShell(fixture.args, fixture.env);
      assert.notEqual(result.status, 0, `false storage health unexpectedly passed: ${JSON.stringify(overrides)}`);
      assert.match(`${result.stdout}\n${result.stderr}`, expected);
    });
  }
});

test('validation diagnostics cannot reflect the action token into failure evidence', async () => {
  await useFixture({ mutateValidation(validation) { validation.ok = false; validation.warnings = ['a'.repeat(48)]; } }, async fixture => {
    const result = await runPowerShell(fixture.args, fixture.env);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp('a'.repeat(48)));
  });
});
