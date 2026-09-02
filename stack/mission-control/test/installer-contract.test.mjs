import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const missionControlDir = path.join(here, '..');
const installer = fs.readFileSync(path.join(missionControlDir, 'Install-HaloMissionControl.ps1'), 'utf8');
const installerPath = path.join(missionControlDir, 'Install-HaloMissionControl.ps1');
const launcher = fs.readFileSync(path.join(missionControlDir, 'Launch-Status.ps1'), 'utf8');
const launcherPath = path.join(missionControlDir, 'Launch-Status.ps1');
const installerContractDepth = Number(process.env.HALO_MC_INSTALLER_CONTRACT_DEPTH || 0);

function invokeInstaller(source, destination, extra = [], envOverrides = {}) {
  const env = {
    ...process.env,
    ...envOverrides,
    HALO_MC_INSTALLER_CONTRACT_DEPTH: String(installerContractDepth + 1),
  };
  // A nested `node --test` inherits this private marker and silently skips its
  // files as recursive. The installer is a separate process under test, so it
  // must receive the same environment an operator invocation receives.
  delete env.NODE_TEST_CONTEXT;
  return spawnSync('pwsh.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', installerPath,
    '-Source', source, '-Destination', destination, ...extra,
  ], { encoding: 'utf8', env });
}

function invokeLauncher(canonicalSource, installedCopy, healthUri, extra = [], envOverrides = {}) {
  return spawnSync('pwsh.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', launcherPath,
    '-CanonicalSource', canonicalSource,
    '-InstalledCopy', installedCopy,
    '-HealthUri', healthUri,
    '-NoBrowser',
    ...extra,
  ], { encoding: 'utf8', env: { ...process.env, ...envOverrides } });
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function installArtifacts(destination) {
  const destinationDir = path.dirname(destination);
  const backupDir = path.join(destinationDir, 'backups');
  return {
    backups: fs.existsSync(backupDir)
      ? fs.readdirSync(backupDir).filter(name => /^mission-control-.*\.mjs$/.test(name))
      : [],
    receipts: fs.existsSync(backupDir)
      ? fs.readdirSync(backupDir).filter(name => /^install-.*\.json$/.test(name))
      : [],
    transactionDebris: fs.existsSync(destinationDir)
      ? fs.readdirSync(destinationDir).filter(name => /\.(?:installing|rollback)-|\.install\.lock$/.test(name))
      : [],
  };
}

async function unusedTcpPort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

test('installer fail-closes on every Mission Control contract suite', () => {
  for (const suite of [
    'reasoning-contract.test.mjs',
    'data-contract.test.mjs',
    'ui-contract.test.mjs',
    'installer-contract.test.mjs',
  ]) {
    assert.match(installer, new RegExp(suite.replaceAll('.', '\\.')), `${suite} is required by name`);
  }
  assert.match(installer, /Test-Path[\s\S]{0,300}PathType\s+Leaf[\s\S]{0,300}throw/i,
    'missing suites stop before installation');
  assert.match(installer, /foreach\s*\([^)]*\$contractSuites[^)]*\)[\s\S]*?&\s*\$node\s+--test/i,
    'every named suite is executed');
});

test('contract suites validate the exact Source selected for installation', () => {
  assert.match(installer, /HALO_MC_SOURCE_UNDER_TEST/);
  for (const suite of ['reasoning-contract.test.mjs', 'data-contract.test.mjs', 'ui-contract.test.mjs']) {
    const body = fs.readFileSync(path.join(here, suite), 'utf8');
    assert.match(body, /process\.env\.HALO_MC_SOURCE_UNDER_TEST/, `${suite} honors the installer's exact-source override`);
  }
});

test('SkipTests cannot install a changed or missing destination', () => {
  assert.match(installer, /\$SkipTests[\s\S]{0,300}(?:\$installRequired|\$needsInstall)[\s\S]{0,300}throw/i);
  assert.match(installer, /cannot install|refus(?:e|ed)|contract suites? (?:are|is) required/i);
});

