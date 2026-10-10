import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const launcher = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Launch-Status.ps1');
async function unusedPort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
function invoke(file, dir, port, timeout = 12, requestTimeout = 5) {
  return spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', launcher,
    '-CanonicalSource', file, '-InstalledCopy', file, '-DshRoot', dir, '-MissionControlDataDir', dir,
    '-HealthUri', `http://127.0.0.1:${port}/api/status`, '-HealthTimeoutSeconds', String(timeout),
    '-HealthRequestTimeoutSeconds', String(requestTimeout), '-NoBrowser'], {
    encoding: 'utf8', windowsHide: true, timeout: 25000,
    env: { ...process.env, HALO_MC_TEST_PORT: String(port),
      PSModulePath: path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/Modules') },
  });
}
function fixture(dir, { delay = 1600, hang = false } = {}) {
  const file = path.join(dir, 'fixture.mjs');
  fs.writeFileSync(file, `import http from 'node:http';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
fs.writeFileSync(${JSON.stringify(path.join(dir, 'pid'))}, String(process.pid));
const hash = createHash('sha256').update(fs.readFileSync(process.argv[1])).digest('hex');
let samples = 0;
http.createServer((req,res) => {
  if (${hang}) return;
  setTimeout(() => {
    res.writeHead(200, {'content-type':'application/json'});
    res.end(JSON.stringify({build:{sourceFile:process.argv[1],sourceSha256:hash}}));
    fs.writeFileSync(${JSON.stringify(path.join(dir, 'samples'))}, String(++samples));
    if (samples >= 2) setTimeout(() => process.exit(0), 500);
  }, ${delay});
}).listen(Number(process.env.HALO_MC_TEST_PORT), '127.0.0.1');
setTimeout(() => process.exit(92), 20000);
`);
  return file;
}
function cleanupFixture(dir) {
  const pidPath = path.join(dir, 'pid');
  if (fs.existsSync(pidPath)) {
    // This PID is written only by our temporary fixture, never by a real service.
    try { process.kill(Number(fs.readFileSync(pidPath, 'utf8'))); } catch { }
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

test('cold launch accepts two slow build-identity samples', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-slow-start-'));
  const port = await unusedPort();
  const file = fixture(dir);
  try {
    const started = invoke(file, dir, port);
    assert.equal(started.status, 0, started.stdout + '\n' + started.stderr);
    assert.match(started.stdout, /True/);
    assert.equal(Number(fs.readFileSync(path.join(dir, 'samples'), 'utf8')), 2);

  } finally { cleanupFixture(dir); }
});

test('a hung health endpoint exhausts the bounded deadline and cleans up its started child', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-hung-start-'));
  const port = await unusedPort();
  const file = fixture(dir, { hang: true });
  try {
    const start = Date.now();
    const result = invoke(file, dir, port, 3, 2);
    assert.notEqual(result.status, 0, result.stdout + '\n' + result.stderr);
    assert.match(result.stdout + result.stderr, /did not become healthy/);
    assert.ok(Date.now() - start < 15000, 'total health timeout must remain bounded');
    const pid = Number(fs.readFileSync(path.join(dir, 'pid'), 'utf8'));
    assert.throws(() => process.kill(pid, 0), /ESRCH/);
  } finally { cleanupFixture(dir); }
});
