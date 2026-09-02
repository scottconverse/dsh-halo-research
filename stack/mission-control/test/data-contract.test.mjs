import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const missionControlFile = process.env.HALO_MC_SOURCE_UNDER_TEST
  ? path.resolve(process.env.HALO_MC_SOURCE_UNDER_TEST)
  : path.join(here, '..', 'mission-control.mjs');
const source = fs.readFileSync(missionControlFile, 'utf8');

function dataContractFunctions() {
  const startMark = '/*__DATA_CONTRACT_START__*/';
  const endMark = '/*__DATA_CONTRACT_END__*/';
  const start = source.indexOf(startMark);
  const end = source.indexOf(endMark);
  assert.notEqual(start, -1, 'data contract start marker is present');
  assert.notEqual(end, -1, 'data contract end marker is present');
  assert.ok(end > start, 'data contract markers are ordered');
  const body = source.slice(start + startMark.length, end);
  return new Function('fs', 'path', `${body}\nreturn { parseMemoryFile, selectNewestLogFile, selectDecodeObservation, describeValidationFreshness, parseValidationDiagnostics, describeRouteRuntime, normalizeHistoryRow, pruneHistoryLines, parseGpuCounterOutput, describeFileFreshness, downsampleHistoryRows, summarizeStalledSessions, describeCacheState, describeMuxState, readSnapshotCadence, selectLatestCompletedSession: typeof selectLatestCompletedSession === 'function' ? selectLatestCompletedSession : undefined, resolveExactResidentRole: typeof resolveExactResidentRole === 'function' ? resolveExactResidentRole : undefined, modelStateMatches: typeof modelStateMatches === 'function' ? modelStateMatches : undefined };`)(fs, path);
}