test('receipt identifies tested source, suites, hashes, commands, and outcome', () => {
  for (const marker of [
    /SourceSha256\s*=/,
    /ContractSuites\s*=/,
    /SuiteSha256\s*=/,
    /TestCommand\s*=/,
    /TestResult\s*=/,
    /ReceiptSha256\s*=/,
  ]) assert.match(installer, marker);
  assert.match(installer, /foreach\s*\([^)]*\$contractEvidence[^)]*\)[\s\S]{0,500}Get-Sha256[\s\S]{0,500}SuiteSha256[\s\S]{0,500}throw/i,
    'suite hashes are rechecked immediately before receipt emission');
});

test('existing backup, staged hash, atomic move, and final hash gates remain', () => {
  assert.match(installer, /Copy-Item[^\n]+\$destinationPath[^\n]+\$backup/);
  assert.match(installer, /backup verification failed/i);
  assert.match(installer, /\.installing-/);
  assert.match(installer, /Staged Mission Control hash does not match/i);
  assert.match(installer, /Move-Item[^\n]+\$staged[^\n]+\$destinationPath/);
  assert.match(installer, /Installed Mission Control hash mismatch/i);
});

test('installer holds an exclusive transaction lock and CAS-checks immediately before promotion', () => {
  assert.match(installer, /\.install\.lock/);
  assert.match(installer, /FileShare\]::None/);
  assert.match(installer, /destination changed after validation/i);
  const promotionAt = installer.indexOf('Move-Item -LiteralPath $staged -Destination $destinationPath -Force');
  assert.notEqual(promotionAt, -1, 'promotion move is present');
  const prePromotion = installer.slice(Math.max(0, promotionAt - 1_500), promotionAt);
  assert.match(prePromotion, /Get-(?:Optional)?Sha256[^\n]*\$destinationPath[\s\S]*\$installedHash/i,
    'the originally observed destination hash is compared again immediately before promotion');
});

