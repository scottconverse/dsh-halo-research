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

test('recent decode rate uses DSH token and decode-time deltas, never lifetime totals', () => {
  const body = source.slice(source.indexOf('const decodeTotals = new Map();'),
    source.indexOf('async function listSessionsApi('));
  assert.ok(body, 'production decode observer is present');
  const { observeDecodeTotals, recentMeasuredDecode } = new Function(
    `${body}\nreturn { observeDecodeTotals, recentMeasuredDecode };`,
  )();
  observeDecodeTotals('s', 'Research', 'brain', { decodeTokens: 1000, decodeMs: 25000 }, 1000000);
  assert.equal(recentMeasuredDecode(1000000), null);
  observeDecodeTotals('s', 'Research', 'brain', { decodeTokens: 1000, decodeMs: 25000 }, 1001000);
  assert.equal(recentMeasuredDecode(1001000), null);
  observeDecodeTotals('s', 'Research', 'brain', { decodeTokens: 1400, decodeMs: 35000 }, 1002000);
  assert.deepEqual(recentMeasuredDecode(1002000), {
    sessionId: 's', title: 'Research', model: 'brain', at: 1002000,
    outputTokens: 400, decodeMs: 10000, tps: 40,
  });
  assert.equal(recentMeasuredDecode(1002000 + 15 * 60 * 1000 + 1), null);
});

// Execute the production supervisor and production mutation queue, with only
// external I/O and the clock substituted. This catches ordering/race defects
// that isolated decision predicates cannot exercise.
function recoveryHarness(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-model-recovery-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const log = path.join(dir, 'main.log');
  fs.writeFileSync(log, 'existing history\n');
  const roles = {
    brain: { identifier: 'halo-brain-35b', modelKey: 'halo/brain', context: 131072, parallel: 1 },
    worker: { identifier: 'halo-coder-q4km', modelKey: 'halo/worker', context: 131072, parallel: 1 },
  };
  const h = { log, roles, clock: 1000000, up: true, models: [], saved: {}, loads: [], fail: false, loadGate: null };
  const resident = role => ({ identifier: roles[role].identifier, modelKey: roles[role].modelKey, deviceIdentifier: null });
  h.resident = resident;
  h.models = [resident('brain'), resident('worker')];
  h.crash = () => fs.appendFileSync(log, 'Engine protocol runtime exited unexpectedly. exitCode=1, signal=null\n');
  const body = source.split('/*__MODEL_RECOVERY_START__*/')[1]?.split('/*__MODEL_RECOVERY_END__*/')[0];
  assert.ok(body, 'the actual recovery supervisor has extraction markers');
  const mutation = source.slice(source.indexOf('async function runLmsMutation('), source.indexOf('const snapshotTaskCache'));
  h.boot = () => {
    h.api = new Function('fs', 'LMSTUDIO_MAIN_LOG', 'DAILY_BRAIN', 'DAILY_WORKER', 'readState', 'writeState', 'tcpCheck', 'lmsPs', 'safeExecFile', 'waitForModelState', 'Date', 'console',
      `${body}\n${mutation}\nreturn { modelRecoveryTick, runLmsMutation, recoveryState, queuedLmsMutation };`)(
      fs, log, roles.brain, roles.worker,
      () => structuredClone(h.saved), patch => { h.saved = structuredClone({ ...h.saved, ...patch }); },
      async () => h.up, async () => h.models == null ? null : structuredClone(h.models),
      async (_exe, args) => {
        if (args[0] === 'load') {
          h.loads.push([...args]);
          if (h.loadGate) await h.loadGate;
          if (h.fail) throw new Error('injected engine load failure');
          const id = args[args.indexOf('--identifier') + 1];
          h.models = h.models.filter(m => m.identifier !== id).concat({ identifier: id, modelKey: args[1], deviceIdentifier: null });
        } else if (args[0] === 'unload') {
          h.models = args[1] === '--all' ? [] : h.models.filter(m => m.identifier !== args[1]);
        }
        return { stdout: '', stderr: '' };
      },
      async (id, loaded) => assert.equal(id == null ? h.models.length > 0 : h.models.some(m => m.identifier === id), loaded),
      class extends Date { static now() { return h.clock; } }, { error() {} },
    );
    return h.api;
  };
  h.boot();
  h.tick = () => h.api.modelRecoveryTick();
  h.manualLoad = role => h.api.runLmsMutation(['load', roles[role].modelKey, '--identifier', roles[role].identifier], roles[role].identifier, true);
  h.manualUnload = role => h.api.runLmsMutation(['unload', role ? roles[role].identifier : '--all'], role ? roles[role].identifier : null, false);
  return h;
}

