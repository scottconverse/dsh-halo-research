// Mission Control — multi-tab operator console for the HALO local AI stack.
// v3: 7-card single page -> tabbed console (overview/models/sessions/plugins/system)
// with a master status strip. Zero deps, single file. Reads native surfaces plus
// a tiny bit of local state (mc-state.json, mc-history.jsonl) for trend/cadence
// tracking. Backup of the v2 cards page: mission-control.v2-cards.mjs.bak
import http from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { zstdDecompressSync } from 'node:zlib';

const execFileP = promisify(execFile);
const PORT = 3090;
// The complete installer owns a private Ollama endpoint. Legacy Halo defaults
// remain unchanged; never inspect or control another installation's LM Studio.
const OLLAMA_ORIGIN = process.env.DSH_MC_OLLAMA_ORIGIN || 'http://127.0.0.1:11434';
const OLLAMA_ONLY = process.env.DSH_MC_OLLAMA_ONLY === '1';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(OLLAMA_ORIGIN)) throw Error('Expected loopback Ollama origin');
const SOURCE_FILE = fileURLToPath(import.meta.url);
const BUILD_SHA256 = crypto.createHash('sha256').update(fs.readFileSync(SOURCE_FILE)).digest('hex').toUpperCase();

// ── safe subprocess execution (no shell) ────────────────────────────────────
// GATE-2026-08-21 / PE-1 (Blocker): every lms/npx/node call in this file used
// { shell: true }. With shell:true, Node CONCATENATES args into a command line
// instead of passing them as an argv vector, so any string that reaches spawn
// from an HTTP request body can inject a second command. Reproduced: an
// `identifier` of `x & echo PROVEN > f &` ran the echo. shell:true was there
// only because `lms` and `npx` are Windows .cmd shims that bare spawn cannot
// find. The correct fix is to RESOLVE the real executable once and run it with
// shell:false, so arguments are never re-parsed by a shell.
function resolveExe(name, fixedDir) {
  if (path.isAbsolute(name) && fs.existsSync(name)) return name;
  const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';') : [''];
  const dirs = (process.env.PATH || '').split(path.delimiter);
  // Known fixed location first, so a poisoned PATH cannot redirect us.
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
// EXE and the safe* helpers are defined AFTER the HOME/constant block below;
// see "safe subprocess execution — resolved" further down.
// Run a fixed executable with an argv array and NO shell. Returns {stdout}.
function safeExecFile(which, args, opts = {}) {
  if (OLLAMA_ONLY && which === 'lms') return Promise.reject(new Error('LM Studio is disabled in this Ollama installation'));
  const exe = EXE[which];
  if (!exe) return Promise.reject(new Error(`required executable is unavailable: ${which}`));
  const { env, ...rest } = opts;
  return execFileP(exe, args, { ...rest, shell: false, env: scrubbedChildEnv(env) });
}
// Fire-and-forget variant (replaces detached spawn(..., {shell:true})).
function safeSpawn(which, args, opts = {}) {
  if (OLLAMA_ONLY && which === 'lms') throw Error('LM Studio is disabled in this Ollama installation');
  const exe = EXE[which];
  if (!exe) throw new Error(`required executable is unavailable: ${which}`);
  const { env, ...rest } = opts;
  return spawn(exe, args, { ...rest, shell: false, env: scrubbedChildEnv(env) });
}

function scrubbedChildEnv(source = process.env) {
  const env = { ...(source || {}) };
  delete env.HALO_DSH_LAUNCH_URL;
  return env;
}

// Resolve only after Windows confirms that the child really spawned.  A bare
// detached spawn can emit `error` asynchronously after the request already
// returned 200, which used to turn a failed launch into a false success (and
// could crash Mission Control because nobody owned the error event).
function safeSpawnStarted(which, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = safeSpawn(which, args, opts);
    const failed = error => reject(error);
    child.once('error', failed);
    child.once('spawn', () => {
      child.off('error', failed);
      child.on('error', error => console.error('[mission-control] detached child error:', redactDshAuthority(error?.message || error)));
      if (opts.detached) child.unref();
      resolve(child);
    });
  });
}

// ── local request authorization (PE-1 / QA2) ────────────────────────────────
// Binding to 127.0.0.1 stops remote network attackers but NOT a CSRF request
// from a page the operator's own browser has open, which is the real vector.
// A token minted at boot and required on every state-changing POST closes it:
// the page is served the token inline, a cross-origin attacker cannot read it
// (same-origin policy), so it cannot forge an authorized POST. We also require
// an Origin/Referer that is our own, rejecting form-POST CSRF outright.
const ACTION_TOKEN = crypto.randomBytes(24).toString('hex');

// A state-changing POST is authorized only if it presents the boot token AND
// its Origin/Referer is our own. Read-only GETs are unaffected.
function actionAuthorized(req) {
  const tok = req.headers['x-mc-token'];
  if (tok !== ACTION_TOKEN) return false;
  const origin = req.headers['origin'] || '';
  const referer = req.headers['referer'] || '';
  if (!origin && !referer) return false;
  const ok = (value) => {
    if (!value) return true;
    try {
      const candidate = new URL(value);
      return candidate.protocol === 'http:'
        && (candidate.hostname === '127.0.0.1' || candidate.hostname === 'localhost')
        && candidate.port === String(PORT);
    } catch {
      return false;
    }
  };
  return ok(origin) && ok(referer);
}

const HOME = os.homedir();
// Mission Control is part of the stock DSH deployment.  The launcher supplies
// these paths explicitly; the fallbacks keep a direct `node mission-control.mjs`
// launch useful without ever falling back to the retired ~/.dsh installation.
const DSH_HOME = path.resolve(process.env.DSH_HOME || path.join(HOME, '.dsh-stock'));
const DSH_ROOT = path.resolve(process.env.HALO_DSH_ROOT || path.join(path.dirname(SOURCE_FILE), '..'));
// Resolve runtime dependencies from the stock deployment even when this tested
// file is promoted into .dsh-stock/mission-control.
const requireFromStockDsh = createRequire(path.join(DSH_ROOT, 'package.json'));
const WebSocket = requireFromStockDsh('ws');
const DSH_SESSIONS = path.join(DSH_HOME, 'sessions');
const MEMORY_FILE = path.join(DSH_HOME, 'memory', 'memory.json');
const CORDIS_PATCH = path.join(DSH_HOME, 'cordis.patch.yml');
// Shared store first; per-profile node_modules (web/headless) hold the
// add-on packages (e.g. dsh-subagent-*) that only exist per-profile.
const DEEPSEEK_PKG_DIRS = [
  path.join(DSH_ROOT, 'node_modules', '@deepseek-ai'),
  path.join(DSH_HOME, 'profiles', 'node_modules', '@deepseek-ai'),
  path.join(DSH_HOME, 'profiles', 'web', 'node_modules', '@deepseek-ai'),
  path.join(DSH_HOME, 'profiles', 'headless', 'node_modules', '@deepseek-ai'),
];
const MC_DIR = path.resolve(process.env.HALO_MC_DIR || path.join(DSH_HOME, 'mission-control'));
const STATE_FILE = path.join(MC_DIR, 'mc-state.json');
const HISTORY_FILE = path.join(MC_DIR, 'mc-history.jsonl');
const LMSTUDIO_LOGS = path.join(HOME, '.lmstudio', 'server-logs');
const LMSTUDIO_MAIN_LOG = path.join(process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming'), 'LM Studio', 'logs', 'main.log');
const LMSTUDIO_VERSION_FILE = path.join(HOME, '.lmstudio', '.internal', 'historical-version-info.json');
const LM_LINK_ACCOUNT_CACHE = path.join(HOME, '.lmstudio', '.internal', 'lm-link-account-status-cache.json');
const LMSTUDIO_MODELS_DIR = path.join(HOME, '.lmstudio', 'models');
const MEMORY_SNAPSHOTS = path.join(DSH_HOME, 'memory', 'snapshots');
const MEMORY_SNAPSHOT_TASK = 'HALO Memory Snapshot';
// The legacy JavaScript loaders were removed when the measured load envelope
// moved into LM Studio model.yaml aliases. Mission Control used to keep reading
// those deleted scripts, which made the real daily pair appear empty and
// "unknown-origin". These are the current, versioned role contracts.
const DAILY_BRAIN = {
  modelKey: 'halo/qwen3.6-35b-a3b-q6', identifier: 'halo/qwen3.6-35b-a3b-q6',
  quant: 'Q6_K', context: 65536, parallel: 1,
  definition: path.join(HOME, '.lmstudio', 'hub', 'models', 'halo', 'qwen3.6-35b-a3b-q6', 'model.yaml'),
};
const DAILY_WORKER = {
  modelKey: 'halo/qwen3-coder-30b-a3b-q4km', identifier: 'halo-coder-q4km',
  quant: 'Q4_K_M', context: 131072, parallel: 1,
  definition: path.join(HOME, '.lmstudio', 'hub', 'models', 'halo', 'qwen3-coder-30b-a3b-q4km', 'model.yaml'),
};
const TUNED_BRAIN_27B = {
  modelKey: 'halo/qwen3.8-27b',
  definition: path.join(HOME, '.lmstudio', 'hub', 'models', 'halo', 'qwen3.8-27b', 'model.yaml'),
};
const START_DSH = path.resolve(process.env.HALO_START_DSH || path.join(DSH_ROOT, 'Start-StockDSH.ps1'));
const DSH_PACKAGE_FILE = path.join(DSH_ROOT, 'node_modules', '@deepseek-ai', 'dsh', 'package.json');
function installedDshVersion() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DSH_PACKAGE_FILE, 'utf8'));
    return typeof parsed.version === 'string' && parsed.version.trim() ? parsed.version.trim() : 'unknown';
  } catch { return 'unknown'; }
}
const DSH_ORIGIN = 'http://127.0.0.1:3080';
const DSH_STDOUT_LOG = process.env.DSH_MC_STDOUT_LOG || path.join(DSH_ROOT, 'logs', 'dsh.stdout.log');
// Capture launch authority exactly once, then remove it from the process-wide
// environment before any child can inherit it. A later DSH restart is learned
// from its protected stdout log, never by repopulating process.env.
const CAPTURED_DSH_LAUNCH_URL = validDshLaunchUrl(process.env.HALO_DSH_LAUNCH_URL);
delete process.env.HALO_DSH_LAUNCH_URL;
// Resolved executables (needs HOME above). safeExecFile/safeSpawn read this.
const DSH_BIN = path.join(DSH_ROOT, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');
const POWERSHELL_EXE = OLLAMA_ONLY && process.env.DSH_COMPLETE_PWSH
  ? process.env.DSH_COMPLETE_PWSH
  : path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const CHROME_EXE = [
  path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local'), 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ...(OLLAMA_ONLY ? [path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe')] : []),
].find(candidate => fs.existsSync(candidate)) || null;
const EXE = {
  lms: resolveExe('lms', path.join(HOME, '.lmstudio', 'bin')),
  node: resolveExe('node') || process.execPath,
  chrome: CHROME_EXE,
  powershell: fs.existsSync(POWERSHELL_EXE) ? POWERSHELL_EXE : null,
};
// A session that claims to be running but whose durable log has not advanced
// in this long is STALLED, whatever the harness's own flag says. Ten minutes
// clears the measured 403 s healthy first-token worst case and matches the
// minimum safe stream-idle timeout enforced by the settings validator.
const STALL_MS = 10 * 60 * 1000;
// GPU carveout sizing must work on ANY box this deploys to (the 5070 Ti port
// exposed a hardcoded-128-GiB defect: "14.9 / 96.4 GiB carveout" on a 16 GiB
// discrete card). Primary source: the display driver's own VRAM capacity from
// the registry (qwMemorySize — reports the VGM carveout on the Strix Halo APU
// and true VRAM on discrete cards). Fallback for APUs where that key is
// absent: unified-total minus what Windows sees. Neither → carveout unknown,
// and the UI says so instead of inventing a number.
const MACHINE_TOTAL_RAM = OLLAMA_ONLY ? os.totalmem() : 128 * 1024 * 1024 * 1024; // HALO fallback hint only
const vramCap = { at: 0, bytes: null };
async function vramCapacityBytes() {
  if (vramCap.at) return vramCap.bytes;
  try {
    const cmd = "Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0*' -Name 'HardwareInformation.qwMemorySize' -ErrorAction SilentlyContinue | ForEach-Object { $_.'HardwareInformation.qwMemorySize' }";
    const { stdout } = await safeExecFile('powershell', ['-NoProfile', '-Command', cmd], { timeout: 8000 });
    const vals = stdout.split('\n').map(s => parseInt(s.trim(), 10)).filter(v => Number.isFinite(v) && v >= 1073741824);
    vramCap.bytes = vals.length ? Math.max(...vals) : null;
  } catch { vramCap.bytes = null; }
  vramCap.at = Date.now();
  return vramCap.bytes;
}
const MEMORY_ENTITY_TRIPWIRE = 50;

function tcpCheck(port, timeout = 1500) {
  return new Promise((resolve) => {
    const s = net.connect({ host: '127.0.0.1', port, timeout });
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
    s.on('timeout', () => { s.destroy(); resolve(false); });
  });
}

function gb(bytes) { return Math.round((bytes || 0) / 1e9 * 10) / 10; }
// Binary (GiB) variant — used for RAM/GPU pools, which is what Adrenalin's VGM
// split and Windows' own reporting actually use. Disk stays decimal (gb()) —
// drive capacities are marketed in decimal GB.
function gib(bytes) { return Math.round((bytes || 0) / 1073741824 * 10) / 10; }

/*__DATA_CONTRACT_START__*/
// Pure data-contract helpers live in this marked block so deterministic tests
// can execute them without starting Mission Control or touching live services.
function parseMemoryFile(file) {
  const entities = [];
  const relations = [];
  const relationCandidates = [];
  const entityNames = new Set();
  let invalidRecords = 0;
  let malformedRecords = 0;
  let duplicateEntities = 0;
  let danglingRelations = 0;
  let totalRecords = 0;
  let mtimeMs = null;
  try {
    const text = fs.readFileSync(file, 'utf8');
    try { mtimeMs = fs.statSync(file).mtimeMs; } catch { /* content is still authoritative */ }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      totalRecords++;
      let obj;
      try { obj = JSON.parse(line); }
      catch { invalidRecords++; malformedRecords++; continue; }
      if (obj?.type === 'entity') {
        const valid = typeof obj.name === 'string' && obj.name.trim()
          && typeof obj.entityType === 'string' && obj.entityType.trim()
          && Array.isArray(obj.observations)
          && obj.observations.every(o => typeof o === 'string');
        if (!valid) { invalidRecords++; continue; }
        if (entityNames.has(obj.name)) {
          invalidRecords++;
          duplicateEntities++;
          continue;
        }
        entityNames.add(obj.name);
        entities.push({ name: obj.name, entityType: obj.entityType, observations: obj.observations });
      } else if (obj?.type === 'relation') {
        const valid = typeof obj.from === 'string' && obj.from.trim()
          && typeof obj.to === 'string' && obj.to.trim()
          && typeof obj.relationType === 'string' && obj.relationType.trim();
        if (!valid) { invalidRecords++; continue; }
        relationCandidates.push({ from: obj.from, to: obj.to, relationType: obj.relationType });
      } else {
        invalidRecords++;
      }
    }
    for (const relation of relationCandidates) {
      if (!entityNames.has(relation.from) || !entityNames.has(relation.to)) {
        invalidRecords++;
        danglingRelations++;
        continue;
      }
      relations.push(relation);
    }
    const ok = invalidRecords === 0;
    const error = ok ? null
      : [
          `${invalidRecords} invalid memory record(s)`,
          malformedRecords ? `${malformedRecords} malformed JSON` : null,
          duplicateEntities ? `${duplicateEntities} duplicate entity name(s)` : null,
          danglingRelations ? `${danglingRelations} dangling relation(s)` : null,
        ].filter(Boolean).join('; ');
    return {
      ok, file, error, entities, relations, relationCount: relations.length, totalRecords,
      invalidRecords, malformedRecords, duplicateEntities, danglingRelations, mtimeMs,
    };
  } catch (e) {
    return {
      ok: false, file, error: e?.code === 'ENOENT' ? 'not configured' : 'unreadable',
      entities, relations, relationCount: 0, totalRecords, invalidRecords, malformedRecords,
      duplicateEntities, danglingRelations, mtimeMs,
    };
  }
}

function selectNewestLogFile(root) {
  let newest = null;
  let newestMtime = -Infinity;
  for (const month of fs.readdirSync(root, { withFileTypes: true })) {
    if (!month.isDirectory() || !/^\d{4}-\d{2}$/.test(month.name)) continue;
    const monthDir = path.join(root, month.name);
    for (const entry of fs.readdirSync(monthDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.log')) continue;
      const file = path.join(monthDir, entry.name);
      const mtimeMs = fs.statSync(file).mtimeMs;
      if (mtimeMs > newestMtime || (mtimeMs === newestMtime && file.localeCompare(newest || '') > 0)) {
        newest = file;
        newestMtime = mtimeMs;
      }
    }
  }
  return newest;
}

function selectDecodeObservation(sessions, previous, measuredStep = null) {
  const completed = (sessions || [])
    .filter(s => s?.decodeTps != null && s.running !== true && s.claimsRunning !== true)
    .sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  const latest = completed[0] || null;
  // A long-running session can finish many model steps before the session
  // itself ends. Its DSH token/time delta is newer than the last closed run.
  if (measuredStep?.at > (latest?.mtime || 0) && Number.isFinite(measuredStep.tps)) {
    const decodeSourceKey = `step:${measuredStep.sessionId}:${measuredStep.at}`;
    return { decodeTps: previous?.decodeSourceKey === decodeSourceKey ? null : measuredStep.tps,
      decodeSourceKey, decodeSourceSession: measuredStep.sessionId, decodeSourceAt: measuredStep.at };
  }
  if (!latest) {
    return { decodeTps: null, decodeSourceKey: previous?.decodeSourceKey || null,
      decodeSourceSession: previous?.decodeSourceSession || null, decodeSourceAt: previous?.decodeSourceAt || null };
  }
  if (previous?.decodeSourceAt && (latest.mtime || 0) <= previous.decodeSourceAt) {
    return { decodeTps: null, decodeSourceKey: previous.decodeSourceKey,
      decodeSourceSession: previous.decodeSourceSession || null, decodeSourceAt: previous.decodeSourceAt };
  }
  const id = latest.id || latest.sessionId || '?';
  const decodeSourceKey = `${id}:${latest.mtime || 0}`;
  return {
    decodeTps: previous?.decodeSourceKey === decodeSourceKey ? null : latest.decodeTps,
    decodeSourceKey,
    decodeSourceSession: id,
    decodeSourceAt: latest.mtime || null,
  };
}

function describeValidationFreshness(validation, now = Date.now(), currentFingerprint = null) {
  const when = Number(validation?.when);
  if (!Number.isFinite(when) || when <= 0) return { state: 'never', ageMs: null };
  const ageMs = Math.max(0, now - when);
  if (currentFingerprint && validation?.fingerprint !== currentFingerprint) {
    return { state: 'stale', ageMs, reason: 'configuration or installed DSH version changed' };
  }
  return { state: ageMs > 24 * 3600000 ? 'stale' : 'current', ageMs,
    ...(ageMs > 24 * 3600000 ? { reason: 'validation is older than 24 hours' } : {}) };
}

function parseValidationDiagnostics(text, max = 50) {
  const diagnostics = [];
  const seen = new Set();
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (!line) continue;
    if (!/^(?:\[[^\]]+\]\s*)?(?:warn(?:ing)?|error|fatal|unmatched\b|not found\b)(?:\s*[:\-]|\s+)/i.test(line)) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    diagnostics.push(line);
    if (diagnostics.length >= max) break;
  }
  return diagnostics;
}

function describeRouteRuntime(route, models, ollama = {}) {
  const model = route?.model || null;
  const configured = route?.provider && model ? `${route.provider}/${model}` : null;
  const runtime = route?.runtime || 'lmstudio';
  const localLlm = (models || []).filter(m => (!m.provider || m.provider === runtime) && m?.originKind === 'local' && (!m?.type || m.type === 'llm'));
  let matches = [];
  let matchBasis = null;
  // Provider ids are operator-defined in the Web profile. Locality comes from
  // that provider's transport, not a stale allow-list of historical names.
  const cloudModel = runtime === 'ollama' && (ollama.remoteModels || []).find(m => m.name === model);
  const localRoute = !cloudModel && (runtime === 'ollama' || route?.localModelProvider === true
    || (route?.localModelProvider == null && ['lmstudio', 'lmstudio-brain'].includes(route?.provider)));
  if (localRoute && model) {
    matches = localLlm.filter(m => m?.identifier === model || m?.modelKey === model);
    if (matches.length === 1) matchBasis = 'exact key or identifier';
    else if (matches.length === 0) {
      // LM Studio's API qualifies catalog routes as publisher/key but its
      // resident process view can expose the unqualified key as identifier.
      // Preserve publisher and require an exact, unique qualified tuple;
      // basename-only matching is unsafe when a Halo alias is also resident.
      matches = localLlm.filter(m => {
        if (!m?.publisher) return false;
        const keys = [m.modelKey, m.identifier].filter(k => k && !String(k).includes('/'));
        return keys.some(k => `${m.publisher}/${k}` === model);
      });
      if (matches.length === 1) matchBasis = 'publisher-qualified resident key';
    }
  }
  const exact = matches.length === 1 ? matches[0] : null;
  const exactResident = !!exact;
  return {
    configured,
    model,
    residencyApplicable: localRoute,
    executionLocation: cloudModel ? 'cloud via Ollama' : localRoute ? 'local' : 'remote/provider-managed',
    exactResident,
    runtime,
    exactGenerating: exact?.provider === 'ollama' ? null : !!exact && exact.status === 'generating',
    matchedIdentifier: exact?.identifier || null,
    matchBasis,
    ambiguous: matches.length > 1,
    configError: route?.error || null,
    warning: route?.error || (localRoute && configured && !exactResident
      ? (matches.length > 1
          ? 'configured route matches more than one resident model; residency is ambiguous'
          : 'configured route is not resident; its next request can load a separate model instance')
      : null),
  };
}

function selectLatestCompletedSession(sessions) {
  return (sessions || [])
    .filter(session => session?.decodeTps != null && !session.running && !session.claimsRunning)
    .sort((a, b) => (b.mtime || 0) - (a.mtime || 0))[0] || null;
}

function resolveExactResidentRole(role, models) {
  const matches = (models || []).filter(model => model?.originKind === 'local'
    && (model.identifier === role?.identifier || model.modelKey === role?.modelKey));
  return {
    model: matches.length === 1 ? matches[0] : null,
    ambiguous: matches.length > 1,
    matches: matches.map(model => model.identifier),
  };
}

function modelStateMatches(models, identifier, shouldBeResident) {
  const local = (models || []).filter(model => model?.deviceIdentifier == null && model?.originKind !== 'device');
  const resident = identifier == null
    ? local.length > 0
    : local.some(model => model.identifier === identifier);
  return shouldBeResident ? resident : !resident;
}

function normalizeHistoryRow(r) {
  if (!r || !Number.isFinite(Number(r.t))) return null;
  const hasDecodeProvenance = typeof r.decodeSourceKey === 'string' && r.decodeSourceKey.length > 0;
  return {
    t: Number(r.t),
    // Before the provenance fields existed Mission Control copied the latest
    // session aggregate into every minute of history. Those legacy numbers are
    // not individual runs and must never be drawn as throughput observations.
    decodeTps: hasDecodeProvenance && r.decodeTps != null && r.decodeTps !== ''
      && Number.isFinite(Number(r.decodeTps)) ? Number(r.decodeTps) : null,
    decodeSourceKey: hasDecodeProvenance ? r.decodeSourceKey : null,
    decodeSourceSession: hasDecodeProvenance ? (r.decodeSourceSession ?? null) : null,
    decodeSourceAt: hasDecodeProvenance ? (r.decodeSourceAt ?? null) : null,
    winFree: r.winFreeGiB ?? r.winFreeGB ?? null,
    gpuDed: r.gpuDedGiB ?? r.gpuDedGB ?? null,
    gpuShared: r.gpuSharedGiB ?? r.gpuSharedGB ?? null,
  };
}

function pruneHistoryLines(lines, now = Date.now(), retainMs = 8 * 24 * 3600000) {
  const cutoff = now - retainMs;
  return (lines || []).filter(line => {
    try {
      const row = JSON.parse(line);
      return Number.isFinite(Number(row?.t)) && Number(row.t) >= cutoff;
    } catch {
      return false;
    }
  });
}

function parseGpuCounterOutput(stdout) {
  let dedicatedBytes = 0;
  let sharedBytes = 0;
  let dedicatedCount = 0;
  let sharedCount = 0;
  for (const line of String(stdout || '').split('\n')) {
    const parts = line.trim().split('|');
    if (parts.length !== 3) continue;
    const counterPath = parts[0].toLowerCase();
    const value = Number(parts[2]);
    if (!parts[2].trim() || !Number.isFinite(value) || value < 0) continue;
    if (counterPath.includes('dedicated usage')) { dedicatedBytes += value; dedicatedCount++; }
    else if (counterPath.includes('shared usage')) { sharedBytes += value; sharedCount++; }
  }
  if (dedicatedCount === 0 || sharedCount === 0) throw new Error('GPU counter query did not return both dedicated and shared samples');
  return { dedicatedBytes, sharedBytes, dedicatedCount, sharedCount };
}

function describeFileFreshness(mtimeMs, now = Date.now(), staleAfterMs = 24 * 3600000) {
  const value = Number(mtimeMs);
  if (!Number.isFinite(value) || value <= 0) return { state: 'unknown', ageMs: null };
  const ageMs = Math.max(0, now - value);
  return { state: ageMs > staleAfterMs ? 'stale' : 'current', ageMs };
}

function downsampleHistoryRows(rows, maxPoints = 400) {
  if (!Array.isArray(rows) || rows.length <= maxPoints) return rows || [];
  const observations = rows.filter(r => r?.decodeTps != null);
  if (observations.length >= maxPoints) return observations.slice(-maxPoints);
  const observationSet = new Set(observations);
  const resourceRows = rows.filter(r => !observationSet.has(r));
  const budget = maxPoints - observations.length;
  const sampled = [];
  if (budget === 1 && resourceRows.length) {
    sampled.push(resourceRows[resourceRows.length - 1]);
  } else if (budget > 1 && resourceRows.length) {
    for (let i = 0; i < budget; i++) {
      const at = Math.round(i * (resourceRows.length - 1) / (budget - 1));
      if (resourceRows[at] && sampled[sampled.length - 1] !== resourceRows[at]) sampled.push(resourceRows[at]);
    }
  }
  return sampled.concat(observations).sort((a, b) => a.t - b.t);
}

function summarizeStalledSessions(sessions, limit = 12) {
  const stalled = (sessions || []).filter(s => s?.stalled);
  return {
    inventoryCount: (sessions || []).length,
    count: stalled.length,
    items: stalled.slice(0, limit).map(s => ({
      id: s.id, sessionId: s.sessionId, title: s.title, stalledMs: s.stalledMs,
    })),
  };
}

function describeCacheState(cache, now = Date.now()) {
  const sampledAt = Number(cache?.sampledAt || cache?.at) || null;
  const ageMs = sampledAt == null ? null : Math.max(0, now - sampledAt);
  const dataAvailable = cache?.pluginEntries != null || cache?.dataAvailable === true;
  return {
    state: cache?.ok ? 'current' : (dataAvailable ? 'stale' : 'unavailable'),
    stale: !cache?.ok && dataAvailable,
    sampledAt,
    ageMs,
    error: cache?.error || null,
  };
}

function describeMuxState(connected, jobs, queues, visibleSessionIds) {
  const visible = new Set(visibleSessionIds || []);
  const include = id => visible.size === 0 || visible.has(id);
  const rawActive = [...(jobs || new Map()).entries()].filter(([id]) => include(id)).flatMap(([sid, list]) =>
    (list || []).map(j => ({
      session: sid.replace(/^session-/, '').slice(0, 8),
      id: j.jobId || j.id || '?', kind: j.kind || '', state: j.state || j.status || (j.running ? 'running' : ''),
    })));
  const rawQueued = [...(queues || new Map()).entries()].filter(([id]) => include(id)).reduce((sum, [, count]) => sum + (count || 0), 0);
  return {
    active: connected ? rawActive : [],
    queuedInputs: connected ? rawQueued : 0,
    dataStale: !connected && (rawActive.length > 0 || rawQueued > 0),
    staleActiveCount: !connected ? rawActive.length : 0,
    staleQueuedInputs: !connected ? rawQueued : 0,
  };
}

function readSnapshotCadence(snapshotDir, now = Date.now(), intervalMs = 3600000, graceMs = 15 * 60000) {
  let newest = null;
  let count = 0;
  try {
    for (const entry of fs.readdirSync(snapshotDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const m = entry.name.match(/^memory-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$/);
      if (!m) continue;
      const at = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])).getTime();
      if (!Number.isFinite(at)) continue;
      count++;
      if (!newest || at > newest.at) newest = { at, file: path.join(snapshotDir, entry.name) };
    }
  } catch (e) {
    return { ok: false, error: e?.code === 'ENOENT' ? 'not configured' : 'unreadable', count: 0, lastSnapshotAt: null, nextExpectedAt: null, ageMs: null, overdue: null, file: null };
  }
  if (!newest) return { ok: false, error: 'no snapshots', count: 0, lastSnapshotAt: null, nextExpectedAt: null, ageMs: null, overdue: null, file: null };
  const ageMs = Math.max(0, now - newest.at);
  return {
    ok: true, error: null, count, lastSnapshotAt: new Date(newest.at).toISOString(),
    nextExpectedAt: new Date(newest.at + intervalMs).toISOString(), ageMs,
    overdue: ageMs > intervalMs + graceMs, file: newest.file,
  };
}
function sessionActivityState(summaryUpdatedAt, logUpdatedAt, claimsRunning, now = Date.now(), stallAfterMs = 10 * 60 * 1000) {
  const summaryAt = Number(summaryUpdatedAt) || 0;
  const logAt = Number(logUpdatedAt) || 0;
  const lastActivityAt = Math.max(summaryAt, logAt);
  const stalledMs = claimsRunning && lastActivityAt ? Math.max(0, now - lastActivityAt) : null;
  const stalled = stalledMs != null && stalledMs > stallAfterMs;
  return {
    lastActivityAt,
    activitySource: logAt > summaryAt ? 'session log' : 'DSH session list',
    stalledMs,
    stalled,
    running: !!claimsRunning && !stalled,
  };
}
/*__DATA_CONTRACT_END__*/

// ─────────────────────────── lms CLI surfaces ───────────────────────────

async function lmsPs() {
  try {
    const { stdout } = await safeExecFile('lms', ['ps', '--json'], { timeout: 8000 });
    return JSON.parse(stdout || '[]');
  } catch { return null; }
}

async function waitForModelState(identifier, shouldBeResident, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const models = await lmsPs();
    if (models !== null && modelStateMatches(models, identifier, shouldBeResident)) return models;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const expected = shouldBeResident ? 'resident' : 'absent';
  throw new Error(`LM Studio did not corroborate ${identifier || 'all local models'} as ${expected} within ${Math.round(timeoutMs / 1000)} seconds`);
}

async function runLmsMutation(args, identifier, shouldBeResident, timeoutMs = 120000, before = null) {
  // Record manual intent before waiting for another model operation. A later
  // Unload wins even if an earlier Load is still completing.
  let revision = null;
  if (!before) {
    if (shouldBeResident) revision = beginManualLoad(identifier);
    else suppressRecovery(identifier, identifier == null);
  }
  lmsMutationsPending++;
  return queuedLmsMutation(async () => {
    if (before && await before() === false) return { skipped: true };
    const { stdout = '', stderr = '' } = await safeExecFile('lms', args, {
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
    });
    await waitForModelState(identifier, shouldBeResident, timeoutMs);
    if (!before && shouldBeResident) rearmRecovery(identifier, revision);
    if (!shouldBeResident) {
      for (const [role, model] of Object.entries(RECOVERY_ROLES)) {
        if (identifier == null || identifier === model.identifier) modelRecoveryState.roles[role].confirmedAbsent = true;
      }
      saveRecovery(modelRecoveryState);
    }
    return { stdout, stderr };
  }).finally(() => { lmsMutationsPending--; });
}

const snapshotTaskCache = { at: 0, value: null };
async function memorySnapshotTaskState(now = Date.now()) {
  if (snapshotTaskCache.value && now - snapshotTaskCache.at < 60000) return snapshotTaskCache.value;
  const script = [
    "$t=Get-ScheduledTask -TaskName 'HALO Memory Snapshot' -ErrorAction SilentlyContinue",
    "if ($null -eq $t) { [pscustomobject]@{configured=$false; state=$null; lastRunTime=$null; nextRunTime=$null; lastTaskResult=$null; actions=@(); triggers=@(); startWhenAvailable=$false; multipleInstances=$null} | ConvertTo-Json -Compress -Depth 6; exit 0 }",
    '$i=$t | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue',
    '$last=if ($null -ne $i.LastRunTime) { $i.LastRunTime.ToUniversalTime().ToString("o") } else { $null }',
    '$next=if ($null -ne $i.NextRunTime) { $i.NextRunTime.ToUniversalTime().ToString("o") } else { $null }',
    '$actions=@($t.Actions | ForEach-Object { [pscustomobject]@{execute=$_.Execute; arguments=$_.Arguments; workingDirectory=$_.WorkingDirectory} })',
    '$triggers=@($t.Triggers | ForEach-Object { [pscustomobject]@{type=$_.CimClass.CimClassName; enabled=$_.Enabled; repetitionInterval=if ($null -ne $_.Repetition) { [string]$_.Repetition.Interval } else { $null }} })',
    '[pscustomobject]@{configured=$true; state=[string]$t.State; lastRunTime=$last; nextRunTime=$next; lastTaskResult=$i.LastTaskResult; actions=$actions; triggers=$triggers; startWhenAvailable=$t.Settings.StartWhenAvailable; multipleInstances=[string]$t.Settings.MultipleInstances} | ConvertTo-Json -Compress -Depth 6',
  ].join('; ');
  let value;
  try {
    const { stdout } = await safeExecFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
      timeout: 8000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    const parsed = JSON.parse(stdout.trim());
    const snapshotScript = path.resolve(DSH_ROOT, 'mission-control', 'Snapshot-HaloMemory.ps1');
    const workingDirectory = path.dirname(snapshotScript);
    const powerShellExecutable = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
    const expectedArguments = [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', `"${snapshotScript}"`,
      '-Source', `"${MEMORY_FILE}"`, '-Destination', `"${MEMORY_SNAPSHOTS}"`, '-Keep', '168',
    ].join(' ');
    const actions = Array.isArray(parsed.actions) ? parsed.actions : (parsed.actions ? [parsed.actions] : []);
    const triggers = Array.isArray(parsed.triggers) ? parsed.triggers : (parsed.triggers ? [parsed.triggers] : []);
    const samePath = (left, right) => typeof left === 'string' && typeof right === 'string'
      && path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
    const issues = [];
    if (parsed.configured === true) {
      if (actions.length !== 1) issues.push(`expected one action, found ${actions.length}`);
      const action = actions[0] || {};
      if (!samePath(action.execute, powerShellExecutable)) issues.push('PowerShell executable does not match the stock task');
      if (action.arguments !== expectedArguments) {
        issues.push(/\\.dsh\\memory/i.test(String(action.arguments || '')) && !/\\.dsh-stock\\memory/i.test(String(action.arguments || ''))
          ? 'task points to retired .dsh memory path'
          : 'snapshot command arguments do not match the stock memory paths and retention');
      }
      if (!samePath(action.workingDirectory, workingDirectory)) issues.push('working directory does not match the stock Mission Control source');
      const hourly = triggers.filter(trigger => trigger.type === 'MSFT_TaskTimeTrigger'
        && trigger.enabled !== false && trigger.repetitionInterval === 'PT1H');
      const startup = triggers.filter(trigger => trigger.type === 'MSFT_TaskBootTrigger' && trigger.enabled !== false);
      if (hourly.length !== 1) issues.push('hourly trigger is missing or incorrect');
      if (startup.length !== 1) issues.push('startup trigger is missing or incorrect');
      if (parsed.startWhenAvailable !== true) issues.push('missed-run recovery is disabled');
      if (parsed.multipleInstances !== 'IgnoreNew') issues.push('overlap prevention is not IgnoreNew');
    }
    value = {
      taskName: MEMORY_SNAPSHOT_TASK,
      configured: parsed.configured === true,
      definitionValid: parsed.configured === true && issues.length === 0,
      definitionIssues: issues,
      state: parsed.state || null,
      lastRunTime: parsed.lastRunTime || null,
      nextRunTime: parsed.nextRunTime || null,
      lastTaskResult: parsed.lastTaskResult ?? null,
      action: actions[0] || null,
      triggers,
      startWhenAvailable: parsed.startWhenAvailable === true,
      multipleInstances: parsed.multipleInstances || null,
      expected: { powerShellExecutable, snapshotScript, workingDirectory, source: MEMORY_FILE, destination: MEMORY_SNAPSHOTS, retention: 168, arguments: expectedArguments },
      error: issues.length ? issues.join('; ') : null,
    };
  } catch (error) {
    value = {
      taskName: MEMORY_SNAPSHOT_TASK,
      configured: false,
      definitionValid: false,
      definitionIssues: [],
      state: null,
      lastRunTime: null,
      nextRunTime: null,
      lastTaskResult: null,
      action: null,
      triggers: [],
      startWhenAvailable: false,
      multipleInstances: null,
      expected: null,
      error: `scheduled-task state unavailable: ${String(error?.message || error).slice(0, 200)}`,
    };
  }
  snapshotTaskCache.at = now;
  snapshotTaskCache.value = value;
  return value;
}

async function lmsLs() {
  try {
    const { stdout } = await safeExecFile('lms', ['ls', '--json'], { timeout: 10000 });
    return JSON.parse(stdout || '[]');
  } catch { return null; }
}

// `lms runtime ls --json` doesn't exist on this build — falls back to parsing
// the text table. Columns: LLM ENGINE (name@version) | SELECTED (✓) | MODEL FORMAT.
async function lmsRuntimeLs() {
  try {
    const { stdout } = await safeExecFile('lms', ['runtime', 'ls'], { timeout: 8000 });
    const lines = stdout.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
    const rows = [];
    let selected = null;
    for (const line of lines) {
      if (/^LLM ENGINE/i.test(line)) continue;
      const m = line.match(/^(\S+)\s{2,}/);
      if (!m) continue;
      const engine = m[1];
      const isSelected = line.includes('\u2713');
      const fmtMatch = line.trim().match(/(\S+)\s*$/);
      const format = fmtMatch ? fmtMatch[1] : '';
      const at = engine.lastIndexOf('@');
      const row = { engine, name: at >= 0 ? engine.slice(0, at) : engine, version: at >= 0 ? engine.slice(at + 1) : '', selected: isSelected, format };
      rows.push(row);
      if (isSelected) selected = row;
    }
    return { rows, selected };
  } catch { return null; }
}