test('changed destination cannot be installed with SkipTests', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-installer-refusal-'));
  const source = path.join(dir, 'source.mjs');
  const destination = path.join(dir, 'installed', 'mission-control.mjs');
  fs.writeFileSync(source, 'console.log("candidate");\n');
  try {
    const result = invokeInstaller(source, destination, ['-SkipTests']);
    assert.notEqual(result.status, 0, `installer unexpectedly succeeded:\n${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /all contract suites are required/i);
    assert.equal(fs.existsSync(destination), false, 'refusal occurs before destination creation');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('contract tests run against an explicitly selected Source before destination mutation', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-installer-source-'));
  const source = path.join(dir, 'candidate.mjs');
  const destination = path.join(dir, 'installed', 'mission-control.mjs');
  const canonical = fs.readFileSync(path.join(missionControlDir, 'mission-control.mjs'), 'utf8');
  fs.writeFileSync(source, canonical.replace('/*__REASONING_CONTRACT_START__*/', '/*__BROKEN_REASONING_CONTRACT_START__*/'));
  try {
    const result = invokeInstaller(source, destination);
    assert.notEqual(result.status, 0, `installer unexpectedly succeeded:\n${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /reasoning-contract\.test\.mjs.*failed/si);
    assert.equal(fs.existsSync(destination), false, 'contract failure occurs before destination creation');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('same-hash SkipTests remains a no-op and writes an honest verification receipt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-installer-noop-'));
  const source = path.join(dir, 'source.mjs');
  const destination = path.join(dir, 'installed', 'mission-control.mjs');
  const content = 'console.log("same");\n';
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(source, content);
  fs.writeFileSync(destination, content);
  try {
    const result = invokeInstaller(source, destination, ['-SkipTests']);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(fs.readFileSync(destination, 'utf8'), content);
    const receiptDir = path.join(path.dirname(destination), 'backups');
    const receipts = fs.readdirSync(receiptDir).filter(name => /^install-.*\.json$/.test(name));
    assert.equal(receipts.length, 1);
    const receiptFile = path.join(receiptDir, receipts[0]);
    const receiptBytes = fs.readFileSync(receiptFile);
    const receipt = JSON.parse(receiptBytes.toString('utf8'));
    const receiptHash = crypto.createHash('sha256').update(receiptBytes).digest('hex').toUpperCase();
    const expectedHash = crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
    assert.equal(receipt.SchemaVersion, 1);
    assert.equal(receipt.ReceiptType, 'HaloMissionControlInstall');
    assert.equal(receipt.Action, 'NoOp');
    assert.equal(receipt.SourceSha256, expectedHash);
    assert.equal(receipt.InstalledSha256, expectedHash);
    assert.equal(receipt.TestResult, 'Skipped');
    assert.equal(receipt.ContractSuites.length, 4);
    assert.ok(receipt.ContractSuites.every(suite => suite.TestResult === 'Skipped' && suite.SuiteSha256));
    assert.match(result.stdout, new RegExp(receiptHash, 'i'), 'returned receipt hash matches the receipt bytes');
    assert.equal(fs.readdirSync(path.dirname(destination)).some(name => name.includes('.installing-')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('changed destination installs tested bytes, preserves a verified backup, and emits a receipt', {
  skip: installerContractDepth > 0,
}, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-installer-success-'));
  const source = path.join(missionControlDir, 'mission-control.mjs');
  const destination = path.join(dir, 'installed', 'mission-control.mjs');
  const previous = 'console.log("previous installed copy");\n';
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, previous);
  try {
    const result = invokeInstaller(source, destination);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(sha256(destination), sha256(source), 'installed bytes exactly match the tested source');
    const artifacts = installArtifacts(destination);
    assert.equal(artifacts.backups.length, 1, 'the prior destination has one preserved backup');
    const backup = path.join(path.dirname(destination), 'backups', artifacts.backups[0]);
    assert.equal(fs.readFileSync(backup, 'utf8'), previous);
    assert.equal(artifacts.receipts.length, 1, 'the changed install emits one receipt');
    const receipt = JSON.parse(fs.readFileSync(path.join(path.dirname(destination), 'backups', artifacts.receipts[0]), 'utf8'));
    assert.equal(receipt.SchemaVersion, 1);
    assert.equal(receipt.ReceiptType, 'HaloMissionControlInstall');
    assert.equal(receipt.Action, 'Installed');
    assert.equal(receipt.SourceSha256, sha256(source));
    assert.equal(receipt.PreviousDestinationSha256, crypto.createHash('sha256').update(previous).digest('hex').toUpperCase());
    assert.equal(receipt.InstalledSha256, sha256(source));
    assert.equal(receipt.BackupSha256, sha256(backup));
    assert.deepEqual(artifacts.transactionDebris, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('every injected post-promotion failure restores the verified prior copy and removes success receipts', {
  skip: installerContractDepth > 0,
}, () => {
  const source = path.join(missionControlDir, 'mission-control.mjs');
  for (const failurePoint of ['AfterPromotion', 'AfterReceipt']) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `halo-mc-installer-rollback-${failurePoint.toLowerCase()}-`));
    const destination = path.join(dir, 'installed', 'mission-control.mjs');
    const previous = `console.log("prior copy for ${failurePoint}");\n`;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, previous);
    try {
      const result = invokeInstaller(source, destination, [], {
        HALO_MC_INSTALL_TEST_FAILURE_POINT: failurePoint,
      });
      assert.notEqual(result.status, 0, `injected ${failurePoint} failure unexpectedly succeeded`);
      assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(`injected.*${failurePoint}`, 'i'));
      assert.equal(fs.readFileSync(destination, 'utf8'), previous, `${failurePoint} restores the prior bytes`);
      const artifacts = installArtifacts(destination);
      assert.equal(artifacts.backups.length, 1, `${failurePoint} retains the verified recovery backup`);
      assert.equal(artifacts.receipts.length, 0, `${failurePoint} leaves no success receipt`);
      assert.deepEqual(artifacts.transactionDebris, [], `${failurePoint} cleans transaction files and lock`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('launcher refuses a missing or hash-mismatched installed copy before starting Node', () => {
  assert.match(launcher, /param\([\s\S]*\$CanonicalSource[\s\S]*\$InstalledCopy/,
    'launcher exposes explicit canonical and installed paths');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-launch-refusal-'));
  const canonical = path.join(dir, 'canonical.mjs');
  const installed = path.join(dir, 'installed.mjs');
  fs.writeFileSync(canonical, 'console.log("canonical");\n');
  try {
    const missing = invokeLauncher(canonical, installed, 'http://127.0.0.1:9/api/status');
    assert.notEqual(missing.status, 0);
    assert.match(`${missing.stdout}\n${missing.stderr}`, /installed Mission Control copy is missing/i);

    fs.writeFileSync(installed, 'console.log("different");\n');
    const mismatch = invokeLauncher(canonical, installed, 'http://127.0.0.1:9/api/status');
    assert.notEqual(mismatch.status, 0);
    assert.match(`${mismatch.stdout}\n${mismatch.stderr}`, /hash.*(?:does not match|mismatch)/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('launcher starts the installed copy hidden, waits for health, and can suppress the browser', async () => {
  assert.match(launcher, /Start-Process[\s\S]{0,500}\$installedPath[\s\S]{0,500}-WindowStyle\s+Hidden/i);
  assert.match(launcher, /Invoke-WebRequest[\s\S]{0,300}\$HealthUri/i);
  assert.match(launcher, /\[switch\]\s*\$NoBrowser/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-launch-health-'));
  const canonical = path.join(dir, 'canonical.mjs');
  const installed = path.join(dir, 'installed.mjs');
  const port = await unusedTcpPort();
  const fakeServer = `
import http from 'node:http';
const port = Number(process.env.HALO_MC_TEST_PORT);
let healthRequests = 0;
setTimeout(() => {
  const server = http.createServer((req, res) => {
    res.writeHead(req.url === '/api/status' ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ build: {
      sourceFile: process.env.HALO_MC_TEST_SOURCE_FILE,
      sourceSha256: process.env.HALO_MC_TEST_SOURCE_SHA256,
    } }));
    if (req.url === '/api/status' && ++healthRequests >= 2) {
      setTimeout(() => server.close(() => process.exit(0)), 250);
    }
  });
  server.listen(port, '127.0.0.1');
}, 350);
setTimeout(() => process.exit(91), 5000);
`;
  fs.writeFileSync(canonical, fakeServer);
  fs.writeFileSync(installed, fakeServer);
  try {
    const result = invokeLauncher(
      canonical,
      installed,
      `http://127.0.0.1:${port}/api/status`,
      ['-HealthTimeoutSeconds', '4'],
      {
        HALO_MC_TEST_PORT: String(port),
        HALO_MC_TEST_SOURCE_FILE: installed,
        HALO_MC_TEST_SOURCE_SHA256: sha256(installed),
      },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /healthy|HealthUri/i);
    assert.match(result.stdout, new RegExp(installed.replaceAll('\\', '\\\\'), 'i'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('launcher rejects a 200 health response from the wrong Mission Control build', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-launch-wrong-build-'));
  const canonical = path.join(dir, 'canonical.mjs');
  const installed = path.join(dir, 'installed.mjs');
  const port = await unusedTcpPort();
  const wrongBuildServer = `
import http from 'node:http';
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ build: { sourceFile: process.argv[1], sourceSha256: 'WRONG-BUILD' } }));
});
server.listen(Number(process.env.HALO_MC_TEST_PORT), '127.0.0.1');
setTimeout(() => server.close(() => process.exit(0)), 800);
`;
  fs.writeFileSync(canonical, wrongBuildServer);
  fs.writeFileSync(installed, wrongBuildServer);
  try {
    const result = invokeLauncher(
      canonical,
      installed,
      `http://127.0.0.1:${port}/api/status`,
      ['-HealthTimeoutSeconds', '2'],
      { HALO_MC_TEST_PORT: String(port) },
    );
    assert.notEqual(result.status, 0, `wrong build unexpectedly accepted:\n${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /health|build|hash/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