test('actual supervisor baselines at EOF and restores only previously resident approved models', async t => {
  const h = recoveryHarness(t);
  fs.writeFileSync(h.log, ('Engine protocol runtime exited unexpectedly\n').repeat(10000));
  await h.tick();
  assert.equal(h.api.recoveryState().log.offset, fs.statSync(h.log).size);
  assert.equal(h.loads.length, 0);
  h.models = [];
  h.crash();
  await h.tick();
  assert.equal(h.loads.length, 2);
  assert.deepEqual(h.models.map(m => m.identifier).sort(), Object.values(h.roles).map(r => r.identifier).sort());
  for (const args of h.loads) {
    assert.equal(args[args.indexOf('--context-length') + 1], '131072');
    assert.equal(args[args.indexOf('--parallel') + 1], '1');
    assert.ok(args.includes('--no-speculative-draft-mtp'));
  }
});

test('ordinary unload is not reversed by a later unrelated engine failure', async t => {
  const h = recoveryHarness(t);
  await h.tick();
  h.models = [h.resident('worker')];
  await h.tick();
  h.models = [];
  h.crash();
  await h.tick();
  assert.equal(h.loads.length, 1);
  assert.equal(h.loads[0][1], h.roles.worker.modelKey);
});

test('unavailable inventory retains the crash event and pending work survives restart', async t => {
  const h = recoveryHarness(t);
  await h.tick();
  const cursor = h.api.recoveryState().log.offset;
  h.models = null;
  h.crash();
  await h.tick();
  assert.equal(h.api.recoveryState().log.offset, cursor);
  assert.equal(h.loads.length, 0);
  h.boot();
  h.models = [h.resident('brain')];
  h.fail = true;
  await h.tick();
  assert.equal(h.api.recoveryState().roles.worker.pending, true);
  h.boot();
  h.fail = false;
  h.clock += 16000;
  await h.tick();
  assert.equal(h.loads.length, 2, 'retry needs no second crash event');
  assert.equal(h.api.recoveryState().roles.worker.pending, false);
});

test('actual failed loads back off and stop at three within ten minutes', async t => {
  const h = recoveryHarness(t);
  await h.tick();
  h.models = [h.resident('brain')];
  h.fail = true;
  h.crash();
  await h.tick();
  await h.tick();
  assert.equal(h.loads.length, 1);
  for (let n = 0; n < 4; n++) { h.clock += 16000; await h.tick(); }
  assert.equal(h.loads.length, 3);
  assert.match(h.api.recoveryState().roles.worker.lastError, /limit/);
});

test('Unload during a recovery load wins and persists through restart; manual Load rearms only that role', async t => {
  const h = recoveryHarness(t);
  await h.tick();
  h.models = [h.resident('brain')];
  h.crash();
  let release;
  h.loadGate = new Promise(resolve => { release = resolve; });
  const recovering = h.tick();
  while (!h.loads.length) await new Promise(resolve => setImmediate(resolve));
  const unloading = h.manualUnload();
  release();
  await Promise.all([recovering, unloading]);
  h.loadGate = null;
  assert.equal(h.models.length, 0);
  h.boot();
  h.crash();
  await h.tick();
  assert.equal(h.loads.length, 1);
  await h.manualLoad('brain');
  assert.equal(h.api.recoveryState().suppression.brain, false);
  assert.equal(h.api.recoveryState().suppression.worker, true);
});

test('automatic load queued behind another mutation rechecks operator suppression', async t => {
  const h = recoveryHarness(t);
  await h.tick();
  let release;
  const blocking = h.api.queuedLmsMutation(() => new Promise(resolve => { release = resolve; }));
  await new Promise(resolve => setImmediate(resolve));
  h.models = [h.resident('brain')];
  h.crash();
  const recovering = h.tick();
  await new Promise(resolve => setImmediate(resolve));
  const unloading = h.manualUnload('worker');
  release();
  await Promise.all([blocking, recovering, unloading]);
  assert.equal(h.loads.length, 0);
  assert.equal(h.api.recoveryState().suppression.worker, true);
});

test('desktop launcher or LM Studio load rearms a previously confirmed intentional unload', async t => {
  const h = recoveryHarness(t);
  await h.tick();
  await h.manualUnload('worker');
  h.boot();
  h.models = [h.resident('brain'), h.resident('worker')];
  await h.tick();
  assert.equal(h.api.recoveryState().suppression.worker, false);
  h.models = [h.resident('brain')];
  h.crash();
  await h.tick();
  assert.equal(h.loads.length, 1);
});

