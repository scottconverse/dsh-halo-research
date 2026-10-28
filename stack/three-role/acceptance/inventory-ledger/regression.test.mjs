import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { emptyState, applyBatch, report } from './ledger.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const event = (id, sku, kind, quantity) => ({ id, sku, kind, quantity });
const cli = (...args) =>
  spawnSync(process.execPath, [join(here, 'cli.mjs'), ...args], {
    encoding: 'utf8',
    timeout: 10000,
  });

test('state shape is strict', () => {
  assert.throws(() => report({ version: 1, events: [], extra: true }));
  assert.throws(() => report({ version: 1 }));
  assert.throws(() => applyBatch({ version: 1, events: [] }, null));
});

test('in-batch replay persists one event and conflicting reuse rolls back', () => {
  const state = emptyState();
  const next = applyBatch(state, [
    event('r1', 'A', 'receive', 5),
    { quantity: 5, kind: 'receive', sku: 'A', id: 'r1' },
  ]);
  assert.equal(next.events.length, 1);
  assert.deepEqual(report(next), {
    balances: [{ sku: 'A', quantity: 5 }],
    eventCount: 1,
  });
  assert.equal(state.events.length, 0);

  const before = JSON.stringify(state);
  assert.throws(() =>
    applyBatch(state, [
      event('r2', 'A', 'receive', 1),
      event('r2', 'A', 'receive', 2),
    ]),
  );
  assert.equal(JSON.stringify(state), before);
});

test('overflow after a valid batch prefix leaves no accepted prefix', () => {
  const state = {
    version: 1,
    events: [event('max', 'A', 'receive', Number.MAX_SAFE_INTEGER)],
  };
  const before = JSON.stringify(state);
  assert.throws(() =>
    applyBatch(state, [
      event('ok', 'B', 'receive', 1),
      event('bad', 'A', 'receive', 1),
    ]),
  );
  assert.equal(JSON.stringify(state), before);
});

test('non-plain events and trailing newlines in identifiers are rejected', () => {
  class NotPlain {
    constructor() {
      Object.assign(this, event('x', 'A', 'receive', 1));
    }
  }
  assert.throws(() => applyBatch(emptyState(), [new NotPlain()]));
  assert.throws(() => applyBatch(emptyState(), [event('x\n', 'A', 'receive', 1)]));
  assert.throws(() => applyBatch(emptyState(), [event('x', 'A\n', 'receive', 1)]));
});

test('report sorts allowed SKUs by ASCII and retains zero balances', () => {
  const state = {
    version: 1,
    events: [
      event('u', '_', 'receive', 1),
      event('z', 'Z', 'receive', 1),
      event('a', 'A', 'receive', 1),
      event('zero', '0', 'receive', 1),
      event('dash', '-', 'receive', 1),
      event('zero-ship', '0', 'ship', 1),
    ],
  };
  assert.deepEqual(report(state).balances.map(({ sku }) => sku), [
    '-',
    '0',
    'A',
    'Z',
    '_',
  ]);
  assert.equal(report(state).balances[1].quantity, 0);
});

test('CLI apply creates a missing state and leaves no temporary file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'triad ledger regression '));
  try {
    const state = join(directory, 'missing state.json');
    const batch = join(directory, 'batch.json');
    writeFileSync(batch, JSON.stringify([event('r1', 'B', 'receive', 4)]));

    const result = cli('apply', state, batch);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      balances: [{ sku: 'B', quantity: 4 }],
      eventCount: 1,
    });
    assert.deepEqual(JSON.parse(readFileSync(state, 'utf8')).events, [
      event('r1', 'B', 'receive', 4),
    ]);
    assert.deepEqual(readdirSync(directory).sort(), ['batch.json', 'missing state.json']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI usage errors never create a missing ledger', () => {
  const directory = mkdtempSync(join(tmpdir(), 'triad ledger regression '));
  try {
    const state = join(directory, 'missing.json');
    const result = cli('apply', state);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(typeof JSON.parse(result.stderr).error, 'string');
    assert.deepEqual(readdirSync(directory), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