// `lms version` prints ASCII art first — hunt for a semver anywhere in the
// output; fall back to the CLI commit line; omit entirely if neither is there.
async function lmsVersionStr() {
  for (const args of [['version'], ['--version']]) {
    try {
      const { stdout } = await safeExecFile('lms', args, { timeout: 5000 });
      const semver = stdout.match(/\b(\d+\.\d+\.\d+)\b/);
      if (semver) return semver[1];
      const commit = stdout.match(/CLI commit:\s*(\S+)/i);
      if (commit) return `commit ${commit[1]}`;
    } catch { /* try next form */ }
  }
  return null;
}

// Migration history can contain llmster's version. Read the actual Windows
// executable instead, caching by path/mtime so dashboard polling is cheap.
let lmVersionCache = { key: null, value: null };
async function lmStudioAppVersion() {
  try {
    const candidates = [path.join(process.env.ProgramFiles || 'C:/Program Files', 'LM Studio/LM Studio.exe'),
      path.join(HOME, 'AppData/Local/Programs/LM Studio/LM Studio.exe')];
    const executable = candidates.find(file => fs.existsSync(file));
    if (!executable) return null;
    const key = executable + ':' + fs.statSync(executable).mtimeMs;
    if (lmVersionCache.key === key) return lmVersionCache.value;
    const quoted = executable.replace(/'/g, "''");
    const result = await safeExecFile('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      `(Get-Item -LiteralPath '${quoted}').VersionInfo.ProductVersion`], { windowsHide: true, timeout: 5000, encoding: 'utf8' });
    const version = result.stdout.trim();
    if (!/^\d+\.\d+\.\d+(?:[.+-][\w.-]+)?$/.test(version)) return null;
    lmVersionCache = { key, value: `${version} (installed executable)` };
    return lmVersionCache.value;
  } catch { return null; }
}

// ─────────────────────────── LM Link fleet awareness ───────────────────────────
// LM Link (multi-device pooling) lets OTHER machines on the account load and
// run models ON this box's LM Studio, and vice versa. Both `lms ps --json`
// and `lms ls --json` entries carry a real `deviceIdentifier` field —
// verified live on this box 2026-08-18:
//   - null            -> the model is physically running on THIS device
//                        (the one `lms` is querying)
//   - a hex hash       -> the model is physically running on that OTHER
//                        device, merged into view here by LM Link pooling
// `lms link status --json` is the only place that hash resolves to a human
// device name (e.g. this box's own hash -> "Halo"; a peer's hash ->
// "NvideaBlackwell"). A `-5070ti`-style suffix on an `identifier` is
// whatever the loader chose to call it — a hint at best, never proof; the
// deviceIdentifier field is the authoritative signal and is always preferred.
//
// A null deviceIdentifier proves physical residency/catalog presence on THIS
// LM Studio instance. It does not prove which client requested the load, and
// Mission Control must not pretend it can infer that from a model name. The UI
// therefore reports physical origin only: this device, a named peer, or an
// unresolved non-null peer id.

async function lmsLinkStatus() {
  try {
    const { stdout } = await safeExecFile('lms', ['link', 'status', '--json'], { timeout: 8000 });
    return JSON.parse(stdout || '{}');
  } catch { return null; }
}

// Cached ~10s alongside the other lms CLI shell-outs (gpuMemory/diskUsage
// follow the same pattern) — status() and catalog() both need it every poll.
const linkCache = { at: 0, status: null };
async function getLinkStatus() {
  if (Date.now() - linkCache.at < 10000 && linkCache.at) return linkCache.status;
  linkCache.status = await lmsLinkStatus();
  linkCache.at = Date.now();
  return linkCache.status;
}

// deviceIdentifier hash -> { name, isSelf, status } for every device we can
// actually name: this box itself, plus every connected LM Link peer.
function buildDeviceMap(linkStatus) {
  const map = new Map();
  if (!linkStatus) return map;
  if (linkStatus.deviceIdentifier) map.set(linkStatus.deviceIdentifier, { name: linkStatus.deviceName || 'this device', isSelf: true, status: 'self' });
  for (const p of (linkStatus.peers || [])) {
    if (p.deviceIdentifier) map.set(p.deviceIdentifier, { name: p.deviceName || p.deviceIdentifier, isSelf: false, status: p.status || null });
  }
  return map;
}

// Resolves the origin of one loaded model instance to exactly one bucket:
//   kind 'local'   — deviceIdentifier is null: physically on this device.
//   kind 'device'  — deviceIdentifier resolves to a named device via `lms
//                     link status` (self or a connected peer). A real,
//                     identified fleet load — not a mystery, informational only.
//   kind 'unknown' — a non-null deviceIdentifier is not in link status.
function resolveOrigin(identifier, modelKey, deviceIdentifier, deviceMap) {
  if (!deviceIdentifier) return { kind: 'local', label: 'this device', deviceId: null };
  if (deviceIdentifier) {
    const dev = deviceMap.get(deviceIdentifier);
    if (dev) return { kind: 'device', label: dev.name, deviceId: deviceIdentifier, isSelf: !!dev.isSelf };
    return { kind: 'unknown', label: 'FLEET/unknown-origin', deviceId: deviceIdentifier };
  }
  return { kind: 'local', label: 'this device', deviceId: null };
}

// LM Link account entitlement cache — a small file LM Studio itself
// maintains, not something we query live. Honest-degraded (ok:false) if
// missing/unreadable rather than inventing zeros.
function readLmLinkAccountCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(LM_LINK_ACCOUNT_CACHE, 'utf8'));
    const mtimeMs = fs.statSync(LM_LINK_ACCOUNT_CACHE).mtimeMs;
    const j = raw.json || raw; // observed on-disk shape: {"json": {...}}
    return {
      ok: true,
      accountStatus: j.accountStatus ?? null,
      maxDevicesAllowed: j.maxDevicesAllowed ?? null,
      currentDeviceCount: j.currentDeviceCount ?? null,
      mtimeMs,
      freshness: describeFileFreshness(mtimeMs),
    };
  } catch {
    return {
      ok: false, accountStatus: null, maxDevicesAllowed: null, currentDeviceCount: null,
      mtimeMs: null, freshness: describeFileFreshness(null),
    };
  }
}

// ─────────────────────────── authenticated DSH RPC ─────────────────────

// DSH 0.1.5 authenticates a browser by exchanging its process launch token on
// GET /?token=... for an HttpOnly cookie.  Mission Control performs that same
// exchange server-to-server and keeps both pieces of authority out of its own
// browser, JSON responses, state, history, and logs.
const dshAuth = { cookie: null, authenticatedAt: 0 };

function redactDshAuthority(value) {
  return String(value || '')
    .replace(/([?&]token=)[^\s&#]+/gi, '$1[redacted]')
    .replace(/\bdsh-auth-[^=\s;]+=[^\s;]+/gi, 'dsh-auth-[redacted]');
}

function validDshLaunchUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' && url.hostname === '127.0.0.1'
      && url.port === '3080' && url.pathname === '/' && /^[\w-]+$/.test(url.searchParams.get('token') || '')
      ? url : null;
  } catch { return null; }
}

function currentDshLaunchUrl() {
  const configured = CAPTURED_DSH_LAUNCH_URL;
  let fromLog = null;
  try {
    const text = fs.readFileSync(DSH_STDOUT_LOG, 'utf8');
    const matches = text.match(/http:\/\/127\.0\.0\.1:3080\/\?token=[\w-]+/g) || [];
    fromLog = validDshLaunchUrl(matches[matches.length - 1]);
  } catch { /* DSH may not have written a launch log yet */ }
  // The log is generated by the current DSH process, so prefer its newest
  // launch token after a restart over the immutable environment snapshot.
  return fromLog || configured;
}

async function openDshInChrome() {
  const launchUrl = currentDshLaunchUrl();
  if (!launchUrl) throw new Error('DSH has no current authenticated launch URL');
  if (!CHROME_EXE) throw new Error(OLLAMA_ONLY ? 'Chrome or Microsoft Edge was not found in a supported Windows location' : 'Google Chrome is not installed in a supported Windows location');
  // The token is authority: pass it only as a child-process argv value. It is
  // never returned to the Mission Control browser, persisted, or logged.
  await safeSpawnStarted('chrome', ['--new-tab', launchUrl.toString()], {
    detached: true, stdio: 'ignore', windowsHide: true,
  });
}

async function authenticateDsh(force = false) {
  if (!force && dshAuth.cookie) return dshAuth.cookie;
  const launchUrl = currentDshLaunchUrl();
  if (!launchUrl) throw new Error('DSH authentication is unavailable: no current launch URL');
  const response = await fetch(launchUrl, {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(5000),
  });
  const setCookie = response.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';', 1)[0].trim();
  if (!/^dsh-auth-[^=\s;]+=[^\s;]+$/.test(cookie)) {
    throw new Error(`DSH authentication exchange failed (HTTP ${response.status})`);
  }
  dshAuth.cookie = cookie;
  dshAuth.authenticatedAt = Date.now();
  return cookie;
}

async function dshRpc(endpoint, args = {}, retryAuth = true) {
  const cookie = await authenticateDsh();
  const rpcId = `mc-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  let response;
  try {
    response = await fetch(`${DSH_ORIGIN}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload: { args } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    dshAuth.cookie = null;
    throw new Error(redactDshAuthority(error?.message || error));
  }
  if (response.status === 401 && retryAuth) {
    dshAuth.cookie = null;
    await authenticateDsh(true);
    return dshRpc(endpoint, args, false);
  }
  let message;
  try { message = await response.json(); }
  catch { throw new Error(`${endpoint}: DSH returned HTTP ${response.status} without a valid RPC response`); }
  if (!response.ok || !message?.result?.ok) {
    const code = message?.result?.error?.code || `HTTP ${response.status}`;
    throw new Error(`${endpoint}: ${redactDshAuthority(code)}`);
  }
  return message.result.value;
}

// ── Cordis fiber lifecycle classification ──────────────────────────────
// Each plugin config row is a fiber with states INACTIVE/LOADING/ACTIVE/
// UNLOADING/FAILED (inventory exposes it as fiberPhase, lower/mixed-case in
// the wild). We bucket every entry into exactly one of five UI buckets:
//   active        enabled && phase==='active'
//   disabled      !enabled
//   waiting       enabled, phase is inactive/null/unrecognized — BENIGN,
//                 will self-activate once its declared dependency appears
//   transitioning enabled, phase is loading/reloading/unloading — normal
//                 for a few seconds; only an alarm if STUCK (see below)
//   failed        enabled, phase is failed/error — TERMINAL, the calculus
//                 never auto-retries until config is touched. Always actionable.
function classifyPluginPhase(enabled, fiberPhaseRaw) {
  if (!enabled) return 'disabled';
  const phase = String(fiberPhaseRaw || '').toLowerCase();
  if (phase === 'active') return 'active';
  if (phase === 'loading' || phase === 'reloading' || phase === 'unloading') return 'transitioning';
  if (phase === 'failed' || phase === 'error') return 'failed';
  return 'waiting'; // '', 'inactive', null/undefined on an enabled row
}

function fmtDurationMs(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

// Server-side stickiness tracker for transitioning fibers. A LOADING/
// UNLOADING/RELOADING phase is normal for seconds; one that sits on the
// exact same phase-string for >60s is a diagnosable stall (a stuck
// UNLOADING specifically means the withdrawal guard is waiting on
// dependents) — flag it as stuck, but don't page on ordinary transitions.
const STUCK_MS = 60000;
const transitionTracker = new Map(); // entryId -> { phase, sinceMs }
function trackTransition(entryId, bucket, phaseLower) {
  const now = Date.now();
  if (bucket !== 'transitioning') {
    transitionTracker.delete(entryId);
    return { stuck: false, sinceMs: null };
  }
  const rec = transitionTracker.get(entryId);
  if (!rec || rec.phase !== phaseLower) {
    transitionTracker.set(entryId, { phase: phaseLower, sinceMs: now });
    return { stuck: false, sinceMs: now };
  }
  return { stuck: (now - rec.sinceMs) > STUCK_MS, sinceMs: rec.sinceMs };
}

// Classifies every entry, updates transition stickiness, and returns both a
// per-entryId lookup (for the /api/plugins table) and a summary object (for
// the status strip + plugins tab header).
function classifyPluginEntries(entries) {
  const byId = new Map();
  const counts = { active: 0, disabled: 0, waiting: 0, transitioning: 0, failed: 0, stuck: 0 };
  const failedIds = [], waitingIds = [], stuckList = [];
  for (const e of entries) {
    const phaseLower = String(e.fiberPhase || '').toLowerCase();
    const bucket = classifyPluginPhase(e.enabled, e.fiberPhase);
    const { stuck, sinceMs } = trackTransition(e.entryId, bucket, phaseLower);
    counts[bucket]++;
    if (stuck) {
      counts.stuck++;
      stuckList.push(`${e.entryId} stuck ${phaseLower.toUpperCase()} ${fmtDurationMs(Date.now() - sinceMs)}${phaseLower === 'unloading' ? ' — withdrawal guard waiting on dependents' : ''}`);
    }
    if (bucket === 'failed') failedIds.push(e.entryId);
    if (bucket === 'waiting') waitingIds.push(e.entryId);
    byId.set(e.entryId, { bucket, stuck, sinceMs, phaseLower });
  }
  return {
    byId,
    summary: {
      total: entries.length, ...counts,
      failedList: failedIds.slice(0, 12),
      waitingList: waitingIds.slice(0, 12),
      stuckList: stuckList.slice(0, 12),
    },
  };
}

// Slow-changing pulls, cached ~30 s: presets + full plugin inventory. Both the
// summary strip and the /api/plugins tab endpoint read off this same cache so
// switching tabs doesn't double-hit the cockpit.
const slowCache = {
  at: 0, sampledAt: 0, attemptedAt: 0, ok: false, error: null,
  presets: null, pluginEntries: null, pluginSummary: null, pluginById: null,
};
function slowCacheView(now = Date.now(), unavailableError = null) {
  const state = describeCacheState({ ...slowCache, ok: unavailableError ? false : slowCache.ok, error: unavailableError || slowCache.error }, now);
  return { ...slowCache, ...state };
}
async function slowPulls() {
  const now = Date.now();
  if (now - slowCache.attemptedAt < 30000 && slowCache.attemptedAt) return slowCacheView(now);
  slowCache.attemptedAt = now;
  try {
    const [pr, pi] = await Promise.all([dshRpc('agentPresets/list'), dshRpc('pluginInventory/list')]);
    slowCache.presets = (pr.presets || []).map(p => ({ id: p.id, trust: p.trust, isDefault: !!p.isDefault, broken: p.broken || null, name: p.name || p.id }));
    const entries = pi.entries || [];
    slowCache.pluginEntries = entries;
    const { byId, summary } = classifyPluginEntries(entries);
    slowCache.pluginById = byId;
    slowCache.pluginSummary = summary;
    slowCache.at = now;
    slowCache.sampledAt = now;
    slowCache.ok = true;
    slowCache.error = null;
  } catch (e) {
    // Retain the last good inventory for diagnosis, but mark it stale. A stale
    // snapshot is useful; presenting it as a fresh green health signal is not.
    slowCache.ok = false;
    slowCache.error = String(e?.message || e || 'DSH inventory refresh failed').slice(0, 300);
  }
  return slowCacheView(now);
}

// One authenticated physical socket carries the current Typert logical
// `session/control` stream. Each generation opens with a complete baseline and
// then emits queue/job deltas. Data retained during reconnect is visibly stale.
const mux = {
  connected: false, lastFrameAt: 0, jobs: new Map(), queues: new Map(),
  socket: null, reconnectTimer: null, openTimer: null, watchdogTimer: null,
  generation: 0, reconnectDelayMs: 1000, awaitingPong: false,
};
const MUX_OPEN_TIMEOUT_MS = 8000;
const MUX_STALE_FRAME_MS = 45000;
const MUX_MAX_RECONNECT_MS = 30000;
function scheduleMuxReconnect() {
  if (mux.reconnectTimer) return;
  const delay = Math.min(Math.max(mux.reconnectDelayMs, 1000), MUX_MAX_RECONNECT_MS);
  mux.reconnectDelayMs = Math.min(delay * 2, MUX_MAX_RECONNECT_MS);
  mux.reconnectTimer = setTimeout(() => {
    mux.reconnectTimer = null;
    muxConnect();
  }, delay);
}
async function muxConnect() {
  if (mux.socket && (mux.socket.readyState === WebSocket.OPEN || mux.socket.readyState === WebSocket.CONNECTING)) return;
  let cookie;
  try { cookie = await authenticateDsh(); }
  catch { scheduleMuxReconnect(); return; }
  const streamId = `mc-control-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  let socket;
  try {
    socket = new WebSocket('ws://127.0.0.1:3080/api/remote.mux', { headers: { Cookie: cookie } });
  } catch {
    scheduleMuxReconnect();
    return;
  }
  mux.socket = socket;
  const generation = ++mux.generation;
  mux.openTimer = setTimeout(() => {
    if (generation === mux.generation && socket.readyState === WebSocket.CONNECTING) socket.terminate();
  }, MUX_OPEN_TIMEOUT_MS);
  socket.on('open', () => {
    if (generation !== mux.generation) return socket.close();
    clearTimeout(mux.openTimer);
    mux.openTimer = null;
    mux.connected = true;
    mux.lastFrameAt = Date.now();
    mux.awaitingPong = false;
    mux.jobs.clear();
    mux.queues.clear();
    socket.send(JSON.stringify({
      type: 'open', streamId, endpoint: 'session/control', payload: { args: {} },
    }));
    mux.watchdogTimer = setInterval(() => {
      if (generation !== mux.generation || socket.readyState !== WebSocket.OPEN) return;
      if (Date.now() - mux.lastFrameAt <= MUX_STALE_FRAME_MS) return;
      if (mux.awaitingPong) {
        socket.terminate();
        return;
      }
      mux.awaitingPong = true;
      try { socket.ping(); } catch { socket.terminate(); }
    }, 10000);
  });
  socket.on('pong', () => {
    if (generation !== mux.generation) return;
    mux.awaitingPong = false;
    mux.lastFrameAt = Date.now();
  });
  socket.on('message', data => {
    try {
      const carrier = JSON.parse(String(data));
      if (carrier.streamId !== streamId) return;
      if (carrier.type === 'error' || carrier.type === 'end') {
        socket.close();
        return;
      }
      if (carrier.type !== 'item') return;
      const frame = carrier.value || {};
      mux.lastFrameAt = Date.now();
      mux.reconnectDelayMs = 1000;
      mux.awaitingPong = false;
      if (frame.type === 'baseline') {
        mux.jobs.clear();
        mux.queues.clear();
        for (const [sessionId, jobs] of Object.entries(frame.value?.jobs || {})) {
          if (Array.isArray(jobs) && jobs.length) mux.jobs.set(sessionId, jobs);
        }
        for (const [sessionId, items] of Object.entries(frame.value?.queues || {})) {
          if (Array.isArray(items) && items.length) mux.queues.set(sessionId, items.length);
        }
      } else if (frame.type === 'jobs' && frame.sessionId) {
        const jobs = Array.isArray(frame.jobs) ? frame.jobs : [];
        if (jobs.length) mux.jobs.set(frame.sessionId, jobs); else mux.jobs.delete(frame.sessionId);
      } else if (frame.type === 'queue' && frame.sessionId) {
        const count = Array.isArray(frame.items) ? frame.items.length : 0;
        if (count) mux.queues.set(frame.sessionId, count); else mux.queues.delete(frame.sessionId);
      }
    } catch { /* malformed or unrelated frame: retain last known state */ }
  });
  const down = () => {
    if (generation !== mux.generation) return;
    if (mux.openTimer) clearTimeout(mux.openTimer);
    if (mux.watchdogTimer) clearInterval(mux.watchdogTimer);
    mux.openTimer = null;
    mux.watchdogTimer = null;
    mux.awaitingPong = false;
    mux.connected = false;
    mux.socket = null;
    // A DSH restart invalidates the old process-bound session cookie.
    dshAuth.cookie = null;
    scheduleMuxReconnect();
  };
  socket.once('close', down);
  socket.once('error', () => { try { socket.close(); } catch { /* already closed */ } });
}
muxConnect();

// Follow only active sessions. DSH's process-local assistant stream supplies
// output text during generation, but not per-chunk token counts. Show its
// actual character rate; never relabel a character heuristic as token speed.
const liveDecode = new Map();
const LIVE_DECODE_WINDOW_MS = 10000;
function followLiveDecode(sessionId) {
  const state = { socket: null, connected: false, active: false, samples: [], lastChunkAt: 0, nextTryAt: 0 };
  liveDecode.set(sessionId, state);
  void (async () => {
    try {
      const cookie = await authenticateDsh();
      if (liveDecode.get(sessionId) !== state) return;
      const socket = new WebSocket('ws://127.0.0.1:3080/api/remote.mux', { headers: { Cookie: cookie } });
      state.socket = socket;
      const streamId = `mc-live-${crypto.randomBytes(8).toString('hex')}`;
      socket.on('open', () => {
        if (liveDecode.get(sessionId) !== state) return socket.close();
        state.connected = true;
        socket.send(JSON.stringify({ type: 'open', streamId, endpoint: 'session/follow', payload: {
          args: { request: { address: { kind: 'session', sessionId }, maxMessages: 1, assistantStream: true } },
        } }));
      });
      socket.on('message', raw => {
        try {
          const carrier = JSON.parse(String(raw));
          if (carrier.streamId !== streamId) return;
          if (carrier.type === 'error' || carrier.type === 'end') return socket.close();
          if (carrier.type !== 'item') return;
          const value = carrier.value || {};
          if (value.type === 'snapshot') {
            state.active = !!value.assistantStream?.activeAttempt;
            state.samples = [];
            state.lastChunkAt = 0;
          } else if (value.type === 'assistant-stream') {
            const frame = value.frame || {};
            if (frame.type === 'start') {
              state.active = true;
              state.samples = [];
              state.lastChunkAt = 0;
            } else if (frame.type === 'end') {
              state.active = false;
              state.samples = [];
              state.lastChunkAt = 0;
            } else if (frame.type === 'chunk') {
              const chunk = frame.chunk || {};
              if ((chunk.type === 'text-delta' || chunk.type === 'reasoning-delta') && typeof chunk.text === 'string') {
                const now = Date.now();
                state.active = true;
                state.samples.push({ at: now, chars: [...chunk.text].length });
                state.lastChunkAt = now;
                state.samples = state.samples.filter(sample => now - sample.at <= LIVE_DECODE_WINDOW_MS);
              }
            }
          }
        } catch { /* No text or authority is logged or persisted. */ }
      });
      socket.on('close', () => { state.connected = false; state.active = false; state.nextTryAt = Date.now() + 5000; });
      socket.on('error', () => { try { socket.close(); } catch { /* already closed */ } });
    } catch { state.nextTryAt = Date.now() + 5000; }
  })();
}
function liveDecodeView(sessionId, title) {
  const state = liveDecode.get(sessionId);
  if (!state?.connected) return { sessionId, title, state: 'unavailable', charsPerS: null };
  if (!state.active) return { sessionId, title, state: 'waiting', charsPerS: null };
  const now = Date.now();
  state.samples = state.samples.filter(sample => now - sample.at <= LIVE_DECODE_WINDOW_MS);
  if (!state.samples.length || now - state.lastChunkAt > 5000) {
    return { sessionId, title, state: 'waiting', charsPerS: null };
  }
  const chars = state.samples.reduce((sum, sample) => sum + sample.chars, 0);
  const seconds = Math.max(2, (now - state.samples[0].at) / 1000);
  return { sessionId, title, state: 'streaming', charsPerS: Math.round(chars / seconds) };
}
function syncLiveDecode(sessions) {
  const active = sessions.filter(session => session.claimsRunning).slice(0, 4);
  const wanted = new Set(active.map(session => session.sessionId));
  for (const [id, state] of liveDecode) {
    if (!wanted.has(id)) {
      liveDecode.delete(id);
      try { state.socket?.close(); } catch { /* already closed */ }
    }
  }
  for (const session of active) {
    const state = liveDecode.get(session.sessionId);
    if (!state || (!state.connected && state.nextTryAt && Date.now() >= state.nextTryAt)) {
      try { state?.socket?.close(); } catch { /* already closed */ }
      followLiveDecode(session.sessionId);
    }
  }
  return active.map(session => liveDecodeView(session.sessionId, session.title || session.id));
}

// ─────────────────────────── sessions ───────────────────────────

function isDriveRoot(p) { return typeof p === 'string' && /^[A-Za-z]:\\?$/.test(p.trim()); }

// DSH sessionStats is the authority for decode speed: its output-token and
// decode-time counters advance when an assistant step settles. Their delta is
// a measured rate for the steps completed since our previous observation.
const decodeTotals = new Map();
let latestMeasuredDecode = null;
function observeDecodeTotals(sessionId, title, model, stats, now = Date.now()) {
  const tokens = stats?.decodeTokens;
  const ms = stats?.decodeMs;
  if (!Number.isFinite(tokens) || !Number.isFinite(ms) || tokens < 0 || ms < 0) return;
  const previous = decodeTotals.get(sessionId);
  decodeTotals.set(sessionId, { tokens, ms });
  if (!previous) return; // Never mistake a session's lifetime totals for one new step.
  const addedTokens = tokens - previous.tokens;
  const addedMs = ms - previous.ms;
  if (addedTokens <= 0 || addedMs <= 0) return;
  latestMeasuredDecode = {
    sessionId, title, model, at: now, outputTokens: addedTokens, decodeMs: addedMs,
    tps: Math.round(addedTokens / (addedMs / 1000) * 10) / 10,
  };
}
function recentMeasuredDecode(now = Date.now()) {
  return latestMeasuredDecode && now - latestMeasuredDecode.at <= 15 * 60 * 1000
    ? latestMeasuredDecode : null;
}

// LM Studio's llama.cpp workers expose the active request's generated-token
// counter through their loopback /slots endpoint. This is a measured live
// count, unlike estimating tokens from streamed text. The worker's bearer key
// stays in memory and is never included in the status API, history, or logs.
let llamaWorkers = [];
let llamaWorkersAt = 0;
let llamaPollBusy = false;
const llamaSamples = new Map();
const LLAMA_SAMPLE_WINDOW_MS = 10000;
let latestLiveEngineDecode = null;
async function discoverLlamaWorkers() {
  if (process.platform !== 'win32') return [];
  try {
    const { stdout } = await safeExecFile('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      'Get-CimInstance Win32_Process -Filter "Name=\'llama-server.exe\'" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress'],
    { timeout: 5000, maxBuffer: 1024 * 1024 });
    const rows = JSON.parse(stdout || 'null');
    return (Array.isArray(rows) ? rows : rows ? [rows] : []).flatMap(row => {
      const cmd = row.CommandLine || '';
      const port = /--port\s+(\d+)/.exec(cmd)?.[1];
      const key = /--api-key\s+(?:"([^"]+)"|(\S+))/.exec(cmd);
      const model = /--model\s+(?:"([^"]+)"|(\S+))/.exec(cmd);
      if (!port || !key || !model) return [];
      return [{ id: `${row.ProcessId}:${port}`, port: Number(port), key: key[1] || key[2],
        model: path.basename(model[1] || model[2]).replace(/\.gguf$/i, '') }];
    }).slice(0, 4);
  } catch { return []; }
}
async function pollLlamaDecode() {
  if (llamaPollBusy) return;
  llamaPollBusy = true;
  try {
    const now = Date.now();
    if (now - llamaWorkersAt > (llamaWorkers.length ? 30000 : 10000)) {
      llamaWorkers = await discoverLlamaWorkers();
      llamaWorkersAt = Date.now();
      const ids = new Set(llamaWorkers.map(w => w.id));
      for (const id of llamaSamples.keys()) if (!ids.has(id)) llamaSamples.delete(id);
    }
    await Promise.all(llamaWorkers.map(async worker => {
      try {
        const response = await fetch(`http://127.0.0.1:${worker.port}/slots`, {
          headers: { Authorization: `Bearer ${worker.key}` }, signal: AbortSignal.timeout(1500),
        });
        if (!response.ok) { llamaSamples.delete(worker.id); return; }
        const slots = await response.json();
        const slot = Array.isArray(slots) ? slots.find(s => s?.is_processing &&
          Number.isFinite(s?.next_token?.[0]?.n_decoded)) : null;
        if (!slot) { llamaSamples.delete(worker.id); return; }
        const task = slot.id_task;
        const count = slot.next_token[0].n_decoded;
        const at = Date.now();
        const prior = llamaSamples.get(worker.id);
        const samples = prior?.task === task && count >= prior.samples.at(-1)?.count
          ? prior.samples.filter(sample => at - sample.at <= LLAMA_SAMPLE_WINDOW_MS) : [];
        samples.push({ at, count });
        llamaSamples.set(worker.id, { model: worker.model, task, samples });
        if (samples.length >= 2) {
          const first = samples[0], last = samples.at(-1);
          const added = last.count - first.count;
          const elapsed = last.at - first.at;
          if (added > 0 && elapsed > 0) latestLiveEngineDecode = {
            model: worker.model, tps: Math.round(added / (elapsed / 1000) * 10) / 10,
            tokens: added, intervalMs: elapsed, at: last.at,
          };
        }
      } catch { /* Busy workers may miss a sample; never manufacture a rate. */ }
    }));
  } finally { llamaPollBusy = false; }
}
function liveEngineDecode(now = Date.now()) {
  return [...llamaSamples.values()].flatMap(state => {
    const samples = state.samples.filter(sample => now - sample.at <= LLAMA_SAMPLE_WINDOW_MS);
    if (samples.length < 2 || now - samples.at(-1).at > 5000) return [];
    const first = samples[0], last = samples.at(-1);
    const added = last.count - first.count;
    const seconds = (last.at - first.at) / 1000;
    if (added <= 0 || seconds <= 0) return [];
    return [{ model: state.model, tps: Math.round(added / seconds * 10) / 10,
      tokens: added, intervalMs: last.at - first.at, at: last.at }];
  });
}
function recentLiveEngineDecode(now = Date.now()) {
  return latestLiveEngineDecode && now - latestLiveEngineDecode.at <= 15 * 60 * 1000
    ? latestLiveEngineDecode : null;
}
setInterval(() => { void pollLlamaDecode(); }, 2000).unref();
void pollLlamaDecode();

// DSH's public modelSelection view exposes lastUsed but omits pending state.
// Read only the saved projection row; never activate an Agent to inspect it.
function savedPendingSelection(sessionId) {
  if (!/^session-[a-zA-Z0-9-]+$/.test(sessionId)) return null;
  try {
    const cached = JSON.parse(fs.readFileSync(path.join(DSH_HOME, 'storages', 'session_projcache', 'sessions', sessionId + '.json'), 'utf8'));
    const pending = cached.record?.rows?.modelSelection?.val?.pending;
    return typeof pending?.provider === 'string' && typeof pending?.model === 'string' ? pending : null;
  } catch { return null; }
}

async function listSessionsApi(limit = 500) {
  const sess = await dshRpc('session/list', { _request: {} });
  // DSH's list updatedAt can remain at the last completed turn while a long
  // running turn keeps writing events. Corroborate active sessions with their
  // durable log before calling them stalled.
  const logActivity = runningSessionLogMtimes(sess.items.filter(s => s.running).map(s => s.sessionId));
  return sess.items
    .filter(s => !s.blank)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, limit)
    .map(s => {
      const v = s.projections?.values || {};
      const pendingSelection = v.modelSelection?.pending || savedPendingSelection(s.sessionId);
      const st = v.sessionStats || {};
      observeDecodeTotals(s.sessionId, v.title || s.sessionId,
        v.modelSelection?.lastUsed?.model || null, st);
      const tk = v.tokenUsage || {};
      // Context fill: the single number that predicts the output-token wall.
      // The harness tracks it (dsh-token-meter's contextPressure projection);
      // MC fetched it in this same block and ignored it until 2026-08-19.
      // projectedTokens estimates the NEXT provider prompt: the last provider
      // prompt plus unsampled surface movement. It can transiently exceed the
      // window while a stream is active. pressureTokens is the separately
      // reported last provider prompt and can be older than the current surface.
      const cp = v.contextPressure || {};
      const ctxUsed = cp.projectedTokens ?? cp.pressureTokens ?? null;
      const ctxWindow = cp.contextWindow || null;
      const workspace = s.cwd || 'Ungrouped';
      const activity = sessionActivityState(s.updatedAt, logActivity.get(s.sessionId), !!s.running, Date.now(), STALL_MS);
      return {
        workspace,
        driveRootBug: isDriveRoot(workspace) || isDriveRoot(s.cwd),
        id: s.sessionId.replace(/^session-/, '').slice(0, 8),
        sessionId: s.sessionId,
        title: v.title || null,
        // dsh-goal-round-driver has emitted both a plain string and an object
        // wrapper over its lifetime.  The browser contract is always a string.
        goal: typeof v.goal === 'string' ? v.goal
          : (v.goal?.goal?.objective || v.goal?.objective || null),
        mtime: activity.lastActivityAt,
        summaryUpdatedAt: s.updatedAt || 0,
        lastActivityAt: activity.lastActivityAt,
        activitySource: activity.activitySource,
        // `running` is the harness's own flag and this console repeated it
        // without corroboration. On 2026-08-20 a session sat at running:true
        // with frozen counters for 4h41m while making zero progress, and the
        // operator watched a screen that said work was happening. A truth
        // console does not relay an upstream claim it can check.
        //
        // claimsRunning = what the harness says. stalledMs = wall-clock since
        // the durable session log last advanced. The UI derives STALLED from
        // both, and `running` now means "claims running AND is actually
        // moving" so every existing consumer gets the corroborated answer.
        claimsRunning: !!s.running,
        stalledMs: activity.stalledMs,
        stalled: activity.stalled,
        running: activity.running,
        preset: v.agentPreset || s.agentPreset || '',
        // Use the model that produced output, not a queued selection or global default.
        provider: v.modelSelection?.lastUsed?.provider || null,
        model: v.modelSelection?.lastUsed?.model || null,
        lastUsedReasoningEffort: v.modelSelection?.lastUsed?.reasoningEffort ?? null,
        nextSelection: pendingSelection || v.modelSelection?.lastUsed || null,
        nextSelectionSource: pendingSelection ? 'saved selection' : v.modelSelection?.lastUsed ? 'last used (no pending override)' : 'default at request time',
        turns: st.turns ?? null,
        kTokIn: Math.round(((tk.uncachedInputTokens || 0) + (tk.cacheReadTokens || 0)) / 1000 * 10) / 10,
        kTokOut: Math.round((tk.outputTokens || 0) / 1000 * 10) / 10,
        ctxUsed,
        ctxProjectedTokens: cp.projectedTokens ?? null,
        ctxLastPromptTokens: cp.pressureTokens ?? null,
        ctxProjectionSource: cp.projectedTokens != null ? 'estimated next provider prompt' : 'last provider prompt fallback',
        ctxWindow,
        ctxPct: (ctxUsed != null && ctxWindow) ? Math.round(ctxUsed / ctxWindow * 100) : null,
        ttftS: st.ttftSteps ? Math.round(st.ttftMs / st.ttftSteps / 1000 * 10) / 10 : null,
        decodeTps: st.decodeMs ? Math.round(st.decodeTokens / (st.decodeMs / 1000) * 10) / 10 : null,
      };
    });
}

function sessionLogFile(sessionDir) {
  try {
    return fs.readdirSync(sessionDir).find(name => /^session(?:\.v\d+)?\.jsonl(?:\.zstd)?$/i.test(name)) || null;
  } catch { return null; }
}

function readSessionHeader(sessionDir, logName) {
  try {
    const file = path.join(sessionDir, logName);
    let bytes = fs.readFileSync(file);
    if (/\.zstd$/i.test(logName)) bytes = zstdDecompressSync(bytes);
    const first = bytes.toString('utf8').split(/\r?\n/, 1)[0];
    const header = JSON.parse(first);
    return header?.type === 'session' ? header : null;
  } catch { return null; }
}

// Fallback only — DSH down means no API.  Workspace directory names are a
// lossy encoding (a hyphen may be punctuation or a path separator), so the old
// decoder invented paths. Read the authoritative cwd from one session header
// per storage bucket and show the raw bucket identity if it cannot be proved.
function listSessionsScrape(limit = 50) {
  const out = [];
  try {
    for (const proj of fs.readdirSync(DSH_SESSIONS)) {
      const projDir = path.join(DSH_SESSIONS, proj);
      if (!fs.statSync(projDir).isDirectory()) continue;
      let provenWorkspace = null;
      for (const sess of fs.readdirSync(projDir)) {
        const sessDir = path.join(projDir, sess);
        try {
          const log = sessionLogFile(sessDir);
          if (!log) continue;
          const header = provenWorkspace ? null : readSessionHeader(sessDir, log);
          if (typeof header?.cwd === 'string' && header.cwd.trim()) provenWorkspace = header.cwd;
          const st = fs.statSync(path.join(sessDir, log));
          const workspace = provenWorkspace || `[stored workspace: ${proj}]`;
          out.push({
            workspace, driveRootBug: isDriveRoot(workspace), id: sess.replace(/^session-/, '').slice(0, 8),
            sessionId: sess, title: null, goal: null, mtime: st.mtimeMs, running: false, preset: '', turns: null,
            kTokIn: null, kTokOut: null, ctxUsed: null, ctxWindow: null, ctxPct: null, ttftS: null, decodeTps: null,
          });
        } catch { /* skip unreadable */ }
      }
    }
  } catch { /* sessions dir missing */ }
  return out.sort((a, b) => b.mtime - a.mtime).slice(0, limit);
}