test('DSH stopped and alias reused for another model never cause recovery', async t => {
  const h = recoveryHarness(t);
  h.models = [{ ...h.resident('worker'), modelKey: 'other/model' }];
  await h.tick();
  h.models = [];
  h.crash();
  await h.tick();
  assert.equal(h.loads.length, 0);
  await h.manualLoad('worker');
  h.loads = [];
  h.up = false;
  h.models = [];
  h.crash();
  await h.tick();
  h.up = true;
  await h.tick();
  assert.equal(h.loads.length, 0);
});

test('bounded log chunks, partial lines, and log rotation retain valid crash detection', async t => {
  const h = recoveryHarness(t);
  await h.tick();
  h.models = [h.resident('brain')];
  fs.appendFileSync(h.log, 'ordinary\n'.repeat(40000) + 'Engine protocol runtime exited unexpectedly');
  await h.tick();
  await h.tick();
  assert.equal(h.loads.length, 0);
  fs.appendFileSync(h.log, '\n');
  await h.tick();
  assert.equal(h.loads.length, 1);
  fs.renameSync(h.log, h.log + '.old');
  fs.writeFileSync(h.log, 'Engine protocol runtime exited unexpectedly\n');
  h.models = [h.resident('brain')];
  h.clock += 16000;
  await h.tick();
  assert.equal(h.loads.length, 2);
});

