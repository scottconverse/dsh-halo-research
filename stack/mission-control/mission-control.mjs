// Mission Control — lightweight Halo Stack monitoring surface at :3090
// Phase 4: Backend (~400 lines). Zero npm deps. Node.js builtins only.
// Polls lms ps, DSH sessions, gate ledger, GPU carveout, machine vitals.
// Serves a separate status.html frontend file.
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import os from 'node:os';

const execFileP = promisify(execFile);
const PORT = 3090;
const HOME = os.homedir();

// ── resolved executables ─────────────────────────────────────────────────
const EXE = {
  lms: resolveExe('lms', path.join(HOME, '.lmstudio', 'bin')),
  node: process.execPath,
};
function resolveExe(name, fixedDir) {
  if (path.isAbsolute(name) && fs.existsSync(name)) return name;
  const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';') : [''];
  const dirs = (process.env.PATH || '').split(path.delimiter);
  if (fixedDir) dirs.unshift(fixedDir);
  for (const d of dirs) {
    if (!d) continue;
    for (const ext of exts) {
      const cand = path.join(d, name + ext);
      if (fs.existsSync(cand)) return cand;
    }
    const bare = path.join(d, name);
    if (fs.existsSync(bare)) return bare;
  }
  return null;
}
function safeExecFile(which, args, opts = {}) {
  return execFileP(EXE[which] || which, args, { ...opts, shell: false });
}

// ── paths ─────────────────────────────────────────────────────────────────
const LMSTUDIO_LOGS = path.join(HOME, '.lmstudio', 'server-logs');
const LEDGER_FILE = path.join(HOME, 'Desktop', 'Code', 'dsh-halo-research', 'stack', 'gateway-conductor', 'LEDGER.csv');
const DSH_SESSIONS = path.join(HOME, '.dsh', 'sessions');
const MACHINE_TOTAL_RAM = 128 * 1024 * 1024 * 1024;