// Shared 4 s cache so /api/status and /api/sessions don't double-hit dsh.
const sessionsCache = { at: 0, sessions: null, source: null };
async function getSessions(dshUp, limit = 50) {
  const cacheMatchesAvailability = dshUp
    ? sessionsCache.source === 'dsh api'
    : sessionsCache.source === 'disk scan (dsh down)';
  if (Date.now() - sessionsCache.at < 4000 && sessionsCache.sessions && cacheMatchesAvailability) {
    return { ...sessionsCache, sessions: sessionsCache.sessions.slice(0, limit) };
  }
  let sessions, source;
  if (dshUp) {
    try { sessions = await listSessionsApi(500); source = 'dsh api'; }
    catch { sessions = listSessionsScrape(500); source = 'disk scan (api failed)'; }
  } else {
    sessions = listSessionsScrape(500); source = 'disk scan (dsh down)';
  }
  sessionsCache.at = Date.now();
  sessionsCache.sessions = sessions;
  sessionsCache.source = source;
  return { ...sessionsCache, sessions: sessionsCache.sessions.slice(0, limit) };
}

function todayStats(sessions) {
  const now = new Date();
  const y0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todays = sessions.filter(s => s.mtime >= y0);
  return {
    count: todays.length,
    kTokIn: Math.round(todays.reduce((a, s) => a + (s.kTokIn || 0), 0) * 10) / 10,
    kTokOut: Math.round(todays.reduce((a, s) => a + (s.kTokOut || 0), 0) * 10) / 10,
  };
}

// ─────────────────────────── memory graph ───────────────────────────

// entryIds patched at the *top level* of cordis.patch.yml (column-0 "- id:"
// lines only — nested ones under "- insert:" blocks are not machine-level
// overrides in the same sense) get a "HALO override" badge in the plugins tab.
function cordisOverrideIds() {
  const ids = new Set();
  try {
    const text = fs.readFileSync(CORDIS_PATCH, 'utf8');
    for (const m of text.matchAll(/^- id:\s*(\S+)/gm)) ids.add(m[1]);
  } catch { /* missing/unreadable */ }
  return ids;
}

// ─────────────────────────── plugin descriptions ───────────────────────────

// Small number of module ids that live outside the @deepseek-ai scope (built
// into cordis core rather than published as a dsh package). Verified by hand
// against the operator's own knowledge of the composition system — do NOT add
// entries here on a guess; unresolved ids fall through to "—".
const CORDIS_CORE_DESCRIPTIONS = {
  'cordis:include': 'Composition include: mounts a config subtree',
};

// package.json descriptions are static on disk and read once per process —
// scanned at startup and cached forever (no TTL, no re-scan on request).
function buildPluginDescriptions() {
  const map = new Map();
  // pnpm's strict layout keeps most packages under node_modules/.pnpm rather
  // than linking every package into the top-level @deepseek-ai scope. Include
  // those real package roots so the Plugins panel can still describe the
  // complete inventory returned by DSH 0.1.5.
  const dirs = [...DEEPSEEK_PKG_DIRS];
  try {
    const pnpmStore = path.join(DSH_ROOT, 'node_modules', '.pnpm');
    for (const entry of fs.readdirSync(pnpmStore)) {
      const scoped = path.join(pnpmStore, entry, 'node_modules', '@deepseek-ai');
      try { if (fs.statSync(scoped).isDirectory()) dirs.push(scoped); } catch { /* not a scoped DSH package */ }
    }
  } catch { /* npm-style install or dependencies not installed yet */ }
  for (const dir of dirs) {
    try {
      for (const pkg of fs.readdirSync(dir)) {
        if (map.has(`@deepseek-ai/${pkg}`)) continue;
        try {
          const pj = JSON.parse(fs.readFileSync(path.join(dir, pkg, 'package.json'), 'utf8'));
          if (pj.description && pj.description.trim()) map.set(`@deepseek-ai/${pkg}`, pj.description.trim());
        } catch { /* unreadable/malformed package.json — skip */ }
      }
    } catch { /* that profile dir missing — fine */ }
  }
  return map;
}
const pluginDescriptions = buildPluginDescriptions();

// moduleName sometimes carries a subpath export, e.g.
// "@deepseek-ai/dsh-tool-subagent-control/list-agents" — strip it to resolve
// the package, then note the export as a suffix on the description.
function resolveModuleDescription(moduleName) {
  if (!moduleName) return null;
  if (moduleName.startsWith('@deepseek-ai/')) {
    const rest = moduleName.slice('@deepseek-ai/'.length);
    const slashIdx = rest.indexOf('/');
    const pkg = slashIdx >= 0 ? rest.slice(0, slashIdx) : rest;
    const subpath = slashIdx >= 0 ? rest.slice(slashIdx + 1) : null;
    const base = pluginDescriptions.get(`@deepseek-ai/${pkg}`);
    if (!base) return null;
    return subpath ? `${base} · export: ${subpath}` : base;
  }
  return CORDIS_CORE_DESCRIPTIONS[moduleName] || null;
}

// Last colon-delimited segment of the entryId — used to distinguish rows that
// share one module (e.g. the four tool-subagent instances: codex, claude-code,
// fork, opencode) once we already know the module is duplicated.
function entryInstanceSuffix(entryId) {
  const parts = String(entryId || '').split(':');
  return parts[parts.length - 1];
}

// ─────────────────────────── GPU / disk / ram ───────────────────────────