function dataContractFunctions() {
  const startMark = '/*__DATA_CONTRACT_START__*/';
  const endMark = '/*__DATA_CONTRACT_END__*/';
  const start = source.indexOf(startMark);
  const end = source.indexOf(endMark);
  assert.notEqual(start, -1, 'data contract start marker is present');
  assert.notEqual(end, -1, 'data contract end marker is present');
  assert.ok(end > start, 'data contract markers are ordered');
  const body = source.slice(start + startMark.length, end);
  return new Function('fs', 'path', `${body}\nreturn { parseMemoryFile, selectNewestLogFile, selectDecodeObservation, describeValidationFreshness, parseValidationDiagnostics, describeRouteRuntime, normalizeHistoryRow, pruneHistoryLines, parseGpuCounterOutput, describeFileFreshness, downsampleHistoryRows, summarizeStalledSessions, sessionActivityState, describeCacheState, describeMuxState, readSnapshotCadence, selectLatestCompletedSession: typeof selectLatestCompletedSession === 'function' ? selectLatestCompletedSession : undefined, resolveExactResidentRole: typeof resolveExactResidentRole === 'function' ? resolveExactResidentRole : undefined, modelStateMatches: typeof modelStateMatches === 'function' ? modelStateMatches : undefined };`)(fs, path);
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
  const root = path.join('C:', 'halo', 'stock-dsh');
  const memoryFile = path.join('C:', 'Users', 'scott', '.dsh-stock', 'memory', 'memory.json');
  const snapshotDir = path.join(path.dirname(memoryFile), 'snapshots');
  const snapshotScript = path.join(root, 'mission-control', 'Snapshot-HaloMemory.ps1');
  const expectedArgs = `-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${snapshotScript}" -Source "${memoryFile}" -Destination "${snapshotDir}" -Keep 168`;
  const readTask = new Function(
    'snapshotTaskCache', 'MEMORY_SNAPSHOT_TASK', 'safeExecFile', 'DSH_ROOT', 'MEMORY_FILE', 'MEMORY_SNAPSHOTS', 'path',
    `${source.slice(start, end)}; return memorySnapshotTaskState;`,
  )({ at: 0, value: null }, 'HALO Memory Snapshot', async (exe, args) => {
    assert.equal(exe, 'powershell');
    const escapedArgs = expectedArgs.replace(/'/g, "''");
    const stub = `function Get-ScheduledTask { [pscustomobject]@{ State="Ready"; Actions=@([pscustomobject]@{Execute='C:\\Program Files\\PowerShell\\7\\pwsh.exe';Arguments='${escapedArgs}';WorkingDirectory='${path.dirname(snapshotScript).replace(/'/g, "''")}'}); Triggers=@([pscustomobject]@{CimClass=[pscustomobject]@{CimClassName='MSFT_TaskTimeTrigger'};Enabled=$true;Repetition=[pscustomobject]@{Interval='PT1H'}},[pscustomobject]@{CimClass=[pscustomobject]@{CimClassName='MSFT_TaskBootTrigger'};Enabled=$true;Repetition=$null}); Settings=[pscustomobject]@{StartWhenAvailable=$true;MultipleInstances='IgnoreNew'} } }; function Get-ScheduledTaskInfo { [pscustomobject]@{ LastRunTime=[datetime]"2026-09-01T12:00:00Z"; NextRunTime=[datetime]"2026-09-01T13:00:00Z"; LastTaskResult=0 } }; `;
    return { stdout: execFileSync(exe, ['-NoProfile', '-NonInteractive', '-Command', stub + args.at(-1)], { encoding: 'utf8', windowsHide: true, timeout: 10000 }) };
  }, root, memoryFile, snapshotDir, path);
  const result = await readTask();
  assert.equal(result.error, null);
  assert.equal(result.definitionValid, true);
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
  const brain = describeRouteRuntime({ provider: 'lmstudio-brain', model: 'halo-brain-35b' }, [
    { identifier: 'halo-brain-35b', modelKey: 'halo/qwen3.6-35b-a3b', originKind: 'local', type: 'llm', status: 'idle' },
  ]);
  assert.equal(brain.exactResident, true);
  assert.equal(brain.matchedIdentifier, 'halo-brain-35b');
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

test('active session uses durable log activity when list timestamp lags', () => {
  const { sessionActivityState } = dataContractFunctions();
  const now = 20_000_000;
  const active = sessionActivityState(now - 8_000_000, now - 10_000, true, now);
  assert.equal(active.lastActivityAt, now - 10_000);
  assert.equal(active.activitySource, 'session log');
  assert.equal(active.running, true);
  assert.equal(active.stalled, false);
  const trulyStalled = sessionActivityState(now - 8_000_000, now - 800_000, true, now);
  assert.equal(trulyStalled.stalled, true);
  assert.equal(trulyStalled.stalledMs, 800_000);
  const fallback = sessionActivityState(now - 10_000, null, true, now);
  assert.equal(fallback.activitySource, 'DSH session list');
  assert.equal(fallback.running, true);
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

test('an absent persistent-memory store is reported unavailable without invented entities', () => {
  const { parseMemoryFile } = dataContractFunctions();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'halo-mc-no-memory-'));
  try {
    const result = parseMemoryFile(path.join(dir, 'memory.json'));
    assert.equal(result.ok, false);
    assert.deepEqual(result.entities, []);
    assert.deepEqual(result.relations, []);
    assert.match(result.error, /not configured|not readable|missing/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('DSH 0.1.5 RPCs use authenticated Typert wire names and the single remote mux', () => {
  assert.match(source, /dshRpc\('pluginInventory\/list'\)/);
  assert.match(source, /dshRpc\('session\/list',\s*\{\s*_request:\s*\{\s*\}\s*\}\)/,
    'session/list requires the generated Typert argument name _request');
  assert.match(source, /dshRpc\('session\/cancel',\s*\{\s*request:\s*\{\s*sessionId\s*\}\s*\}\)/);
  assert.match(source, /\/api\/remote\.mux/);
  assert.match(source, /endpoint:\s*'session\/control'/);
  assert.doesNotMatch(source, /\/api\/events\.mux/);
  assert.doesNotMatch(source, /dshRpc\('(?:session|pluginInventory)\./,
    'DSH remotes use slash-separated names');
});

test('DSH authority is exchanged server-side, sent on RPC and WebSocket, and redacted', () => {
  assert.match(source, /process\.env\.HALO_DSH_LAUNCH_URL/);
  assert.match(source, /response\.headers\.get\('set-cookie'\)/);
  assert.match(source, /headers:\s*\{\s*'content-type':\s*'application\/json',\s*cookie\s*\}/);
  assert.match(source, /new WebSocket\([^\n]+\/api\/remote\.mux[^\n]+\{\s*headers:\s*\{\s*Cookie:\s*cookie\s*\}/);
  assert.match(source, /redactDshAuthority/);

  const page = source.slice(source.indexOf('const PAGE ='), source.indexOf('/*__SETTINGS_FN_START__*/'));
  for (const secretName of ['HALO_DSH_LAUNCH_URL', 'dshAuth', 'set-cookie', '.credentials.yaml']) {
    assert.equal(page.includes(secretName), false, `browser page must not contain ${secretName}`);
  }
});

test('stock paths and session fallback preserve truthful workspace identity', () => {
  assert.match(source, /path\.join\(HOME,\s*'\.dsh-stock'\)/);
  assert.match(source, /const PRESET_FILE = path\.join\(DSH_HOME,\s*'\.agent-presets',\s*'local',\s*'agent\.cordis\.yml'\)/);
  assert.doesNotMatch(source, /path\.join\(HOME,\s*'\.dsh'/,
    'Mission Control must never read the retired ~/.dsh tree');
  assert.match(source, /const presetFile = PRESET_FILE/);
  assert.doesNotMatch(source, /replace\(\/-\/g,\s*['"]\\\\['"]\)/,
    'hyphenated storage buckets cannot be decoded into invented path separators');
  assert.match(source, /readSessionHeader/);
  assert.match(source, /\[stored workspace:/);
});