// ── helpers ───────────────────────────────────────────────────────────────
function tcpCheck(port, timeout = 1500) {
  return new Promise((resolve) => {
    const s = net.connect({ host: '127.0.0.1', port, timeout });
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
    s.on('timeout', () => { s.destroy(); resolve(false); });
  });
}
function gib(bytes) { return Math.round((bytes || 0) / 1073741824 * 10) / 10; }
function gb(bytes) { return Math.round((bytes || 0) / 1e9 * 10) / 10; }
function fmtStamp(ms) {
  if (!ms) return '—';
  const d = new Date(ms), p = (n) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

// ── lms CLI surfaces ──────────────────────────────────────────────────────
async function lmsPs() {
  try {
    const { stdout } = await safeExecFile('lms', ['ps', '--json'], { timeout: 8000 });
    return JSON.parse(stdout || '[]');
  } catch { return null; }
}
async function lmsLs() {
  try {
    const { stdout } = await safeExecFile('lms', ['ls', '--json'], { timeout: 10000 });
    return JSON.parse(stdout || '[]');
  } catch { return null; }
}

// ── GPU / disk / ram ──────────────────────────────────────────────────────
const gpuCache = { at: 0, dedicatedBytes: 0, sharedBytes: 0, ok: false };
async function gpuMemory() {
  if (Date.now() - gpuCache.at < 10000 && gpuCache.at) return gpuCache;
  try {
    const cmd = "(Get-Counter '\\GPU Adapter Memory(*)\\Dedicated Usage','\\GPU Adapter Memory(*)\\Shared Usage').CounterSamples | ForEach-Object { '{0}|{1}|{2}' -f $_.Path, $_.InstanceName, $_.CookedValue }";
    const { stdout } = await execFileP('powershell.exe', ['-NoProfile', '-Command', cmd], { timeout: 8000 });
    let dedicated = 0, shared = 0;
    for (const line of stdout.split('\n')) {
      const parts = line.trim().split('|');
      if (parts.length !== 3) continue;
      const p = parts[0].toLowerCase();
      const val = parseFloat(parts[2]) || 0;
      if (p.includes('dedicated usage')) dedicated += val;
      else if (p.includes('shared usage')) shared += val;
    }
    gpuCache.dedicatedBytes = dedicated;
    gpuCache.sharedBytes = shared;
    gpuCache.ok = true;
    gpuCache.at = Date.now();
  } catch { gpuCache.ok = false; gpuCache.at = Date.now(); }
  return gpuCache;
}

const diskCache = { at: 0, usedBytes: 0, freeBytes: 0, ok: false };
async function diskUsage() {
  if (Date.now() - diskCache.at < 60000 && diskCache.at) return diskCache;
  try {
    const cmd = "$d=Get-PSDrive C; '{0}|{1}' -f $d.Used,$d.Free";
    const { stdout } = await execFileP('powershell.exe', ['-NoProfile', '-Command', cmd], { timeout: 8000 });
    const [used, free] = stdout.trim().split('|').map(Number);
    diskCache.usedBytes = used || 0;
    diskCache.freeBytes = free || 0;
    diskCache.ok = true;
    diskCache.at = Date.now();
  } catch { diskCache.ok = false; diskCache.at = Date.now(); }
  return diskCache;
}

const vramCap = { at: 0, bytes: null };
async function vramCapacityBytes() {
  if (vramCap.at) return vramCap.bytes;
  try {
    const cmd = "Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0*' -Name 'HardwareInformation.qwMemorySize' -ErrorAction SilentlyContinue | ForEach-Object { $_.'HardwareInformation.qwMemorySize' }";
    const { stdout } = await execFileP('powershell.exe', ['-NoProfile', '-Command', cmd], { timeout: 8000 });
    const vals = stdout.split('\n').map(s => parseInt(s.trim(), 10)).filter(v => Number.isFinite(v) && v >= 1073741824);
    vramCap.bytes = vals.length ? Math.max(...vals) : null;
  } catch { vramCap.bytes = null; }
  vramCap.at = Date.now();
  return vramCap.bytes;
}

// ── sessions (disk scrape) ────────────────────────────────────────────────
function listSessionsScrape(limit = 50) {
  const out = [];
  try {
    for (const proj of fs.readdirSync(DSH_SESSIONS)) {
      const projDir = path.join(DSH_SESSIONS, proj);
      if (!fs.statSync(projDir).isDirectory()) continue;
      for (const sess of fs.readdirSync(projDir)) {
        const sessDir = path.join(projDir, sess);
        try {
          const log = fs.readdirSync(sessDir).find(f => f.startsWith('session.jsonl'));
          if (!log) continue;
          const st = fs.statSync(path.join(sessDir, log));
          const wsRaw = proj.replace(/^-+|-+$/g, '');
          const workspace = wsRaw.replace(/^C-/, 'C:\\').replace(/-/g, '\\');
          out.push({
            workspace,
            id: sess.replace(/^session-/, '').slice(0, 8),
            sessionId: sess,
            mtime: st.mtimeMs,
          });
        } catch { /* skip unreadable */ }
      }
    }
  } catch { /* sessions dir missing */ }
  return out.sort((a, b) => b.mtime - a.mtime).slice(0, limit);
}

// ── gate ledger ───────────────────────────────────────────────────────────
function readLedger() {
  try {
    const raw = fs.readFileSync(LEDGER_FILE, 'utf8');
    const lines = raw.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (lines.length < 2) return { rows: [], greens: 0, reds: 0, trips: 0 };
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const obj = {};
      const cols = line.split(',');
      header.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
      return obj;
    });
    // Count final verdicts (last row per unit)
    const byUnit = new Map();
    for (const r of rows) {
      const key = r.unit || r.batch || '';
      if (!byUnit.has(key) || (r.verdict && r.verdict !== 'incomplete')) {
        byUnit.set(key, r);
      }
    }
    let greens = 0, reds = 0, trips = 0;
    for (const r of byUnit.values()) {
      const v = (r.verdict || '').toLowerCase();
      if (v === 'green') greens++;
      else if (v === 'red') reds++;
      else if (v === 'tripwire') trips++;
    }
    return { rows, greens, reds, trips, total: greens + reds + trips };
  } catch { return { rows: [], greens: 0, reds: 0, trips: 0, total: 0 }; }
}