test('malformed memory JSON fails closed instead of reporting a healthy graph', () => {
  const { parseMemoryFile } = dataContractFunctions();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-memory-'));
  const file = path.join(dir, 'memory.json');
  fs.writeFileSync(file, [
    JSON.stringify({ type: 'entity', name: 'valid', entityType: 'probe', observations: ['ok'] }),
    '{ definitely not json',
  ].join('\n'));
  try {
    const result = parseMemoryFile(file);
    assert.equal(result.ok, false);
    assert.equal(result.invalidRecords, 1);
    assert.match(result.error, /malformed/i);
    assert.equal(result.entities.length, 1, 'valid records remain visible for diagnosis');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('unknown or structurally invalid memory records fail closed', () => {
  const { parseMemoryFile } = dataContractFunctions();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-memory-'));
  const file = path.join(dir, 'memory.json');
  fs.writeFileSync(file, [
    JSON.stringify({ type: 'entity', name: '', entityType: 'probe', observations: [] }),
    JSON.stringify({ type: 'mystery', value: 1 }),
  ].join('\n'));
  try {
    const result = parseMemoryFile(file);
    assert.equal(result.ok, false);
    assert.equal(result.invalidRecords, 2);
    assert.equal(result.entities.length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('duplicate entities and dangling relations fail closed instead of inflating the graph', () => {
  const { parseMemoryFile } = dataContractFunctions();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-memory-relations-'));
  const file = path.join(dir, 'memory.json');
  fs.writeFileSync(file, [
    JSON.stringify({ type: 'entity', name: 'alpha', entityType: 'probe', observations: ['first'] }),
    JSON.stringify({ type: 'entity', name: 'alpha', entityType: 'probe', observations: ['duplicate'] }),
    JSON.stringify({ type: 'relation', from: 'alpha', to: 'missing', relationType: 'points-at' }),
  ].join('\n'));
  try {
    const result = parseMemoryFile(file);
    assert.equal(result.ok, false);
    assert.equal(result.duplicateEntities, 1);
    assert.equal(result.danglingRelations, 1);
    assert.equal(result.entities.length, 1, 'the drawable entity set is unique');
    assert.equal(result.relations.length, 0, 'dangling relations are not counted as drawable');
    assert.match(result.error, /duplicate/i);
    assert.match(result.error, /dangling/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the newest LM Studio log is selected by modification time, not lexical name', () => {
  const { selectNewestLogFile } = dataContractFunctions();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-logs-'));
  const month = path.join(dir, '2026-09');
  fs.mkdirSync(month);
  const lexicalWinner = path.join(month, '2026-09-01.9.log');
  const actualNewest = path.join(month, '2026-09-01.10.log');
  fs.writeFileSync(lexicalWinner, 'old');
  fs.writeFileSync(actualNewest, 'new');
  const old = new Date('2026-09-01T10:00:00Z');
  const fresh = new Date('2026-09-01T11:00:00Z');
  fs.utimesSync(lexicalWinner, old, old);
  fs.utimesSync(actualNewest, fresh, fresh);
  try {
    assert.equal(selectNewestLogFile(dir), actualNewest);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a completed-session decode rate is emitted once rather than repeated every minute', () => {
  const { selectDecodeObservation } = dataContractFunctions();
  const sessions = [{ id: 's1', mtime: 1234, decodeTps: 22.1 }];
  const first = selectDecodeObservation(sessions, null);
  assert.equal(first.decodeTps, 22.1);
  assert.equal(first.decodeSourceKey, 's1:1234');
  const repeated = selectDecodeObservation(sessions, first);
  assert.equal(repeated.decodeTps, null);
  assert.equal(repeated.decodeSourceKey, 's1:1234');
});

test('a repeated completed-run observation stays absent through history normalization', () => {
  const { selectDecodeObservation, normalizeHistoryRow } = dataContractFunctions();
  const sessions = [{ id: 's1', mtime: 1234, decodeTps: 22.1 }];
  const first = selectDecodeObservation(sessions, null);
  const repeated = selectDecodeObservation(sessions, first);
  assert.equal(normalizeHistoryRow({ t: 2000, ...first }).decodeTps, 22.1);
  assert.equal(normalizeHistoryRow({ t: 3000, ...repeated }).decodeTps, null);
  assert.equal(normalizeHistoryRow({ t: 4000, decodeSourceKey: 's1:1234', decodeTps: '' }).decodeTps, null);
});

function catalogFixture(catalogModels, residentModels) {
  const start = source.indexOf('async function catalog()');
  const end = source.indexOf('// ─────────────────────────── status()', start);
  assert.ok(start >= 0 && end > start, 'catalog source is available without starting the service');
  const catalog = new Function(
    'lmsLs', 'lmsPs', 'getLinkStatus', 'buildDeviceMap', 'resolveOrigin', 'directoryUsage', 'LMSTUDIO_MODELS_DIR', 'gb', 'gib',
    `${source.slice(start, end)}; return catalog;`,
  )(
    async () => catalogModels, async () => residentModels, async () => ({}), () => new Map(),
    (_identifier, _modelKey, deviceIdentifier) => ({ kind: deviceIdentifier == null ? 'local' : 'device', label: deviceIdentifier || 'this device', deviceId: deviceIdentifier ?? null }),
    () => ({ ok: false }), 'unused', bytes => (bytes || 0) / 1e9, bytes => (bytes || 0) / 1073741824,
  );
  return catalog();
}

test('catalog residency joins never cross devices sharing a model path', async () => {
  const available = [
    { modelKey: 'model', displayName: 'Local model', path: 'publisher/model.gguf', deviceIdentifier: null },
    { modelKey: 'model', displayName: 'Peer model', path: 'publisher/model.gguf', deviceIdentifier: 'peer' },
  ];
  const result = await catalogFixture(available, [
    { modelKey: 'model', identifier: 'peer-instance', path: 'publisher/model.gguf', deviceIdentifier: 'peer', status: 'generating' },
  ]);
  const local = result.catalog.find(row => row.originKind === 'local');
  assert.equal(local.loaded, false);
  assert.equal(local.identifier, null);
  const peer = result.catalog.find(row => row.originKind === 'device');
  assert.equal(peer.loaded, true);
  assert.equal(peer.identifier, 'peer-instance');
  assert.equal(peer.deviceId, 'peer');
});

test('catalog preserves distinct resident instances while not claiming weight-sharing aliases are loaded', async () => {
  const available = [
    { modelKey: 'base', displayName: 'Base', path: 'publisher/shared.gguf', deviceIdentifier: null },
    { modelKey: 'halo/alias', displayName: 'Alias', path: 'publisher/shared.gguf', deviceIdentifier: null },
  ];
  const residents = [
    { modelKey: 'base', identifier: 'base-a', path: 'publisher/shared.gguf', deviceIdentifier: null, status: 'idle' },
    { modelKey: 'base', identifier: 'base-b', path: 'publisher/shared.gguf', deviceIdentifier: null, status: 'generating' },
  ];
  const result = await catalogFixture(available, residents);
  assert.deepEqual(result.catalog.filter(row => row.loaded).map(row => row.identifier).sort(), ['base-a', 'base-b']);
  assert.equal(result.catalog.find(row => row.modelKey === 'halo/alias').loaded, false);
  assert.deepEqual(result.catalog.filter(row => row.loaded).map(row => row.residentModelKey), ['base', 'base']);
});

test('catalog appends unmatched residents even when another device has the same catalog key', async () => {
  const result = await catalogFixture([
    { modelKey: 'model', displayName: 'Peer', path: 'peer/model.gguf', deviceIdentifier: 'peer' },
  ], [
    { modelKey: 'model', displayName: 'Local instance', identifier: 'local-instance', path: 'local/model.gguf', deviceIdentifier: null, status: 'idle' },
  ]);
  assert.equal(result.catalog.find(row => row.identifier === 'local-instance')?.loadedOnly, true);
});

test('catalog cannot turn a failed resident query into an all-unloaded success', async () => {
  const result = await catalogFixture([{ modelKey: 'model', displayName: 'Model', path: 'model.gguf', deviceIdentifier: null }], null);
  assert.equal(result.error, true);
});

test('multiple resident instances do not inflate addressable catalog totals', async () => {
  const result = await catalogFixture([
    { modelKey: 'model', displayName: 'Model', path: 'model.gguf', deviceIdentifier: null, sizeBytes: 1e9 },
  ], [
    { modelKey: 'model', identifier: 'instance-a', path: 'model.gguf', deviceIdentifier: null, status: 'idle' },
    { modelKey: 'model', identifier: 'instance-b', path: 'model.gguf', deviceIdentifier: null, status: 'idle' },
  ]);
  assert.equal(result.localCount, 1);
  assert.equal(result.localAddressableGB, 1);
  assert.equal(result.catalog.filter(row => row.loaded).length, 2);
});

test('Windows PowerShell snapshot task dates cross the JSON boundary as ISO strings', async () => {
  const start = source.indexOf('async function memorySnapshotTaskState(');
  const end = source.indexOf('async function lmsLs()', start);
  assert.ok(start >= 0 && end > start, 'snapshot task reader is available without starting the service');
  const readTask = new Function(
    'snapshotTaskCache', 'MEMORY_SNAPSHOT_TASK', 'execFileP',
    `${source.slice(start, end)}; return memorySnapshotTaskState;`,
  )({ at: 0, value: null }, 'HALO Memory Snapshot', async (exe, args) => {
    assert.equal(exe, 'powershell.exe');
    const stub = 'function Get-ScheduledTask { [pscustomobject]@{ State="Ready" } }; function Get-ScheduledTaskInfo { [pscustomobject]@{ LastRunTime=[datetime]"2026-09-01T12:00:00Z"; NextRunTime=[datetime]"2026-09-01T13:00:00Z"; LastTaskResult=0 } }; ';
    return { stdout: execFileSync(exe, ['-NoProfile', '-NonInteractive', '-Command', stub + args.at(-1)], { encoding: 'utf8', windowsHide: true, timeout: 10000 }) };
  });
  const result = await readTask();
  assert.equal(result.error, null);
  assert.equal(typeof result.lastRunTime, 'string');
  assert.match(result.lastRunTime, /^2026-09-01T12:00:00(?:\.\d+)?Z$/);
  assert.match(result.nextRunTime, /^2026-09-01T13:00:00(?:\.\d+)?Z$/);
});

test('legacy repeated decode rows are hidden unless they carry run provenance', () => {
  const { normalizeHistoryRow } = dataContractFunctions();
  assert.equal(normalizeHistoryRow({ t: 1000, decodeTps: 90.2 }).decodeTps, null);
  assert.deepEqual(normalizeHistoryRow({
    t: 2000, decodeTps: 61.7, decodeSourceKey: 's1:123', decodeSourceSession: 's1',
    winFreeGB: 20, gpuDedGiB: 22,
  }), {
    t: 2000, decodeTps: 61.7, decodeSourceKey: 's1:123', decodeSourceSession: 's1',
    decodeSourceAt: null, winFree: 20, gpuDed: 22, gpuShared: null,
  });
});

test('history retention is timestamp-based and covers the full seven-day UI range', () => {
  const { pruneHistoryLines } = dataContractFunctions();
  const day = 24 * 3600000;
  const now = 10 * day;
  const lines = [
    JSON.stringify({ t: now - 9 * day }),
    JSON.stringify({ t: now - 7.5 * day }),
    JSON.stringify({ t: now - 7 * day }),
    'malformed',
  ];
  assert.deepEqual(pruneHistoryLines(lines, now).map(line => JSON.parse(line).t), [now - 7.5 * day, now - 7 * day]);
});

test('GPU counter parsing fails closed instead of turning missing data into zero', () => {
  const { parseGpuCounterOutput } = dataContractFunctions();
  assert.throws(() => parseGpuCounterOutput(''), /both dedicated and shared/);
  assert.throws(() => parseGpuCounterOutput('path|instance|NaN'), /both dedicated and shared/);
  assert.throws(() => parseGpuCounterOutput('\\\\host\\gpu adapter memory(adapter_0)\\dedicated usage|adapter_0|0'), /both dedicated and shared/);
  assert.throws(() => parseGpuCounterOutput('\\\\host\\gpu adapter memory(adapter_0)\\shared usage|adapter_0|0'), /both dedicated and shared/);
  assert.deepEqual(parseGpuCounterOutput([
    '\\\\host\\gpu adapter memory(adapter_0)\\dedicated usage|adapter_0|1073741824',
    '\\\\host\\gpu adapter memory(adapter_0)\\shared usage|adapter_0|0',
  ].join('\n')), { dedicatedBytes: 1073741824, sharedBytes: 0, dedicatedCount: 1, sharedCount: 1 });
});

test('file-backed account state exposes freshness instead of looking live forever', () => {
  const { describeFileFreshness } = dataContractFunctions();
  const now = 100 * 3600000;
  assert.deepEqual(describeFileFreshness(null, now), { state: 'unknown', ageMs: null });
  assert.deepEqual(describeFileFreshness(now - 3600000, now), { state: 'current', ageMs: 3600000 });
  assert.deepEqual(describeFileFreshness(now - 25 * 3600000, now), { state: 'stale', ageMs: 25 * 3600000 });
});

test('history downsampling preserves sparse completed-run observations', () => {
  const { downsampleHistoryRows } = dataContractFunctions();
  const rows = Array.from({ length: 1000 }, (_, i) => ({ t: i, decodeTps: i === 123 || i === 777 ? 42 + i : null }));
  const sampled = downsampleHistoryRows(rows, 40);
  assert.ok(sampled.length <= 40);
  assert.deepEqual(sampled.filter(r => r.decodeTps != null).map(r => r.t), [123, 777]);
  assert.equal(sampled[0].t, 0);
  assert.equal(sampled[sampled.length - 1].t, 999);
});

test('validation freshness distinguishes current, stale, and never-run evidence', () => {
  const { describeValidationFreshness } = dataContractFunctions();
  const now = Date.parse('2026-09-01T12:00:00Z');
  assert.deepEqual(describeValidationFreshness(null, now), { state: 'never', ageMs: null });
  assert.deepEqual(describeValidationFreshness({ when: now - 60_000 }, now), { state: 'current', ageMs: 60_000 });
  assert.deepEqual(describeValidationFreshness({ when: now - 25 * 3_600_000 }, now), { state: 'stale', ageMs: 25 * 3_600_000 });
});

test('configured DSH route is kept separate from resident model state', () => {
  const { describeRouteRuntime } = dataContractFunctions();
  const route = { provider: 'lmstudio', model: 'unsloth/qwen3.8-27b' };
  const models = [
    { publisher: 'unsloth', identifier: 'qwen3.8-27b', modelKey: 'qwen3.8-27b', type: 'llm', originKind: 'local', status: 'idle' },
    { publisher: 'halo', identifier: 'halo/qwen3.8-27b', modelKey: 'halo/qwen3.8-27b', type: 'llm', originKind: 'local', status: 'idle' },
  ];
  const raw = describeRouteRuntime(route, models);
  assert.equal(raw.configured, 'lmstudio/unsloth/qwen3.8-27b');
  assert.equal(raw.exactResident, true);
  assert.equal(raw.matchedIdentifier, 'qwen3.8-27b');
  assert.equal(raw.matchBasis, 'publisher-qualified resident key');
  assert.equal(raw.warning, null);
  const exact = describeRouteRuntime({ provider: 'lmstudio', model: 'halo/qwen3.8-27b' }, models);
  assert.equal(exact.exactResident, true);
  assert.equal(exact.matchedIdentifier, 'halo/qwen3.8-27b');
  assert.equal(exact.matchBasis, 'exact key or identifier');
  assert.equal(exact.warning, null);
  const absent = describeRouteRuntime({ provider: 'lmstudio', model: 'other/qwen3.8-27b' }, models);
  assert.equal(absent.exactResident, false);
  assert.match(absent.warning, /not resident/);
  const remoteOnly = describeRouteRuntime(route, [
    { publisher: 'unsloth', identifier: 'qwen3.8-27b', modelKey: 'qwen3.8-27b', type: 'llm', originKind: 'device', status: 'idle' },
  ]);
  assert.equal(remoteOnly.exactResident, false);
  const ambiguous = describeRouteRuntime(route, [
    { publisher: 'unsloth', identifier: 'raw-a', modelKey: 'qwen3.8-27b', type: 'llm', originKind: 'local', status: 'idle' },
    { publisher: 'unsloth', identifier: 'raw-b', modelKey: 'qwen3.8-27b', type: 'llm', originKind: 'local', status: 'generating' },
  ]);
  assert.equal(ambiguous.exactResident, false);
  assert.equal(ambiguous.ambiguous, true);
  assert.match(ambiguous.warning, /ambiguous/);
  const generating = describeRouteRuntime(route, [
    { publisher: 'unsloth', identifier: 'qwen3.8-27b', modelKey: 'qwen3.8-27b', type: 'llm', originKind: 'local', status: 'generating' },
  ]);
  assert.equal(generating.exactGenerating, true);

  const unreadable = describeRouteRuntime({
    provider: null, model: null, error: 'settings.yaml is unreadable',
  }, models);
  assert.equal(unreadable.exactResident, false);
  assert.equal(unreadable.configError, 'settings.yaml is unreadable');
  assert.match(unreadable.warning, /unreadable/i);
});

test('completed-run selection excludes sessions still running or claiming to run', () => {
  const { selectLatestCompletedSession } = dataContractFunctions();
  assert.equal(typeof selectLatestCompletedSession, 'function');
  const selected = selectLatestCompletedSession([
    { id: 'running', mtime: 400, decodeTps: 99, running: true },
    { id: 'claimed', mtime: 300, decodeTps: 88, claimsRunning: true },
    { id: 'older-complete', mtime: 100, decodeTps: 42 },
    { id: 'newer-complete', mtime: 200, decodeTps: 51, running: false, claimsRunning: false },
  ]);
  assert.equal(selected.id, 'newer-complete');
  assert.equal(selected.decodeTps, 51);
});

test('role resolution refuses ambiguous identity matches and model state matching is exact', () => {
  const { resolveExactResidentRole, modelStateMatches } = dataContractFunctions();
  assert.equal(typeof resolveExactResidentRole, 'function');
  assert.equal(typeof modelStateMatches, 'function');
  const role = { identifier: 'halo-worker', modelKey: 'halo/worker' };
  const ambiguous = resolveExactResidentRole(role, [
    { identifier: 'halo-worker', modelKey: 'base/a', originKind: 'local' },
    { identifier: 'other', modelKey: 'halo/worker', originKind: 'local' },
  ]);
  assert.equal(ambiguous.model, null);
  assert.equal(ambiguous.ambiguous, true);
  const exact = [{ identifier: 'halo-worker', originKind: 'local' }];
  assert.equal(modelStateMatches(exact, 'halo-worker', true), true);
  assert.equal(modelStateMatches(exact, 'halo-worker', false), false);
  assert.equal(modelStateMatches([], 'halo-worker', false), true);
});

test('validation diagnostics are anchored and deduplicated', () => {
  const { parseValidationDiagnostics } = dataContractFunctions();
  assert.deepEqual(parseValidationDiagnostics([
    'failOnStartupError: false',
    'WARNING: real warning',
    'warning: real warning',
    'prefix error should not match',
    'ERROR - real error',
  ].join('\n')), ['WARNING: real warning', 'ERROR - real error']);
});

test('stall summary covers the complete supplied inventory', () => {
  const { summarizeStalledSessions } = dataContractFunctions();
  const sessions = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, stalled: i === 15, stalledMs: 700_000 }));
  assert.deepEqual(summarizeStalledSessions(sessions), {
    inventoryCount: 20, count: 1,
    items: [{ id: 's15', sessionId: undefined, title: undefined, stalledMs: 700_000 }],
  });
  assert.match(source, /const STALL_MS = 10 \* 60 \* 1000/);
});

test('failed cache refresh is explicitly stale and disconnected mux data is not active', () => {
  const { describeCacheState, describeMuxState } = dataContractFunctions();
  assert.deepEqual(describeCacheState({ ok: false, sampledAt: 1000, pluginEntries: [], error: 'down' }, 4000), {
    state: 'stale', stale: true, sampledAt: 1000, ageMs: 3000, error: 'down',
  });
  const jobs = new Map([['session-a', [{ id: 'j1', state: 'running' }]]]);
  const queues = new Map([['session-a', 2]]);
  const mux = describeMuxState(false, jobs, queues, ['session-a']);
  assert.equal(mux.active.length, 0);
  assert.equal(mux.queuedInputs, 0);
  assert.equal(mux.dataStale, true);
  assert.equal(mux.staleActiveCount, 1);
  assert.equal(mux.staleQueuedInputs, 2);
});

test('snapshot cadence comes from snapshot filenames, not copied file mtimes', () => {
  const { readSnapshotCadence } = dataContractFunctions();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-snapshots-'));
  const older = path.join(dir, 'memory-20260901-100000.json');
  const newest = path.join(dir, 'memory-20260901-110000.json');
  fs.writeFileSync(older, '{}');
  fs.writeFileSync(newest, '{}');
  fs.utimesSync(newest, new Date('2000-01-01T00:00:00Z'), new Date('2000-01-01T00:00:00Z'));
  try {
    const result = readSnapshotCadence(dir, Date.parse('2026-09-01T12:20:00-06:00'));
    assert.equal(result.count, 2);
    assert.equal(result.lastSnapshotAt, '2026-09-01T17:00:00.000Z');
    assert.equal(result.overdue, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('backend routes wire the data contracts and disable API caching', () => {
  assert.match(source, /parseMemoryFile\(MEMORY_FILE\)/);
  assert.match(source, /selectNewestLogFile\(LMSTUDIO_LOGS\)/);
  assert.match(source, /parseValidationDiagnostics\(combined\)/);
  assert.match(source, /summarizeStalledSessions\(sc\.sessions \|\| \[\]\)/);
  assert.match(source, /startsWith\('\/api\/'\).*cache-control.*no-store/);
  assert.match(source, /gpu\.ok \? gib\(gpu\.dedicatedBytes\) : null/);
});

test('operator UI labels completed-run throughput and configured routing explicitly', () => {
  assert.match(source, /completed-run decode/i);
  assert.match(source, /Configured DSH route/);
  assert.doesNotMatch(source, /say\('Brain:',brain\)/);
});