async function ollamaResidents() {
  try {
    const response = await fetch(`${OLLAMA_ORIGIN}/api/ps`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('Ollama HTTP ' + response.status);
    const body = await response.json();
    if (!Array.isArray(body.models)) throw new Error('Ollama returned no model inventory');
    // Local Ollama can proxy remote models; /ps alone cannot establish locality.
    let remoteModels = [], remoteMetadataError = null;
    try {
      const tags = await fetch(`${OLLAMA_ORIGIN}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!tags.ok) throw new Error('Ollama tags HTTP ' + tags.status);
      const inventory = await tags.json();
      remoteModels = (inventory.models || []).filter(m => m.remote_host).map(m => ({ name: m.name || m.model }));
    } catch (error) { remoteMetadataError = String(error.message); }
    return { ok: true, sampledAt: Date.now(), error: null, remoteModels, remoteMetadataError, models: body.models.map(m => ({
      identifier: m.name || m.model, modelKey: m.model || m.name, provider: 'ollama',
      type: 'llm', quant: m.details?.quantization_level || '?', context: m.context_length || null,
      status: 'loaded', gb: gb(m.size), vramGiB: gib(m.size_vram),
      origin: 'this device (Ollama)', originKind: 'local', deviceId: null,
    })) };
  } catch (error) { return { ok: false, sampledAt: null, error: String(error.message), models: [] }; }
}

const gpuCache = { at: 0, sampledAt: null, dedicatedBytes: null, sharedBytes: null, ok: false, error: null };
async function gpuMemory() {
  if (Date.now() - gpuCache.at < 10000 && gpuCache.at) return gpuCache;
  try {
    const cmd = "(Get-Counter '\\GPU Adapter Memory(*)\\Dedicated Usage','\\GPU Adapter Memory(*)\\Shared Usage').CounterSamples | ForEach-Object { '{0}|{1}|{2}' -f $_.Path, $_.InstanceName, $_.CookedValue }";
    let counters;
    try {
      const { stdout } = await safeExecFile('powershell', ['-NoProfile', '-Command', cmd], { timeout: 8000, windowsHide: true });
      counters = parseGpuCounterOutput(stdout);
      gpuCache.source = 'Windows Get-Counter';
    } catch {
      const fallback = "$ErrorActionPreference='Stop'; Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory | ForEach-Object { 'Dedicated Usage|{0}|{1}' -f $_.Name,$_.DedicatedUsage; 'Shared Usage|{0}|{1}' -f $_.Name,$_.SharedUsage }";
      const { stdout } = await safeExecFile('powershell', ['-NoProfile', '-Command', fallback], { timeout: 8000, windowsHide: true });
      counters = parseGpuCounterOutput(stdout);
      gpuCache.source = 'Windows CIM GPUAdapterMemory';
    }
    gpuCache.dedicatedBytes = counters.dedicatedBytes;
    gpuCache.sharedBytes = counters.sharedBytes;
    gpuCache.ok = true;
    gpuCache.at = Date.now();
    gpuCache.sampledAt = gpuCache.at;
    gpuCache.error = null;
  } catch (e) {
    gpuCache.dedicatedBytes = null;
    gpuCache.sharedBytes = null;
    gpuCache.ok = false;
    gpuCache.error = String(e?.message || e || 'GPU counter read failed').slice(0, 300);
    gpuCache.at = Date.now();
  }
  return gpuCache;
}

const diskCache = { at: 0, usedBytes: 0, freeBytes: 0, ok: false };
async function diskUsage() {
  if (Date.now() - diskCache.at < 60000 && diskCache.at) return diskCache;
  try {
    // Native Node statfs is both cheaper and more reliable than starting a
    // hidden PowerShell and assuming Get-PSDrive returned numeric fields. The
    // latter returned an empty string after one MC restart, which was parsed as
    // zero while `ok` was still set true.
    const s = fs.statfsSync('C:\\');
    const total = Number(s.bsize) * Number(s.blocks);
    const free = Number(s.bsize) * Number(s.bavail);
    if (!(total > 0) || !(free >= 0) || free > total) throw new Error('invalid statfs result');
    diskCache.usedBytes = total - free;
    diskCache.freeBytes = free;
    diskCache.ok = true;
    diskCache.at = Date.now();
  } catch { diskCache.ok = false; diskCache.at = Date.now(); }
  return diskCache;
}

// ─────────────────────────── local state (mc-state.json) ───────────────────────────

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastEngine: null, lastValidation: null }; }
}
function writeState(patch) {
  try {
    fs.mkdirSync(MC_DIR, { recursive: true });
    const cur = readState();
    fs.writeFileSync(STATE_FILE, JSON.stringify({ ...cur, ...patch }, null, 2));
  } catch { /* best effort */ }
}

function runningSessionLogMtimes(sessionIds) {
  const wanted = new Set(sessionIds.filter(Boolean));
  const result = new Map();
  if (!wanted.size) return result;
  try {
    for (const bucket of fs.readdirSync(DSH_SESSIONS)) {
      const bucketDir = path.join(DSH_SESSIONS, bucket);
      if (!fs.statSync(bucketDir).isDirectory()) continue;
      for (const sessionId of wanted) {
        const sessionDir = path.join(bucketDir, sessionId);
        const logName = sessionLogFile(sessionDir);
        if (!logName) continue;
        try { result.set(sessionId, fs.statSync(path.join(sessionDir, logName)).mtimeMs); }
        catch { /* fall back to the DSH list timestamp */ }
        wanted.delete(sessionId);
      }
      if (!wanted.size) break;
    }
  } catch { /* missing or unreadable logs: retain the DSH list timestamp */ }
  return result;
}

// Crash recovery is deliberately narrower than startup convergence. It only
// reloads an approved role after that role was seen resident, a new LM Studio
// engine-exit line arrived, and a fresh lms ps confirms its absence.
/*__MODEL_RECOVERY_START__*/
const RECOVERY_ROLES = { brain: DAILY_BRAIN, worker: DAILY_WORKER };
let lmsMutationTail = Promise.resolve();
let lmsMutationsPending = 0;
let recoveryTickRunning = false;
function normalizeRecovery(r = {}) {
  const roles = Object.fromEntries(Object.keys(RECOVERY_ROLES).map(role => [role, {
    observedResident: !!r.roles?.[role]?.observedResident, lastObservedAt: r.roles?.[role]?.lastObservedAt || null,
    lastRecoveryAt: r.roles?.[role]?.lastRecoveryAt || null, lastError: r.roles?.[role]?.lastError || null,
    pending: !!r.roles?.[role]?.pending, intentRevision: Number(r.roles?.[role]?.intentRevision) || 0,
    confirmedAbsent: !!r.roles?.[role]?.confirmedAbsent,
    attempts: Array.isArray(r.roles?.[role]?.attempts) ? r.roles[role].attempts.filter(x => Number.isFinite(x) && Date.now() - x < 10 * 60 * 1000) : [],
  }]));
  return {
    log: { path: LMSTUDIO_MAIN_LOG, offset: Number.isFinite(r.log?.offset) ? r.log.offset : null, carry: typeof r.log?.carry === 'string' ? r.log.carry : '', identity: r.log?.identity || null },
    crashAt: Number.isFinite(r.crashAt) ? r.crashAt : null,
    lastCrashLine: r.lastCrashLine || null, monitorError: null, dshUp: false,
    suppression: { brain: !!r.suppression?.brain, worker: !!r.suppression?.worker }, roles,
  };
}
const modelRecoveryState = normalizeRecovery(readState().modelRecovery);
function recoveryState() {
  for (const role of Object.keys(RECOVERY_ROLES)) modelRecoveryState.roles[role].attempts = modelRecoveryState.roles[role].attempts.filter(x => Date.now() - x < 10 * 60 * 1000);
  return modelRecoveryState;
}
function saveRecovery(s) { writeState({ modelRecovery: s }); }
function suppressRecovery(identifier, all = false) {
  const s = modelRecoveryState;
  for (const [role, model] of Object.entries(RECOVERY_ROLES)) {
    if (!all && model.identifier !== identifier) continue;
    s.suppression[role] = true;
    s.roles[role].pending = false;
    s.roles[role].observedResident = false;
    s.roles[role].confirmedAbsent = false;
    s.roles[role].lastError = null;
    s.roles[role].intentRevision++;
  }
  saveRecovery(s);
}
function beginManualLoad(identifier) {
  const s = modelRecoveryState;
  const role = Object.keys(RECOVERY_ROLES).find(r => RECOVERY_ROLES[r].identifier === identifier);
  if (!role) return null;
  const revision = ++s.roles[role].intentRevision;
  s.roles[role].pending = false;
  saveRecovery(s);
  return revision;
}
function rearmRecovery(identifier, revision) {
  const s = modelRecoveryState;
  for (const [role, model] of Object.entries(RECOVERY_ROLES)) {
    if (model.identifier !== identifier || s.roles[role].intentRevision !== revision) continue;
    s.suppression[role] = false;
    s.roles[role].pending = false;
    s.roles[role].observedResident = true;
    s.roles[role].confirmedAbsent = false;
    s.roles[role].lastError = null;
    s.roles[role].attempts = [];
  }
  saveRecovery(s);
}
function queuedLmsMutation(run) {
  const result = lmsMutationTail.then(run, run);
  lmsMutationTail = result.catch(() => {});
  return result;
}
function readNewCrashLines(s) {
  try {
    const st = fs.statSync(LMSTUDIO_MAIN_LOG);
    const identity = `${st.birthtimeMs}:${st.ino || 0}`;
    const rotated = s.log.identity != null && s.log.identity !== identity;
    let offset = s.log.offset;
    const baseline = offset == null;
    if (baseline) { s.log.offset = st.size; s.log.identity = identity; s.log.carry = ''; return { ok: true, crashes: [], baseline: true }; }
    if (rotated || offset > st.size) { offset = 0; s.log.carry = ''; }
    const max = 256 * 1024;
    const start = Math.max(0, Math.min(offset, st.size));
    const length = Math.min(max, st.size - start);
    const fd = fs.openSync(LMSTUDIO_MAIN_LOG, 'r');
    const buf = Buffer.alloc(length);
    let bytesRead;
    try { bytesRead = fs.readSync(fd, buf, 0, length, start); }
    finally { fs.closeSync(fd); }
    const text = s.log.carry + buf.subarray(0, bytesRead).toString('utf8');
    const lines = text.split(/\r?\n/);
    s.log.carry = (lines.pop() || '').slice(-4096);
    s.log.offset = start + bytesRead;
    s.log.identity = identity;
    const crashes = lines.filter(line => /Engine protocol runtime exited unexpectedly/i.test(line));
    return { ok: true, crashes, baseline, caughtUp: s.log.offset >= st.size && !s.log.carry };
  } catch (e) { return { ok: false, error: String(e?.message || e).slice(0, 240) }; }
}
async function modelRecoveryTick() {
  if (recoveryTickRunning) return;
  recoveryTickRunning = true;
  try {
    const s = recoveryState();
    const dshUp = await tcpCheck(3080);
    const candidate = normalizeRecovery(s);
    const scan = readNewCrashLines(candidate);
    if (!scan.ok) { s.monitorError = scan.error; saveRecovery(s); return; }
    const models = await lmsPs();
    if (models === null) { s.monitorError = 'LM Studio model inventory unavailable'; saveRecovery(s); return; }
    s.monitorError = null;
    s.dshUp = dshUp;
    s.log = candidate.log;
    const crashSeen = scan.crashes.length > 0 && !scan.baseline;
    if (crashSeen) {
      s.crashAt = Date.now(); s.lastCrashLine = scan.crashes[scan.crashes.length - 1].slice(-300);
    }
    for (const [role, expected] of Object.entries(RECOVERY_ROLES)) {
      const rs = s.roles[role];
      const resident = models.some(m => m?.identifier === expected.identifier && m?.modelKey === expected.modelKey && m?.deviceIdentifier == null);
      // A later explicit load through LM Studio or the desktop launcher also
      // re-arms recovery. Never mistake an in-flight queued Unload for that.
      if (s.suppression[role] && !resident) rs.confirmedAbsent = true;
      if (s.suppression[role] && resident && rs.confirmedAbsent && lmsMutationsPending === 0) s.suppression[role] = false;
      if (!dshUp || s.suppression[role]) { rs.pending = false; rs.observedResident = false; continue; }
      if (resident) { rs.observedResident = true; rs.confirmedAbsent = false; rs.lastObservedAt = Date.now(); rs.pending = false; continue; }
      if (crashSeen && rs.observedResident) rs.pending = true;
      // Keep the last observation until a bounded log read catches up; an
      // engine-exit line may be in the next chunk or incomplete current line.
      if (!rs.pending && (scan.caughtUp || scan.baseline)) rs.observedResident = false;
    }
    saveRecovery(s);
    if (!dshUp || scan.baseline) return;
    for (const [role, expected] of Object.entries(RECOVERY_ROLES)) {
      const rs = s.roles[role];
      if (!rs.pending || s.suppression[role]) continue;
      if (rs.attempts.length >= 3) { rs.lastError = 'recovery limit reached (3 loads in 10 minutes)'; continue; }
      if (rs.attempts.some(at => Date.now() - at < 15000)) continue;
      try {
        const result = await runLmsMutation(['load', expected.modelKey, '--identifier', expected.identifier, '--gpu', 'max', '--context-length', String(expected.context), '--parallel', String(expected.parallel), '--no-speculative-draft-mtp', '-y'], expected.identifier, true, 10 * 60 * 1000, async () => {
          if (!await tcpCheck(3080)) { rs.pending = false; return false; }
          const fresh = await lmsPs();
          if (fresh === null) throw new Error('LM Studio inventory unavailable before automatic recovery');
          // Check again after the asynchronous reads: an Unload may have been
          // requested while the inventory call was in flight.
          if (s.suppression[role] || !rs.pending) return false;
          if (fresh.some(m => m?.identifier === expected.identifier)) { rs.pending = false; return false; }
          rs.attempts.push(Date.now());
          saveRecovery(s);
        });
        if (!result.skipped) {
          rs.lastRecoveryAt = Date.now(); rs.lastError = null; rs.pending = false;
          rs.observedResident = !s.suppression[role];
        }
      } catch (e) { rs.lastError = String(e?.message || e).slice(0, 300); console.error(`[mission-control] automatic ${role} recovery failed:`, rs.lastError); }
    }
    saveRecovery(s);
  } catch (error) {
    modelRecoveryState.monitorError = String(error?.message || error).slice(0, 300);
    saveRecovery(modelRecoveryState);
    console.error('[mission-control] model recovery monitor failed:', modelRecoveryState.monitorError);
  } finally { recoveryTickRunning = false; }
}
/*__MODEL_RECOVERY_END__*/

// ─────────────────────────── history (mc-history.jsonl) ───────────────────────────

async function appendHistory() {
  try {
    const [gpu, sess] = await Promise.all([gpuMemory(), getSessions(await tcpCheck(3080), 50)]);
    if (!historyObservationState.initialized) {
      const lastRow = readHistorySpark(1)[0];
      historyObservationState.decodeSourceKey = lastRow?.decodeSourceKey || null;
      historyObservationState.decodeSourceAt = lastRow?.decodeSourceAt || null;
      historyObservationState.initialized = true;
    }
    const observation = selectDecodeObservation(sess.sessions || [], historyObservationState, recentMeasuredDecode());
    historyObservationState.decodeSourceKey = observation.decodeSourceKey;
    historyObservationState.decodeSourceAt = observation.decodeSourceAt;
    const row = {
      t: Date.now(),
      ...observation,
      winFreeGiB: gib(os.freemem()),
      gpuDedGiB: gpu.ok ? gib(gpu.dedicatedBytes) : null,
      gpuSharedGiB: gpu.ok ? gib(gpu.sharedBytes) : null,
    };
    fs.mkdirSync(MC_DIR, { recursive: true });
    fs.appendFileSync(HISTORY_FILE, JSON.stringify(row) + '\n');
    const lines = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean);
    const retained = pruneHistoryLines(lines);
    // Eight days safely covers the UI's seven-day range even across DST and
    // poll jitter. Time, not row count, is the contract.
    if (retained.length !== lines.length) fs.writeFileSync(HISTORY_FILE, retained.join('\n') + '\n');
  } catch { /* best effort, never crash the poller */ }
}

const historyObservationState = { initialized: false, decodeSourceKey: null, decodeSourceAt: null };

// Time-series for the vitals chart. Field names drifted mid-collection
// (winFreeGB -> winFreeGiB etc.) — accept both rather than losing the older
// half of the record. Downsampled on the wire: past ~400 points a chart this
// size draws noise, not information.
function readHistoryRange(sinceMs, maxPoints = 400) {
  try {
    const lines = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean);
    const rows = [];
    for (const line of lines) {
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      if (!r.t || r.t < sinceMs) continue;
      const normalized = normalizeHistoryRow(r);
      if (normalized) rows.push(normalized);
    }
    return downsampleHistoryRows(rows, maxPoints);
  } catch { return []; }
}

function readHistorySpark(n = 40) {
  try {
    const lines = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean).slice(-n);
    return lines.map(l => {
      try { return normalizeHistoryRow(JSON.parse(l)); }
      catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

// ─────────────────────────── model catalog ───────────────────────────

function directoryUsage(root) {
  let bytes = 0, files = 0;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) { bytes += fs.statSync(p).size; files++; }
    }
  };
  try { walk(root); return { ok: true, bytes, files }; }
  catch { return { ok: false, bytes: 0, files: 0 }; }
}

function configuredRouteData() {
  try {
    const raw = fs.readFileSync(PROFILE_FILE, 'utf8');
    const route = parseAgentDefaultRoute(raw);
    return { ...route, ...profileProviderTransport(raw, route.provider, OLLAMA_ORIGIN) };
  }
  catch (error) {
    return {
      provider: null,
      model: null,
      reasoningEffort: null,
      error: error?.code === 'ENOENT' ? 'Web profile is not configured' : 'Web profile is unreadable',
    };
  }
}

async function catalog() {
  const [lsAll, psAll, linkStatus] = await Promise.all([lmsLs(), lmsPs(), getLinkStatus()]);
  if (lsAll === null || psAll === null) return { error: true, catalog: [], totalGB: 0 };
  const deviceMap = buildDeviceMap(linkStatus);
  const residentsByEntry = new Map(lsAll.map(model => [model, []]));
  const matchedResidents = new Set();
  for (const resident of psAll) {
    const sameDevice = lsAll.filter(model => (model.deviceIdentifier ?? null) === (resident.deviceIdentifier ?? null));
    let matches = sameDevice.filter(model => model.modelKey && model.modelKey === resident.modelKey);
    if (!matches.length) matches = sameDevice.filter(model => model.modelKey && model.modelKey === resident.identifier);
    // A file path can be shared by several aliases or by peer machines. Use it
    // only when it identifies one catalog entry on the resident's own device.
    if (!matches.length && resident.path) matches = sameDevice.filter(model => model.path === resident.path);
    if (matches.length === 1) {
      residentsByEntry.get(matches[0]).push(resident);
      matchedResidents.add(resident);
    }
  }
  const rows = lsAll.flatMap(m => {
    const residents = residentsByEntry.get(m);
    return (residents.length ? residents : [null]).map(loaded => {
      // lms ls is fleet-merged. Its deviceIdentifier is therefore required even
      // for unloaded rows; leaving Origin blank made remote peer catalogs look
      // like stale local files and exposed a bogus local Load button.
      const origin = resolveOrigin(loaded?.identifier || null, m.modelKey, m.deviceIdentifier, deviceMap);
      return {
        modelKey: m.modelKey,
        displayName: m.displayName,
        publisher: m.publisher,
        path: m.path,
        architecture: m.architecture,
        paramsString: m.paramsString,
        quant: m.quantization?.name || '?',
        sizeGB: gb(m.sizeBytes),
        maxContextLength: m.maxContextLength || null,
        loaded: !!loaded,
        identifier: loaded?.identifier || null,
        residentModelKey: loaded?.modelKey || null,
        status: loaded?.status || null,
        contextLength: loaded?.contextLength || null,
        ttlMs: loaded?.ttlMs ?? null,
        lastUsedTime: loaded?.lastUsedTime ?? null,
        queued: loaded?.queued ?? null,
        parallel: loaded?.parallel ?? null,
        origin: origin.label,
        originKind: origin.kind,
        deviceId: origin.deviceId || null,
      };
    });
  });
  // Any loaded model somehow missing from `ls` (shouldn't normally happen, but
  // don't silently drop it) gets appended flagged loaded-only.
  for (const m of psAll) {
    if (matchedResidents.has(m)) continue;
    const origin = resolveOrigin(m.identifier, m.modelKey, m.deviceIdentifier, deviceMap);
    rows.push({
      modelKey: m.modelKey, displayName: m.displayName, publisher: m.publisher, path: m.path,
      architecture: m.architecture, paramsString: m.paramsString, quant: m.quantization?.name || '?',
      sizeGB: gb(m.sizeBytes), maxContextLength: m.maxContextLength || null, loaded: true,
      identifier: m.identifier, residentModelKey: m.modelKey, status: m.status, contextLength: m.contextLength, ttlMs: m.ttlMs,
      lastUsedTime: m.lastUsedTime, queued: m.queued, parallel: m.parallel, loadedOnly: true,
      origin: origin.label, originKind: origin.kind, deviceId: origin.deviceId || null,
    });
  }
  rows.sort((a, b) => (b.loaded - a.loaded) || a.displayName.localeCompare(b.displayName));
  // Catalog totals count addressable entries, not the expanded resident rows:
  // one available model may have several separately loaded instances.
  const localEntries = lsAll.filter(m => m.deviceIdentifier == null);
  const fleetEntries = lsAll.filter(m => m.deviceIdentifier != null);
  const disk = directoryUsage(LMSTUDIO_MODELS_DIR);
  return {
    error: false,
    catalog: rows,
    localCount: localEntries.length,
    fleetCount: fleetEntries.length,
    localDiskGiB: disk.ok ? gib(disk.bytes) : null,
    localDiskFiles: disk.ok ? disk.files : null,
    // Addressable totals include model.yaml aliases that share base weights;
    // never present this number as physical disk use.
    localAddressableGB: Math.round(localEntries.reduce((a, m) => a + gb(m.sizeBytes), 0) * 10) / 10,
    fleetCatalogGB: Math.round(fleetEntries.reduce((a, m) => a + gb(m.sizeBytes), 0) * 10) / 10,
  };
}

// ─────────────────────────── status() — the 5 s poll ───────────────────────────

async function status() {
  const [dshUp, lmUp, models, runtime, lmsVer, gpu, disk, linkStatus, snapshotTask, ollama] = await Promise.all([
    tcpCheck(3080), OLLAMA_ONLY ? Promise.resolve(false) : tcpCheck(1234), lmsPs(), lmsRuntimeLs(), lmsVersionStr(), gpuMemory(), diskUsage(), getLinkStatus(), memorySnapshotTaskState(), ollamaResidents(),
  ]);
  // Today totals and context selection need the complete session inventory,
  // not whichever 50 happen to sort first. The UI still renders a short slice.
  const sc = await getSessions(dshUp, 500);
  const liveDecodeRows = syncLiveDecode(dshUp ? (sc.sessions || []) : []);
  const slow = dshUp ? await slowPulls() : slowCacheView(Date.now(), 'DSH port unavailable');
  const mem = parseMemoryFile(MEMORY_FILE);
  const snapshots = readSnapshotCadence(MEMORY_SNAPSHOTS);
  const today = todayStats(sc.sessions || []);
  const deviceMap = buildDeviceMap(linkStatus);
  const modelsWithOrigin = (models || []).map(m => {
    const origin = resolveOrigin(m.identifier, m.modelKey, m.deviceIdentifier, deviceMap);
    return {
      identifier: m.identifier,
      modelKey: m.modelKey,
      provider: 'lmstudio',
      publisher: m.publisher || null,
      type: m.type || null,
      quant: m.quantization?.name || '?',
      context: m.contextLength,
      status: m.status,
      queued: m.queued,
      parallel: m.parallel ?? null,
      gb: gb(m.sizeBytes),
      origin: origin.label,
      originKind: origin.kind,
      deviceId: origin.deviceId || null,
    };
  });
  modelsWithOrigin.push(...ollama.models);
  const unknownOrigin = modelsWithOrigin.filter(m => m.originKind === 'unknown');
  const accountCache = readLmLinkAccountCache();
  const stalledSessions = summarizeStalledSessions(sc.sessions || []);
  const routeRuntime = describeRouteRuntime(configuredRouteData(), modelsWithOrigin, ollama);
  const profiles = roleProfiles();
  const brainRole = resolveExactResidentRole(profiles.brain, modelsWithOrigin);
  const workerRole = resolveExactResidentRole(profiles.worker, modelsWithOrigin);
  const residentRoles = {
    brain: brainRole.model,
    worker: workerRole.model,
    ambiguous: {
      brain: brainRole.ambiguous ? brainRole.matches : [],
      worker: workerRole.ambiguous ? workerRole.matches : [],
    },
  };
  residentRoles.other = modelsWithOrigin.filter(m =>
    m.originKind === 'local' && m !== residentRoles.brain && m !== residentRoles.worker);
  const muxState = describeMuxState(mux.connected, mux.jobs, mux.queues, (sc.sessions || []).map(s => s.sessionId));

  const engineStr = runtime?.selected ? `${runtime.selected.name}@${runtime.selected.version}` : null;
  const state = readState();
  const modelRecovery = state.modelRecovery || recoveryState();
  let engineChanged = false;
  if (engineStr) {
    if (state.lastEngine == null) { writeState({ lastEngine: engineStr }); }
    else if (state.lastEngine !== engineStr) { engineChanged = true; writeState({ lastEngine: engineStr }); }
  }

  const winTotal = os.totalmem(), winFree = os.freemem();
  const capBytes = await vramCapacityBytes();
  const apuDiff = MACHINE_TOTAL_RAM - winTotal;
  const carveoutBytes = capBytes != null ? capBytes
    : (apuDiff >= 8 * 1073741824 ? apuDiff : null);

  return {
    build: { sourceFile: SOURCE_FILE, sourceSha256: BUILD_SHA256 },
    time: new Date().toISOString(),
    node: process.version,
    services: {
      cockpit: dshUp,
      lmstudio: lmUp,
      lmsCli: models !== null,
      dshVersionPin: installedDshVersion(),
      lmsCliVersion: lmsVer,
      lmStudioVersion: await lmStudioAppVersion(),
      engine: engineStr,
      engineChanged,
    },
    ollama,
    models: modelsWithOrigin,
    modelRecovery,
    fleet: {
      linkOk: !!linkStatus,
      deviceName: linkStatus?.deviceName || null,
      deviceId: linkStatus?.deviceIdentifier || null,
      peers: (linkStatus?.peers || []).map(p => ({
        deviceName: p.deviceName, deviceIdentifier: p.deviceIdentifier, status: p.status, loadedModels: p.loadedModels || [],
      })),
      accountCache,
      pool: modelsWithOrigin,
      unknownOriginResident: unknownOrigin.map(m => m.identifier),
      unknownOriginGenerating: unknownOrigin.filter(m => m.status === 'generating').map(m => m.identifier),
    },
    sessions: (sc.sessions || []).slice(0, 8),
    latestCompletedRun: selectLatestCompletedSession(sc.sessions || []),
    liveDecode: liveDecodeRows,
    liveEngineDecode: liveEngineDecode(),
    recentLiveEngineDecode: recentLiveEngineDecode(),
    recentMeasuredDecode: recentMeasuredDecode(),
    sessionsSource: sc.source,
    stalledSessions,
    // Context warning for work that is actually live/recent. The old reduction
    // ranged over every retained session, so a dormant 97%-full experiment from
    // days ago kept the global strip red forever. Historical fill remains on
    // the Sessions tab; the global alarm covers running sessions and sessions
    // whose durable log advanced in the last 15 minutes.
    contextPressure: (() => {
      const recentCutoff = Date.now() - 15 * 60 * 1000;
      const withCtx = (sc.sessions || []).filter(x => x.ctxPct != null && (x.running || x.mtime >= recentCutoff));
      if (!withCtx.length) return null;
      const worst = withCtx.reduce((a, b) => (b.ctxPct > a.ctxPct ? b : a));
      return { worstPct: worst.ctxPct, worstTitle: worst.title || worst.id, worstId: worst.id, scope: 'running or updated within 15 minutes' };
    })(),
    today,
    presets: slow.presets,
    plugins: slow.pluginSummary ? {
      ...slow.pluginSummary, stale: slow.stale, cacheState: slow.state,
      sampledAt: slow.sampledAt || null, sourceAgeMs: slow.ageMs, refreshError: slow.error,
    } : null,
    dshData: { available: dshUp, cacheState: slow.state, stale: slow.stale, sampledAt: slow.sampledAt || null, sourceAgeMs: slow.ageMs, error: slow.error },
    routeRuntime,
    residentRoles,
    jobs: {
      streamConnected: mux.connected,
      lastFrameAgeS: mux.lastFrameAt ? Math.round((Date.now() - mux.lastFrameAt) / 1000) : null,
      ...muxState,
    },
    memory: {
      ok: mem.ok, error: mem.error || null, file: mem.file, mtimeMs: mem.mtimeMs,
      entities: mem.entities.length, relations: mem.relationCount, totalRecords: mem.totalRecords,
      invalidRecords: mem.invalidRecords, malformedRecords: mem.malformedRecords,
      duplicateEntities: mem.duplicateEntities, danglingRelations: mem.danglingRelations,
      tripwire: MEMORY_ENTITY_TRIPWIRE,
      writer: (() => {
        const entry = (slow.pluginEntries || []).find(item => /(?:^|:)memory-mcp-reference$/.test(item.entryId || ''));
        return {
          configured: !!entry,
          active: !!entry && entry.enabled === true && entry.fiberPhase === 'active',
          entryId: entry?.entryId || null,
          cacheState: slow.state,
          error: slow.error || null,
        };
      })(),
      snapshots,
      snapshotTask,
    },
    loaders: { brain: profiles.brain.quant, worker: profiles.worker.quant },
    // Eviction JIT-reload trap (5070Ti port, issue #5): when LM Studio evicts
    // the brain, the next API call reloads it with SERVER defaults, not the
    // loader profile (measured 17.5 vs 49 tok/s on the port box). Compare the
    // live local brain against the loader script's own identity/quant/ctx.
    brainConfigMismatch: brainMismatch(roleProfiles(), modelsWithOrigin),
    // RAM/GPU pools in GiB (binary) — matches AMD Adrenalin's VGM split units.
    // Disk stays decimal GB below — drives are marketed in decimal.
    ram: { totalGiB: gib(winTotal), freeGiB: gib(winFree), usedGiB: gib(winTotal - winFree) },
    gpu: {
      ok: gpu.ok,
      source: gpu.source || null,
      dedicatedGiB: gpu.ok ? gib(gpu.dedicatedBytes) : null,
      sharedGiB: gpu.ok ? gib(gpu.sharedBytes) : null,
      carveoutGiB: carveoutBytes != null ? gib(carveoutBytes) : null,
      sampledAt: gpu.sampledAt,
      error: gpu.error,
    },
    disk: { ok: disk.ok, usedGB: gb(diskCache.usedBytes), freeGB: gb(diskCache.freeBytes), totalGB: gb(diskCache.usedBytes + diskCache.freeBytes) },
    machineTotalRamGiB: Math.round(MACHINE_TOTAL_RAM / 1073741824),
    validation: state.lastValidation
      ? { ...state.lastValidation, freshness: describeValidationFreshness(state.lastValidation, Date.now(), configurationFingerprint()) }
      : { when: null, ok: null, warnings: [], freshness: describeValidationFreshness(null) },
    historySpark: readHistorySpark(40).map(h => h.decodeTps),
  };
}

// ─────────────────────────── actions ───────────────────────────

// The model.yaml aliases are now the load profiles. Validate that the files
// exist and still carry the expected context/parallel settings before using
// their role contracts in the UI.
const roleProfileCache = { at: 0, value: null };
function readRoleProfile(role) {
  let definitionOk = false;
  try {
    const src = fs.readFileSync(role.definition, 'utf8');
    definitionOk = new RegExp('model:\\s*' + role.modelKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(src)
      && new RegExp('key:\\s*llm\\.load\\.contextLength\\s*[\\s\\S]*?value:\\s*' + role.context + '\\b').test(src)
      && /key:\s*llm\.load\.numParallelSessions\s*[\s\S]*?value:\s*1\b/.test(src);
  } catch { definitionOk = false; }
  return { ...role, definitionOk };
}
function roleProfiles() {
  if (roleProfileCache.value && Date.now() - roleProfileCache.at < 60000) return roleProfileCache.value;
  roleProfileCache.value = { brain: readRoleProfile(DAILY_BRAIN), worker: readRoleProfile(DAILY_WORKER) };
  roleProfileCache.at = Date.now();
  return roleProfileCache.value;
}
function brainMismatch(profiles, models) {
  const expected = profiles?.brain;
  if (!expected?.definitionOk) return `cannot verify the daily brain: its LM Studio model.yaml definition is missing or no longer pins ${expected?.context ?? DAILY_BRAIN.context} tokens / parallel=${expected?.parallel ?? DAILY_BRAIN.parallel}`;
  const b = (models || []).find(m => m.identifier === expected.identifier && m.originKind === 'local');
  if (!b) return null;
  const quantOk = b.quant === expected.quant;
  const ctxOk = b.context === expected.context;
  const parallelOk = b.parallel === expected.parallel;
  if (quantOk && ctxOk && parallelOk) return null;
  return `brain is loaded as ${b.quant}@${b.context} parallel=${b.parallel ?? '?'} but the daily profile says ${expected.quant}@${expected.context} parallel=${expected.parallel}`;
}

const ACTIONS = {
  // gauntlet Eng-minor: this was the ONE action still calling raw spawn() with a
  // bare executable name, bypassing the PATH-resolution hardening every sibling
  // uses -- a poisoned PATH entry named powershell.exe would have been launched.
  'start-cockpit': () => safeSpawnStarted('powershell', ['-NoProfile', ...(OLLAMA_ONLY ? [] : ['-ExecutionPolicy', 'Bypass']), '-WindowStyle', 'Hidden', '-File', START_DSH, '-NoOpen', '-KeepMissionControl'], { detached: true, stdio: 'ignore', windowsHide: true }),
  'open-dsh': () => openDshInChrome(),
  'load-q5': () => runLmsMutation(['load', DAILY_BRAIN.modelKey, '--identifier', DAILY_BRAIN.identifier, '--gpu', 'max', '--context-length', String(DAILY_BRAIN.context), '--parallel', String(DAILY_BRAIN.parallel), '--no-speculative-draft-mtp', '-y'], DAILY_BRAIN.identifier, true, 10 * 60 * 1000),
  'load-worker': () => runLmsMutation(['load', DAILY_WORKER.modelKey, '--identifier', DAILY_WORKER.identifier, '--gpu', 'max', '--context-length', String(DAILY_WORKER.context), '--parallel', String(DAILY_WORKER.parallel), '--no-speculative-draft-mtp', '-y'], DAILY_WORKER.identifier, true, 10 * 60 * 1000),
  'unload-all': () => runLmsMutation(['unload', '--all'], null, false, 60000),
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// ─────────────────────────── HTML shell ───────────────────────────

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>HALO Mission Control</title><style>
:root{--bg:#0b0f14;--panel:#101c2a;--line:#27405c;--ink:#eef6ff;--mut:#9fb3c8;--teal:#4fd8c4;--green:#5fe39a;--amber:#ffc86b;--red:#ff8080}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#080c11,#0c1420);color:var(--ink);font:15px/1.5 Segoe UI,Arial,sans-serif;padding:18px 24px 40px}
h1{font-size:1.3rem;margin:0 0 2px}.sub{color:var(--mut);font-size:.82rem;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px;min-width:0}
.card h2{font-size:.92rem;margin:0 0 10px;color:#dcecff}
.card.wide{grid-column:1/-1}
.card.span2{grid-column:span 2}
/* One explicit statement of what the machine is doing, so a screen full of
   zeros reads as "idle" rather than "broken". */
.hero-state{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px 16px;padding:12px 17px;margin-bottom:14px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;font-size:.92rem}
.hero-state .st{font-weight:800;letter-spacing:.08em;font-size:.95rem}
.hero-state .st.idle{color:#7f9bb5}.hero-state .st.busy{color:var(--amber)}.hero-state .st.down{color:var(--red)}
/* Severity belongs on the VALUES, not only the top strip: with everything
   green there is nothing to scan for. */
.v-warn{color:var(--amber)}.v-bad{color:var(--red)}
.vrange{float:right;display:flex;gap:4px}
.vrange button{margin:0;padding:3px 9px;font-size:.72rem}
.vrange button.on{background:#1c5570;border-color:var(--teal);color:#fff}
.vitals-head{display:flex;flex-wrap:wrap;gap:26px;margin:2px 0 12px}
.vstat b{display:block;font-size:1.45rem;color:#eaf4ff;font-weight:700;line-height:1.15}
.vstat span{color:var(--mut);font-size:.74rem;letter-spacing:.03em}
.vstat b.warn{color:var(--amber)}.vstat b.bad{color:var(--red)}
.vtip{position:absolute;pointer-events:none;background:#0b1826;border:1px solid var(--line);border-radius:7px;padding:7px 10px;font-size:.76rem;color:#dcecff;white-space:nowrap;display:none;z-index:5}
.row{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid #1a2c42;font-size:.87rem}
.row:last-child{border:none}.k{color:var(--mut);text-align:right}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;flex:none}
.up{background:var(--green)}.down{background:var(--red)}.busy{background:var(--amber)}.wait{background:#5f8fd9}
button{background:#12344c;color:#cfe8ff;border:1px solid #3c6284;border-radius:8px;padding:6px 11px;margin:3px 6px 0 0;cursor:pointer;font-size:.82rem}
button:hover{background:#164058}button:disabled{opacity:.5;cursor:default}a{color:var(--teal);text-decoration:none}a:hover{text-decoration:underline}
.mut{color:var(--mut);font-size:.8rem}.mono{font-family:Consolas,monospace;font-size:.82rem}
input[type=text],input[type=number]{background:#0c1620;border:1px solid var(--line);color:var(--ink);border-radius:6px;padding:4px 7px;font-size:.82rem;width:90px}
#actionMsg{color:var(--amber);font-size:.83rem;min-height:1.2em;margin:4px 0 10px}
/* status strip */
.strip{display:flex;align-items:center;gap:16px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 16px;margin-bottom:14px;flex-wrap:wrap}
.light-item{display:flex;align-items:center;gap:6px;cursor:pointer;padding:4px 8px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit}
.light-item:hover{background:#16283c}
.light{width:13px;height:13px;border-radius:50%;flex:none;box-shadow:0 0 6px 0 currentColor}
.light.g{background:var(--green);color:var(--green)}.light.a{background:var(--amber);color:var(--amber)}.light.r{background:var(--red);color:var(--red)}
.light-label{font-size:.78rem;color:var(--mut);letter-spacing:.03em}
/* Slot occupancy, so "Load Brain" has a visible target instead of being magic. */
/* Numeric columns line up for vertical comparison. */
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.lg-err{color:#ff9a9a}.lg-warn{color:var(--amber)}
.slots{display:flex;flex-wrap:wrap;gap:18px;font-size:.82rem;margin-bottom:10px;padding-bottom:9px;border-bottom:1px solid #1a2c42}
.slot b{color:#9fc4e0;font-weight:600;margin-right:5px}
/* Destructive controls read as destructive and sit apart from the safe ones. */
.danger-cluster{margin-left:auto;display:inline-flex;gap:6px}
button.danger{background:#2a1414;border-color:#7a3030;color:#ffb0b0}
button.danger:hover{background:#3a1a1a}
.pchip{display:inline-block;margin:0 5px 0 0;padding:2px 9px;border-radius:999px;border:1px solid var(--line);background:transparent;font:inherit;font-size:.78rem;color:var(--mut);cursor:pointer}
.pchip:hover{border-color:#4a7799}
.pchip.on{background:#1c5570;border-color:var(--teal);color:#fff}
.pchip.bad{border-color:#7a3030;color:#ff9a9a}.pchip.warn{border-color:#7a6030;color:var(--amber)}.pchip.ok{border-color:#2f6a4a;color:#8fe3b4}
.alarm{flex:1 1 260px;font-size:.85rem;color:var(--mut);text-align:right}
.alarm.bad{color:var(--amber)}
.alarm.info{color:var(--teal)}
/* tabs */
.tabs{display:flex;gap:4px;margin-bottom:14px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.tabbtn{background:none;border:none;color:var(--mut);padding:8px 14px;font-size:.88rem;cursor:pointer;border-bottom:2px solid transparent;margin:0;border-radius:0}
.tabbtn:hover{background:none;color:var(--ink)}
.tabbtn.current{color:var(--ink);border-bottom-color:var(--teal)}
.tabpanel{display:none}.tabpanel.active{display:block}
/* tables */
table.tbl{width:100%;border-collapse:collapse;font-size:.85rem}
.tbl th{text-align:left;color:var(--mut);font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;padding:6px 8px;border-bottom:1px solid var(--line)}
.tbl td{padding:6px 8px;border-bottom:1px solid #1a2c42;vertical-align:top}
.tbl tr:hover td{background:#132234}
.tbl tr.clickable{cursor:pointer}
.row-toggle,.memory-row{width:100%;margin:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left}
.badge{display:inline-block;padding:1px 7px;border-radius:6px;font-size:.7rem;margin-left:6px;white-space:nowrap}
/* gauntlet UX-1: badge-green was USED (the Settings "ok" state) but never
   defined, so the safe/common case rendered as plain body text -- the traffic
   light only lit up for danger. */
.badge-green{background:#12341f;color:var(--green)}
.badge-amber{background:#3a2c12;color:var(--amber)}.badge-red{background:#3a1414;color:var(--red)}.badge-teal{background:#123a34;color:var(--teal)}.badge-mut{background:#182636;color:var(--mut)}
.bar{background:#1a2c42;border-radius:6px;height:9px;overflow:hidden;margin-top:3px}
.bar>i{display:block;height:100%;background:var(--teal)}
.bar.amber>i{background:var(--amber)}.bar.red>i{background:var(--red)}
.filterbar{display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
.filterbar input[type=text]{width:220px}
.table-scroll{max-width:100%;overflow-x:auto}
#models-table table{min-width:980px}#sessions-table table{min-width:1080px}#plugins-table table{min-width:760px}
.detail{background:#0c1620;border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:4px 0 10px;font-size:.82rem}
.spark{display:block}
.tabsection{margin-bottom:22px}
/* memory graph */
.mgraph-wrap{display:flex;gap:14px;height:calc(100vh - 260px);min-height:460px}
.mgraph-canvas{flex:1 1 auto;min-width:0;background:#0c1620;border:1px solid var(--line);border-radius:8px;overflow:hidden;position:relative}
.mgraph-canvas svg{display:block;width:100%;height:100%}
.mgraph-side{width:300px;flex:none;display:flex;flex-direction:column;gap:10px;min-height:0}
.mgraph-legend{background:#0c1620;border:1px solid var(--line);border-radius:8px;padding:10px 12px;font-size:.8rem;max-height:180px;overflow:auto;flex:none}
.mgraph-legend-item{display:flex;align-items:center;gap:7px;padding:2px 0}
.mgraph-swatch{width:10px;height:10px;border-radius:50%;flex:none}
.mgraph-detail{background:#0c1620;border:1px solid var(--line);border-radius:8px;padding:12px;font-size:.82rem;flex:1;overflow:auto;min-height:0}
.mgraph-conn-btn{display:block;width:100%;text-align:left;margin:3px 0;background:#12344c;color:#cfe8ff;border:1px solid #3c6284;border-radius:6px;padding:5px 9px;cursor:pointer;font-size:.78rem}
.mgraph-conn-btn:hover{background:#164058}
.mgraph-obs{margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #1a2c42}
.mgraph-obs:last-child{border:none}
.mgraph-tooltip{position:fixed;z-index:80;background:#101c2a;border:1px solid var(--line);color:var(--ink);padding:6px 10px;border-radius:6px;font-size:.78rem;max-width:300px;line-height:1.4;pointer-events:none;display:none;box-shadow:0 6px 18px rgba(0,0,0,.45)}
.mg-about{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:12px 16px;margin-bottom:12px}
.mg-about summary{cursor:pointer;font-weight:600;color:#dcecff;font-size:.88rem;list-style:revert}
.mg-about[open] summary{margin-bottom:8px}
.mg-about .mg-about-body{color:var(--mut);font-size:.83rem;line-height:1.6}
.mg-about .mg-about-body .mono{color:var(--teal)}
@media(max-width:700px){
  body{padding:12px 10px 28px}.grid{grid-template-columns:minmax(0,1fr)}
  .card.span2{grid-column:1/-1}.tabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin}.tabbtn{white-space:nowrap}
  .strip{gap:5px;padding:8px}.light-item{padding:4px}.alarm{flex-basis:100%;text-align:left}
  .danger-cluster{margin-left:0}.mgraph-wrap{height:auto;min-height:0;display:block}
  .mgraph-canvas{height:480px}.mgraph-side{width:auto;margin-top:12px}.mgraph-detail{min-height:240px}
}
</style></head><body>
<h1>HALO Mission Control</h1><div class="sub">Refreshes every 5 seconds &middot; updated <span id="stamp"></span></div>
<div id="strip" class="strip" role="status" aria-live="polite">checking watched signals&hellip;</div>
<div id="actionMsg" role="status" aria-live="polite"></div>
<nav class="tabs" role="tablist" aria-label="Mission Control sections">
<button id="tab-button-overview" class="tabbtn" data-tab="overview" role="tab" aria-controls="tab-overview" aria-selected="false">Overview</button>
<button id="tab-button-models" class="tabbtn" data-tab="models" role="tab" aria-controls="tab-models" aria-selected="false">Models</button>
<button id="tab-button-sessions" class="tabbtn" data-tab="sessions" role="tab" aria-controls="tab-sessions" aria-selected="false">Sessions</button>
<button id="tab-button-plugins" class="tabbtn" data-tab="plugins" role="tab" aria-controls="tab-plugins" aria-selected="false">Plugins</button>
<button id="tab-button-system" class="tabbtn" data-tab="system" role="tab" aria-controls="tab-system" aria-selected="false">System</button>
<button id="tab-button-memory" class="tabbtn" data-tab="memory" role="tab" aria-controls="tab-memory" aria-selected="false">Memory</button>
<button id="tab-button-settings" class="tabbtn" data-tab="settings" role="tab" aria-controls="tab-settings" aria-selected="false">Settings</button>
</nav>

<div id="tab-overview" class="tabpanel" role="tabpanel" aria-labelledby="tab-button-overview">
<div id="ov-hero" class="hero-state"></div>
<div class="grid">
<div class="card"><h2>Services</h2><div id="ov-services">checking services&hellip;</div>
<div id="ov-svcbtn" style="margin-top:4px"></div></div>
<div class="card"><h2>Activity</h2><div id="ov-activity"></div></div>
<div class="card"><h2>Memory pools</h2><div id="ov-pools"></div></div>
<div class="card"><h2>Cadence &amp; drift</h2><div id="ov-cadence"></div></div>
<div class="card span2"><h2>Resident models &amp; LM Link</h2><div id="ov-fleet"></div></div>
<div class="card"><h2>Disk</h2><div id="ov-disk"></div></div>
<div class="card"><h2>Knowledge graph</h2><div id="ov-knowledge"></div></div>
<div class="card wide">
<h2>Machine vitals
<span class="vrange">
<button data-vh="1" onclick="setVitalsRange(1)">1h</button>
<button data-vh="6" class="on" onclick="setVitalsRange(6)">6h</button>
<button data-vh="24" onclick="setVitalsRange(24)">24h</button>
<button data-vh="168" onclick="setVitalsRange(168)">7d</button>
</span></h2>
<div id="ov-vitals-head" class="vitals-head"></div>
<div id="ov-vitals"></div>
</div>
</div>
</div>

<div id="tab-models" class="tabpanel" role="tabpanel" aria-labelledby="tab-button-models">
<div class="card">
<div id="model-slots" class="slots"></div>
<div class="filterbar">
<button id="btn-load-brain" onclick="act('load-q5')">Load Brain</button>
<button id="btn-load-worker" onclick="act('load-worker')">Load Worker</button>
<label class="mut toggle" title="LM Link merges models from connected peers into lms ls. Local-only is the truthful default for this machine."><input type="checkbox" id="showFleetModels" onchange="loadModels()"> also show LM Link peer catalogs</label>
<span class="danger-cluster">
<button class="danger" onclick="act('unload-worker')">Unload Worker</button>
<button class="danger" onclick="act('unload-all')">Unload All LM Studio</button>
</span>
</div>
<div id="models-table" class="table-scroll">loading model catalog&hellip;</div>
<div class="mut" id="models-footer" style="margin-top:8px"></div>
</div>
</div>

<div id="tab-sessions" class="tabpanel" role="tabpanel" aria-labelledby="tab-button-sessions">
<div class="card">
<div class="filterbar">
<span id="sessions-agg"></span>
<label class="mut toggle" title="Sessions opened on a drive root (C:\\) may not bind their workspace. They are hidden because they cannot be used."><input type="checkbox" id="showDriveRoot" onchange="loadSessions()"> also show unusable drive-root sessions</label>
</div>
<div id="sessions-table" class="table-scroll">loading sessions&hellip;</div>
</div>
</div>

<div id="tab-plugins" class="tabpanel" role="tabpanel" aria-labelledby="tab-button-plugins">
<div class="card">
<div class="filterbar">
<label class="mut" for="pluginFilter">Filter plugins</label><input type="text" id="pluginFilter" aria-label="Filter plugins" placeholder="entryId / module / phase / description" oninput="renderPlugins()">
<span class="mut" id="plugins-summary"></span>
</div>
<div id="plugins-table" class="table-scroll">loading plugins&hellip;</div>
</div>
</div>

<div id="tab-system" class="tabpanel" role="tabpanel" aria-labelledby="tab-button-system">
<div class="grid">
<div class="card"><h2>RAM &amp; GPU memory</h2><div id="sys-memory"></div></div>
<div class="card"><h2>Disk C:</h2><div id="sys-disk"></div></div>
<div class="card"><h2>Versions</h2><div id="sys-versions"></div></div>
<div class="card"><h2>Config validation</h2>
<button onclick="validateConfig()">Validate config</button>
<div id="sys-validate" role="status" aria-live="polite">validation not run this view</div></div>
</div>
<div class="card tabsection" style="margin-top:14px"><h2>Memory entities (list view) <button style="float:right" onclick="loadMemoryGraph()">Refresh</button></h2><div class="mut" style="margin-bottom:6px">Text browser of the same data. The interactive graph is the <a href="#memory" onclick="showTab('memory')">Memory tab</a>.</div><div id="sys-memgraph"></div></div>
<div class="card tabsection"><h2>Log tail <button style="float:right" onclick="loadLogtail()">Refresh</button></h2><div id="sys-logtail" class="mono"></div></div>
</div>

<div id="tab-settings" class="tabpanel" role="tabpanel" aria-labelledby="tab-button-settings">
<div class="tabsection">
<h2>Effective configuration</h2>
<p class="mut">The values Web DSH actually uses. Editable values target an exact provider, model, or active-preset scalar in <code>profiles/web/cordis.patch.yml</code>; Mission Control stages and validates the live and repository profiles before replacing either.</p>
<div id="settings-body">loading&hellip;</div>
</div>
</div>

<div id="tab-memory" class="tabpanel" role="tabpanel" aria-labelledby="tab-button-memory">
<details class="mg-about" id="mg-about" open>
<summary>About this graph</summary>
<div class="mg-about-body">
This is the harness's persistent knowledge graph (<span class="mono">~\\.dsh-stock\\memory\\memory.json</span>): what your local models remember across sessions. Nodes are entities (things the models chose to remember), colored by type. Edges are relations between them. Click a node to read its observations &mdash; the actual remembered facts.
<br><br>
It can grow when the DSH memory writer is active and a session records durable facts &mdash; say <span class="mono">&quot;remember this:&quot;</span> in the cockpit.
<br>
Hourly recovery copies are available when the <span class="mono">HALO Memory Snapshot</span> task is configured and producing snapshots. The live status below reports whether the writer, task, and snapshots actually exist; Mission Control does not invent them.
</div>
</details>
<div id="mg-health" class="card" role="status" aria-live="polite" style="margin-bottom:12px">Checking memory writer, snapshot task, and recovery copies&hellip;</div>
<div class="card" style="padding:12px 14px">
<div class="filterbar" style="justify-content:space-between">
<h2 style="margin:0" id="mg-header">Memory Graph &middot; &hellip;</h2>
<span>
<button onclick="mgResetView()" title="Frame all nodes back into view">Reset view</button>
<button onclick="loadMemoryGraphTab()">Refresh</button>
</span>
</div>
<div id="mg-status" class="mut" role="status" aria-live="polite" style="margin:2px 0 10px">waiting for memory data&hellip;</div>
<div class="mgraph-wrap">
<div id="mg-canvas" class="mgraph-canvas"></div>
<div class="mgraph-side">
<div class="mgraph-legend"><div class="mut" style="margin-bottom:6px;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em">Entity types</div><div id="mg-legend"></div></div>
<div id="mg-detail" class="mgraph-detail"><div class="mut">Click a node to see its details.</div></div>
</div>
</div>
</div>
</div>

<script>
// Per-boot action token, injected server-side. Every state-changing POST must
// carry it (and a same-origin Origin/Referer), so a cross-origin page cannot
// forge one -- it cannot read this value.
var MC_TOKEN='__MC_ACTION_TOKEN__';
function postAction(pathname, bodyObj){
  var opts={method:'POST',headers:{'x-mc-token':MC_TOKEN}};
  if(bodyObj!==undefined){ opts.headers['content-type']='application/json'; opts.body=JSON.stringify(bodyObj); }
  return fetch(pathname, opts);
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmtK(n){return n==null?'&mdash;':(Math.round(n/1024*10)/10)+'K'}
// One date format everywhere. Adjacent rows used to mix "2026-08-17" with
// "8/18/2026, 1:07:43 AM", which reads as unfinished.
function fmtStamp(ms){
  if(!ms) return '&mdash;';
  var d=new Date(ms), p=function(n){return (n<10?'0':'')+n};
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());
}
// Elapsed duration for the STALLED state. Deliberately coarse and blunt:
// "4h41m" is the number that should have been on screen all morning.
function fmtDur(ms){
  if(ms==null) return '';
  var m=Math.floor(ms/60000), h=Math.floor(m/60);
  return h>0 ? h+'h'+(m%60)+'m' : m+'m';
}
function fmtRel(ms){
  if(!ms) return '&mdash;';
  var d=Date.now()-ms; if(d<0) d=0;
  var s=Math.round(d/1000);
  if(s<60) return s+'s ago';
  var m=Math.round(s/60); if(m<60) return m+'m ago';
  var h=Math.round(m/60); if(h<24) return h+'h ago';
  return Math.round(h/24)+'d ago';
}
// "TTL 1429:57" read as minutes:seconds for what is really 23h 49m - a
// clock format nobody parses at a glance. Use plain units.
function fmtTtl(ttlMs,lastUsedTime){
  if(ttlMs==null||lastUsedTime==null) return 'no automatic unload';
  var remain=ttlMs-(Date.now()-lastUsedTime); if(remain<0) remain=0;
  var mins=Math.floor(remain/60000);
  if(mins>=60){ var h=Math.floor(mins/60); return h+'h '+(mins%60)+'m'; }
  if(mins>=1) return mins+'m';
  return Math.floor(remain/1000)+'s';
}

var currentTab='overview';
var lastStatus=null;

// gauntlet UX-2: every control carries an id + a real <label>, and numeric fields
// declare type="number". Without them a screen reader announced seven unlabelled
// edit boxes and gave no hint which was which.
function settingsInput(wl,val,label){
  var box='background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:4px 6px';
  var id='set-'+wl;
  return '<input id="'+id+'" type="number" inputmode="decimal" step="any" aria-label="'+esc(label)+'" data-wl="'+esc(wl)+'" data-orig="'+esc(String(val))+'" value="'+esc(String(val==null?'':val))+'" oninput="settingsRecalc()" style="width:150px;'+box+'">';
}
async function loadSettings(){
  var el=document.getElementById('settings-body'); if(!el) return;
  try{
    var d=await (await fetch('/api/settings')).json();
    if(d.error){ el.innerHTML='<div class="card" style="border-color:var(--red)"><b style="color:var(--red)">Settings unavailable:</b> '+esc(d.error)+'</div>'; return; }
    var rows=(d.rows||[]).map(function(r){
      var value=r.editableKey?settingsInput(r.editableKey,r.rawValue,r.label)+esc(r.suffix||''):'<span class="mono">'+esc(r.value)+'</span>';
      return '<tr><td class="mut">'+esc(r.label)+'</td><td>'+value+'</td><td class="mut">'+esc(r.source)+'</td></tr>';
    }).join('');
    el.innerHTML='<div class="table-scroll"><table class="tbl"><thead><tr><th>Setting</th><th>Effective value</th><th>Source</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div id="set-math" class="card" style="margin-top:12px"></div><div id="set-ref" role="alert"></div>'+
      '<div style="margin-top:12px"><button id="set-apply" onclick="applySettingsChanges()">Apply changes</button> <span id="set-msg" class="mut" role="status" aria-live="polite">No changes applied.</span></div>';
    settingsRecalc();
  }catch(e){ el.innerHTML='<div class="card" style="border-color:var(--red)"><b style="color:var(--red)">Settings unavailable:</b> '+esc(String(e&&e.message||e))+'</div>'; }
}
function settingsGather(){
  var out={};
  document.querySelectorAll('#settings-body [data-wl]').forEach(function(i){
    var wl=i.getAttribute('data-wl'), orig=i.getAttribute('data-orig'), val=String(i.value).trim();
    if(val!==orig) out[wl]=val;
  });
  return out;
}
// This is a PREVIEW of the server's decision, not the decision itself. The server
// re-runs the same refusal checks on the real file before writing, and its answer
// is authoritative (gauntlet UX-11) -- the preview exists so the operator sees the
// consequence while typing, and the two must be kept in step by hand.
function settingsRecalc(){
  function g(wl){ var i=document.querySelector('#settings-body [data-wl="'+wl+'"]'); return i?String(i.value).trim():''; }
  var win=+g('contextWindow'), tR=+g('thresholdRatio'), rR=+g('retainRatio'), sMax=+g('summaryMaxTokens'), idle=+g('streamIdleTimeoutMs');
  var refs=[];
  // gauntlet UX-4: a half-typed or invalid entry produced negative, nonsensical
  // token counts ("summarize -19.2K"). Numbers that cannot be real are not shown.
  var sane=(win>0 && tR>0 && tR<1 && rR>0 && rR<1 && sMax>0);
  var compactAt=null, retain=null, toSum=null, ratio=null;
  if(sane){
    compactAt=Math.round(win*tR); retain=Math.round(win*rR); toSum=compactAt-retain;
    ratio=+(toSum/sMax).toFixed(2);
  }
  // Plain language: an operator at 2am should not have to decode "F3" (UX-7).
  if(!(win>0)) refs.push('Context window must be a positive number of tokens.');
  if(rR>=tR) refs.push('Retain ratio ('+rR+') must be BELOW the compaction threshold ('+tR+'). If it is not, compaction can never shrink the context, so the session compacts over and over and never finishes.');
  if(ratio!=null&&ratio>4) refs.push('The summarizer would have to fold '+fmtK(toSum)+' tokens into '+fmtK(sMax)+' ('+ratio+':1). Anything past 4:1 truncates instead of summarizing, which is what caused the 95-minute compaction loop on 2026-08-20.');
  if(idle&&idle<600000) refs.push('Stream idle timeout under 10 minutes is shorter than a healthy first token at depth on this machine, so live requests get killed and retried -- the retry storm that burned 2.4M tokens in one turn.');
  var ok=refs.length===0 && sane;
  var md=document.getElementById('set-math');
  if(md){
    if(!sane){
      md.innerHTML='<span class="mut">enter valid numbers to see the compaction maths</span>';
    } else if(toSum<=0){
      // A negative "summarize" figure is not a smaller number, it is a nonsense
      // one -- retain is at or above the compaction threshold, so there is nothing
      // between them to summarize. Say that instead of printing -19.2K (UX-4).
      md.innerHTML='retain (<b>'+fmtK(retain)+'</b>) is at or above the compaction point (<b>'+fmtK(compactAt)+'</b>) &mdash; there would be nothing left to summarize <span class="badge badge-red">would be refused</span>';
    } else {
      md.innerHTML='compact at <b>'+fmtK(compactAt)+'</b> &middot; retain <b>'+fmtK(retain)+'</b> &middot; summarize <b>'+fmtK(toSum)+'</b> into <b>'+fmtK(sMax)+'</b> = <b>'+ratio+':1</b> '+(ok?'<span class="badge badge-green">ok</span>':'<span class="badge badge-red">would be refused</span>');
    }
  }
  var rd=document.getElementById('set-ref'); if(rd) rd.innerHTML=refs.length?('<div class="card" style="border-color:var(--red)"><b style="color:var(--red)">Would be refused &mdash; this would re-arm a failure we have already hit:</b><ul style="margin:8px 0 0 0">'+refs.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div>'):'';
  var changes=settingsGather(); var n=Object.keys(changes).length;
  var ab=document.getElementById('set-apply');
  if(ab){
    ab.disabled=(!ok||n===0);
    ab.style.opacity=ab.disabled?'0.5':'1';
    ab.textContent=n?('Apply '+n+' change'+(n>1?'s':'')):'Apply changes';
    // gauntlet UX-5: a disabled control must say WHY, for people who cannot see
    // the red card next to it.
    var why = n===0 ? 'No changes to apply yet - edit a value first.'
            : (!ok ? 'Cannot apply: the change above would re-arm a known failure. See the reasons listed.'
                   : 'Write these changes to the Web profile.');
    ab.title=why; ab.setAttribute('aria-label', why);
    ab.setAttribute('aria-disabled', ab.disabled ? 'true' : 'false');
  }
}
var settingsApplyInFlight=false;
async function applySettingsChanges(){
  // gauntlet UX-9: nothing stopped a second click landing while the first write
  // was still in flight -- two concurrent writes to the same file, and the second
  // backup would overwrite the first.
  if(settingsApplyInFlight) return;
  var msg=document.getElementById('set-msg'); var changes=settingsGather();
  if(!Object.keys(changes).length){ if(msg) msg.textContent='no changes'; return; }
  var ab=document.getElementById('set-apply');
  settingsApplyInFlight=true; if(ab){ ab.disabled=true; ab.style.opacity='0.5'; }
  if(msg) msg.textContent='applying…';
  try{
    var r=await postAction('/api/action/apply-settings',{changes:changes});
    var d=await r.json().catch(function(){return {};});
    if(r.ok&&d.applied){
      if(msg) msg.innerHTML='applied '+esc((d.changed||[]).join(', '))+' &mdash; live and repository recovery copies now match. Restart DSH when the response says it is required.';
      setTimeout(loadSettings,1500);
    }
    else {
      // gauntlet UX-6: a failure here is a degraded state and this app's own
      // convention is red for degraded -- a neutral grey line reads like a note.
      if(msg) msg.innerHTML='<span style="color:var(--red)">Refused, nothing was written: '+esc(((d.refusals||[]).concat(d.errors||[])).join('; ')||'unknown reason')+'</span>';
    }
  }catch(e){ if(msg) msg.innerHTML='<span style="color:var(--red)">Could not reach Mission Control: '+esc(String((e&&e.message)||e))+'</span>'; }
  finally{ settingsApplyInFlight=false; settingsRecalc(); }
}

function showTab(name){
  var validTabs=['overview','models','sessions','plugins','system','memory','settings'];
  if(validTabs.indexOf(name)===-1) name='overview';
  // gauntlet UX-3: leaving Settings threw away unapplied edits with no warning --
  // the operator retypes budgets they thought were staged. This file already
  // confirms before a destructive session stop; do the same for losing work.
  if(currentTab==='settings' && name!=='settings'){
    var pending=Object.keys(settingsGather()).length;
    if(pending && !confirm('Discard '+pending+' unapplied settings change'+(pending>1?'s':'')+'?\\n\\nThey have NOT been written to the Web profile.')){
      // gauntlet re-verify New-1: the tab click sets location.hash BEFORE
      // hashchange calls showTab, so an early return here left the URL pointing at
      // a tab we are not showing -- and a refresh then landed there and silently
      // dropped the staged edit. Put the hash back where the user actually is.
      try{ if(location.hash!=='#'+currentTab) location.hash='#'+currentTab; }catch(e){}
      return;
    }
  }
  document.querySelectorAll('.tabpanel').forEach(function(p){
    var active=p.id==='tab-'+name;
    p.classList.toggle('active',active);
    p.hidden=!active;
  });
  var el=document.getElementById('tab-'+name);
  document.querySelectorAll('.tabbtn').forEach(function(b){
    var active=b.dataset.tab===name;
    b.classList.toggle('current',active);
    b.setAttribute('aria-selected',active?'true':'false');
    b.tabIndex=active?0:-1;
    if(active) b.scrollIntoView({block:'nearest',inline:'nearest'});
  });
  currentTab=name;
  onTabShown(name);
}
function onTabShown(name){
  if(name==='overview') loadVitals();
  if(name==='settings') loadSettings();
  if(name==='models') loadModels();
  if(name==='sessions') loadSessions();
  if(name==='plugins') loadPlugins();
  if(name==='system'){ loadMemoryGraph(); loadLogtail(); }
  if(name==='memory') mgOnTabActivated();
}
document.querySelectorAll('.tabbtn').forEach(function(b){
  b.addEventListener('click',function(){location.hash='#'+b.dataset.tab});
  b.addEventListener('keydown',function(ev){
    var tabs=Array.prototype.slice.call(document.querySelectorAll('.tabbtn'));
    var at=tabs.indexOf(b),next=null;
    if(ev.key==='ArrowRight') next=tabs[(at+1)%tabs.length];
    else if(ev.key==='ArrowLeft') next=tabs[(at-1+tabs.length)%tabs.length];
    else if(ev.key==='Home') next=tabs[0];
    else if(ev.key==='End') next=tabs[tabs.length-1];
    if(next){ev.preventDefault();next.focus();location.hash='#'+next.dataset.tab;}
  });
});
window.addEventListener('hashchange', function(){ showTab((location.hash||'#overview').slice(1) || 'overview') });

// Stop one session through the harness's own cancel endpoint. Before this
// existed the only remedy for a runaway was killing the whole dsh process.
async function stopSession(sessionId, title){
  // NO escape sequences and no line breaks in this string. It lives inside the
  // PAGE template literal, so a backslash-n written here emits a REAL newline
  // into the page and leaves an unterminated JS string -- a blank console.
  if(!confirm('Stop session: ' + title + ' - this cancels its current turn. Findings already written to disk are kept.')) return;
  var msg=document.getElementById('actionMsg');
  msg.textContent='stopping '+title+'...';
  try{
    var r=await postAction('/api/action/stop-session',{sessionId:sessionId});
    var t=await r.text();
    msg.textContent = r.ok ? ('stopped '+title) : ('could not stop: '+t);
  }catch(e){ msg.textContent='could not stop: '+e.message; }
  setTimeout(function(){ msg.textContent=''; loadSessions(); },2500);
}
async function openDsh(){
  var msg=document.getElementById('actionMsg');
  msg.textContent='opening DSH in Chrome...';
  try{
    var response=await postAction('/api/action/open-dsh');
    var detail=await response.text();
    msg.textContent=response.ok?'opened DSH in Chrome':'could not open DSH: '+(detail||response.status);
  }catch(e){ msg.textContent='could not open DSH: '+String(e&&e.message||e); }
  setTimeout(function(){msg.textContent=''},2500);
}
async function act(a){
  // Destructive globals name what they will destroy before doing it. One
  // misclick used to evict every resident model with no confirm and no undo.
  if(a==='unload-all'||a==='unload-worker'){
    var loaded=(lastStatus&&lastStatus.models||[]).filter(function(m){return m.originKind==='local'});
    var worker=lastStatus&&lastStatus.residentRoles&&lastStatus.residentRoles.worker;
    var targets=a==='unload-all'?loaded:(worker?[worker]:[]);
    if(!targets.length){ document.getElementById('actionMsg').textContent='nothing to unload'; setTimeout(function(){document.getElementById('actionMsg').textContent=''},2500); return; }
    var gb=targets.reduce(function(t,m){return t+(m.gb||0)},0);
    var names=targets.map(function(m){return m.identifier}).join(', ');
    if(!confirm('Unload '+targets.length+' model'+(targets.length>1?'s':'')+' and free about '+gb.toFixed(1)+' GB?\\n\\n'+names+'\\n\\nAny session using them will reload from disk on its next request.')) return;
  }
  var endpoint='/api/action/'+a;
  var payload;
  if(a==='unload-worker'){
    endpoint='/api/action/unload-model';
    payload={identifier:targets[0].identifier};
  }
  var msg=document.getElementById('actionMsg');
  msg.textContent='running: '+a+'...';
  try{
    var response=await postAction(endpoint,payload);
    var detail=await response.text();
    if(!response.ok){ msg.textContent='action failed: '+(detail||response.status); return; }
    msg.textContent=a==='start-cockpit'?'action started successfully: '+a:'action completed successfully: '+a;
  }catch(e){ msg.textContent='action failed: '+String(e&&e.message||e); return; }
  setTimeout(function(){document.getElementById('actionMsg').textContent='';refreshStatus();if(currentTab==='models')loadModels()},2500);
}

// Rows are addressed by index into modelsCache, never by interpolating raw
// path/modelKey strings into onclick attributes — avoids any quoting hazard.
var modelsCache=[];
async function loadModel(i){
  var row=modelsCache[i]; if(!row) return;
  var ctxInput=document.getElementById('loadctx-'+i);
  var ctx=ctxInput?parseInt(ctxInput.value,10):131072;
  if(!ctx||ctx<512) ctx=131072;
  if(ctx>=200000&&!confirm('Load '+row.modelKey+' with '+ctx.toLocaleString()+' context tokens? This huge context can consume substantial memory.')) return;
  var msg=document.getElementById('actionMsg');
  msg.textContent='loading '+row.modelKey+' (ctx '+ctx+')...';
  try{
    var response=await postAction('/api/action/load-model',{path:row.path,modelKey:row.modelKey,ctx:ctx});
    var detail=await response.text();
    if(!response.ok){ msg.textContent='load failed: '+(detail||response.status); return; }
    msg.textContent='loaded successfully: '+row.modelKey;
  }catch(e){ msg.textContent='load failed: '+String(e&&e.message||e); return; }
  setTimeout(function(){document.getElementById('actionMsg').textContent='';loadModels();refreshStatus()},3000);
}
async function unloadModel(i){
  var row=modelsCache[i]; if(!row||!row.identifier) return;
  if(!confirm('Unload exactly '+row.identifier+'? Sessions using it will reload it from disk on their next request.')) return;
  var msg=document.getElementById('actionMsg');
  msg.textContent='unloading '+row.identifier+'...';
  try{
    var response=await postAction('/api/action/unload-model',{identifier:row.identifier});
    var detail=await response.text();
    if(!response.ok){ msg.textContent='unload failed: '+(detail||response.status); return; }
    msg.textContent='unloaded successfully: '+row.identifier;
  }catch(e){ msg.textContent='unload failed: '+String(e&&e.message||e); return; }
  setTimeout(function(){document.getElementById('actionMsg').textContent='';loadModels();refreshStatus()},2500);
}
function showLoadRow(i){
  var el=document.getElementById('loadrow-'+i);
  if(el) el.style.display=(el.style.display==='none'?'flex':'none');
}

// ── master status strip ──
function computeLights(s){
  var lights={};
  // HARNESS — failed fibers are always actionable (red); a stuck transition
  // (>60s on the same LOADING/UNLOADING/RELOADING phase) is also an alarm
  // (amber). Plain "waiting" (no dependency yet) and ordinary in-flight
  // transitions are BENIGN and never trip this light.
  // A stalled session outranks every other harness condition: it is the state
  // this console previously reported as healthy for 4h41m (2026-08-20) while
  // the operator waited on a run that was already dead.
  var stalled=s.stalledSessions||{count:0,items:[]};
  if(stalled.count){
    lights.HARNESS={level:'r',cause:stalled.count+' session(s) claim to be running but have not advanced: '+
      (stalled.items||[]).map(function(x){return '"'+(x.title||x.id)+'" idle '+fmtDur(x.stalledMs)}).join('; ')+
      ' — no durable session activity; investigate before stopping'};
  }
  else if(!s.services.cockpit) lights.HARNESS={level:'r',cause:'cockpit :3080 is down'};
  else if(s.dshData&&(s.dshData.cacheState==='stale'||s.dshData.cacheState==='unavailable')) {
    lights.HARNESS={level:'a',cause:'DSH inventory is '+s.dshData.cacheState+(s.dshData.error?': '+s.dshData.error:'')};
  }
  else if(s.plugins&&(s.plugins.cacheState==='stale'||s.plugins.cacheState==='unavailable')) {
    lights.HARNESS={level:'a',cause:'plugin inventory is '+s.plugins.cacheState+(s.plugins.refreshError?': '+s.plugins.refreshError:'')};
  }
  else if(s.plugins&&s.plugins.failed>0) {
    lights.HARNESS={level:'r',cause:s.plugins.failed+' plugin(s) failed: '+(s.plugins.failedList||[]).join(', ')};
  } else if(s.plugins&&s.plugins.stuck>0) {
    lights.HARNESS={level:'a',cause:(s.plugins.stuckList||[]).join('; ')};
  } else if(s.presets&&s.presets.some(function(p){return p.broken})) {
    lights.HARNESS={level:'a',cause:'a preset is broken'};
  } else if(s.contextPressure&&s.contextPressure.worstPct>=85) {
    lights.HARNESS={level:'a',cause:'session "'+s.contextPressure.worstTitle+'" is '+s.contextPressure.worstPct+'% through its context window — large single emissions will truncate; start a fresh session for big generations'};
  } else lights.HARNESS={level:'g',cause:null};
  // MODELS
  var unknownResident=(s.fleet&&s.fleet.unknownOriginResident)||[];
  var unknownGenerating=(s.fleet&&s.fleet.unknownOriginGenerating)||[];
  var localGenerating=s.models.some(function(m){return m.originKind==='local'&&m.status==='generating'});
  if(s.routeRuntime&&s.routeRuntime.configured&&s.routeRuntime.runtime==='ollama'&&!s.ollama.ok) lights.MODELS={level:'r',cause:'Ollama inventory unavailable: '+s.ollama.error};
  else if(!s.services.lmsCli&&!s.ollama.ok) lights.MODELS={level:'r',cause:'lms CLI failed'};
  else if(s.routeRuntime&&s.routeRuntime.configError) lights.MODELS={level:'r',cause:'configured route cannot be read: '+s.routeRuntime.configError};
  else if(s.routeRuntime&&s.routeRuntime.ambiguous) lights.MODELS={level:'r',cause:'configured route matches multiple resident models; routing is ambiguous'};
  else if(s.models.length===0&&s.routeRuntime&&s.routeRuntime.residencyApplicable===false) lights.MODELS={level:'g',cause:'remote route; no local model required (provider availability is not tested)'};
  else if(s.models.length===0) lights.MODELS={level:'a',cause:'zero models loaded'};
  else if(s.routeRuntime&&s.routeRuntime.residencyApplicable&&s.routeRuntime.configured&&!s.routeRuntime.exactResident) lights.MODELS={level:'a',cause:s.routeRuntime.warning||'configured local route is not resident'};
  else if(s.models.some(function(m){return m.context>=200000})) lights.MODELS={level:'a',cause:'a loaded model has context \u2265 200K (silent-huge-context trap)'};
  else if(s.brainConfigMismatch) lights.MODELS={level:'a',cause:s.brainConfigMismatch};
  else if(unknownGenerating.length&&localGenerating) lights.MODELS={level:'a',cause:'fleet contention: unknown-origin model generating alongside a local model \u2014 '+unknownGenerating.join(', ')};
  else lights.MODELS={level:'g',cause:null};
  // Informational-only: an unknown-origin model just being resident (loaded
  // but not necessarily generating) is not itself an alarm \u2014 surface it in
  // the alarm line so it's never a silent mystery, without tripping amber.
  if(unknownResident.length) lights.MODELS.info='fleet load resident: '+unknownResident.join(', ');
  // MEMORY
  if(!s.gpu||!s.gpu.ok) lights.MEMORY={level:'a',cause:'GPU memory counters unavailable'};
  else if(s.ram.freeGiB<3) lights.MEMORY={level:'r',cause:'Windows free RAM '+s.ram.freeGiB+' GiB < 3 GiB'};
  else if(s.gpu.sharedGiB>8) lights.MEMORY={level:'a',cause:'GPU shared usage '+s.gpu.sharedGiB+' GiB > 8 GiB (above shared-memory warning threshold; allocation owner and leak status unknown)'};
  else if(s.ram.freeGiB<6) lights.MEMORY={level:'a',cause:'Windows free RAM '+s.ram.freeGiB+' GiB < 6 GiB'};
  else lights.MEMORY={level:'g',cause:null};
  // "MEMORY" meant machine RAM here but the model store on the tab bar - four
  // uses of one word. This light is about RAM; renamed at render time.
  // DISK
  if(!s.disk.ok) lights.DISK={level:'a',cause:'disk read failed'};
  else if(s.disk.freeGB<50) lights.DISK={level:'r',cause:'disk free '+s.disk.freeGB+' GB < 50 GB'};
  else if(s.disk.freeGB<150) lights.DISK={level:'a',cause:'disk free '+s.disk.freeGB+' GB < 150 GB'};
  else lights.DISK={level:'g',cause:null};
  // CONTEXT — the strip claimed "all systems nominal" while a session sat at
  // 95% of its window, i.e. one large reply away from silent truncation. The
  // banner must cover what the Sessions tab actually watches.
  var cp=s.contextPressure;
  if(!cp) lights.CONTEXT={level:'g',cause:null};
  else if(cp.worstPct>=85) lights.CONTEXT={level:'r',cause:'session "'+cp.worstTitle+'" at '+cp.worstPct+'% of its context window — a large reply will truncate; start a fresh session for big work'};
  else if(cp.worstPct>=70) lights.CONTEXT={level:'a',cause:'session "'+cp.worstTitle+'" at '+cp.worstPct+'% of its context window'};
  else lights.CONTEXT={level:'g',cause:null};
  // STREAM
  lights.STREAM=s.jobs.streamConnected?{level:'g',cause:null}:{level:'a',cause:'events WebSocket disconnected'};
  // STORE — persistent model memory is distinct from machine RAM.  Missing is
  // amber (feature unavailable); malformed/unreadable is red (configured data
  // cannot be trusted).
  var memory=s.memory||{};
  var writer=memory.writer||{};
  var task=memory.snapshotTask||{};
  var snapshots=memory.snapshots||{};
  if(!memory.ok&&/not configured/i.test(memory.error||'')) lights.STORE={level:'a',cause:'persistent model memory is not configured'};
  else if(!memory.ok) lights.STORE={level:'r',cause:'persistent model memory failed: '+(memory.error||'unknown error')};
  else if(writer.cacheState!=='current') lights.STORE={level:'a',cause:'memory-writer plugin state is '+(writer.cacheState||'unavailable')};
  else if(!writer.configured||!writer.active) lights.STORE={level:'a',cause:'memory-writer plugin is not active'};
  else if(task.error||task.definitionValid!==true) lights.STORE={level:'r',cause:task.error||'memory snapshot task definition does not match the stock Halo paths'};
  else if(!task.configured) lights.STORE={level:'a',cause:'hourly memory snapshot task is not configured'};
  else if(!/^(?:Ready|Running)$/i.test(task.state||'')) lights.STORE={level:'a',cause:'memory snapshot task state is '+(task.state||'unknown')};
  else if(!snapshots.ok) lights.STORE={level:'a',cause:'memory snapshots are '+(snapshots.error||'unavailable')};
  else if(snapshots.overdue) lights.STORE={level:'a',cause:'hourly memory snapshots are overdue'};
  else lights.STORE={level:'g',cause:null};
  // CONFIG — a successful validation is evidence only while it is current.
  var val=s.validation||{};
  var freshness=val.freshness||{state:'never'};
  if(val.ok===false) lights.CONFIG={level:'r',cause:'configuration validation found issues'};
  else if(freshness.state==='stale') lights.CONFIG={level:'a',cause:'configuration validation is stale'};
  else if(freshness.state==='never'||val.ok==null) lights.CONFIG={level:'a',cause:'configuration has not been validated'};
  else lights.CONFIG={level:'g',cause:null};
  return lights;
}
var lightTab={HARNESS:'overview',MODELS:'models',MEMORY:'system',STORE:'memory',DISK:'system',CONTEXT:'sessions',STREAM:'overview',CONFIG:'system'};
function renderStrip(s){
  var lights=computeLights(s);
  var order=['HARNESS','MODELS','MEMORY','STORE','CONTEXT','DISK','STREAM','CONFIG'];
  var worst=null, cause=null, info=null;
  order.forEach(function(name){
    var lv=lights[name].level;
    if(lv==='r'&&worst!=='r'){worst='r';cause=name+': '+lights[name].cause}
    else if(lv==='a'&&worst==null){worst='a';cause=name+': '+lights[name].cause}
    else if(lv==='a'&&worst==='a'&&!cause){cause=name+': '+lights[name].cause}
    if(lights[name].info&&!info) info=name+': '+lights[name].info;
  });
  // Display names: "MEMORY" collided with the Memory tab (the model store)
  // while meaning machine RAM. Say RAM.
  var labelOf={MEMORY:'RAM'};
  var html=order.map(function(name){
    var l=lights[name];
    return '<button type="button" class="light-item" title="'+esc(l.cause||name+' nominal')+'" onclick="location.hash=\\'#'+lightTab[name]+'\\'"><span class="light '+l.level+'"></span><span class="light-label">'+(labelOf[name]||name)+'</span></button>';
  }).join('');
  var alarmCls=worst?' bad':(info?' info':'');
  // Scope the reassurance to what is actually watched, so "nominal" is a
  // checkable claim rather than a blanket one.
  var alarmTxt=worst?cause:(info?info:'Nominal on all eight watched signals');
  html+='<span class="alarm'+alarmCls+'">'+esc(alarmTxt)+'</span>';
  document.getElementById('strip').innerHTML=html;
}

// ── overview ──
// Loader-derived button labels. These buttons live on the MODELS tab, so
// setting them from the overview renderer left them unlabelled unless you
// happened to visit Overview first - call this from the status poll instead,
// which runs on every tab.
function applyLoaderLabels(s){
  if(!s) return;
  var lb=document.getElementById('btn-load-brain'), lw=document.getElementById('btn-load-worker');
  if(lb&&s.loaders&&s.loaders.brain) lb.textContent='Load Brain ('+s.loaders.brain+')';
  if(lw&&s.loaders&&s.loaders.worker) lw.textContent='Load Worker ('+s.loaders.worker+')';
  // "Brain" and "Worker" are slot names with no meaning on a screen that only
  // shows a flat model list. Say who currently occupies each slot, so the
  // button has a visible target instead of being magic.
  var slots=document.getElementById('model-slots');
  if(slots){
    var local=(s.models||[]).filter(function(m){return m.originKind==='local'});
    var brain=s.residentRoles&&s.residentRoles.brain||null;
    var worker=s.residentRoles&&s.residentRoles.worker||null;
    var say=function(label,m){
      return '<span class="slot"><b>'+label+'</b> '+(m
        ? '<span class="mono">'+esc(m.identifier)+'</span> <span class="mut">'+(m.quant||'')+' &middot; ctx '+(m.context||0).toLocaleString()+'</span>'
        : '<span class="mut">empty</span>')+'</span>';
    };
    var route=s.routeRuntime||{};
    var routeHtml='<span class="slot"><b>Configured DSH route:</b> <span class="mono">'+esc(route.configured||'not declared')+'</span>'+
      (route.warning?' <span class="badge badge-amber">'+esc(route.warning)+'</span>'
        :(route.configured&&route.residencyApplicable===false?' <span class="badge">'+esc(route.executionLocation||'remote route')+'; local residency N/A</span>':''))+'</span>';
    var others=((s.residentRoles&&s.residentRoles.other)||[]).map(function(m){return '<span class="mono">'+esc(m.identifier)+' ('+esc(m.provider||'LM Studio')+') ctx '+(m.context||0).toLocaleString()+' &middot; '+(m.gb||0)+' GB</span>';}).join(', ');
    slots.innerHTML=routeHtml+say('Resident Brain:',brain)+say('Resident Worker:',worker)+
      (others?'<span class="slot"><b>Other resident:</b> '+others+'</span>':'')+
      '<span class="mut">resident '+local.length+' &middot; '+local.reduce(function(t,m){return t+(m.gb||0)},0).toFixed(1)+' GB</span>';
  }
}
function renderOverview(s){
  lastStatus=s;
  renderVitalsHead();
  var svcRows=[
    ['Cockpit (:3080)',s.services.cockpit],
    ['LM Studio API (:1234)',s.services.lmstudio],
    ['Ollama API',s.ollama&&s.ollama.ok],
    ['lms CLI',s.services.lmsCli],
  ];
  document.getElementById('ov-services').innerHTML=svcRows.map(function(r){
    return '<div class="row"><span><span class="dot '+(r[1]?'up':'down')+'"></span>'+r[0]+'</span><span class="k '+(r[1]?'':'v-bad')+'">'+(r[1]?'up':'down')+'</span></div>';
  }).join('');
  // State-aware: offering "Start" for a service already up is noise. Version
  // pins live on the System tab; a status card should carry status.
  document.getElementById('ov-svcbtn').innerHTML=
    (s.services.cockpit
      ? '<button type="button" onclick="openDsh()">Open DSH in Chrome</button>'
      : '<button onclick="act(&quot;start-cockpit&quot;)">Start cockpit</button>')+
    (s.services.engineChanged?' <span class="badge badge-amber">engine changed since last look</span>':'');

  // ── hero state line ──────────────────────────────────────────────────
  // Three cards used to report zeros while another reported a decode rate,
  // which reads as broken data. One sentence reconciles them.
  var running=s.sessions.filter(function(x){return x.running});
  var genModels=s.models.filter(function(m){return m.status==='generating'});
  var latest=s.latestCompletedRun||null;
  var localRes=s.models.filter(function(m){return m.originKind==='local'});
  var hero='',cls='idle',word='IDLE';
  // P6: never state a liveness word this screen has not corroborated. With
  // LM Studio stopped the hero used to read "IDLE ... qwen resident - ctx 131,072"
  // while Services said "down" on the same screen -- a model cannot be resident
  // when the process that would hold it is not running. IDLE means "up and
  // waiting"; a dead brain is DOWN.
  if(!s.services.cockpit){ cls='down'; word='COCKPIT DOWN'; }
  else if(!s.services.lmstudio&&!(s.ollama&&s.ollama.ok)){ cls='down'; word='MODEL SERVICES DOWN'; }
  else if(genModels.length||running.length||s.jobs.active.length){ cls='busy'; word='WORKING'; }
  hero='<span class="st '+cls+'">'+word+'</span>';
  if(cls==='busy'){
    var bits=[];
    if(genModels.length) bits.push(genModels.map(function(m){return esc(m.identifier)}).join(', ')+' generating');
    if(running.length) bits.push(running.length+' session'+(running.length>1?'s':'')+' running');
    if(s.jobs.active.length) bits.push(s.jobs.active.length+' job'+(s.jobs.active.length>1?'s':''));
    hero+='<span>'+bits.join(' &middot; ')+'</span>';
  } else if(cls==='idle'){
    hero+='<span class="mut">last inference '+(latest?fmtRel(latest.mtime):'not yet this boot')+'</span>';
  }
  hero+='<span class="mut">'+(!s.services.lmstudio&&!(s.ollama&&s.ollama.ok)
    ? 'nothing can be resident &mdash; LM Studio (:1234) is down; any model shown below is last-known, not live'
    : (localRes.length
        ? localRes.map(function(m){return esc(m.identifier)+' ('+esc(m.provider||'LM Studio')+') resident &middot; ctx '+(m.context||0).toLocaleString()}).join(' &nbsp;|&nbsp; ')
        : 'no local model resident'))+'</span>';
  if(s.jobs.queuedInputs) hero+='<span class="v-warn">'+s.jobs.queuedInputs+' queued</span>';
  document.getElementById('ov-hero').innerHTML=hero;

  var winPct=Math.min(100,Math.round(s.ram.usedGiB/s.ram.totalGiB*100));
  var gpuOk=!!(s.gpu&&s.gpu.ok);
  var haveCarve=gpuOk&&s.gpu.carveoutGiB!=null;
  var gpuPct=haveCarve?Math.min(100,Math.round(s.gpu.dedicatedGiB/s.gpu.carveoutGiB*100)):0;
  var sharedCls=gpuOk?(s.gpu.sharedGiB>8?'v-bad':(s.gpu.sharedGiB>3?'v-warn':'')):'';
  // A 95%-full bar used to look identical to a 40% one - colour by proximity
  // to the limit so the gauge itself carries the warning.
  var barCls=function(pct){return pct>=95?'red':(pct>=80?'amber':'')};
  var freeCls=s.ram.freeGiB<6?'v-bad':(s.ram.freeGiB<12?'v-warn':'');
  // Proportion lives here; the vitals strip owns the trend and the raw
  // current levels, so this card shows capacity relationships only.
  var gpuRows=gpuOk
    ? ('<div class="row" style="margin-top:8px"><span class="k">GPU carveout</span><span class="'+(gpuPct>=95?'v-bad':(gpuPct>=80?'v-warn':''))+'">'+(haveCarve?gpuPct+'% used of '+s.gpu.carveoutGiB+' GiB':'capacity unknown')+'</span></div>'+
       (haveCarve?'<div class="bar '+barCls(gpuPct)+'"><i style="width:'+gpuPct+'%"></i></div>':'')+
       '<div class="row" style="margin-top:8px"><span class="k">GPU shared</span><span class="'+sharedCls+'">'+s.gpu.sharedGiB+' GiB'+(sharedCls?' &mdash; elevated usage':'')+'</span></div>'+
       '<div class="mut" style="margin-top:2px">Adapter-wide usage across processes. Shared GPU memory can include application buffers and desktop allocations. The 8 GiB warning threshold is not a capacity limit; high usage alone does not establish a memory leak.</div>')
    : '<div class="v-warn" style="margin-top:8px">GPU memory counters unavailable'+(s.gpu&&s.gpu.error?': '+esc(s.gpu.error):'')+'; no usage value is asserted</div>';
  document.getElementById('ov-pools').innerHTML=
    '<div class="row"><span class="k">Windows pool</span><span class="'+freeCls+'">'+s.ram.freeGiB+' GiB free of '+s.ram.totalGiB+'</span></div>'+
    '<div class="bar '+barCls(winPct)+'"><i style="width:'+winPct+'%"></i></div>'+
    gpuRows;

  var due=s.memory||{};
  var snapshots=due.snapshots||{};
  var dueTxt=snapshots.nextExpectedAt
    ? (snapshots.overdue?'overdue by '+fmtDur(Math.max(0,(snapshots.ageMs||0)-3600000)):fmtStamp(snapshots.nextExpectedAt))
    : 'no snapshot recorded';
  var validation=s.validation||{};
  var validationFreshness=validation.freshness||{state:'never'};
  var validationTxt=validationFreshness.state==='never'
    ? '<span class="v-warn">never run</span>'
    : (validationFreshness.state==='stale'
      ? '<span class="v-warn">stale</span> &middot; '+fmtStamp(validation.when)
      : (validation.ok
        ? '<span style="color:var(--green)">ok</span> &middot; '+fmtStamp(validation.when)
        : '<span class="v-bad">issues</span> &middot; '+fmtStamp(validation.when)));
  document.getElementById('ov-cadence').innerHTML=
    '<div class="row"><span class="k">last memory snapshot</span><span>'+(snapshots.lastSnapshotAt?fmtStamp(snapshots.lastSnapshotAt):'&mdash;')+'</span></div>'+
    '<div class="row"><span class="k">next snapshot expected</span><span class="'+(snapshots.overdue?'v-warn':'')+'">'+esc(dueTxt)+'</span></div>'+
    '<div class="row"><span class="k">snapshots retained</span><span>'+(snapshots.count||0)+'</span></div>'+
    '<div class="row"><span class="k">engine</span><span>'+esc(s.services.engine||'unknown')+'</span></div>'+
    '<div class="row"><span class="k">last config validation</span><span>'+validationTxt+'</span></div>';

  // Activity: what used to be two half-empty cards (Today + Throughput),
  // with the hairline sparkline dropped since the vitals strip owns trend.
  var tpsCls=latest&&latest.decodeTps<18?'v-warn':'';
  var activeSessions=(s.sessions||[]).filter(function(session){return session.running;});
  var activeModels=activeSessions.map(function(session){
    return '<span title="'+esc(session.title||session.sessionId||'')+'">'+esc(session.model||'awaiting model output')+'<br><span class="mut">'+esc(session.provider||'provider not yet recorded')+'</span></span>';
  }).join('<br>');
  var live=(s.liveDecode||[]).find(function(row){return row.state==='streaming'})||(s.liveDecode||[])[0];
  var liveText=live&&live.state==='streaming'
    ? live.charsPerS+' chars/s <span class="mut">'+esc(live.title)+'; rolling text flow</span>'
    : '<span class="mut">'+(live?'waiting for model output':'no active session')+'</span>';
  var measured=s.recentMeasuredDecode||null;
  var engineLive=s.liveEngineDecode||[];
  var engineRecent=s.recentLiveEngineDecode||null;
  var engineLiveText=engineLive.length
    ? engineLive.map(function(row){return row.tps+' t/s <span class="mut">'+esc(row.model)+'; '+row.tokens+' tokens / '+(row.intervalMs/1000).toFixed(1)+'s</span>';}).join('<br>')
    : (engineRecent
      ? engineRecent.tps+' t/s <span class="mut">last live sample '+fmtRel(engineRecent.at)+'; '+esc(engineRecent.model)+'</span>'
      : '<span class="mut">waiting for active local decode</span>');
  var measuredText=measured
    ? measured.tps+' t/s <span class="mut">'+esc(measured.model||measured.title)+'; '+measured.outputTokens+' tokens / '+(measured.decodeMs/1000).toFixed(1)+'s, observed '+fmtRel(measured.at)+'</span>'
    : '<span class="mut">waiting for a completed model step</span>';
  document.getElementById('ov-activity').innerHTML=
    '<div class="row"><span class="k">running now</span><span style="text-align:right;overflow-wrap:anywhere">'+(activeModels||'<span class="mut">no active session</span>')+'</span></div>'+
    '<div class="row"><span class="k">live local decode</span><span style="text-align:right">'+engineLiveText+'</span></div>'+
    '<div class="row"><span class="k">live output flow</span><span style="text-align:right">'+liveText+'</span></div>'+
    '<div class="row"><span class="k">recent measured decode</span><span style="text-align:right">'+measuredText+'</span></div>'+
    '<div class="row"><span class="k">session files updated today</span><span>'+s.today.count+'</span></div>'+
    '<div class="row"><span class="k">cumulative kTok in / out for those sessions</span><span>'+s.today.kTokIn+'K / '+s.today.kTokOut+'K</span></div>'+
    (latest
      ? '<div class="row"><span class="k">latest completed session</span><span style="text-align:right;overflow-wrap:anywhere">'+esc(latest.title||latest.sessionId||'untitled')+'</span></div>'+
        '<div class="row"><span class="k">that session’s last model</span><span style="text-align:right;overflow-wrap:anywhere">'+esc(latest.model||'unknown')+'<br><span class="mut">'+esc(latest.provider||'unknown provider')+'</span></span></div>'+
        '<div class="row"><span class="k">completed-run decode</span><span class="'+tpsCls+'">'+latest.decodeTps+' t/s <span class="mut">session aggregate</span></span></div>'+
        '<div class="row"><span class="k">TTFT, latest completed session</span><span>'+(latest.ttftS!=null?latest.ttftS+'s':'&mdash;')+'</span></div>'
      : '<div class="row"><span class="k">completed-run decode</span><span class="mut">no completed run with stats yet</span></div>');

  var dFree=s.disk.ok?s.disk.freeGB:null;
  var diskCls=dFree==null?'':(dFree<50?'v-bad':(dFree<150?'v-warn':''));
  var diskPct=s.disk.ok&&s.disk.totalGB?Math.round(s.disk.usedGB/s.disk.totalGB*100):0;
  document.getElementById('ov-disk').innerHTML=s.disk.ok?
    '<div class="row"><span class="k">free</span><span class="'+diskCls+'">'+s.disk.freeGB+' GB</span></div>'+
    '<div class="bar '+(diskCls==='v-bad'?'red':(diskCls==='v-warn'?'amber':''))+'"><i style="width:'+diskPct+'%"></i></div>'+
    '<div class="row" style="margin-top:8px"><span class="k">used / total</span><span>'+s.disk.usedGB+' / '+s.disk.totalGB+' GB</span></div>'+
    '<div class="mut" style="margin-top:2px">models and session logs live here</div>'
    : '<div class="mut">disk read failed</div>';

  var mem=s.memory||{};
  var memCls=mem.entities>=mem.tripwire?'v-warn':'';
  document.getElementById('ov-knowledge').innerHTML=mem.ok
    ? ('<div class="row"><span class="k">entities</span><span class="'+memCls+'">'+mem.entities+' / '+mem.tripwire+' tripwire</span></div>'+
       '<div class="row"><span class="k">graph</span><span><a href="#memory" onclick="showTab(&quot;memory&quot;)">open the memory graph</a></span></div>'+
       '<div class="mut" style="margin-top:2px">what the local models remember across sessions</div>')
    : '<div class="mut">memory graph '+esc(mem.error||'unavailable')+' &mdash; no zero count is asserted</div>';

  var fc=s.fleet||{};
  var ac=fc.accountCache||{};
  var fleetHtml='';
  if(!ac.ok){
    fleetHtml+='<div class="row"><span class="k">LM Link account</span><span class="mut">cache file missing &mdash; degraded, not a fake zero</span></div>';
  } else {
    fleetHtml+='<div class="row"><span class="k">account status</span><span>'+esc(ac.accountStatus||'unknown')+'</span></div>';
    fleetHtml+='<div class="row"><span class="k">devices allowed</span><span>'+(ac.currentDeviceCount!=null?ac.currentDeviceCount:'&mdash;')+' / '+(ac.maxDevicesAllowed!=null?ac.maxDevicesAllowed:'&mdash;')+'</span></div>';
    fleetHtml+='<div class="row"><span class="k">account cache</span><span'+(ac.freshness&&ac.freshness.state==='stale'?' class="v-warn"':'')+'>'+esc((ac.freshness&&ac.freshness.state)||'unknown')+(ac.mtimeMs?' &middot; '+fmtRel(ac.mtimeMs):'')+'</span></div>';
  }
  fleetHtml+='<div class="row"><span class="k">this device</span><span>'+(fc.linkOk?esc(fc.deviceName||'unknown'):'<span class="mut">lms link status unavailable</span>')+'</span></div>';
  var peers=fc.peers||[];
  fleetHtml+='<div class="row"><span class="k">connected peers</span><span>'+peers.length+'</span></div>';
  fleetHtml+=peers.map(function(p){
    return '<div class="row"><span>'+esc(p.deviceName)+'</span><span class="k">'+esc(p.status||'?')+(p.loadedModels&&p.loadedModels.length?' &middot; '+p.loadedModels.map(esc).join(', '):'')+'</span></div>';
  }).join('');
  var pool=fc.pool||[];
  fleetHtml+='<div class="mut" style="margin-top:8px;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em">Resident pool'
    +(!s.services.lmstudio?' <span class="badge badge-amber">LM Studio unavailable; Ollama listed independently</span>':'')+'</div>';
  // P6: with the brain down these rows are a cached snapshot, not live state.
  // Labelling them keeps the card from asserting residency nothing verified.
  fleetHtml+= pool.length? pool.map(function(m){
    var badgeCls= m.originKind==='unknown'?'badge-amber':(m.originKind==='device'?'badge-teal':'badge-mut');
    return '<div class="row"><span class="mono">'+esc(m.identifier)+'</span><span class="k">'+esc(m.status||'')+' <span class="badge '+badgeCls+'">'+esc(m.origin)+'</span></span></div>';
  }).join('') : '<div class="mut">no models resident</div>';
  document.getElementById('ov-fleet').innerHTML=fleetHtml;
}
// ── Machine vitals: the console's only view with a TIME axis ──────────
// Every other card is a point-in-time reading, which cannot answer "is this
// getting worse?". The 60s history has been collected since day one and was
// rendered as a 220px sparkline; this spends it properly. Series chosen for
// what actually goes wrong on this box: GPU dedicated (what models occupy),
// GPU shared stacked on top (the OOM leak signature — it must stay a sliver),
// and decode t/s (the felt speed) on its own axis.
var vitalsHours=6, vitalsRows=[];
function setVitalsRange(h){
  vitalsHours=h;
  var btns=document.querySelectorAll('.vrange button');
  for(var i=0;i<btns.length;i++){ btns[i].className=(Number(btns[i].getAttribute('data-vh'))===h?'on':''); }
  loadVitals();
}
async function loadVitals(){
  try{
    var r=await (await fetch('/api/history?hours='+vitalsHours)).json();
    vitalsRows=r.rows||[];
    renderVitals();
  }catch(e){ document.getElementById('ov-vitals').innerHTML='<div class="mut">history unavailable</div>'; }
}
// Round tick steps (1/2/5 x 10^n) with padding, so axes read as designed
// rather than as max-divided-by-four artifacts. zeroFloor keeps series that
// cannot go negative (shared pool, decode rate) anchored at 0.
function niceScale(lo,hi,zeroFloor){
  if(!isFinite(lo)||!isFinite(hi)) { lo=0; hi=1; }
  if(hi-lo<1e-9){ hi=lo+Math.max(Math.abs(lo)*0.05,1); }
  var pad=(hi-lo)*0.18; lo-=pad; hi+=pad;
  if(zeroFloor&&lo<0) lo=0;
  var raw=(hi-lo)/3;
  var mag=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10));
  var norm=raw/mag;
  var step=(norm<1.5?1:norm<3.5?2:norm<7.5?5:10)*mag;
  return { lo:Math.floor(lo/step)*step, hi:Math.ceil(hi/step)*step, step:step };
}
function fmtClock(ms,span){
  var d=new Date(ms);
  var hh=('0'+d.getHours()).slice(-2), mm=('0'+d.getMinutes()).slice(-2);
  if(span>36*3600000) return (d.getMonth()+1)+'/'+d.getDate()+' '+hh+':00';
  return hh+':'+mm;
}
function renderVitals(){
  var el=document.getElementById('ov-vitals'), rows=vitalsRows;
  renderVitalsHead();
  if(rows.length<2){ el.innerHTML='<div class="mut">not enough history in this range &mdash; vitals sample every 60 s</div>'; return; }
  // Three separate strips, each auto-fitted to its OWN data range, sharing one
  // time axis. The first version zero-based everything on one scale: GPU
  // dedicated at 27 of a 35 ceiling drew a featureless slab, the 1.5 GiB
  // shared trace lived in the bottom 4% where a multi-GiB leak is sub-pixel,
  // and the second axis put decode at the same pixel height as the memory
  // edge. This panel's job is VARIATION, not level - never zero-base a leak
  // watch.
  var W=1000,H=250,L=56,R=950;
  var strips=[
    {key:'gpuDed', label:'GPU dedicated', unit:'GiB', color:'#4fd8c4', top:14,  bot:76,  fill:true},
    {key:'gpuShared', label:'GPU shared', unit:'GiB', color:'#ffc86b', top:90,  bot:140, fill:true, danger:8},
    {key:'decodeTps', label:'measured decode', unit:'t/s', color:'#6ea8ff', top:154, bot:206, fill:false}
  ];
  var t0=rows[0].t, t1=rows[rows.length-1].t, span=(t1-t0)||1;
  var x=function(t){return L+((t-t0)/span)*(R-L)};
  var body='',i;
  strips.forEach(function(st){
    var vals=rows.map(function(r){return r[st.key]}).filter(function(v){return v!=null});
    var lo=vals.length?Math.min.apply(null,vals):0, hi=vals.length?Math.max.apply(null,vals):1;
    var sc=niceScale(lo,hi,st.key==='gpuShared'||st.key==='decodeTps');
    // Reserve a header band so a high value cannot draw through the label.
    var plotTop=st.top+18;
    var y=function(v){return st.bot-((v-sc.lo)/(sc.hi-sc.lo))*(st.bot-plotTop)};
    st._y=y; st._sc=sc;
    // gridlines + rounded tick labels (the old auto-scale printed 9/17/26/35,
    // which reads as broken rather than designed)
    for(var v=sc.lo; v<=sc.hi+1e-9; v+=sc.step){
      var gy=y(v);
      body+='<line x1="'+L+'" y1="'+gy.toFixed(1)+'" x2="'+R+'" y2="'+gy.toFixed(1)+'" stroke="#1b2f47"/>'+
        '<text x="'+(L-7)+'" y="'+(gy+3.5).toFixed(1)+'" fill="#6d8299" font-size="9.5" text-anchor="end">'+
        (sc.step<1?v.toFixed(1):v.toFixed(0))+'</text>';
    }
    if(st.danger!=null&&sc.hi>=st.danger){
      body+='<line x1="'+L+'" y1="'+y(st.danger).toFixed(1)+'" x2="'+R+'" y2="'+y(st.danger).toFixed(1)+'" stroke="#ff6b6b" stroke-dasharray="4 4" stroke-opacity=".8"/>';
    }
    // Break the trace wherever the series has no sample, rather than drawing
    // a straight line across time when nothing ran.
    var segs=[],cur=[];
    rows.forEach(function(r){
      if(r[st.key]==null){ if(cur.length) segs.push(cur); cur=[]; return; }
      cur.push([x(r.t),y(r[st.key])]);
    });
    if(cur.length) segs.push(cur);
    segs.forEach(function(sg){
      // Decode is a sparse settled-step or completed-run observation, not a continuous live
      // rate. Dots make that distinction visible even for adjacent samples.
      if(st.key==='decodeTps'){
        sg.forEach(function(p){body+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.8" fill="'+st.color+'"/>';});
        return;
      }
      var pts=sg.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1)}).join('L');
      if(st.fill&&sg.length>1){
        body+='<path d="M'+pts+'L'+sg[sg.length-1][0].toFixed(1)+','+st.bot+'L'+sg[0][0].toFixed(1)+','+st.bot+'Z" fill="'+st.color+'" fill-opacity=".13"/>';
      }
      body+=(sg.length>1)
        ? '<path d="M'+pts+'" fill="none" stroke="'+st.color+'" stroke-width="1.7" stroke-linejoin="round"/>'
        : '<circle cx="'+sg[0][0].toFixed(1)+'" cy="'+sg[0][1].toFixed(1)+'" r="2" fill="'+st.color+'"/>';
    });
    var cv=vals.length?vals[vals.length-1]:null;
    body+='<text x="'+(L+4)+'" y="'+(st.top+11)+'" fill="'+st.color+'" font-size="10.5">'+st.label+
      ' <tspan fill="#6d8299">'+st.unit+'</tspan>'+
      (cv!=null?' <tspan fill="#dcecff">'+cv+'</tspan>':' <tspan fill="#6d8299">no samples</tspan>')+'</text>';
  });
  var xlab='';
  for(i=0;i<=4;i++){
    var tt=t0+span*i/4;
    xlab+='<text x="'+x(tt).toFixed(0)+'" y="'+(H-8)+'" fill="#6d8299" font-size="9.5" text-anchor="middle">'+fmtClock(tt,span)+'</text>';
  }
  el.innerHTML=
    '<div style="position:relative">'+
    '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block" id="vitals-svg">'+
      body+xlab+
      '<line id="vx" x1="0" y1="14" x2="0" y2="206" stroke="#8fb6d6" stroke-dasharray="3 3" style="display:none"/>'+
      '<rect x="'+L+'" y="14" width="'+(R-L)+'" height="192" fill="transparent" id="vhit"/>'+
    '</svg><div class="vtip" id="vtip"></div></div>';
  var svg=document.getElementById('vitals-svg'), hit=document.getElementById('vhit'),
      tip=document.getElementById('vtip'), vx=document.getElementById('vx');
  hit.addEventListener('mousemove',function(ev){
    var box=svg.getBoundingClientRect(), sx=(ev.clientX-box.left)/box.width*W;
    var frac=(sx-L)/(R-L); if(frac<0)frac=0; if(frac>1)frac=1;
    var want=t0+span*frac, best=rows[0], bd=Infinity;
    rows.forEach(function(r){ var d=Math.abs(r.t-want); if(d<bd){bd=d;best=r;} });
    vx.setAttribute('x1',x(best.t)); vx.setAttribute('x2',x(best.t)); vx.style.display='';
    tip.style.display='block';
    tip.style.left=Math.min(Math.max(ev.clientX-box.left-60,0),box.width-190)+'px';
    tip.style.top='6px';
    tip.innerHTML='<b>'+fmtClock(best.t,span)+'</b><br>'+
      'GPU dedicated: '+(best.gpuDed!=null?best.gpuDed+' GiB':'&mdash;')+'<br>'+
      'GPU shared: '+(best.gpuShared!=null?best.gpuShared+' GiB':'&mdash;')+'<br>'+
      'measured decode: '+(best.decodeTps!=null?best.decodeTps+' t/s':'no observation at this time')+'<br>'+
      'Windows free: '+(best.winFree!=null?best.winFree+' GiB':'&mdash;');
  });
  hit.addEventListener('mouseleave',function(){ tip.style.display='none'; vx.style.display='none'; });
}
function renderVitalsHead(){
  var s=lastStatus, head=document.getElementById('ov-vitals-head');
  if(!s){ head.innerHTML=''; return; }
  var last=null;
  for(var i=vitalsRows.length-1;i>=0;i--){ if(vitalsRows[i].decodeTps!=null){ last=vitalsRows[i]; break; } }
  var gpuOk=!!(s.gpu&&s.gpu.ok);
  var sharedCls=gpuOk?(s.gpu.sharedGiB>8?'bad':(s.gpu.sharedGiB>3?'warn':'')):'';
  var freeCls=s.ram.freeGiB<6?'bad':(s.ram.freeGiB<12?'warn':'');
  var worst=s.contextPressure;
  var ctxCls=worst?(worst.worstPct>=85?'bad':(worst.worstPct>=70?'warn':'')):'';
  var gen=s.models.filter(function(m){return m.status==='generating'}).length;
  var liveRates=s.liveEngineDecode||[];
  var liveRate=liveRates.length===1?liveRates[0]:null;
  var lastLive=s.recentLiveEngineDecode||null;
  head.innerHTML=
    '<div class="vstat"><b>'+(liveRate?liveRate.tps:(lastLive?lastLive.tps:'&mdash;'))+'</b><span>'+(liveRate?'live decode t/s · '+esc(liveRate.model):(lastLive?'last live sample · '+fmtRel(lastLive.at):'live decode t/s · waiting'))+'</span></div>'+
    '<div class="vstat"><b>'+(last?last.decodeTps:'&mdash;')+'</b><span>last charted decode t/s</span></div>'+
    '<div class="vstat"><b>'+(gpuOk?s.gpu.dedicatedGiB:'&mdash;')+(gpuOk&&s.gpu.carveoutGiB!=null?' <span class="mut" style="font-size:.62em">/ '+s.gpu.carveoutGiB+'</span>':'')+'</b><span>GPU dedicated GiB</span></div>'+
    '<div class="vstat"><b class="'+sharedCls+'">'+(gpuOk?s.gpu.sharedGiB:'&mdash;')+'</b><span title="~1.5 GiB is the normal floor: Vulkan staging buffers plus the desktop. Growth is the leak signal.">GPU shared GiB (flat ≈ healthy)</span></div>'+
    '<div class="vstat"><b class="'+freeCls+'">'+s.ram.freeGiB+'</b><span>Windows free GiB</span></div>'+
    '<div class="vstat"><b class="'+ctxCls+'">'+(worst?worst.worstPct+'%':'&mdash;')+'</b><span title="running sessions or sessions updated within the last 15 minutes; historical fill remains on the Sessions tab">fullest recent context</span></div>'+
    '<div class="vstat"><b>'+gen+'</b><span>models generating now</span></div>';
}
function sparkSvg(vals){
  var pts=(vals||[]).filter(function(v){return v!=null});
  if(pts.length<2) return '';
  var w=220,h=36,max=Math.max.apply(null,pts),min=Math.min.apply(null,pts);
  var range=(max-min)||1;
  var step=w/(pts.length-1);
  var d=pts.map(function(v,i){var x=i*step,y=h-((v-min)/range)*h; return (i===0?'M':'L')+x.toFixed(1)+','+y.toFixed(1)}).join(' ');
  return '<svg class="spark" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><path d="'+d+'" fill="none" stroke="var(--teal)" stroke-width="1.5"/></svg>';
}

// ── models tab ──
async function loadModels(){
  try{
    var c=await (await fetch('/api/catalog')).json();
    if(c.error){ document.getElementById('models-table').innerHTML='<div class="mut">lms CLI down &mdash; no catalog</div>'; return }
    modelsCache=c.catalog;
    var showFleet=!!(document.getElementById('showFleetModels')&&document.getElementById('showFleetModels').checked);
    var visible=c.catalog.map(function(m,i){return {m:m,i:i}}).filter(function(x){return showFleet||x.m.originKind==='local'});
    if(!visible.length){
      document.getElementById('models-table').innerHTML='<div class="mut">No local models are available in this catalog.</div>';
      document.getElementById('models-footer').textContent='';
      return;
    }
    var rows=visible.map(function(x){
      var m=x.m,i=x.i;
      var ctxBadge=(m.loaded&&m.contextLength>=200000)?' <span class="badge badge-amber">ctx ≥ 200K</span>':'';
      var stateCell=m.loaded?('<span class="dot up"></span>'+esc(m.status||'loaded')+' &middot; '+fmtK(m.contextLength)+' &middot; TTL '+fmtTtl(m.ttlMs,m.lastUsedTime)):'<span class="mut">on disk</span>';
      var originCell=m.originKind==='unknown'
        ? '<span class="badge badge-amber" title="LM Link reported a peer identifier that link status could not resolve">'+esc(m.origin)+'</span>'
        : (m.originKind==='device'
          ? '<span class="badge badge-teal" title="catalog entry belongs to a connected LM Link peer">fleet: '+esc(m.origin)+'</span>'
          : '<span class="badge badge-mut">this device</span>');
      // Classify components before constructing actions. Projectors, embedding
      // models, draft heads and metadata shards are not standalone chat models.
      var kind=/clip|vision/i.test(m.architecture||'')?'vision'
        :/bert|embed/i.test((m.architecture||'')+m.modelKey)?'embedding'
        :/assistant/i.test(m.architecture||'')?'draft head'
        :(m.sizeGB===0?'metadata':null);
      var actionCell=kind?'<span class="mut">component only</span>':(m.loaded?
        (m.originKind==='local'?
          '<button onclick="unloadModel('+i+')">Unload</button>'
          : '<span class="mut" title="This model runs on another LM Link device. Unloading from here would kill it on THAT machine.">runs on '+esc(m.origin||'another device')+'<br><a href="#overview" onclick="showTab(&quot;overview&quot;)">see Fleet &rarr;</a></span>')
        : (m.originKind==='local'
          ? ('<button onclick="showLoadRow('+i+')">Load</button>'+
             '<span id="loadrow-'+i+'" style="display:none;gap:4px;align-items:center;margin-top:4px">'+
             '<label class="mut" for="loadctx-'+i+'">context</label> <input type="number" aria-label="Context length for '+esc(m.displayName||m.modelKey)+'" id="loadctx-'+i+'" value="131072">'+
             '<button onclick="loadModel('+i+')">Confirm</button></span>')
          : '<span class="mut">manage on '+esc(m.origin||'peer')+'</span>'));
      // Two rows titled "Qwen3.8 27B UD" read as a duplicate render, not as
      // two heavy models resident at once. Fold the distinguishing quant into
      // the title so a name can never fail to identify its row.
      var title=esc(m.displayName)+(m.quant&&m.quant!=='?'?' <span class="mut">'+esc(m.quant)+'</span>':'');
      // Not everything in this catalog is a chat model. Loading an embedding,
      // an MTP draft head or a metadata shard is meaningless, and a 0 GB row
      // otherwise reads as corruption.
      var kindTitle=kind==='vision'
        ? 'optional vision projector used with its matching language model for image input; not a standalone chat model'
        : 'not a chat model — a component used by another model';
      var kindBadge=kind?' <span class="badge badge-mut" title="'+kindTitle+'">'+kind+'</span>':'';
      return '<tr>'+
        '<td>'+title+ctxBadge+kindBadge+'<br><span class="mono mut">'+esc(m.modelKey)+'</span></td>'+
        '<td>'+esc(m.architecture||'?')+' / '+esc(m.paramsString||'?')+'</td>'+
        '<td>'+(m.quant==='?'?'<span class="mut" title="LM Studio did not report a quantization for this file">unknown</span>':esc(m.quant))+'</td>'+
        '<td class="num">'+m.sizeGB+' GB</td>'+
        '<td class="num">'+fmtK(m.maxContextLength)+'</td>'+
        '<td>'+stateCell+'</td>'+
        '<td>'+originCell+'</td>'+
        '<td>'+actionCell+'</td>'+
        '</tr>';
    }).join('');
    document.getElementById('models-table').innerHTML='<table class="tbl"><thead><tr><th>Model</th><th>Arch/Params</th><th>Quant</th><th class="num">Size</th><th class="num">Max ctx</th><th>State</th><th>Origin</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table>';
    var localDisk=c.localDiskGiB==null?'unavailable':(c.localDiskGiB+' GiB in '+c.localDiskFiles+' files');
    var mr=lastStatus&&lastStatus.modelRecovery;
    var mrText=mr?(' \\u00b7 Model recovery: '+(mr.monitorError||(!mr.dshUp?'paused (DSH stopped)':Object.keys(mr.roles||{}).map(function(role){var r=mr.roles[role];return role+': '+(mr.suppression[role]?'intentionally unloaded':r.lastError|| (r.pending?'restoring':r.observedResident?'watching':'not resident'));}).join('; ')))):'';
    document.getElementById('models-footer').textContent='this device: '+c.localCount+' addressable entries, '+localDisk+' physically on disk (aliases share base weights) \\u00b7 LM Link peers: '+c.fleetCount+' catalog entries / '+c.fleetCatalogGB+' GB \\u00b7 engine: '+(lastStatus&&lastStatus.services.engine||'unknown')+mrText;
  }catch(e){ document.getElementById('models-table').innerHTML='<div class="mut">catalog fetch failed</div>' }
}

// ── sessions tab ──
var openSession=null;
// The primary meter is the token-meter estimate for the next provider prompt.
// It is intentionally not clamped: a transient overflow is useful evidence.
function ctxCell(s){
  if(s.ctxPct==null) return '<span class="mut">&mdash;</span>';
  // The ramp starts at 50, not 70: by the time a window is 70% full a large
  // emission already may not fit, so the warning has to arrive earlier. The
  // percent is the dominant figure; counts are the supporting line.
  var cls=s.ctxPct>=85?'badge-red':(s.ctxPct>=50?'badge-amber':'badge-mut');
  // NB: this whole UI script lives inside a template literal, which eats one
  // level of backslash — an escaped apostrophe here silently ends the string
  // and breaks the page. Use double quotes, never \\' in this file.
  var title=s.ctxPct>=50?"estimated next provider prompt is near or beyond this context window":"estimated next provider prompt";
  var big=s.ctxPct>=50?'font-size:1.25rem;font-weight:700':'font-size:1.05rem;font-weight:600';
  var col=s.ctxPct>=85?'color:var(--red)':(s.ctxPct>=50?'color:var(--amber)':'color:var(--mut)');
  var delta=s.ctxWindow-s.ctxUsed;
  var capacity=delta>=0?delta.toLocaleString()+' estimated headroom':Math.abs(delta).toLocaleString()+' estimated overflow';
  return '<div style="'+big+';'+col+'" title="'+title+'">'+s.ctxPct+'%</div>'+
    '<div class="mut mono" style="font-size:.75rem">'+capacity+'</div>'+
    '<div class="mut mono" style="font-size:.7rem;opacity:.75">next prompt estimate: '+s.ctxUsed.toLocaleString()+' / '+s.ctxWindow.toLocaleString()+'</div>';
}
async function loadSessions(){
  try{
    var showBug=document.getElementById('showDriveRoot').checked;
    var r=await (await fetch('/api/sessions?all=1')).json();
    var list=r.sessions.filter(function(s){return showBug||!s.driveRootBug});
    // Headline says what matters (how many sessions are near their limit),
    // not which API answered. Sorted by risk so the one about to truncate is
    // the first row, not a hunt through thirty.
    list.sort(function(a,b){ return (b.ctxPct||-1)-(a.ctxPct||-1) || b.mtime-a.mtime; });
    var atRisk=list.filter(function(s){return s.ctxPct!=null&&s.ctxPct>=50});
    document.getElementById('sessions-agg').innerHTML=
      r.today.count+' session file'+(r.today.count===1?'':'s')+' updated today &middot; '+
      (atRisk.length
        ? '<span class="v-warn">'+atRisk.length+' of '+list.length+' over 50% context</span>'
        : 'all sessions under 50% context')+
      ' <span class="mut">&middot; '+r.today.kTokIn+'K in / '+r.today.kTokOut+'K out, cumulative across those sessions &middot; sorted by context risk</span>';
    if(!list.length){
      document.getElementById('sessions-table').innerHTML='<div class="mut">No sessions match the current view.</div>';
      return;
    }
    var rows=list.map(function(s,i){
      var bug=s.driveRootBug?' <span class="badge badge-red">drive-root bug</span>':'';
      var main='<tr>'+
        '<td><button type="button" onclick="toggleSessionDetail('+i+')" style="background:none;border:0;color:inherit;padding:0;text-align:left;cursor:pointer">'+esc(s.title||s.id)+'</button>'+bug+(s.goal?'<br><span class="mut">'+esc(s.goal.slice(0,80))+'</span>':'')+'</td>'+
        '<td>'+esc(s.workspace)+'</td>'+
        '<td>'+esc(s.preset||'—')+'</td>'+
        '<td><b>Next request (saved):</b> '+esc(s.nextSelection ? s.nextSelection.provider+'/'+s.nextSelection.model : 'default at request time')+
        (s.nextSelection&&s.nextSelection.reasoningEffort!=null?' <span class="mut">effort '+esc(s.nextSelection.reasoningEffort)+'</span>':'')+
        '<br><span class="mut">Last used: '+esc(s.model ? (s.provider||'unknown')+'/'+s.model : 'no request recorded')+'</span></td>'+
        // STALLED is its own state, never folded into running or idle. A
        // session claiming to run while its log has not moved is the single
        // most expensive thing this console can misreport (2026-08-20: 4h41m).
        '<td>'+(s.stalled
          ? '<span class="dot bad"></span><span class="v-warn">STALLED '+fmtDur(s.stalledMs)+'</span>'
          : '<span class="dot '+(s.running?'busy':'up')+'"></span>'+(s.running?'running':'idle'))+'</td>'+
        '<td>'+(s.turns!=null?s.turns:'&mdash;')+'</td>'+
        '<td>'+(s.kTokIn!=null?s.kTokIn+'K':'&mdash;')+'</td>'+
        '<td>'+(s.kTokOut!=null?s.kTokOut+'K':'&mdash;')+'</td>'+
        '<td>'+ctxCell(s)+'</td>'+
        // TTFT and decode describe a run in progress; on an idle session they
        // are history, so they are dimmed rather than competing with context.
        '<td class="'+(s.running?'':'mut')+'">'+(s.ttftS!=null?s.ttftS+'s':'&mdash;')+'</td>'+
        '<td class="'+(s.running?'':'mut')+'">'+(s.decodeTps!=null?s.decodeTps+' <span class="mut" style="font-size:.75rem">tok/s</span>':'&mdash;')+'</td>'+
        '<td title="'+esc(s.activitySource||'session file')+'">'+fmtRel(s.lastActivityAt||s.mtime)+'</td>'+
        // Only offered where it means something: a session the harness still
        // believes is running. Stopping is the operator's call, so it asks.
        '<td>'+((s.claimsRunning)
          ? '<button class="btn btn-sm" onclick="event.stopPropagation();stopSession(&quot;'+esc(s.sessionId)+'&quot;,&quot;'+esc((s.title||s.id).replace(/"/g,'')) +'&quot;)">stop</button>'
          : '')+'</td>'+
        '</tr>';
      var detail='<tr id="sdetail-'+i+'" style="display:none"><td colspan="13"><div class="detail">'+
        '<div>sessionId: <span class="mono">'+esc(s.sessionId)+'</span></div>'+
        (s.ctxPct!=null?'<div>estimated next provider prompt: '+s.ctxUsed.toLocaleString()+' / '+s.ctxWindow.toLocaleString()+' tokens ('+s.ctxPct+'%)</div>':'')+
        (s.ctxLastPromptTokens!=null?'<div>last provider prompt: '+s.ctxLastPromptTokens.toLocaleString()+' tokens <span class="mut">(may lag while streaming)</span></div>':'')+
        (s.lastActivityAt?'<div>last durable activity: '+fmtRel(s.lastActivityAt)+' ('+esc(s.activitySource||'unknown source')+')</div>':'')+
        (s.goal?'<div>goal: '+esc(s.goal)+'</div>':'')+
        '<div><button class="btn btn-sm" type="button" onclick="event.stopPropagation();openDsh()">Open in DSH</button></div>'+
        '</div></td></tr>';
      return main+detail;
    }).join('');
    document.getElementById('sessions-table').innerHTML='<table class="tbl"><thead><tr><th>Title</th><th>Workspace</th><th>Preset</th><th>Model selection / history</th><th>State</th><th>Turns</th><th title="cumulative tokens sent to the model">Tokens in</th><th title="cumulative tokens generated">Tokens out</th><th title="how full this session’s context window is — a full window truncates large replies">Context</th><th title="time to first token, session aggregate">TTFT</th><th title="decode rate, session aggregate">Decode</th><th>Updated</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>';
  }catch(e){ document.getElementById('sessions-table').innerHTML='<div class="mut">sessions fetch failed</div>' }
}
function toggleSessionDetail(i){
  var el=document.getElementById('sdetail-'+i);
  if(el) el.style.display=(el.style.display==='none'?'table-row':'none');
}

// ── plugins tab ──
var pluginsData=null, pluginBucket=null, pluginLimit=75;
function setPluginBucket(b){ pluginBucket=b||null; pluginLimit=75; renderPlugins(); }
function showMorePlugins(){ pluginLimit+=75; renderPlugins(); }
async function loadPlugins(){
  try{
    pluginsData=await (await fetch('/api/plugins')).json();
    renderPlugins();
  }catch(e){ document.getElementById('plugins-table').innerHTML='<div class="mut">plugins fetch failed</div>' }
}
function renderPlugins(){
  if(!pluginsData){ document.getElementById('plugins-table').innerHTML='<div class="mut">loading&hellip;</div>'; return }
  if(pluginsData.error){ document.getElementById('plugins-table').innerHTML='<div class="mut">dsh down &mdash; no inventory</div>'; return }
  var filter=(document.getElementById('pluginFilter').value||'').toLowerCase();
  var rows=pluginsData.entries.filter(function(e){
    if(pluginBucket){
      if(pluginBucket==='stuck'){ if(!e.stuck) return false; }
      else if(e.bucket!==pluginBucket) return false;
    }
    if(!filter) return true;
    return (e.entryId||'').toLowerCase().indexOf(filter)>=0 || (e.moduleName||'').toLowerCase().indexOf(filter)>=0 || (e.fiberPhase||'').toLowerCase().indexOf(filter)>=0 || (e.description||'').toLowerCase().indexOf(filter)>=0;
  });
  // A wall of 135 identical green rows hid the 31 that were not active. The
  // counts are now the filter: click a state to see only those rows.
  var sm=pluginsData.summary;
  var chip=function(n,label,cls){
    if(!n) return '';
    return '<button type="button" class="pchip '+(cls||'')+(pluginBucket===label?' on':'')+'" aria-pressed="'+(pluginBucket===label?'true':'false')+'" onclick="setPluginBucket(&quot;'+label+'&quot;)">'+n+' '+label+'</button>';
  };
  document.getElementById('plugins-summary').innerHTML=
    (pluginsData.stale
      ? '<div class="v-warn" style="margin-bottom:8px">Showing last-known plugin inventory; refresh failed'+(pluginsData.sourceAgeMs!=null?' &middot; sample '+fmtDur(pluginsData.sourceAgeMs)+' old':'')+(pluginsData.refreshError?': '+esc(pluginsData.refreshError):'')+'</div>'
      : '')+
    chip(sm.failed,'failed','bad')+chip(sm.stuck,'stuck','bad')+
    chip(sm.transitioning,'transitioning','warn')+chip(sm.waiting,'waiting','warn')+
    chip(sm.disabled,'disabled')+chip(sm.active,'active','ok')+
    '<button type="button" class="pchip'+(pluginBucket===null?' on':'')+'" aria-pressed="'+(pluginBucket===null?'true':'false')+'" onclick="setPluginBucket(&quot;&quot;)">'+sm.total+' all</button>';
  // Problems first: a failure on row 140 of 166 may as well not be rendered.
  var rank={failed:0,transitioning:1,waiting:2,disabled:3,active:4};
  rows=rows.slice().sort(function(a,b){
    var ra=(a.stuck?0:rank[a.bucket]!=null?rank[a.bucket]:9);
    var rb=(b.stuck?0:rank[b.bucket]!=null?rank[b.bucket]:9);
    return ra-rb || String(a.entryId).localeCompare(String(b.entryId));
  });
  var totalFiltered=rows.length;
  var visibleRows=rows.slice(0,pluginLimit);
  var html=visibleRows.map(function(e){
    var state, stateColor='', tip='';
    if(e.bucket==='failed'){ state='<span class="dot down"></span>failed'; stateColor=' style="color:var(--red)"'; }
    else if(e.bucket==='transitioning'){
      state='<span class="dot busy"></span>'+(e.stuck?'stuck '+esc((e.fiberPhase||'').toUpperCase()):esc(e.fiberPhase||'transitioning'));
      stateColor=' style="color:var(--amber)"';
    }
    else if(e.bucket==='waiting'){
      state='<span class="dot wait"></span>waiting';
      stateColor=' style="color:#7fa8d9"';
      tip=' title="waiting on dependency \\u2014 will self-activate"';
    }
    else if(e.bucket==='active'){ state='<span class="dot up"></span>active'; }
    else { state='<span class="dot"></span>disabled'; stateColor=' style="color:var(--mut)"'; }
    // fiberPhase repeated the state on every row. Show it only when it says
    // something the state does not.
    var phase=(e.fiberPhase||'').toLowerCase();
    var phaseExtra=(phase&&phase!==e.bucket&&phase!=='active')?' <span class="mut">('+esc(e.fiberPhase)+')</span>':'';
    return '<tr'+tip+'>'+
      '<td class="mono">'+esc(e.entryId)+(e.haloOverride?' <span class="badge badge-teal">HALO override</span>':'')+'</td>'+
      '<td'+stateColor+'>'+state+phaseExtra+(e.bucket==='waiting'?' <span class="mut">(waiting on dependency &mdash; will self-activate)</span>':'')+'</td>'+
      '<td class="mono mut">'+esc(e.moduleName||'—')+'</td>'+
      '<td class="mut" style="max-width:420px;white-space:normal">'+esc(e.description||'—')+'</td>'+
      '</tr>';
  }).join('');
  var pluginBody=visibleRows.length
    ? '<table class="tbl"><thead><tr><th>entryId</th><th>state</th><th>module</th><th>what it does</th></tr></thead><tbody>'+html+'</tbody></table>'
    : '<div class="mut">No plugins match the selected state and text filters.</div>';
  document.getElementById('plugins-table').innerHTML=pluginBody+
    '<div class="mut" style="margin-top:6px">showing '+visibleRows.length+' of '+totalFiltered+' matching ('+pluginsData.entries.length+' total)'+
    (visibleRows.length<totalFiltered?' <button onclick="showMorePlugins()">Show 75 more</button>':'')+'</div>';
}

// ── system tab ──
function renderSystem(s){
  var winPct=Math.min(100,Math.round(s.ram.usedGiB/s.ram.totalGiB*100));
  var gpuOk=!!(s.gpu&&s.gpu.ok);
  var haveCarve=gpuOk&&s.gpu.carveoutGiB!=null;
  var gpuPct=haveCarve?Math.min(100,Math.round(s.gpu.dedicatedGiB/s.gpu.carveoutGiB*100)):0;
  var sharedCls=gpuOk&&s.gpu.sharedGiB>8?'amber':'';
  // Bars carry the warning themselves; a full gauge used to look exactly like
  // an empty one. Shared-pool bar is scaled against its 8 GiB alarm point so
  // the sliver has a stated denominator instead of floating unanchored.
  var bc=function(pct){return pct>=95?'red':(pct>=80?'amber':'')};
  var gpuSystem=gpuOk
    ? ('<div class="row" style="margin-top:10px"><span class="k">GPU carveout</span><span class="'+(gpuPct>=95?'v-bad':(gpuPct>=80?'v-warn':''))+'">'+s.gpu.dedicatedGiB+(haveCarve?' / '+s.gpu.carveoutGiB+' GiB':' GiB (capacity unknown)')+'</span></div>'+(haveCarve?'<div class="bar '+bc(gpuPct)+'"><i style="width:'+gpuPct+'%"></i></div>':'')+
       '<div class="row" style="margin-top:10px"><span class="k">GPU shared</span><span'+(sharedCls?' style="color:var(--amber)"':'')+'>'+s.gpu.sharedGiB+' / 8 GiB alarm</span></div><div class="bar '+sharedCls+'"><i style="width:'+Math.min(100,s.gpu.sharedGiB/8*100)+'%"></i></div>'+
       '<div class="mut" style="margin-top:6px">'+(haveCarve?'GPU capacity from driver registry (portable across boxes)':'machine total: '+s.machineTotalRamGiB+' GiB unified')+'</div>')
    : '<div class="v-warn" style="margin-top:10px">GPU memory counters unavailable'+(s.gpu&&s.gpu.error?': '+esc(s.gpu.error):'')+'; no usage value is asserted</div>';
  document.getElementById('sys-memory').innerHTML=
    '<div class="row"><span class="k">Windows pool</span><span class="'+(winPct>=95?'v-bad':(winPct>=80?'v-warn':''))+'">'+s.ram.usedGiB+' / '+s.ram.totalGiB+' GiB</span></div><div class="bar '+bc(winPct)+'"><i style="width:'+winPct+'%"></i></div>'+
    gpuSystem;
  var diskPct=s.disk.ok?Math.round(s.disk.usedGB/s.disk.totalGB*100):0;
  var diskCls=!s.disk.ok?'':(s.disk.freeGB<50?'red':(s.disk.freeGB<150?'amber':''));
  document.getElementById('sys-disk').innerHTML=s.disk.ok?
    ('<div class="row"><span class="k">used / free / total</span><span>'+s.disk.usedGB+' / '+s.disk.freeGB+' / '+s.disk.totalGB+' GB</span></div><div class="bar '+diskCls+'"><i style="width:'+diskPct+'%"></i></div>')
    : '<div class="mut">disk read failed</div>';
  var vv='<div class="row"><span class="k">installed DSH</span><span class="mono">'+esc(s.services.dshVersionPin)+'</span></div>'+
    '<div class="row"><span class="k">LM Studio</span><span>'+esc(s.services.lmStudioVersion||'unknown')+'</span></div>'+
    '<div class="row"><span class="k">lms CLI</span><span>'+esc(s.services.lmsCliVersion||'unknown')+'</span></div>'+
    '<div class="row"><span class="k">engine (selected)</span><span>'+esc(s.services.engine||'unknown')+(s.services.engineChanged?' <span class="badge badge-teal">changed</span>':'')+'</span></div>'+
    '<div class="row"><span class="k">node</span><span>'+esc(s.node)+'</span></div>';
  document.getElementById('sys-versions').innerHTML=vv;
  var val=s.validation;
  var freshness=val&&val.freshness||{state:'never',ageMs:null};
  if(!val||freshness.state==='never'){
    document.getElementById('sys-validate').innerHTML='<div class="v-warn">never run &mdash; status remains non-nominal until configuration is validated</div>';
  }else{
    document.getElementById('sys-validate').innerHTML=
      '<div class="row"><span class="k">last run</span><span>'+fmtStamp(val.when)+'</span></div>'+
      '<div class="row"><span class="k">freshness</span><span'+(freshness.state==='stale'?' style="color:var(--amber)"':'')+'>'+esc(freshness.state)+(freshness.ageMs!=null?' &middot; '+fmtDur(freshness.ageMs)+' old':'')+(freshness.reason?' &middot; '+esc(freshness.reason):'')+'</span></div>'+
      '<div class="row"><span class="k">result</span><span'+(val.ok?' style="color:var(--green)"':' style="color:var(--red)"')+'>'+(val.ok?'ok':'issues found')+'</span></div>'+
      (val.warnings&&val.warnings.length?'<div class="mut" style="margin-top:6px">'+val.warnings.map(esc).join('<br>')+'</div>':'');
  }
}
async function validateConfig(){
  document.getElementById('sys-validate').innerHTML='<div class="mut">running &mdash; this dumps the full config, can take up to 2 minutes&hellip;</div>';
  try{
    var response=await postAction('/api/validate-config');
    var r=await response.json().catch(function(){return {ok:false,warnings:['Mission Control returned a non-JSON validation response']};});
    if(!response.ok) throw new Error((r.warnings||[]).join('; ')||('HTTP '+response.status));
    renderSystem(lastStatus||{services:{},ram:{},gpu:{},disk:{}});
    document.getElementById('sys-validate').innerHTML=
      '<div class="row"><span class="k">last run</span><span>'+fmtStamp(r.when)+'</span></div>'+
      '<div class="row"><span class="k">result</span><span'+(r.ok?' style="color:var(--green)"':' style="color:var(--red)"')+'>'+(r.ok?'ok':'issues found')+'</span></div>'+
      (r.warnings&&r.warnings.length?'<div class="mut" style="margin-top:6px">'+r.warnings.map(esc).join('<br>')+'</div>':'');
    refreshStatus();
  }catch(e){ document.getElementById('sys-validate').innerHTML='<div style="color:var(--red)">validation request failed: '+esc(String((e&&e.message)||e))+'</div>' }
}
async function loadMemoryGraph(){
  try{
    var g=await (await fetch('/api/memory-graph')).json();
    if(!g.ok){ document.getElementById('sys-memgraph').innerHTML='<div class="mut">memory graph '+esc(g.error||'unavailable')+' &mdash; '+esc(g.file||'')+'</div>'; return }
    var html='<div class="mut" style="margin-bottom:8px">'+g.entities.length+'/'+g.tripwire+' entities (upgrade tripwire) \\u00b7 '+g.relationCount+' relations</div>';
    html+=g.entities.map(function(e,i){
      return '<button type="button" class="row clickable memory-row" aria-expanded="false" aria-controls="obs-'+i+'" onclick="toggleObs('+i+',this)"><span>'+esc(e.name)+' <span class="mut">['+esc(e.entityType)+']</span></span><span class="k">'+e.observations.length+' obs</span></button>'+
        '<div id="obs-'+i+'" class="detail" style="display:none">'+e.observations.map(function(o){return '<div style="margin-bottom:4px">'+esc(o)+'</div>'}).join('')+'</div>';
    }).join('');
    document.getElementById('sys-memgraph').innerHTML=html;
  }catch(e){ document.getElementById('sys-memgraph').innerHTML='<div class="mut">memory graph read failed</div>' }
}
function toggleObs(i,button){
  var el=document.getElementById('obs-'+i);
  if(el){
    var open=el.style.display==='none';
    el.style.display=open?'block':'none';
    if(button) button.setAttribute('aria-expanded',open?'true':'false');
  }
}
async function loadLogtail(raw){
  try{
    var r=await (await fetch('/api/logtail'+(raw?'?raw=1':''))).json();
    if(r.error){ document.getElementById('sys-logtail').innerHTML='<div class="mut">no LM Studio log file found</div>'; return }
    document.getElementById('sys-logtail').innerHTML=
      '<div class="mut" style="margin-bottom:6px">'+esc(r.file)+
      (r.filtered?' &middot; '+r.dropped+' routine polling lines hidden <a href="#" onclick="loadLogtail(1);return false">show raw</a>':'')+
      '</div><pre style="white-space:pre-wrap;font-size:.78rem;max-height:400px;overflow:auto;margin:0">'+
      (r.lines.length
        // An ERROR line used to carry exactly the same visual weight as
        // "listing models". Level decides colour.
        ? r.lines.map(function(l){
            var cls=/\\b(ERROR|FATAL|failed|exception)\\b/i.test(l)?'lg-err'
                   :/\\b(WARN|WARNING)\\b/i.test(l)?'lg-warn':'';
            return cls?'<span class="'+cls+'">'+esc(l)+'</span>':esc(l);
          }).join('\\n')
        : 'no notable log lines &mdash; only routine polling')+'</pre>';
  }catch(e){ document.getElementById('sys-logtail').innerHTML='<div class="mut">log tail failed</div>' }
}

// ── memory tab: hand-rolled force-directed knowledge graph (no libs) ──
// Continuous force simulation (the "Obsidian feel"): a requestAnimationFrame
// tick loop runs charge repulsion + edge springs + centering gravity every
// frame, with velocity damping, instead of a one-shot batch of iterations.
// It free-runs while the graph is unsettled and auto-pauses once kinetic
// energy drops near zero (see MG_KE_STOP/MG_KE_STOP_FRAMES below) — this is
// a dashboard, not a game loop, so it must not spin the CPU forever.
// Dragging a node pins it to the cursor (its own velocity is zeroed, its
// position set directly) while the simulation keeps running around it, so
// spring forces visibly pull connected neighbors along and the network
// re-settles on release.
// Entity-type hues only. Red and amber are deliberately absent: they are the
// alarm channel everywhere else in this console, and spending them on a
// neutral category (an "infrastructure" node rendered red) leaves nothing to
// signal an actual problem with. Adjacent hues are also kept far enough apart
// that two types cannot be confused at a glance.
var MG_PALETTE=['#4fd8c4','#7fa8d9','#c58fe6','#5fe39a','#5fb8e3','#a8d95f','#8fe3c8','#b9a7f0','#6fd0a8','#9fc4e0','#8fd6e3','#c0d98f'];
function mgHashStr(s){ s=String(s||''); var h=0; for(var i=0;i<s.length;i++){ h=((h<<5)-h+s.charCodeAt(i))|0; } return Math.abs(h); }
function mgColorFor(entityType){ return MG_PALETTE[mgHashStr(entityType)%MG_PALETTE.length]; }

// Physics constants (tuned live on the 5-entity/4-relation HALO graph):
//   MG_IDEAL_K_CAP  max ideal node spacing, px — capped regardless of canvas
//                   area so wide monitors don't fling unconnected nodes into
//                   the walls (uncapped k scales with W*H).
//   MG_CENTER_K     centering gravity coefficient applied every frame.
//   MG_DAMPING      velocity multiplier per frame (simple v*=damping decay).
//   MG_ACCEL        force-to-velocity impulse scale per frame.
//   MG_MAX_SPEED    per-node speed clamp, px/frame, so a freshly-loaded
//                   tight cluster can't launch nodes off-canvas in one tick.
//   MG_KE_STOP      total kinetic energy (sum of vx^2+vy^2) below which the
//                   graph counts as "settling".
//   MG_KE_STOP_FRAMES  consecutive low-KE frames required before the rAF
//                   loop actually pauses (~0.5s at 60fps) — avoids pausing
//                   on a single transient near-zero moment.
var MG_IDEAL_K_CAP=170, MG_CENTER_K=0.010, MG_DAMPING=0.86, MG_ACCEL=0.02,
    MG_MAX_SPEED=36, MG_KE_STOP=0.05, MG_KE_STOP_FRAMES=30, MG_MAX_SIM_FRAMES=3600;

var mg={svg:null,viewport:null,nodes:[],edges:[],byId:{},tx:0,ty:0,k:1,w:800,h:500,selected:null,
  dragNode:null,moved:false,panning:false,panMoved:false,hoverNode:null,hoverEdge:null,
  idealK:MG_IDEAL_K_CAP,didInitialFit:false,initialized:false};
var mgSim={running:false,rafId:null,lowFrames:0,frames:0};

function memoryVersionKey(memory){
  memory=memory||{};
  return JSON.stringify([memory.file||null,memory.mtimeMs==null?null:memory.mtimeMs,memory.ok===true,memory.error||null]);
}
function refreshMemoryGraphIfChanged(memory){
  if(!mg.loading&&mg.loadedVersion!==memoryVersionKey(memory)) return loadMemoryGraphTab();
}
function renderMemoryStatus(memory){
  var el=document.getElementById('mg-health');
  if(!el) return;
  memory=memory||{};
  var writer=memory.writer||{},task=memory.snapshotTask||{},snapshots=memory.snapshots||{};
  var storeText=memory.ok
    ? 'available; '+memory.entities+' entities, '+memory.relations+' relations; file updated '+fmtStamp(memory.mtimeMs)
    : (memory.error||'unavailable');
  var writerText=writer.cacheState!=='current'
    ? 'status '+(writer.cacheState||'unavailable')+(writer.error?': '+writer.error:'')
    : (!writer.configured?'not configured':(writer.active?'active':'configured but inactive'));
  var taskText=task.error||(!task.configured?'not configured':((task.state||'unknown state')+
    '; last result '+(task.lastTaskResult==null?'unknown':task.lastTaskResult)+
    '; last run '+fmtStamp(task.lastRunTime)+'; next run '+fmtStamp(task.nextRunTime)));
  var snapshotText=snapshots.ok
    ? snapshots.count+' retained; latest '+fmtStamp(snapshots.lastSnapshotAt)+(snapshots.overdue?'; overdue':'; on schedule')
    : (snapshots.error||'unavailable');
  el.innerHTML='<div class="row"><span class="k">Memory file</span><span>'+esc(storeText)+'</span></div>'+
    '<div class="row"><span class="k">DSH memory writer</span><span>'+esc(writerText)+'</span></div>'+
    '<div class="row"><span class="k">HALO Memory Snapshot task</span><span>'+esc(taskText)+'</span></div>'+
    '<div class="row"><span class="k">Recovery snapshots</span><span>'+esc(snapshotText)+'</span></div>'+
    '<div class="mut" style="margin-top:6px">Checked every 5 seconds. The graph refreshes when its backing file changes; unchanged views keep their layout and selection.</div>';
}

function mgStopSim(){
  if(mgSim.rafId!=null) cancelAnimationFrame(mgSim.rafId);
  mgSim.running=false;
  mgSim.rafId=null;
  mgSim.lowFrames=0;
  mgSim.frames=0;
}

function clearMemoryGraphState(){
  mgStopSim();
  mg.nodes=[];
  mg.edges=[];
  mg.byId={};
  mg.selected=null;
  mg.hoverNode=null;
  mg.hoverEdge=null;
  mg.dragNode=null;
  mg.initialized=false;
  mg.loadedVersion=null;
  mg.graphStatus='';
  mg.svg=null;
  mg.viewport=null;
  var canvas=document.getElementById('mg-canvas');
  var legend=document.getElementById('mg-legend');
  var detail=document.getElementById('mg-detail');
  if(canvas) canvas.innerHTML='';
  if(legend) legend.innerHTML='';
  if(detail) detail.innerHTML='<div class="mut">No graph details are available.</div>';
}

async function loadMemoryGraphTab(){
  if(mg.loading) return;
  mg.loading=true;
  try{
  var statusEl=document.getElementById('mg-status');
  var headerEl=document.getElementById('mg-header');
  var canvas=document.getElementById('mg-canvas');
  var legendEl=document.getElementById('mg-legend');
  statusEl.textContent='loading\\u2026';
  var g;
  try{
    var resp=await fetch('/api/memory-graph');
    if(!resp.ok) throw new Error('http '+resp.status);
    g=await resp.json();
  }catch(e){
    clearMemoryGraphState();
    headerEl.textContent='Memory Graph \\u2014 unavailable';
    statusEl.innerHTML='<span style="color:var(--red)">degraded: could not reach /api/memory-graph (dsh/mission-control unreachable). No graph is shown \\u2014 this is not a fake/empty render.</span>';
    return;
  }
  if(!g.ok){
    clearMemoryGraphState();
    mg.loadedVersion=memoryVersionKey(g);
    headerEl.textContent='Memory Graph \u2014 '+(g.error||'unavailable');
    statusEl.textContent='No graph is shown: '+(g.error||'the backing memory file is unavailable')+'.';
    return;
  }
  var version=memoryVersionKey(g);
  if(mg.initialized&&mg.loadedVersion===version){
    statusEl.textContent=mg.graphStatus||'';
    return;
  }
  var entities=g.entities||[];
  var relations=g.relations||[];
  headerEl.textContent='Memory Graph \\u00b7 '+entities.length+' entities \\u00b7 '+relations.length+' relations';
  if(!entities.length) statusEl.textContent='no entities recorded yet in memory.json';
  else if(!relations.length) statusEl.textContent='No relations yet \\u2014 relations appear when sessions link entities together.';
  else statusEl.textContent='';

  mg.nodes=entities.map(function(e){ return {id:e.name,name:e.name,entityType:e.entityType,observations:e.observations||[],color:mgColorFor(e.entityType),x:0,y:0,vx:0,vy:0}; });
  mg.byId={}; mg.nodes.forEach(function(n){ mg.byId[n.id]=n });
  // Drop relations pointing at an entity name we don't have (keeps the
  // renderer honest — never invent a node just to satisfy an edge).
  mg.edges=relations.filter(function(r){ return mg.byId[r.from] && mg.byId[r.to]; }).map(function(r){ return {from:r.from,to:r.to,relationType:r.relationType||''}; });
  mg.selected=null; mg.hoverNode=null; mg.hoverEdge=null;

  var legendTypes=[]; var seen={};
  mg.nodes.forEach(function(n){ if(!seen[n.entityType]){ seen[n.entityType]=1; legendTypes.push(n.entityType); } });
  legendEl.innerHTML=legendTypes.length? legendTypes.map(function(t){
    return '<div class="mgraph-legend-item"><span class="mgraph-swatch" style="background:'+mgColorFor(t)+'"></span>'+esc(t)+'</div>';
  }).join('') : '<div class="mut">no entity types</div>';

  initMemoryGraphDom();
  mgSeedPositions(mg.nodes, mg.w, mg.h);
  buildMemoryGraphElements();
  mg.didInitialFit=false;
  applyMgTransform(); // identity-ish start; physics settle live, then auto-fit
  mgApplyHighlight();
  mgStartSim();
  mg.initialized=true;
  mg.loadedVersion=version;
  mg.graphStatus=statusEl.textContent;
  document.getElementById('mg-detail').innerHTML='<div class="mut">Click a node to see its details.</div>';
  // Self-correct the sizing trap: if the tab was hidden (clientWidth/Height
  // 0) when this ran, the canvas fell back to 800x500. A frame later, once
  // the browser has actually painted the now-active tab, re-measure and
  // re-fit if the real size differs.
  requestAnimationFrame(function(){ mgOnTabActivated(); });
  }finally{mg.loading=false;}
}

// Re-entry point every time the Memory tab is shown (nav click or
// hash-change), NOT just on first load. First activation does the full
// fetch+build; later activations just re-measure the canvas (it may have
// been display:none — 0 clientWidth/Height — when the graph was built) and
// re-fit + nudge the simulation if the size actually changed, instead of
// re-fetching/rebuilding and losing the live layout and any dragged nodes.
function mgOnTabActivated(){
  // Guard against being called before the mg={...} initializer below has
  // run: the very first tab activation happens synchronously from the
  // initial showTab() call at the bottom of <script> (hash-based deep link,
  // e.g. #memory), which fires BEFORE this file's later var statements have
  // executed. mg is hoisted (still undefined) at that point.
  if(typeof mg==='undefined' || !mg.initialized){ loadMemoryGraphTab(); return; }
  var canvas=document.getElementById('mg-canvas');
  if(!canvas) return;
  var w=canvas.clientWidth||0, h=canvas.clientHeight||0;
  if(w<10||h<10) return; // still hidden/not laid out — nothing reliable to measure
  if(Math.abs(w-mg.w)>4||Math.abs(h-mg.h)>4){
    mg.w=w; mg.h=h;
    if(mg.svg) mg.svg.setAttribute('viewBox','0 0 '+w+' '+h);
    // Resizing moves nodes during the next simulation. Fit now for an
    // immediate view, then fit their settled positions instead of keeping
    // a transform anchored to the old desktop coordinates.
    mg.didInitialFit=false;
    mgFitToView();
    mgStartSim(); // let it glide to the new center
  }
}
window.addEventListener('resize', function(){ if(currentTab==='memory') mgOnTabActivated(); });

// Frame the laid-out nodes: center their bounding box in the canvas at a
// scale that fits with padding (never over-zoomed past 1.4x). Called after
// the simulation's initial settle, after a canvas resize, and by the
// "Reset view"/Esc/double-click escape hatches below.
function mgFitToView(){
  if(!mg.nodes.length){ mg.tx=0; mg.ty=0; mg.k=1; applyMgTransform(); return; }
  var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  mg.nodes.forEach(function(n){
    if(n.x<minX)minX=n.x; if(n.x>maxX)maxX=n.x;
    if(n.y<minY)minY=n.y; if(n.y>maxY)maxY=n.y;
  });
  var pad=110; // room for labels + breathing space
  var bw=Math.max(maxX-minX,1)+pad*2, bh=Math.max(maxY-minY,1)+pad*2;
  var scale=Math.min(mg.w/bw, mg.h/bh, 1.4);
  var cx=(minX+maxX)/2, cy=(minY+maxY)/2;
  mg.k=scale;
  mg.tx=mg.w/2-scale*cx;
  mg.ty=mg.h/2-scale*cy;
  applyMgTransform();
}

// Deterministic circular seed (sin/cos of index, not Math.random()) so the
// starting shape is the same on every reload; the continuous simulation
// then relaxes it live instead of pre-computing a static layout.
function mgSeedPositions(nodes, W, H){
  var n=nodes.length;
  if(n===0) return;
  if(n===1){ nodes[0].x=W/2; nodes[0].y=H/2; nodes[0].vx=0; nodes[0].vy=0; mg.idealK=MG_IDEAL_K_CAP; return; }
  var seedR=Math.min(W,H)*0.32;
  nodes.forEach(function(node,i){
    var angle=(i/n)*Math.PI*2;
    node.x=W/2+seedR*Math.cos(angle)+Math.sin(i*12.9898)*6;
    node.y=H/2+seedR*Math.sin(angle)+Math.cos(i*78.233)*6;
    node.vx=0; node.vy=0;
  });
  // Ideal spacing, capped: uncapped it scales with canvas area and on wide
  // monitors repulsion flings unconnected nodes into the boundary clamps
  // (observed live: 5 nodes pinned to the corners of a 2000px canvas).
  mg.idealK=Math.min(Math.sqrt((W*H)/Math.max(n,1)), MG_IDEAL_K_CAP);
}

function mgStartSim(){
  mgSim.lowFrames=0; mgSim.frames=0;
  if(mgSim.running) return;
  mgSim.running=true;
  mgSim.rafId=requestAnimationFrame(mgTick);
}

// One frame of Fruchterman-Reingold-style forces: charge repulsion between
// every pair (k^2/dist) + spring attraction along edges (dist^2/k, so the
// two balance exactly at the ideal edge length k) + weak centering gravity,
// integrated with velocity damping. A dragged node is pinned — its velocity
// is zeroed and its position comes from the mouse instead — but it still
// exerts forces on everything else, so neighbors visibly get pulled along.
function mgTick(){
  var nodes=mg.nodes, edges=mg.edges, n=nodes.length;
  mgSim.frames++;
  if(n===0){ mgSim.running=false; mgSim.rafId=null; return; }
  var k=mg.idealK||MG_IDEAL_K_CAP;
  for(var i=0;i<n;i++){ nodes[i].fx=0; nodes[i].fy=0; }
  for(var i=0;i<n;i++){
    for(var j=i+1;j<n;j++){
      var a=nodes[i], b=nodes[j];
      var dx=a.x-b.x, dy=a.y-b.y;
      var dist=Math.sqrt(dx*dx+dy*dy)||0.01;
      var force=(k*k)/dist;
      var fx=(dx/dist)*force, fy=(dy/dist)*force;
      a.fx+=fx; a.fy+=fy; b.fx-=fx; b.fy-=fy;
    }
  }
  for(var e=0;e<edges.length;e++){
    var a=mg.byId[edges[e].from], b=mg.byId[edges[e].to];
    if(!a||!b) continue;
    var dx=a.x-b.x, dy=a.y-b.y;
    var dist=Math.sqrt(dx*dx+dy*dy)||0.01;
    var force=(dist*dist)/k;
    var fx=(dx/dist)*force, fy=(dy/dist)*force;
    a.fx-=fx; a.fy-=fy; b.fx+=fx; b.fy+=fy;
  }
  var cx=mg.w/2, cy=mg.h/2;
  for(var i=0;i<n;i++){
    var a=nodes[i];
    a.fx+=(cx-a.x)*MG_CENTER_K; a.fy+=(cy-a.y)*MG_CENTER_K;
  }
  var totalKE=0;
  for(var i=0;i<n;i++){
    var a=nodes[i];
    if(a===mg.dragNode){ a.vx=0; a.vy=0; continue; }
    a.vx=(a.vx+a.fx*MG_ACCEL)*MG_DAMPING;
    a.vy=(a.vy+a.fy*MG_ACCEL)*MG_DAMPING;
    var speed=Math.sqrt(a.vx*a.vx+a.vy*a.vy);
    if(speed>MG_MAX_SPEED){ a.vx=a.vx/speed*MG_MAX_SPEED; a.vy=a.vy/speed*MG_MAX_SPEED; }
    a.x+=a.vx; a.y+=a.vy;
    a.x=Math.max(24,Math.min(mg.w-24,a.x));
    a.y=Math.max(24,Math.min(mg.h-24,a.y));
    totalKE+=a.vx*a.vx+a.vy*a.vy;
  }
  mgUpdatePositions();
  if(mg.dragNode){ mgSim.lowFrames=0; }
  else if(totalKE<MG_KE_STOP){ mgSim.lowFrames++; }
  else { mgSim.lowFrames=0; }
  var settled=!mg.dragNode && mgSim.lowFrames>MG_KE_STOP_FRAMES;
  var timedOut=mgSim.frames>MG_MAX_SIM_FRAMES; // safety valve — never spin forever
  if(settled||timedOut){
    mgSim.running=false; mgSim.rafId=null;
    if(!mg.didInitialFit){ mg.didInitialFit=true; mgFitToView(); }
    return;
  }
  mgSim.rafId=requestAnimationFrame(mgTick);
}

var MG_NS='http://www.w3.org/2000/svg';
function initMemoryGraphDom(){
  var canvas=document.getElementById('mg-canvas');
  canvas.innerHTML='';
  var w=canvas.clientWidth||800, h=canvas.clientHeight||500;
  mg.w=w; mg.h=h;
  var svg=document.createElementNS(MG_NS,'svg');
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  svg.style.cursor='grab';
  var defs=document.createElementNS(MG_NS,'defs');
  var marker=document.createElementNS(MG_NS,'marker');
  marker.setAttribute('id','mg-arrow');
  marker.setAttribute('viewBox','0 0 10 10'); marker.setAttribute('refX','8'); marker.setAttribute('refY','5');
  marker.setAttribute('markerWidth','7'); marker.setAttribute('markerHeight','7'); marker.setAttribute('orient','auto-start-reverse');
  var mpath=document.createElementNS(MG_NS,'path');
  mpath.setAttribute('d','M0,0 L10,5 L0,10 z'); mpath.setAttribute('fill','#3c6284');
  marker.appendChild(mpath); defs.appendChild(marker); svg.appendChild(defs);
  var viewport=document.createElementNS(MG_NS,'g'); viewport.setAttribute('id','mg-viewport');
  svg.appendChild(viewport);
  canvas.appendChild(svg);
  mg.svg=svg; mg.viewport=viewport;
  wireMemoryGraphEvents();
}

function buildMemoryGraphElements(){
  var edgesGroup=document.createElementNS(MG_NS,'g');
  var edgeLabelsGroup=document.createElementNS(MG_NS,'g');
  var nodesGroup=document.createElementNS(MG_NS,'g');
  mg.viewport.appendChild(edgesGroup);
  mg.viewport.appendChild(edgeLabelsGroup);
  mg.viewport.appendChild(nodesGroup);

  mg.edges.forEach(function(e){
    var line=document.createElementNS(MG_NS,'line');
    line.setAttribute('stroke','#3c6284'); line.setAttribute('stroke-width','1.4');
    line.setAttribute('marker-end','url(#mg-arrow)');
    line.style.transition='stroke .12s,stroke-width .12s,opacity .12s';
    edgesGroup.appendChild(line);
    e.el=line;
    // Wider invisible hit-line layered on top so a thin 1.4px edge is still
    // easy to hover — the visible line stays thin and legible.
    var hit=document.createElementNS(MG_NS,'line');
    hit.setAttribute('stroke','transparent'); hit.setAttribute('stroke-width','12');
    hit.style.cursor='pointer'; hit.style.pointerEvents='stroke';
    edgesGroup.appendChild(hit);
    e.hitEl=hit;
    var label=document.createElementNS(MG_NS,'text');
    label.setAttribute('font-size','9'); label.setAttribute('fill','#9fb3c8'); label.setAttribute('text-anchor','middle');
    label.style.opacity='0'; label.style.pointerEvents='none'; label.style.transition='opacity .12s';
    label.textContent=e.relationType||'';
    edgeLabelsGroup.appendChild(label);
    e.labelEl=label;
    hit.addEventListener('mouseenter', function(ev){ mg.hoverEdge=e; mg.hoverNode=null; mgApplyHighlight(); mgShowTooltip(mgEdgeTooltipText(e),ev); });
    hit.addEventListener('mousemove', function(ev){ if(mg.hoverEdge===e) mgMoveTooltip(ev); });
    hit.addEventListener('mouseleave', function(){ if(mg.hoverEdge===e){ mg.hoverEdge=null; mgApplyHighlight(); mgHideTooltip(); } });
  });

  mg.nodes.forEach(function(node){
    var grp=document.createElementNS(MG_NS,'g');
    grp.setAttribute('tabindex','0');
    grp.setAttribute('role','button');
    grp.setAttribute('aria-label','Open memory entity '+node.name);
    grp.style.cursor='pointer';
    grp.style.transition='opacity .12s';
    var circle=document.createElementNS(MG_NS,'circle');
    circle.setAttribute('r','15'); circle.setAttribute('fill',node.color);
    circle.setAttribute('stroke','#0b0f14'); circle.setAttribute('stroke-width','2');
    var text=document.createElementNS(MG_NS,'text');
    text.setAttribute('font-size','10.5'); text.setAttribute('fill','#eef6ff'); text.setAttribute('text-anchor','middle');
    text.setAttribute('y','28'); text.textContent=node.name;
    grp.appendChild(circle); grp.appendChild(text);
    nodesGroup.appendChild(grp);
    node.el=grp; node.circleEl=circle;
    grp.addEventListener('mousedown', function(ev){ mgStartNodeDrag(ev,node); });
    grp.addEventListener('keydown', function(ev){
      if(ev.key==='Enter'||ev.key===' '){
        ev.preventDefault();
        if(mg.selected===node.id) deselectMemoryNode();
        else selectMemoryNode(node.id);
      }
    });
    grp.addEventListener('mouseenter', function(ev){ mg.hoverNode=node; mg.hoverEdge=null; mgApplyHighlight(); mgShowTooltip(mgNodeTooltipText(node),ev); });
    grp.addEventListener('mousemove', function(ev){ if(mg.hoverNode===node) mgMoveTooltip(ev); });
    grp.addEventListener('mouseleave', function(){ if(mg.hoverNode===node){ mg.hoverNode=null; mgApplyHighlight(); mgHideTooltip(); } });
  });
  mgUpdatePositions();
}

function mgUpdatePositions(){
  mg.nodes.forEach(function(node){
    node.el.setAttribute('transform','translate('+node.x.toFixed(1)+','+node.y.toFixed(1)+')');
  });
  mg.edges.forEach(function(e){
    var a=mg.byId[e.from], b=mg.byId[e.to];
    if(!a||!b) return;
    var dx=b.x-a.x, dy=b.y-a.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
    var r=15;
    var x1=a.x+(dx/dist)*r, y1=a.y+(dy/dist)*r;
    var x2=b.x-(dx/dist)*(r+3), y2=b.y-(dy/dist)*(r+3);
    e.el.setAttribute('x1',x1.toFixed(1)); e.el.setAttribute('y1',y1.toFixed(1));
    e.el.setAttribute('x2',x2.toFixed(1)); e.el.setAttribute('y2',y2.toFixed(1));
    if(e.hitEl){ e.hitEl.setAttribute('x1',x1.toFixed(1)); e.hitEl.setAttribute('y1',y1.toFixed(1)); e.hitEl.setAttribute('x2',x2.toFixed(1)); e.hitEl.setAttribute('y2',y2.toFixed(1)); }
    e.labelEl.setAttribute('x',((a.x+b.x)/2).toFixed(1));
    e.labelEl.setAttribute('y',((a.y+b.y)/2-4).toFixed(1));
  });
}

// Zoomed-out edge labels get cluttered/illegible — hide them below this
// scale unless a hover is actively highlighting that specific edge.
function mgEdgeLabelBaseOpacity(){ return mg.k<0.55?'0':'0.85'; }

// Hover state -> visual highlight: the hovered node/edge (and, for a node,
// its directly-connected neighbors and edges) stay at full opacity; the
// rest of the graph dims so the relevant subgraph pops. No hover = no dim.
function mgApplyHighlight(){
  var activeNodeIds=null, activeEdges=null;
  if(mg.hoverNode){
    activeNodeIds={}; activeNodeIds[mg.hoverNode.id]=true;
    activeEdges=[];
    mg.edges.forEach(function(e){
      if(e.from===mg.hoverNode.id||e.to===mg.hoverNode.id){
        activeEdges.push(e); activeNodeIds[e.from]=true; activeNodeIds[e.to]=true;
      }
    });
  } else if(mg.hoverEdge){
    activeEdges=[mg.hoverEdge];
    activeNodeIds={}; activeNodeIds[mg.hoverEdge.from]=true; activeNodeIds[mg.hoverEdge.to]=true;
  }
  var dimActive=!!activeNodeIds;
  mg.nodes.forEach(function(n){ n.el.style.opacity=(dimActive&&!activeNodeIds[n.id])?'0.28':'1'; });
  mg.edges.forEach(function(e){
    var isActive=activeEdges&&activeEdges.indexOf(e)>=0;
    e.el.style.opacity=(dimActive&&!isActive)?'0.15':'1';
    e.el.setAttribute('stroke-width', isActive?'2.6':'1.4');
    e.el.setAttribute('stroke', isActive?'#7fc7ff':'#3c6284');
    e.labelEl.style.opacity= isActive?'1':(dimActive?'0':mgEdgeLabelBaseOpacity());
  });
}

function applyMgTransform(){
  mg.viewport.setAttribute('transform','translate('+mg.tx+','+mg.ty+') scale('+mg.k+')');
}
function mgClientToWorld(clientX,clientY){
  var rect=mg.svg.getBoundingClientRect();
  var sx=mg.w/rect.width, sy=mg.h/rect.height;
  var vx=(clientX-rect.left)*sx, vy=(clientY-rect.top)*sy;
  return {vx:vx,vy:vy,wx:(vx-mg.tx)/mg.k,wy:(vy-mg.ty)/mg.k,sx:sx,sy:sy};
}

// ── tooltip: reused for both node and edge hover ──
function mgTooltipEl(){
  var t=document.getElementById('mg-tooltip');
  if(!t){ t=document.createElement('div'); t.id='mg-tooltip'; t.className='mgraph-tooltip'; document.body.appendChild(t); }
  return t;
}
function mgShowTooltip(text,ev){ var t=mgTooltipEl(); t.textContent=text; t.style.display='block'; mgMoveTooltip(ev); }
function mgMoveTooltip(ev){ var t=mgTooltipEl(); t.style.left=(ev.clientX+14)+'px'; t.style.top=(ev.clientY+14)+'px'; }
function mgHideTooltip(){ var t=document.getElementById('mg-tooltip'); if(t) t.style.display='none'; }
function mgSnippet(s,n){ s=String(s||''); if(s.length<=n) return s; return s.slice(0,n).replace(/\\s+\\S*$/,'')+'\\u2026'; }
function mgNodeTooltipText(node){
  var first=(node.observations&&node.observations.length)?node.observations[0]:null;
  return node.name+(first?' \\u2014 '+mgSnippet(first,100):' (no observations)');
}
function mgEdgeTooltipText(e){
  var a=mg.byId[e.from], b=mg.byId[e.to];
  return (a?a.name:e.from)+' \\u2192 '+(e.relationType||'related')+' \\u2192 '+(b?b.name:e.to);
}

function wireMemoryGraphEvents(){
  mg.svg.addEventListener('wheel', function(ev){
    ev.preventDefault();
    var p=mgClientToWorld(ev.clientX,ev.clientY);
    var factor=ev.deltaY<0?1.12:0.89;
    var newK=Math.max(0.2,Math.min(4,mg.k*factor));
    mg.tx=p.vx-p.wx*newK; mg.ty=p.vy-p.wy*newK; mg.k=newK;
    applyMgTransform();
    mgApplyHighlight(); // label visibility depends on zoom level
  }, {passive:false});
  mg.svg.addEventListener('mousedown', function(ev){
    if(ev.target!==mg.svg && ev.target!==mg.viewport) return;
    mgStartPan(ev);
  });
  // Escape hatch: double-click on empty background = fit-to-view (frames
  // every node back into the visible canvas, same as the Reset view button).
  mg.svg.addEventListener('dblclick', function(ev){
    if(ev.target!==mg.svg && ev.target!==mg.viewport) return;
    mgResetView();
  });
}

function mgStartNodeDrag(ev,node){
  ev.stopPropagation(); ev.preventDefault();
  mg.dragNode=node; mg.moved=false;
  mgHideTooltip();
  mgStartSim(); // guarantee the loop is running so neighbors react live
  var start=mgClientToWorld(ev.clientX,ev.clientY);
  mg.dragOrigWX=start.wx; mg.dragOrigWY=start.wy;
  mg.dragNodeStartX=node.x; mg.dragNodeStartY=node.y;
  document.addEventListener('mousemove', mgOnNodeDragMove);
  document.addEventListener('mouseup', mgOnNodeDragEnd);
}
function mgOnNodeDragMove(ev){
  var node=mg.dragNode; if(!node) return;
  var cur=mgClientToWorld(ev.clientX,ev.clientY);
  var dx=cur.wx-mg.dragOrigWX, dy=cur.wy-mg.dragOrigWY;
  if(Math.abs(dx*mg.k)>4||Math.abs(dy*mg.k)>4) mg.moved=true;
  node.x=mg.dragNodeStartX+dx; node.y=mg.dragNodeStartY+dy;
  mgUpdatePositions();
}
function mgOnNodeDragEnd(){
  document.removeEventListener('mousemove', mgOnNodeDragMove);
  document.removeEventListener('mouseup', mgOnNodeDragEnd);
  var node=mg.dragNode; mg.dragNode=null;
  if(node && !mg.moved){
    // Toggle: clicking the already-selected node deselects it instead of
    // re-selecting/re-centering onto itself (escape hatch #5).
    if(mg.selected===node.id) deselectMemoryNode();
    else selectMemoryNode(node.id);
  }
  mg.moved=false;
}
function mgStartPan(ev){
  mg.panning=true; mg.panMoved=false;
  mg.panStartClientX=ev.clientX; mg.panStartClientY=ev.clientY;
  mg.panStartTx=mg.tx; mg.panStartTy=mg.ty;
  mg.svg.style.cursor='grabbing';
  document.addEventListener('mousemove', mgOnPanMove);
  document.addEventListener('mouseup', mgOnPanEnd);
}
function mgOnPanMove(ev){
  if(!mg.panning) return;
  var rect=mg.svg.getBoundingClientRect();
  var sx=mg.w/rect.width, sy=mg.h/rect.height;
  var dx=(ev.clientX-mg.panStartClientX)*sx, dy=(ev.clientY-mg.panStartClientY)*sy;
  if(Math.abs(dx)>4||Math.abs(dy)>4) mg.panMoved=true;
  mg.tx=mg.panStartTx+dx; mg.ty=mg.panStartTy+dy;
  applyMgTransform();
}
function mgOnPanEnd(){
  mg.panning=false;
  if(mg.svg) mg.svg.style.cursor='grab';
  document.removeEventListener('mousemove', mgOnPanMove);
  document.removeEventListener('mouseup', mgOnPanEnd);
  // Escape hatch: a plain click (no drag) on empty background deselects
  // the current node and un-dims everything, WITHOUT recentering the view
  // — distinct from double-click/Esc/Reset view, which do recenter.
  if(!mg.panMoved) deselectMemoryNode();
  mg.panMoved=false;
}

// Escape hatch: Reset view button, double-click background, and Esc all
// route here — deselect (clears the zoom-to-node the detail click applied)
// then fit-to-view (frames every node back into the visible canvas). This
// is the one obvious, zero-knowledge way back after any navigation the
// graph performs (selecting a node or clicking a connection both recenter).
function mgResetView(){
  deselectMemoryNode();
  mgFitToView();
}
document.addEventListener('keydown', function(ev){
  if(ev.key==='Escape' && currentTab==='memory') mgResetView();
});

function selectMemoryNode(id){
  var node=mg.byId[id]; if(!node) return;
  mg.selected=id;
  mg.nodes.forEach(function(n){
    n.circleEl.setAttribute('stroke', n.id===id?'#4fd8c4':'#0b0f14');
    n.circleEl.setAttribute('stroke-width', n.id===id?'3':'2');
  });
  renderMemoryDetail(id);
  mg.tx=mg.w/2-node.x*mg.k; mg.ty=mg.h/2-node.y*mg.k;
  applyMgTransform();
}

// Connections are addressed by index into mgDetailConns, never by
// interpolating the raw entity-name id into an onclick attribute string —
// same quoting-hazard-avoidance convention as modelsCache elsewhere in this file.
var mgDetailConns=[];
function renderMemoryDetail(id){
  var node=mg.byId[id];
  var panel=document.getElementById('mg-detail');
  if(!node){ panel.innerHTML='<div class="mut">Click a node to see its details.</div>'; return; }
  mgDetailConns=mg.edges.filter(function(e){ return e.from===id||e.to===id; });
  // Sentence-shaped: "<verb> \\u2192 <other entity>", e.g. "uses \\u2192
  // halo-search-infrastructure". A small leading glyph marks direction
  // (\\u25b8 outgoing / \\u25c2 incoming) without breaking that reading flow.
  var connHtml=mgDetailConns.length?mgDetailConns.map(function(e,i){
    var otherId=e.from===id?e.to:e.from;
    var other=mg.byId[otherId];
    var glyph=e.from===id?'\\u25b8':'\\u25c2';
    return '<button class="mgraph-conn-btn" onclick="selectMemoryConn('+i+')">'+glyph+' '+esc(e.relationType||'related')+' \\u2192 <b>'+esc(other?other.name:otherId)+'</b></button>';
  }).join(''):'<div class="mut">No relations recorded.</div>';
  panel.innerHTML=
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">'+
      '<h3 style="margin:0 0 6px;font-size:1rem">'+esc(node.name)+'</h3>'+
      '<button onclick="deselectMemoryNode()" style="padding:2px 8px" title="Deselect (does not recenter)">&times;</button>'+
    '</div>'+
    '<div class="badge" style="background:'+node.color+'2a;color:'+node.color+';margin:0 0 10px">'+esc(node.entityType)+'</div>'+
    '<div class="mut" style="margin:8px 0 4px;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em">Observations ('+node.observations.length+')</div>'+
    '<div style="max-height:240px;overflow:auto;margin-bottom:12px">'+
      (node.observations.length?node.observations.map(function(o){ return '<div class="mgraph-obs">'+esc(o)+'</div>'; }).join(''):'<div class="mut">none</div>')+
    '</div>'+
    '<div class="mut" style="margin:8px 0 4px;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em">Connections ('+mgDetailConns.length+')</div>'+
    connHtml;
}
function deselectMemoryNode(){
  mg.selected=null;
  mg.nodes.forEach(function(n){ n.circleEl.setAttribute('stroke','#0b0f14'); n.circleEl.setAttribute('stroke-width','2'); });
  var panel=document.getElementById('mg-detail');
  if(panel) panel.innerHTML='<div class="mut">Click a node to see its details.</div>';
}
function selectMemoryConn(i){
  var e=mgDetailConns[i]; if(!e) return;
  var otherId=(e.from===mg.selected)?e.to:e.from;
  selectMemoryNode(otherId);
}

// ── master poll ──
var statusPending=false, lastStatusSuccess=0;
function statusWarning(message){
  var banner=document.getElementById('status-health');
  if(!banner){banner=document.createElement('div');banner.id='status-health';banner.setAttribute('role','alert');banner.style.cssText='padding:12px;background:#642626;color:white;position:sticky;top:0;z-index:999';document.body.prepend(banner);}
  banner.textContent=message;banner.hidden=false;
}
async function refreshStatus(){
  if(statusPending)return;
  statusPending=true;
  try{
    var response=await fetch('/api/status',{signal:AbortSignal.timeout(20000),cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    var s=await response.json();
    if(!s.time||!s.services)throw new Error('invalid status response');
    if(Date.now()-Date.parse(s.time)>30000)throw new Error('backend returned stale status');
    lastStatusSuccess=Date.now();
    var banner=document.getElementById('status-health');if(banner)banner.hidden=true;
    lastStatus=s;
    document.getElementById('stamp').textContent=new Date(s.time).toLocaleTimeString();
    renderStrip(s);
    lastStatus=s;
    applyLoaderLabels(s);
    if(currentTab==='overview') renderOverview(s);
    if(currentTab==='system') renderSystem(s);
    if(currentTab==='memory'){
      renderMemoryStatus(s.memory);
      await refreshMemoryGraphIfChanged(s.memory);
    }
  }catch(e){ document.getElementById('stamp').textContent='STALE — status fetch failed';statusWarning('Dashboard data is stale or unavailable. Last successful refresh: '+(lastStatusSuccess?new Date(lastStatusSuccess).toLocaleTimeString():'never')+'. '+e.message); }finally{statusPending=false;}
}
// Activate the initial tab only after every later global (notably
// vitalsHours and the memory graph state) has been initialized.  Calling this
// near the top produced /api/history?hours=undefined and raced the first paint.
showTab((location.hash||'#overview').slice(1) || 'overview');
refreshStatus();
setInterval(function(){
  if(lastStatusSuccess&&Date.now()-lastStatusSuccess>30000)statusWarning('Dashboard data is stale — no successful refresh in 30 seconds.');
  refreshStatus();
  if(currentTab==='models') loadModels();
  if(currentTab==='sessions') loadSessions();
  if(currentTab==='plugins') loadPlugins();
},5000);
// Vitals redraw on the sampling cadence, not the 5 s poll: the history only
// gains a point every 60 s, so anything faster is a repaint of the same data.
setInterval(function(){ if(currentTab==='overview') loadVitals(); },60000);
</script></body></html>`;

// ─────────────────────────── settings ───────────────────────────
// Web 0.2 composes its route, providers, models and registered presets from a
// profile patch. Preserve comments and JS tags by editing exact scalar lines;
// never parse and re-serialize the document.
const PROFILE_FILE = path.join(DSH_HOME, 'profiles', 'web', 'cordis.patch.yml');
const REPO_PROFILE_FILE = path.join(DSH_ROOT, 'web-profile', 'cordis.patch.yml');

/*__SETTINGS_FN_START__*/
function profileLines(raw) {
  const rows = [];
  const re = /.*(?:\r?\n|$)/g;
  let match;
  while ((match = re.exec(String(raw))) && match[0]) {
    rows.push({ text: match[0].replace(/\r?\n$/, ''), start: match.index, end: re.lastIndex });
  }
  return rows;
}

function profileProviderTransport(raw, provider, ollamaOrigin = 'http://127.0.0.1:11434') {
  const rows = profileLines(raw);
  const significant = row => row.text.trim() && !row.text.trimStart().startsWith('#');
  const indent = row => row.text.match(/^ */)?.[0].length || 0;
  const providerAt = rows.findIndex(row => indent(row) === 6 && row.text.trim() === String(provider) + ':');
  if (providerAt < 0) return { providerBaseURL: null, localModelProvider: false };
  let end = rows.length;
  for (let i = providerAt + 1; i < rows.length; i++) {
    if (significant(rows[i]) && indent(rows[i]) <= 6) { end = i; break; }
  }
  const baseLine = rows.slice(providerAt + 1, end)
    .find(row => indent(row) === 8 && row.text.trimStart().startsWith('baseURL:'));
  const baseURL = baseLine?.text.split(/baseURL:\s*/, 2)[1]?.trim().replace(/^(['"])(.*)\1$/, '$2') || null;
  let localModelProvider = false;
  try {
    const parsed = new URL(baseURL);
    localModelProvider = parsed.protocol === 'http:'
      && ['127.0.0.1', 'localhost'].includes(parsed.hostname)
      && parsed.port === '1234';
  } catch { /* absent or invalid transport is never assumed local */ }
  let runtime = null;
  try { const url = new URL(baseURL); if (['127.0.0.1', 'localhost'].includes(url.hostname)) runtime = url.port === '11434' || url.origin === ollamaOrigin ? 'ollama' : url.port === '1234' ? 'lmstudio' : null; } catch {}
  return { providerBaseURL: baseURL, localModelProvider: localModelProvider || runtime === 'ollama', runtime };
}

function locateProfileField(raw, scope, field, routeOverride = null) {
  const rows = profileLines(raw);
  const route = routeOverride || parseAgentDefaultRoute(raw);
  const provider = scope.provider || route.provider;
  const model = scope.model === true ? route.model : scope.model;
  if (!provider || (scope.model && !model)) return null;
  const significant = row => row.text.trim() && !row.text.trimStart().startsWith('#');
  const indent = row => row.text.match(/^ */)?.[0].length || 0;
  const providerAt = rows.findIndex(row => indent(row) === 6 && row.text.trim() === provider + ':');
  if (providerAt < 0) return null;
  let end = rows.length;
  for (let i = providerAt + 1; i < rows.length; i++) {
    if (significant(rows[i]) && indent(rows[i]) <= 6) { end = i; break; }
  }
  let start = providerAt + 1;
  if (scope.model) {
    const modelAt = rows.findIndex((row, index) => index >= start && index < end
      && indent(row) === 10 && row.text.trim() === '- id: ' + model);
    if (modelAt < 0) return null;
    start = modelAt + 1;
    for (let i = start; i < end; i++) {
      if (significant(rows[i]) && indent(rows[i]) <= 10) { end = i; break; }
    }
  }
  const matches = [];
  const expectedIndent = scope.model ? 12 : 8;
  for (let i = start; i < end; i++) {
    const match = rows[i].text.match(new RegExp('^ {' + expectedIndent + '}' + field + ':[ \\t]*(\\d+)(?:[ \\t]*(?:#.*)?)$'));
    if (match) {
      const relative = rows[i].text.indexOf(match[1]);
      matches.push({ start: rows[i].start + relative, end: rows[i].start + relative + match[1].length, value: match[1] });
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

function configurationFingerprint(profileRaw = null, version = installedDshVersion()) {
  try {
    const raw = profileRaw == null ? fs.readFileSync(PROFILE_FILE) : Buffer.from(profileRaw);
    return crypto.createHash('sha256').update(String(version)).update('\0').update(raw).digest('hex').toUpperCase();
  } catch { return null; }
}

// The whitelist IS the write policy: only these scalar keys can be edited from
// MC, each by replacing the value in place (group $1 keeps the key + comment +
// indentation; only the value changes). The summary maxTokens is scoped to the
// compaction-basic block because model maxTokens appear earlier in the file.
// Each entry carries the line-edit regex AND the value's safe range. GATE-2026-08-22
// (gauntlet C1): a bare /^\d+$/ accepted "0", and the refusal maths then SKIPPED
// its own guards because `window &&` / `&& summaryMaxTokens` treat 0 as
// not-applicable -- so contextWindow:0 (brain unusable) and summaryMaxTokens:0
// (summarise 32,768 tokens into 0 = the exact compaction treadmill this release
// exists to fix) both wrote clean. Every numeric key now states its floor.
// `unique: true` (gauntlet C2): the live settings.yaml has TWO contextWindow keys
// (the daily brain and the on-demand worker). A non-global replace silently edited
// whichever came first. Editing "a" context window when there are two is the
// dangerous default, so a multi-match refuses and names the count.
const SETTINGS_WHITELIST = {
  // Every model field is scoped to its exact id. The old generic
  // `contextWindow` regexp matched whichever model appeared first.
  contextWindow:       { scope: { model: true }, field: 'contextWindow', kind: 'int', min: 4096, max: 1048576, unique: true },
  brainContextWindow:  { scope: { provider: 'web-fast', model: 'halo/qwen3.6-35b-a3b-q6' }, field: 'contextWindow', kind: 'int', min: 4096, max: 1048576, unique: true },
  workerContextWindow: { scope: { provider: 'lmstudio', model: 'halo-coder-q4km' }, field: 'contextWindow', kind: 'int', min: 4096, max: 1048576, unique: true },
  defaultMaxTokens:    { scope: { model: true }, field: 'maxTokens', kind: 'int', min: 256, max: 262144, unique: true },
  brainMaxTokens:      { scope: { provider: 'web-fast', model: 'halo/qwen3.6-35b-a3b-q6' }, field: 'maxTokens', kind: 'int', min: 256, max: 262144, unique: true },
  workerMaxTokens:     { scope: { provider: 'lmstudio', model: 'halo-coder-q4km' }, field: 'maxTokens', kind: 'int', min: 256, max: 262144, unique: true },
  streamIdleTimeoutMs: { scope: {}, field: 'streamIdleTimeoutMs', kind: 'int', min: 600000, max: 7200000, defaultValue: 300000 },
  thresholdRatio:      { document: 'compaction', key: 'thresholdRatio', kind: 'ratio', defaultValue: 0.8 },
  retainRatio:         { document: 'compaction', key: 'retainRatio', kind: 'ratio', defaultValue: 0.16 },
  summaryMaxTokens:    { document: 'compaction', key: 'maxTokens', kind: 'int', min: 1024, max: 262144, defaultValue: 8192 },
  maxRetries:          { document: 'compaction', key: 'compactionRetries', kind: 'int', min: 0, max: 5, defaultValue: 1 },
  maxOverflowRetries:  { document: 'compaction', key: 'maxOverflowRetries', kind: 'int', min: 0, max: 5, defaultValue: 1 },
};

function compactionBlock(raw) {
  const lines = String(raw || '').split(/\r?\n/);
  const start = lines.findIndex(line => /^\s+- id:\s*compaction-basic\s*$/.test(line));
  if (start < 0) return null;
  const indent = lines[start].match(/^(\s*)/)?.[1].length || 0;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (new RegExp('^ {' + indent + '}- id:\\s*').test(lines[i])) { end = i; break; }
  }
  return { lines, start, end, indent };
}

function readCompactionValue(raw, key, fallback = null) {
  const block = compactionBlock(raw);
  if (!block) return fallback;
  const re = new RegExp('^ {' + (block.indent + 4) + '}' + key + ':\\s*([^#\\s]+)');
  for (let i = block.start + 1; i < block.end; i++) {
    const match = block.lines[i].match(re);
    if (match) return match[1];
  }
  return fallback;
}

function upsertCompactionValues(raw, values) {
  const block = compactionBlock(raw);
  if (!block) throw new Error('local preset does not contain the compaction-basic row');
  const lines = block.lines;
  let configAt = -1;
  const configIndent = block.indent + 2;
  const valueIndent = block.indent + 4;
  for (let i = block.start + 1; i < block.end; i++) if (new RegExp('^ {' + configIndent + '}config:\\s*$').test(lines[i])) { configAt = i; break; }
  if (configAt < 0) {
    let insertAt = block.start + 1;
    while (insertAt < block.end && new RegExp('^ {' + configIndent + '}(?:name|disabled):').test(lines[insertAt])) insertAt++;
    const additions = [' '.repeat(configIndent) + 'config:', ...Object.entries(values).map(([key, value]) => ' '.repeat(valueIndent) + `${key}: ${value}`)];
    lines.splice(insertAt, 0, ...additions);
  } else {
    let configEnd = block.end;
    for (let i = configAt + 1; i < block.end; i++) {
      if (lines[i].trim() && (lines[i].match(/^(\s*)/)?.[1].length || 0) < valueIndent) { configEnd = i; break; }
    }
    for (const [key, value] of Object.entries(values)) {
      const re = new RegExp('^ {' + valueIndent + '}' + key + ':');
      let found = false;
      for (let i = configAt + 1; i < configEnd; i++) {
        if (re.test(lines[i])) { lines[i] = ' '.repeat(valueIndent) + `${key}: ${value}`; found = true; break; }
      }
      if (!found) { lines.splice(configEnd, 0, ' '.repeat(valueIndent) + `${key}: ${value}`); configEnd++; }
    }
  }
  return lines.join(raw.includes('\r\n') ? '\r\n' : '\n');
}

// computeSettings and applySettings are PURE (string in, result out) so they are
// unit-tested off a temp file, never the live one. settingsData() is the only
// part that touches disk.
function computeSettings(raw, editContext = {}) {
  // gauntlet Eng-nit: this used to carry its OWN copy of every regex, structurally
  // similar to but separate from SETTINGS_WHITELIST's. Two hand-synced copies of
  // the same pattern drift -- and a read that disagrees with the write is how you
  // edit one key while displaying another. Read through the whitelist so there is
  // exactly one definition of where each value lives. (Group 2 is the value; the
  // whitelist's group 1 is the key + leading whitespace it preserves on write.)
  const read = (key) => {
    const spec = Object.prototype.hasOwnProperty.call(SETTINGS_WHITELIST, key) ? SETTINGS_WHITELIST[key] : null;
    if (!spec) return null;
    if (spec.document === 'compaction') return readCompactionValue(raw, spec.key, spec.defaultValue ?? null);
    const located = locateProfileField(raw, spec.scope || {}, spec.field, editContext.route || null);
    return located ? located.value : (spec.defaultValue ?? null);
  };
  const num = (key) => { const v = read(key); return v == null ? null : Number(v); };
  const window = num('contextWindow');
  const thresholdRatio = num('thresholdRatio');
  const retainRatio = num('retainRatio');
  const summaryMaxTokens = num('summaryMaxTokens');
  const streamIdleTimeoutMs = num('streamIdleTimeoutMs');
  const maxRetries = num('maxRetries');

  // C1: these used JS truthiness (`window &&`, `&& summaryMaxTokens`), so a real
  // ZERO made the derived value null and every refusal below silently skipped --
  // the guard opting itself out of exactly the value it exists to catch. Compare
  // explicitly, and treat a non-positive budget as a refusal in its own right.
  const compactAt = (window > 0 && thresholdRatio != null) ? Math.round(window * thresholdRatio) : null;
  const retain = (window > 0 && retainRatio != null) ? Math.round(window * retainRatio) : null;
  const toSummarize = (compactAt != null && retain != null) ? (compactAt - retain) : null;
  const summaryRatio = (toSummarize != null && summaryMaxTokens > 0) ? Number((toSummarize / summaryMaxTokens).toFixed(2)) : null;

  const refusals = [];
  if (window != null && !(window > 0))
    refusals.push('contextWindow is ' + window + ' -- a zero or negative window leaves no room for any request; the brain becomes unusable until this file is hand-edited.');
  if (summaryMaxTokens != null && !(summaryMaxTokens > 0))
    refusals.push('compaction summary maxTokens is ' + summaryMaxTokens + ' -- the summarizer would be asked to fold the whole retained context into nothing, which is the 2026-08-20 compaction treadmill.');
  if (retainRatio != null && thresholdRatio != null && retainRatio >= thresholdRatio)
    refusals.push('Retain ratio (' + retainRatio + ') must be BELOW the compaction threshold (' + thresholdRatio + '). If it is not, the first compaction lands at or above the threshold again, so the context never actually shrinks and the session compacts forever.');
  if (summaryRatio != null && summaryRatio > 4)
    refusals.push('summary ratio ' + summaryRatio + ':1 exceeds 4:1 -- the summarizer cannot fold that much into one pass, which is the 2026-08-20 compaction treadmill.');
  if (streamIdleTimeoutMs != null && streamIdleTimeoutMs < 600000)
    refusals.push('Stream idle timeout (' + streamIdleTimeoutMs + 'ms) is under 10 minutes, which is shorter than a healthy first token at depth on this machine. Live requests get killed and retried, and each retry re-reads the whole context -- that is the storm that burned 2.4M tokens in a single turn.');

  return {
    values: {
      window, thresholdRatio, retainRatio, summaryMaxTokens, streamIdleTimeoutMs, maxRetries,
      brainContextWindow: num('brainContextWindow'), workerContextWindow: num('workerContextWindow'),
      defaultMaxTokens: num('defaultMaxTokens'), brainMaxTokens: num('brainMaxTokens'),
      workerMaxTokens: num('workerMaxTokens'), maxOverflowRetries: num('maxOverflowRetries'),
    },
    math: { compactAt, retain, toSummarize, summaryRatio },
    refusals,
    ok: refusals.length === 0
  };
}

// Apply whitelisted line-edits to the raw file text, validate each value, then
// RE-RUN the refusal checks on the result. Returns the would-be content and any
// blocking errors/refusals -- the caller writes ONLY when ok. Nothing is written
// here; comments and everything off the whitelist are preserved verbatim.
function applySettingsDocuments(raw, changes, whitelist = SETTINGS_WHITELIST, editContext = {}) {
  let content = raw;
  const changed = [];
  const errors = [];
  const compactionChanges = {};
  for (const key of Object.keys(changes || {})) {
    // C5: `whitelist[key]` resolved Object.prototype members, so a key named
    // __proto__ / constructor / toString sailed past the guard and then crashed
    // on spec.kind -- the same bug already fixed three lines away in the ACTIONS
    // dispatcher. Own-property only, and never trust an inherited hit.
    const spec = Object.prototype.hasOwnProperty.call(whitelist, key) ? whitelist[key] : undefined;
    if (!spec || typeof spec !== 'object') { errors.push('key not editable from Mission Control: ' + key); continue; }
    const v = String(changes[key]).trim();
    if (spec.kind === 'int') {
      if (!/^\d+$/.test(v)) { errors.push(key + ' must be a whole number'); continue; }
      const n = Number(v);
      if (spec.min != null && n < spec.min) { errors.push(key + ' must be at least ' + spec.min + ' (got ' + n + ') -- a smaller value breaks the harness'); continue; }
      if (spec.max != null && n > spec.max) { errors.push(key + ' must be at most ' + spec.max + ' (got ' + n + ')'); continue; }
    }
    else if (spec.kind === 'ratio') { const n = Number(v); if (!(n > 0 && n < 1)) { errors.push(key + ' must be a ratio strictly between 0 and 1'); continue; } }
    else if (spec.kind === 'enum') { if (!spec.enum.includes(v)) { errors.push(key + ' must be one of: ' + spec.enum.join(', ')); continue; } }
    if (spec.document === 'compaction') {
      compactionChanges[spec.key] = v;
      changed.push(key + ' -> ' + v);
      continue;
    }
    const located = locateProfileField(content, spec.scope || {}, spec.field, editContext.route || null);
    if (!located) {
      errors.push(key + ' was not found in the exact Web profile provider/model row -- cannot line-edit it'); continue;
    }
    content = content.slice(0, located.start) + v + content.slice(located.end);
    changed.push(key + ' -> ' + v);
  }
  if (Object.keys(compactionChanges).length) {
    try { content = upsertCompactionValues(content, compactionChanges); }
    catch (error) { errors.push(String(error?.message || error)); }
  }
  const after = computeSettings(content, editContext);
  return {
    content, changed, errors, refusals: after.refusals,
    ok: errors.length === 0 && after.refusals.length === 0,
  };
}

// Kept for the deterministic pure-function contract.
function applySettings(raw, changes, whitelist = SETTINGS_WHITELIST) {
  return applySettingsDocuments(raw, changes, whitelist);
}
/*__SETTINGS_FN_END__*/

function pruneSettingsBackups(file, keep = 10) {
  try {
    const dir = path.dirname(file);
    const prefix = path.basename(file) + '.mc-bak-';
    const backups = fs.readdirSync(dir).filter(name => name.startsWith(prefix)).sort();
    for (const name of backups.slice(0, Math.max(0, backups.length - keep))) {
      try { fs.unlinkSync(path.join(dir, name)); } catch { /* best-effort retention */ }
    }
  } catch { /* backups are still usable even if old copies cannot be pruned */ }
}

function atomicWriteUtf8(file, content, nonce) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.mc-write-' + nonce;
  try {
    fs.writeFileSync(temp, content, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temp, file);
  } finally {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch { /* best effort */ }
  }
}

// The live Web profile and its versioned source may legitimately differ in the
// selected route. Apply the same requested scalar edits independently to each
// baseline, compare-and-swap both inputs, then replace both or roll both back.
// A failure after the first replacement restores every original byte string.
function applySettingsTransaction(changes) {
  const documents = [
    { name: 'live Web profile', path: PROFILE_FILE },
    { name: 'repository Web profile', path: REPO_PROFILE_FILE },
  ];
  const before = new Map();
  try {
    for (const doc of documents) before.set(doc.path, fs.readFileSync(doc.path, 'utf8'));
  } catch (error) {
    return { ok: false, status: 500, errors: ['A settings source is not readable: ' + String(error?.message || error)] };
  }

  const candidates = new Map();
  let result = null;
  const editContext = { route: parseAgentDefaultRoute(before.get(PROFILE_FILE)) };
  if (!editContext.route.provider || !editContext.route.model) {
    return { ok: false, status: 409, errors: ['The live Web profile default route is not readable; nothing was written.'] };
  }
  for (const doc of documents) {
    const candidate = applySettingsDocuments(before.get(doc.path), changes, SETTINGS_WHITELIST, editContext);
    if (!candidate.ok) return { ...candidate, status: 409,
      errors: candidate.errors.map(error => doc.name + ': ' + error) };
    candidates.set(doc.path, candidate.content);
    if (!result) result = candidate;
  }

  const nonce = `${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  fs.mkdirSync(MC_DIR, { recursive: true });
  const stageDir = fs.mkdtempSync(path.join(MC_DIR, 'settings-stage-'));
  const stagedProfiles = documents.map((doc, index) => path.join(stageDir, `profile-${index}.yml`));
  try {
    for (let index = 0; index < documents.length; index++) {
      const doc = documents[index];
      fs.writeFileSync(stagedProfiles[index], candidates.get(doc.path), 'utf8');
      const checked = fs.readFileSync(stagedProfiles[index], 'utf8');
      if (checked !== candidates.get(doc.path)) {
        return { ok: false, status: 500, errors: [doc.name + ' staged bytes did not read back exactly; nothing was written.'] };
      }
      const staged = computeSettings(checked, editContext);
      if (!compactionBlock(checked) || !staged.ok) {
        return { ok: false, status: 409, errors: [],
          refusals: staged.refusals.length ? staged.refusals : [doc.name + ' has no compaction-basic row'] };
      }
    }

    // No await occurs in this transaction, but external editors and DSH sync
    // jobs can still race it. Verify both byte strings at the final edge.
    for (const doc of documents) {
      if (fs.readFileSync(doc.path, 'utf8') !== before.get(doc.path)) {
        return { ok: false, status: 409, errors: [doc.name + ' changed during validation; nothing was written. Reload Settings and try again.'] };
      }
    }

    const desired = candidates;
    const targets = documents.filter(doc => desired.get(doc.path) !== before.get(doc.path));
    if (!targets.length) return { ...result, ok: true, written: [] };

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    for (const doc of targets) {
      fs.copyFileSync(doc.path, doc.path + '.mc-bak-' + stamp);
      fs.copyFileSync(doc.path, doc.path + '.mc-bak');
      pruneSettingsBackups(doc.path);
    }

    const written = [];
    try {
      for (const doc of targets) {
        atomicWriteUtf8(doc.path, desired.get(doc.path), nonce);
        written.push(doc);
      }
    } catch (writeError) {
      const rollbackErrors = [];
      for (const doc of written.reverse()) {
        try { atomicWriteUtf8(doc.path, before.get(doc.path), nonce + '-rollback-' + rollbackErrors.length); }
        catch (rollbackError) { rollbackErrors.push(doc.name + ': ' + String(rollbackError?.message || rollbackError)); }
      }
      const suffix = rollbackErrors.length ? ' Rollback also failed for ' + rollbackErrors.join('; ') : ' All replaced files were restored.';
      throw new Error('Settings transaction failed: ' + String(writeError?.message || writeError) + suffix);
    }
    return { ...result, ok: true, written: targets.map(doc => doc.path) };
  } finally {
    try { fs.rmSync(stageDir, { recursive: true, force: true }); } catch { /* stale staging is inert */ }
  }
}

/*__REASONING_CONTRACT_START__*/
// DSH and LM Studio expose two different kinds of reasoning control here.
// DSH may send a named effort only when a provider/model explicitly declares
// real effort levels. The Halo LM Studio aliases expose a Boolean Jinja switch
// instead. Never relabel Boolean on/off as low/medium/high: that was the stale
// Mission Control fiction this contract replaces.
function parseAgentDefaultRoute(raw) {
  const text = String(raw || '');
  const profile = text.match(/(?:^|\n)- id:\s*agent-default-model\s*\r?\n([\s\S]*?)(?=\r?\n- (?:id|insert):|$)/);
  const match = profile
    ? [profile[0], profile[1]]
    : text.match(/(?:^|\n)agent-default-model:\s*\r?\n((?:[ \t]+[^\r\n]*(?:\r?\n|$))*)/);
  if (!match) return { provider: null, model: null, reasoningEffort: null };
  const block = match[1];
  const field = (name) => {
    const value = block.match(new RegExp('^[ \\t]+' + name + ':[ \\t]*([^#\\r\\n]+)', 'm'))?.[1]?.trim() || null;
    return value && /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
  };
  return {
    provider: field('provider'),
    model: field('model'),
    reasoningEffort: field('reasoningEffort'),
  };
}

function describeModelReasoning(raw) {
  const text = String(raw || '');
  if (!text.trim()) return { value: 'unknown', basis: 'model definition unavailable' };

  const custom = text.match(/(?:^|\n)\s*-\s*key:\s*enableThinking\b([\s\S]*?)(?=\r?\n\s*-\s*key:|\r?\n\S|$)/);
  const configured = custom?.[1]?.match(/^\s*defaultValue:\s*(true|false)\s*$/m)?.[1];
  if (configured) {
    return {
      value: configured === 'true' ? 'on' : 'off',
      basis: 'LM Studio enableThinking default=' + configured,
    };
  }

  const capability = text.match(/^\s*reasoning:\s*(true|false)\s*$/m)?.[1];
  if (capability === 'false') return { value: 'off', basis: 'model declares reasoning=false' };
  if (capability === 'true') {
    return { value: 'provider default', basis: 'reasoning-capable; no on/off default is declared' };
  }
  return { value: 'unknown', basis: 'model does not declare a reasoning contract' };
}

function describeConfiguredReasoningEffort(route) {
  if (route?.reasoningEffort) {
    return { value: 'explicit ' + route.reasoningEffort, basis: 'configured in DSH settings' };
  }
  return { value: 'none', basis: 'adapter/provider resolves at request time' };
}

function resolveCurrentRouteReasoning(route, definitions = {}) {
  const routeKey = route?.provider && route?.model ? route.provider + '/' + route.model : null;
  const exact = routeKey ? definitions[routeKey] : null;
  if (exact?.raw?.trim()) {
    return { ...describeModelReasoning(exact.raw), source: exact.source || null };
  }
  return {
    value: 'provider-owned',
    basis: 'unknown from static DSH configuration; no exact alias contract is declared for this route',
    source: null,
  };
}

function buildReasoningRows({
  route,
  definitions = {},
  settingsSource,
  brainContract,
  brainSource,
  workerContract,
  workerSource,
}) {
  const routeName = route?.provider && route?.model
    ? route.provider + '/' + route.model
    : 'not declared';
  const configuredEffort = describeConfiguredReasoningEffort(route);
  const currentContract = resolveCurrentRouteReasoning(route, definitions);
  return [
    { label: 'Configured DSH route', value: routeName, source: settingsSource },
    {
      label: 'Configured DSH reasoning effort',
      value: configuredEffort.value + ' — ' + configuredEffort.basis,
      source: settingsSource,
    },
    {
      label: 'Current model reasoning contract',
      value: currentContract.value + ' — ' + currentContract.basis,
      source: currentContract.source || settingsSource,
    },
    {
      label: 'Daily brain alias reasoning default',
      value: brainContract.value + ' — ' + brainContract.basis,
      source: brainSource,
    },
    {
      label: 'Worker alias reasoning default',
      value: workerContract.value + ' — ' + workerContract.basis,
      source: workerSource,
    },
  ];
}
/*__REASONING_CONTRACT_END__*/

function settingsData(file = PROFILE_FILE) {
  let raw = '';
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch { return { error: 'Web profile not readable at ' + file }; }
  const brainFile = DAILY_BRAIN.definition;
  const workerFile = DAILY_WORKER.definition;
  const tunedBrain27File = TUNED_BRAIN_27B.definition;
  const readText = p => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
  const brain = readText(brainFile);
  const worker = readText(workerFile);
  const tunedBrain27 = readText(tunedBrain27File);
  const n = (text, re, fallback = null) => { const m = text.match(re); return m ? Number(m[1]) : fallback; };
  const route = parseAgentDefaultRoute(raw);
  const brainReasoning = describeModelReasoning(brain);
  const workerReasoning = describeModelReasoning(worker);
  const reasoningDefinitions = {
    // DSH routes by the alias identifier from the Web profile. Keep the physical
    // LM Studio model key as an additional exact key for manually selected
    // routes, but never confuse it with the configured stock alias.
    ['web-fast/' + DAILY_BRAIN.identifier]: { raw: brain, source: brainFile },
    ['web-fast/' + DAILY_BRAIN.modelKey]: { raw: brain, source: brainFile },
    ['lmstudio/' + DAILY_WORKER.identifier]: { raw: worker, source: workerFile },
    ['lmstudio/' + DAILY_WORKER.modelKey]: { raw: worker, source: workerFile },
    ['lmstudio/' + TUNED_BRAIN_27B.modelKey]: { raw: tunedBrain27, source: tunedBrain27File },
  };
  const reasoningRows = buildReasoningRows({
    route,
    definitions: reasoningDefinitions,
    settingsSource: file,
    brainContract: brainReasoning,
    brainSource: brainFile,
    workerContract: workerReasoning,
    workerSource: workerFile,
  });
  const computed = computeSettings(raw);
  const v = computed.values;
  return {
    file, profileKind: 'web cordis.patch.yml', editable: true, math: computed.math, refusals: computed.refusals,
    rows: [
      { label: 'Current route context window', value: v.window + ' tokens', rawValue: v.window, editableKey: 'contextWindow', suffix: ' tokens', source: file },
      { label: 'Brain context window', value: v.brainContextWindow + ' tokens', rawValue: v.brainContextWindow, editableKey: 'brainContextWindow', suffix: ' tokens', source: file },
      { label: 'Worker context window', value: v.workerContextWindow + ' tokens', rawValue: v.workerContextWindow, editableKey: 'workerContextWindow', suffix: ' tokens', source: file },
      { label: 'Current route maximum output', value: v.defaultMaxTokens + ' tokens', rawValue: v.defaultMaxTokens, editableKey: 'defaultMaxTokens', suffix: ' tokens', source: file },
      { label: 'Brain maximum output', value: v.brainMaxTokens + ' tokens', rawValue: v.brainMaxTokens, editableKey: 'brainMaxTokens', suffix: ' tokens', source: file },
      { label: 'Worker maximum output', value: v.workerMaxTokens + ' tokens', rawValue: v.workerMaxTokens, editableKey: 'workerMaxTokens', suffix: ' tokens', source: file },
      { label: 'Compaction enabled', value: 'true', source: file + ' + dsh-compaction-basic default' },
      { label: 'Compaction threshold', value: v.thresholdRatio, rawValue: v.thresholdRatio, editableKey: 'thresholdRatio', source: readCompactionValue(raw, 'thresholdRatio', null) == null ? 'dsh-compaction-basic default' : file },
      { label: 'Compaction retain ratio', value: v.retainRatio, rawValue: v.retainRatio, editableKey: 'retainRatio', source: readCompactionValue(raw, 'retainRatio', null) == null ? 'dsh-compaction-basic default' : file },
      { label: 'Compaction summary maximum', value: v.summaryMaxTokens + ' tokens', rawValue: v.summaryMaxTokens, editableKey: 'summaryMaxTokens', suffix: ' tokens', source: readCompactionValue(raw, 'maxTokens', null) == null ? 'dsh-compaction-basic default' : file },
      { label: 'Compaction retries', value: v.maxRetries, rawValue: v.maxRetries, editableKey: 'maxRetries', source: readCompactionValue(raw, 'compactionRetries', null) == null ? 'dsh-compaction-basic default' : file },
      { label: 'Overflow compaction retries', value: v.maxOverflowRetries, rawValue: v.maxOverflowRetries, editableKey: 'maxOverflowRetries', source: readCompactionValue(raw, 'maxOverflowRetries', null) == null ? 'dsh-compaction-basic default' : file },
      { label: 'Provider stream idle timeout', value: v.streamIdleTimeoutMs + ' ms', rawValue: v.streamIdleTimeoutMs, editableKey: 'streamIdleTimeoutMs', suffix: ' ms', source: /streamIdleTimeoutMs:/.test(raw) ? file : 'dsh-llm-pi-ai default' },
      ...reasoningRows,
      { label: 'Brain parallel slots', value: n(brain, /llm\.load\.numParallelSessions[\s\S]*?value:\s*(\d+)/, DAILY_BRAIN.parallel), source: brainFile },
      { label: 'Worker parallel slots', value: n(worker, /llm\.load\.numParallelSessions[\s\S]*?value:\s*(\d+)/, DAILY_WORKER.parallel), source: workerFile },
    ]
  };
}

// ─────────────────────────── HTTP server ───────────────────────────

function setCommonSecurityHeaders(res) {
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'none'; object-src 'none'");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

const server = http.createServer(async (req, res) => {
  try {
    setCommonSecurityHeaders(res);
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/')) res.setHeader('cache-control', 'no-store');
    if (req.method === 'GET' && url.pathname === '/') {
      // no-store: the app ships inline in this file — a cached copy silently
      // runs stale UI against a newer server after every MC update.
      // Inject the per-boot action token into the served page. A cross-origin
      // attacker cannot read the response (same-origin policy), so it cannot
      // learn the token and cannot forge an authorized state-changing POST.
      const page = PAGE.replace('__MC_ACTION_TOKEN__', ACTION_TOKEN);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(page); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/status') {
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(await status())); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/catalog') {
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(await catalog())); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/settings') {
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(settingsData())); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/plugins') {
      const dshUp = await tcpCheck(3080);
      const slow = dshUp ? await slowPulls() : slowCacheView(Date.now(), 'DSH port unavailable');
      const overrides = cordisOverrideIds();
      const rawEntries = slow.pluginEntries || [];
      const moduleCounts = new Map();
      for (const e of rawEntries) moduleCounts.set(e.moduleName, (moduleCounts.get(e.moduleName) || 0) + 1);
      // Sort: failed (red) first, then stuck-transitioning, then ordinary
      // transitioning (both amber), then waiting (dimmed — benign), then
      // active, then disabled.
      const bucketRank = (b, stuck) => {
        if (b === 'failed') return 0;
        if (b === 'transitioning') return stuck ? 1 : 2;
        if (b === 'waiting') return 3;
        if (b === 'active') return 4;
        return 5; // disabled
      };
      const entries = rawEntries.map(e => {
        let description = resolveModuleDescription(e.moduleName);
        if (description && (moduleCounts.get(e.moduleName) || 0) > 1) {
          description += ` · instance: ${entryInstanceSuffix(e.entryId)}`;
        }
        const cls = slow.pluginById?.get(e.entryId) || { bucket: classifyPluginPhase(e.enabled, e.fiberPhase), stuck: false };
        return {
          entryId: e.entryId, moduleName: e.moduleName, enabled: e.enabled, fiberPhase: e.fiberPhase,
          bucket: cls.bucket, stuck: !!cls.stuck,
          haloOverride: overrides.has(e.entryId),
          description: description || '—',
        };
      }).sort((a, b) => bucketRank(a.bucket, a.stuck) - bucketRank(b.bucket, b.stuck) || a.entryId.localeCompare(b.entryId));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        error: !slow.pluginEntries, entries,
        summary: slow.pluginSummary ? { ...slow.pluginSummary, stale: slow.stale, cacheState: slow.state } : null,
        stale: slow.stale, cacheState: slow.state, sampledAt: slow.sampledAt || null,
        sourceAgeMs: slow.ageMs, refreshError: slow.error,
      }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/sessions') {
      const dshUp = await tcpCheck(3080);
      const wantAll = url.searchParams.get('all') === '1';
      const sc = await getSessions(dshUp, wantAll ? 500 : 50);
      const today = todayStats(sc.sessions || []);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ sessions: sc.sessions, source: sc.source, today }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/memory-graph') {
      const graph = parseMemoryFile(MEMORY_FILE);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ...graph, error: graph.error || null, tripwire: MEMORY_ENTITY_TRIPWIRE }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/history') {
      const hours = Math.min(Math.max(Number(url.searchParams.get('hours')) || 6, 1), 336);
      const rows = readHistoryRange(Date.now() - hours * 3600000);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ hours, rows }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/logtail') {
      try {
        const file = selectNewestLogFile(LMSTUDIO_LOGS);
        if (!file) throw new Error('no log files');
        const all = fs.readFileSync(file, 'utf8').split('\n');
        // The raw tail is ~90% LMSAuthenticator polling chatter (getLoadConfig /
        // getModelInfo / getInstanceProcessingState with long instance hashes),
        // which buries the lines an operator actually needs - loads, unloads,
        // errors, engine messages. Filter by default; ?raw=1 shows everything.
        const NOISE = /\[LMSAuthenticator\]|Getting (load config stack|descriptor|instance processing state)|Listing (loaded|downloaded) models|Client (created|disconnected)/;
        const raw = url.searchParams.get('raw') === '1';
        const kept = raw ? all : all.filter(l => l.trim() && !NOISE.test(l));
        const lines = kept.slice(-80);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: false, file, fileMtimeMs: fs.statSync(file).mtimeMs, lines, filtered: !raw, dropped: raw ? 0 : all.filter(l => l.trim()).length - kept.length }));
      } catch {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: true, file: null, lines: [] }));
      }
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/validate-config') {
      if (!actionAuthorized(req)) { res.writeHead(403); res.end('unauthorized: missing or invalid action token'); return; }
      let result;
      const fingerprintBefore = configurationFingerprint();
      const version = installedDshVersion();
      try {
        // Validate with the exact DSH bits installed in this deployment. A
        // network `dlx` could validate a different build and used to download
        // hundreds of packages from an operator button.
        if (!fs.existsSync(DSH_BIN)) throw new Error('installed DSH validator not found under the stock deployment');
        const { stdout, stderr } = await safeExecFile('node', [DSH_BIN, 'web', '--dump-config'], {
          cwd: DSH_ROOT,
          env: { ...process.env, DSH_HOME },
          timeout: 60000,
          maxBuffer: 16 * 1024 * 1024,
        });
        const combined = `${stdout}\n${stderr}`;
        const warnings = parseValidationDiagnostics(combined);
        const fingerprintAfter = configurationFingerprint();
        if (!fingerprintBefore || fingerprintAfter !== fingerprintBefore) {
          warnings.push('Web profile or installed DSH version changed during validation; retry against a stable configuration');
        }
        result = { when: Date.now(), ok: warnings.length === 0, warnings,
          fingerprint: fingerprintAfter, dshVersion: version, profile: PROFILE_FILE };
      } catch (e) {
        result = { when: Date.now(), ok: false, warnings: [String(e.message || e).slice(0, 500)],
          fingerprint: configurationFingerprint(), dshVersion: version, profile: PROFILE_FILE };
        // If a plugin spawned a descendant during composition, clean up only
        // the exact installed bin.js dump-config command from this deployment.
        if (/timeout|ETIMEDOUT/i.test(String(e.message || e))) {
          try {
            const quotedBin = DSH_BIN.replace(/'/g, "''");
            if (EXE.powershell) {
              execFile(EXE.powershell, ['-NoProfile', '-Command',
                `$needle=[regex]::Escape('${quotedBin}'); Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match $needle -and $_.CommandLine -match '--dump-config' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`],
                { shell: false, timeout: 15000, env: scrubbedChildEnv() }, () => {});
            }
          } catch { /* best-effort cleanup */ }
        }
      }
      writeState({ lastValidation: result });
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(result)); return;
    }
    if (req.method === 'POST' && url.pathname === '/api/action/load-model') {
      if (!actionAuthorized(req)) { res.writeHead(403); res.end('unauthorized: missing or invalid action token'); return; }
      let body;
      try { body = await readBody(req); } catch { res.writeHead(400); res.end('bad json'); return; }
      const { path: modelPath, modelKey, ctx } = body || {};
      if (!modelPath || !modelKey) { res.writeHead(400); res.end('path and modelKey required'); return; }
      // Validate against the REAL catalog, not just truthiness. lms ls is the
      // set of models that actually exist; anything else is rejected before it
      // can reach a subprocess. modelKey (the identifier we assign) is held to
      // a strict charset so it cannot smuggle a flag or a metacharacter.
      const catalog = await lmsLs();
      if (!(catalog || []).some(m => m.path === modelPath || m.modelKey === modelPath)) {
        res.writeHead(400); res.end('unknown model path (not in lms ls)'); return;
      }
      if (!/^[A-Za-z0-9._:@\/-]{1,128}$/.test(String(modelKey))) {
        res.writeHead(400); res.end('invalid modelKey'); return;
      }
      const ctxN = Number.isFinite(ctx) && ctx > 0 ? Math.min(1048576, Math.round(ctx)) : DAILY_BRAIN.context;
      // No shell: args are an argv vector, never concatenated into a command line.
      try {
        await runLmsMutation(
          ['load', String(modelPath), '--identifier', String(modelKey), '--gpu', 'max', '--context-length', String(ctxN), '--parallel', '1', '--no-speculative-draft-mtp', '-y'],
          String(modelKey), true, 10 * 60 * 1000,
        );
        res.writeHead(200); res.end(`loaded and corroborated: ${modelKey}`); return;
      } catch (error) {
        console.error('[mission-control] model load failed:', error);
        res.writeHead(502); res.end('model load failed or residency could not be corroborated; see the Mission Control log'); return;
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/action/unload-model') {
      if (!actionAuthorized(req)) { res.writeHead(403); res.end('unauthorized: missing or invalid action token'); return; }
      let body;
      try { body = await readBody(req); } catch { res.writeHead(400); res.end('bad json'); return; }
      const { identifier } = body || {};
      if (!identifier) { res.writeHead(400); res.end('identifier required'); return; }
      // The identifier MUST match a currently-loaded model. This both validates
      // input (only real, resident identifiers reach the subprocess) and lets
      // the LM Link guard below apply unconditionally -- previously an
      // attacker-crafted string left `target` undefined and fell straight
      // through to spawn. No match -> reject, never execute.
      const ps = await lmsPs();
      const target = (ps || []).find(m => m.identifier === identifier);
      if (!target) { res.writeHead(404); res.end('no such loaded model'); return; }
      if (target.deviceIdentifier != null) {
        res.writeHead(403); res.end('refused: model runs on a remote LM Link device — unload it from that device'); return;
      }
      try {
        await runLmsMutation(['unload', String(identifier)], String(identifier), false, 60000);
        res.writeHead(200); res.end(`unloaded and corroborated: ${identifier}`); return;
      } catch (error) {
        console.error('[mission-control] model unload failed:', error);
        res.writeHead(502); res.end('model unload failed or residency could not be corroborated; see the Mission Control log'); return;
      }
    }
    // Stop ONE session. On 2026-08-20 the only way to end a runaway was to
    // kill the whole harness process from a shell, which also ends every other
    // session and the cockpit itself. A console that lists running sessions
    // has to be able to stop one of them.
    if (req.method === 'POST' && url.pathname === '/api/action/stop-session') {
      if (!actionAuthorized(req)) { res.writeHead(403); res.end('unauthorized: missing or invalid action token'); return; }
      let body;
      try { body = await readBody(req); } catch { res.writeHead(400); res.end('bad json'); return; }
      const { sessionId } = body || {};
      if (!sessionId || typeof sessionId !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(sessionId)) { res.writeHead(400); res.end('valid sessionId required'); return; }
      try {
        const result = await dshRpc('session/cancel', { request: { sessionId } });
        if (result?.accepted !== true) throw new Error('DSH did not acknowledge cancellation');
        res.writeHead(200); res.end('cancel accepted'); return;
      } catch (e) {
        console.error('[mission-control] session cancel failed:', redactDshAuthority(e?.message || e));
        res.writeHead(502); res.end('the harness did not accept the session cancellation; see the Mission Control log'); return;
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/action/apply-settings') {
      if (!actionAuthorized(req)) { res.writeHead(403); res.end('unauthorized: missing or invalid action token'); return; }
      let body;
      try { body = await readBody(req); } catch { res.writeHead(400); res.end('bad json'); return; }
      const changes = (body && body.changes) || {};
      if (typeof changes !== 'object' || Array.isArray(changes)) { res.writeHead(400); res.end('changes object required'); return; }
      try {
        const result = applySettingsTransaction(changes);
        if (!result.ok) {
          res.writeHead(result.status || 409, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ applied: false, errors: result.errors || [], refusals: result.refusals || [] }));
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          applied: true,
          changed: result.changed,
          written: result.written,
          note: result.written.length
            ? 'Live and repository Web profiles were updated transactionally. Restart DSH for composition changes to take effect.'
            : 'No settings values changed.',
        }));
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ applied: false, errors: [String((e && e.message) || e)] }));
      }
      return;
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/action/')) {
      if (!actionAuthorized(req)) { res.writeHead(403); res.end('unauthorized: missing or invalid action token'); return; }
      const a = url.pathname.split('/').pop();
      // Own properties only: `ACTIONS[a]` walked the prototype chain, so
      // /api/action/constructor and /api/action/hasOwnProperty resolved to
      // functions and returned 200 (QA3). Restrict to declared actions.
      if (Object.prototype.hasOwnProperty.call(ACTIONS, a) && typeof ACTIONS[a] === 'function') {
        try {
          await ACTIONS[a]();
          res.writeHead(200); res.end(a === 'start-cockpit' ? 'start request spawned' : 'action completed and corroborated'); return;
        } catch (error) {
          console.error(`[mission-control] action ${a} failed:`, redactDshAuthority(error?.message || error));
          res.writeHead(502); res.end('action failed; see the Mission Control log'); return;
        }
      }
      res.writeHead(404); res.end('unknown action'); return;
    }
    res.writeHead(404); res.end('not found');
  } catch (e) {
    // gauntlet Eng-minor: this returned String(e) to the caller, handing an
    // unexpected error's message -- and any absolute path or internal detail in
    // it -- straight to the browser. The operator needs it in the log, not the
    // response body.
    console.error('[mission-control] unhandled request error:', e);
    res.writeHead(500); res.end('internal error - see the Mission Control console output');
  }
});
// The whole UI script is a string inside this file, so a syntax error in it
// is invisible to `node --check` and ships as a BLANK PAGE that still returns
// HTTP 200. Twice now that has been an escaped quote eaten by the template
// literal. Parse it at boot and refuse to pretend everything is fine.
(function validatePageContent() {
  // Windows paths written literally in this template literal lose their
  // backslashes silently: `~\.dsh\memory\memory.json` renders as
  // `~.dshmemorymemory.json`. It parses fine and looks like a typo to the
  // reader, so nothing catches it - a design reviewer flagged exactly this
  // and it was initially dismissed as a misread. Paths must be escaped (\\).
  const mangled = PAGE.match(/~\.[A-Za-z][A-Za-z0-9.]{6,}/g);
  if (mangled) {
    console.error('FATAL: a Windows path lost its backslashes in the page template:');
    [...new Set(mangled)].forEach(p => console.error('  ' + p + '   (write it as ~\\\\.dsh\\\\... in the source)'));
    process.exit(1);
  }
})();

(function validatePageScript() {
  const m = PAGE.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) { console.error('FATAL: no inline script found in PAGE'); process.exit(1); }
  try {
    new Function(m[1]);
  } catch (e) {
    console.error('FATAL: the UI script does not parse — the page would render blank.');
    console.error('  ' + e.message);
    const line = String(e.stack || '').match(/<anonymous>:(\d+)/);
    if (line) {
      const src = m[1].split('\n');
      const n = Number(line[1]) - 2;
      for (let i = Math.max(0, n - 2); i < Math.min(src.length, n + 1); i++) {
        console.error(`  ${i + 1}: ${src[i].trim().slice(0, 150)}`);
      }
    }
    process.exit(1);
  }
})();

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mission Control on http://127.0.0.1:${PORT}`);
  appendHistory();
  setInterval(appendHistory, 60000);
  modelRecoveryTick();
  setInterval(modelRecoveryTick, 15000);
});