// ── log tail ──────────────────────────────────────────────────────────────
function logTail(n = 40) {
  try {
    const months = fs.readdirSync(LMSTUDIO_LOGS).filter(d => /^\d{4}-\d{2}$/.test(d)).sort();
    if (!months.length) return [];
    const monthDir = path.join(LMSTUDIO_LOGS, months[months.length - 1]);
    const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.log')).sort();
    if (!files.length) return [];
    const file = path.join(monthDir, files[files.length - 1]);
    const all = fs.readFileSync(file, 'utf8').split('\n');
    const NOISE = /\[LMSAuthenticator\]|Getting (load config stack|descriptor|instance processing state)|Listing (loaded|downloaded) models|Client (created|disconnected)/;
    const kept = all.filter(l => l.trim() && !NOISE.test(l));
    return kept.slice(-n);
  } catch { return []; }
}

// ── status() — the 5 s poll ───────────────────────────────────────────────
async function status() {
  const [dshUp, lmUp, models, gpu, disk] = await Promise.all([
    tcpCheck(3080), tcpCheck(1234), lmsPs(), gpuMemory(), diskUsage(),
  ]);
  const sessions = listSessionsScrape(50);
  const ledger = readLedger();
  const capBytes = await vramCapacityBytes();
  const winTotal = os.totalmem(), winFree = os.freemem();
  const apuDiff = MACHINE_TOTAL_RAM - winTotal;
  const carveoutBytes = capBytes != null ? capBytes
    : (apuDiff >= 8 * 1073741824 ? apuDiff : null);

  // Model summary
  const modelsSummary = (models || []).map(m => ({
    identifier: m.identifier,
    modelKey: m.modelKey,
    quant: m.quantization?.name || '?',
    context: m.contextLength,
    status: m.status,
    gb: gb(m.sizeBytes),
  }));

  const generating = modelsSummary.filter(m => m.status === 'generating');
  const todaySessions = sessions.filter(s => s.mtime > new Date().setHours(0, 0, 0, 0));

  return {
    time: new Date().toISOString(),
    services: {
      cockpit: dshUp,
      lmstudio: lmUp,
      lmsCli: models !== null,
    },
    models: modelsSummary,
    generating: generating.map(m => m.identifier),
    sessions: {
      total: sessions.length,
      today: todaySessions.length,
      recent: sessions.slice(0, 8).map(s => ({
        id: s.id,
        workspace: s.workspace,
        mtime: s.mtime,
        age: fmtStamp(s.mtime),
      })),
    },
    gate: ledger,
    ram: { totalGiB: gib(winTotal), freeGiB: gib(winFree), usedGiB: gib(winTotal - winFree) },
    gpu: {
      ok: gpu.ok,
      dedicatedGiB: gib(gpu.dedicatedBytes),
      sharedGiB: gib(gpu.sharedBytes),
      carveoutGiB: carveoutBytes != null ? gib(carveoutBytes) : null,
    },
    disk: { ok: disk.ok, usedGB: gb(disk.usedBytes), freeGB: gb(disk.freeBytes), totalGB: gb(disk.usedBytes + disk.freeBytes) },
    logtail: logTail(15),
  };
}

// ── HTTP server ───────────────────────────────────────────────────────────
const STATUS_PAGE = (() => {
  try {
    return fs.readFileSync(path.join(import.meta.dirname || __dirname, 'status.html'), 'utf8');
  } catch {
    return '<html><body><h1>Mission Control</h1><p>status.html not found</p></body></html>';
  }
})();

function serveApiJson(res, data) {
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');

    // GET / — serve the status page
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(STATUS_PAGE);
      return;
    }

    // GET /api/status — the single status endpoint
    if (req.method === 'GET' && url.pathname === '/api/status') {
      serveApiJson(res, await status());
      return;
    }

    // POST /api/action/start-cockpit
    if (req.method === 'POST' && url.pathname === '/api/action/start-cockpit') {
      const startScript = path.join(HOME, '.dsh', 'Start-DSH.ps1');
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', startScript], { shell: false });
      res.writeHead(200); res.end('ok'); return;
    }

    // POST /api/action/unload-all
    if (req.method === 'POST' && url.pathname === '/api/action/unload-all') {
      execFile(EXE.lms, ['unload', '--all'], { shell: false });
      res.writeHead(200); res.end('ok'); return;
    }

    res.writeHead(404); res.end('not found');
  } catch (e) {
    console.error('[mission-control]', e);
    res.writeHead(500); res.end('internal error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mission Control on http://127.0.0.1:${PORT}`);
});
