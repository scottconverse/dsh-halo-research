// Focused tests for ledger.mjs (task AMBER-LEDGER-64).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger, parseMoney, canonical } from './ledger.mjs';

const T = (over = {}) => ({
  id: 't1',
  from: 'A',
  to: 'B',
  amount: '1',
  at: '2026-10-20T01:00:00Z',
  ...over,
});

// ---------------------------------------------------------------- parseMoney
test('parseMoney: exact cents, no float rounding', () => {
  assert.equal(parseMoney('12.30'), 1230n);
  assert.equal(parseMoney('0'), 0n);
  assert.equal(parseMoney('0.00'), 0n);
  assert.equal(parseMoney('-0'), 0n);
  assert.equal(parseMoney('-0.00'), 0n);
  assert.equal(parseMoney('-1.5'), -150n);
  assert.equal(parseMoney('9007199254740993.99'), 900719925474099399n);
  assert.equal(parseMoney('123456789012345678901234567890.07'), 12345678901234567890123456789007n);
});

test('parseMoney: rejects everything outside the grammar', () => {
  for (const bad of [
    '', ' ', '1 ', ' 1', '+1', '007', '00.1', '1e3', '1E3', '1.234', '1.', '.5',
    '-', '-.5', '1,000', '0x10', 'NaN', 'Infinity', '\n1', '1\n', '١٢',
  ]) {
    assert.throws(() => parseMoney(bad), undefined, `expected reject: ${JSON.stringify(bad)}`);
  }
  for (const bad of [5, 1.5, null, undefined, 5n, {}, [], true, Symbol('x')]) {
    assert.throws(() => parseMoney(bad));
  }
});

// ---------------------------------------------------------------- canonical
test('canonical: sorted keys, array order, __proto__, null proto', () => {
  assert.equal(canonical({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(canonical({ a: 1, A: 2 }), '{"A":2,"a":1}');
  assert.equal(canonical([3, { z: 1, a: 2 }]), '[3,{"a":2,"z":1}]');
  assert.equal(canonical(JSON.parse('{"__proto__":1,"b":2}')), '{"__proto__":1,"b":2}');
  assert.equal(canonical(Object.assign(Object.create(null), { b: 1, a: 2 })), '{"a":2,"b":1}');
  assert.equal(canonical(null), 'null');
  assert.equal(canonical(true), 'true');
  assert.equal(canonical('x"y'), '"x\\"y"');
  assert.equal(canonical(-0), '0');
  assert.equal(canonical({ n: -0 }), '{"n":0}');
});

test('canonical: accepts shared acyclic references, rejects cycles', () => {
  const shared = { a: 1 };
  assert.equal(canonical([shared, shared]), '[{"a":1},{"a":1}]');
  const cyc = { a: 1 };
  cyc.self = cyc;
  assert.throws(() => canonical(cyc), TypeError);
  const arr = [];
  arr.push(arr);
  assert.throws(() => canonical(arr), TypeError);
});

test('canonical: rejects unsupported values and non-plain objects', () => {
  class C { constructor() { this.a = 1; } }
  for (const bad of [
    undefined, 1n, Symbol('s'), () => 1, NaN, Infinity, -Infinity,
    new Date(0), new Map(), new Set(), new C(), Buffer.from('x'),
  ]) {
    assert.throws(() => canonical(bad), TypeError);
  }
  assert.throws(() => canonical({ a: undefined }), TypeError);
  assert.throws(() => canonical([undefined]), TypeError);
  assert.throws(() => canonical({ a: NaN }), TypeError);
  assert.throws(() => canonical(Object.create({ inherited: 1 })), TypeError);
  assert.throws(() => canonical([1, , 3]), TypeError);
  assert.throws(() => canonical(new Array(2)), TypeError);
});

test('canonical: rejects accessors without invoking getters', () => {
  let called = 0;
  const obj = {};
  Object.defineProperty(obj, 'x', {
    enumerable: true,
    get() { called++; return 1; },
  });
  assert.throws(() => canonical(obj), TypeError);
  assert.equal(called, 0);

  const nested = { a: {} };
  Object.defineProperty(nested.a, 'y', { enumerable: true, get() { called++; return 2; } });
  assert.throws(() => canonical(nested), TypeError);
  assert.equal(called, 0);

  const arr = [1];
  Object.defineProperty(arr, '0', { enumerable: true, get() { called++; return 1; } });
  assert.throws(() => canonical(arr), TypeError);
  assert.equal(called, 0);
});

test('canonical: non-enumerable and symbol keys are ignored; no mutation', () => {
  const obj = { b: 2, a: 1 };
  Object.defineProperty(obj, 'hidden', { value: 9, enumerable: false });
  obj[Symbol('s')] = 10;
  assert.equal(canonical(obj), '{"a":1,"b":2}');
  assert.deepEqual(Object.keys(obj), ['b', 'a']);

  const input = { b: [2, 1], a: { d: 4, c: 3 } };
  const before = JSON.stringify(input);
  canonical(input);
  assert.equal(JSON.stringify(input), before);
});

// ---------------------------------------------------------------- Ledger core
test('ledger: credit, balance, entries format and detachment', () => {
  const l = new Ledger();
  assert.equal(l.balance('nobody'), 0n);
  l.credit('A', '10');
  l.credit('A', '0.05');
  assert.equal(l.balance('A'), 1005n);
  assert.equal(
    l.apply([T({ amount: '2.5', at: '2026-10-20T03:00:00+02:00' })]),
    1
  );
  const [rec] = l.entries();
  assert.equal(rec.id, 't1');
  assert.equal(rec.from, 'A');
  assert.equal(rec.to, 'B');
  assert.equal(rec.amount, '2.50');
  assert.equal(rec.at, '2026-10-20T01:00:00.000Z');
  assert.equal(rec.seq, 1);
  assert.equal(l.balance('B'), 250n);
  assert.equal(l.balance('A'), 755n);

  rec.amount = '999.99';
  rec.seq = 42;
  assert.equal(l.entries()[0].amount, '2.50');
  assert.equal(l.entries()[0].seq, 1);
});

test('ledger: apply rejects invalid transfers and rolls back entirely', () => {
  const l = new Ledger();
  l.credit('A', '10');

  const bad = [
    T({ id: '' }),
    T({ from: '' }),
    T({ to: '' }),
    T({ from: 'A', to: 'A' }),
    T({ amount: '0' }),
    T({ amount: '-1' }),
    T({ amount: '1.001' }),
    T({ amount: 1 }),
    T({ id: 7 }),
    T({ at: '2026-10-20T01:00:00' }),
    T({ at: '2026-10-20 01:00:00Z' }),
    T({ at: '2026-10-20T01:00:00.1234Z' }),
    T({ at: '2026-10-20T01:00:60Z' }),
    T({ at: '2026-10-20T24:00:00Z' }),
    T({ at: '2026-02-30T01:00:00Z' }),
    T({ at: '2026-13-01T01:00:00Z' }),
    T({ at: '2026-10-20T01:00:00+24:00' }),
    T({ at: '2026-10-20T01:00:00+05:60' }),
    T({ at: '2026-10-20T01:00:00z' }),
    T({ at: '2026-10-20t01:00:00Z' }),
    T({ at: '2026-10-20T01:00:00.Z' }),
    T({ at: '226-10-20T01:00:00Z' }),
  ];
  for (const t of bad) {
    assert.throws(() => l.apply([t]), undefined, `expected reject: ${JSON.stringify(t)}`);
  }
  assert.throws(() => l.apply('nope'));
  assert.throws(() => l.apply([null]));

  // Mid-batch failure leaves no trace at all (balances, seq, idempotency).
  assert.throws(
    () =>
      l.apply([
        T({ id: 'ok', from: 'A', to: 'B', amount: '4' }),
        T({ id: 'bad', from: 'A', to: 'C', amount: '7' }),
      ]),
    /insufficient/
  );
  assert.equal(l.balance('A'), 1000n);
  assert.equal(l.balance('B'), 0n);
  assert.deepEqual(l.entries(), []);

  // Sequence/idempotency were rolled back too.
  assert.equal(l.apply([T({ id: 'ok', from: 'A', to: 'B', amount: '4' })]), 1);
  assert.equal(l.entries()[0].seq, 1);
  assert.equal(l.apply([T({ id: 'bad', from: 'A', to: 'C', amount: '4' })]), 1);
  assert.equal(l.entries()[1].seq, 2);
});

test('ledger: semantic replay is a no-op even with different spellings', () => {
  const l = new Ledger();
  l.credit('A', '100');
  assert.equal(l.apply([T({ id: 'x', amount: '5', at: '2026-10-20T01:00:00Z' })]), 1);
  assert.equal(
    l.apply([T({ id: 'x', amount: '5.00', at: '2026-10-20T03:00:00+02:00' })]),
    0
  );
  assert.equal(
    l.apply([T({ id: 'x', amount: '5.0', at: '2026-10-20T01:00:00.000Z' })]),
    0
  );
  assert.equal(l.entries().length, 1);
  assert.equal(l.balance('A'), 9500n);

  // Duplicate identical ids inside one batch collapse to one commit.
  assert.equal(
    l.apply([T({ id: 'y', amount: '1' }), T({ id: 'y', amount: '1.0' })]),
    1
  );
  assert.equal(l.entries().length, 2);
});

test('ledger: conflicting idempotency key throws and rolls back the batch', () => {
  const l = new Ledger();
  l.credit('A', '100');
  l.apply([T({ id: 'x', amount: '5' })]);
  assert.throws(
    () =>
      l.apply([
        T({ id: 'x', amount: '5.01' }),
        T({ id: 'fresh', from: 'A', to: 'B', amount: '1' }),
      ]),
    /conflict/
  );
  assert.equal(l.entries().length, 1);
  assert.throws(() => l.apply([T({ id: 'x', from: 'A', to: 'C', amount: '5' })]), /conflict/);
  assert.throws(() => l.apply([T({ id: 'x', to: 'C', amount: '5' })]), /conflict/);
  assert.throws(
    () => l.apply([T({ id: 'x', amount: '5', at: '2026-10-20T01:00:01Z' })]),
    /conflict/
  );
  assert.equal(l.balance('B'), 500n);
});

test('ledger: hostile account/id names work and cannot pollute prototypes', () => {
  const l = new Ledger();
  const names = ['__proto__', 'constructor', 'prototype', 'toString', 'a.b', ''];
  l.credit('__proto__', '3');
  l.credit('constructor', '3');
  assert.equal(l.balance('__proto__'), 300n);
  assert.equal(l.balance('constructor'), 300n);
  assert.equal(l.apply([T({ id: '__proto__', from: '__proto__', to: 'constructor', amount: '1' })]), 1);
  assert.equal(l.balance('__proto__'), 200n);
  assert.equal(l.balance('constructor'), 400n);
  assert.equal(l.apply([T({ id: 'constructor', from: 'constructor', to: 'new', amount: '0.01' })]), 1);
  assert.equal(l.balance('new'), 1n);
  assert.equal(Object.prototype.polluted, undefined);
  for (const n of names.slice(0, 5)) assert.equal(typeof l.balance(n), 'bigint');
});

// ---------------------------------------------------------------- entries order
test('ledger: entries sorted by instant then commit seq', () => {
  const l = new Ledger();
  l.credit('A', '100');
  l.apply([
    T({ id: 'late', from: 'A', to: 'B', amount: '1', at: '2026-10-20T02:00:00Z' }),
    T({ id: 'early2', from: 'A', to: 'B', amount: '1', at: '2026-10-20T01:00:00Z' }),
    T({ id: 'early1', from: 'A', to: 'B', amount: '1', at: '2026-10-20T00:00:00-01:00' }),
  ]);
  assert.deepEqual(
    l.entries().map((r) => [r.id, r.seq, r.at]),
    [
      ['early2', 2, '2026-10-20T01:00:00.000Z'],
      ['early1', 3, '2026-10-20T01:00:00.000Z'],
      ['late', 1, '2026-10-20T02:00:00.000Z'],
    ]
  );
});

// ---------------------------------------------------------------- page
test('page: limit validation and complete pagination', () => {
  const l = new Ledger();
  l.credit('A', '100');
  for (let i = 1; i <= 5; i++) {
    l.apply([T({ id: `t${i}`, amount: '1', at: `2026-10-20T01:00:0${i}Z` })]);
  }
  for (const bad of [0, 101, -1, 1.5, NaN, Infinity, '10', null]) {
    assert.throws(() => l.page({ limit: bad }), undefined, `limit ${String(bad)}`);
  }
  assert.throws(() => l.page(null), TypeError);

  const seen = [];
  let cursor;
  let pages = 0;
  do {
    const { items, next } = l.page({ after: cursor, limit: 2 });
    assert.ok(items.length <= 2);
    seen.push(...items.map((r) => r.seq));
    cursor = next;
    pages++;
    if (pages > 10) throw new Error('pagination did not terminate');
  } while (cursor !== null);
  assert.deepEqual(seen, [1, 2, 3, 4, 5]);
  assert.equal(pages, 3);

  assert.deepEqual(l.page({ after: undefined, limit: 100 }).items.length, 5);
  assert.equal(l.page({ limit: 100 }).next, null);
});

test('page: equal timestamps neither lost nor duplicated', () => {
  const l = new Ledger();
  l.credit('A', '100');
  for (let i = 1; i <= 7; i++) {
    l.apply([T({ id: `e${i}`, amount: '1', at: '2026-10-20T01:00:00Z' })]);
  }
  const seqs = [];
  let cursor;
  for (;;) {
    const { items, next } = l.page({ after: cursor, limit: 3 });
    seqs.push(...items.map((r) => r.seq));
    cursor = next;
    if (cursor === null) break;
  }
  assert.deepEqual(seqs, [1, 2, 3, 4, 5, 6, 7]);
});

test('page: forged, malformed, foreign and stale cursors are rejected', () => {
  const l = new Ledger();
  l.credit('A', '100');
  for (let i = 1; i <= 3; i++) {
    l.apply([T({ id: `t${i}`, amount: '1', at: `2026-10-20T01:00:0${i}Z` })]);
  }

  for (const bad of ['garbage', '', '!!!', 'eyJhIjoxfQ', 12, null, {}]) {
    assert.throws(() => l.page({ after: bad }), undefined, `cursor ${String(bad)}`);
  }

  const { next } = l.page({ limit: 1 });
  assert.equal(typeof next, 'string');
  assert.equal(l.page({ after: next, limit: 1 }).items[0].seq, 2);

  // Failed mutation does not invalidate cursors.
  assert.throws(() => l.apply([T({ id: 'z', from: 'A', to: 'B', amount: '1000' })]));
  assert.equal(l.page({ after: next, limit: 1 }).items[0].seq, 2);

  // Pure replay does not invalidate cursors.
  l.apply([T({ id: 't1', amount: '1', at: '2026-10-20T01:00:01Z' })]);
  assert.equal(l.page({ after: next, limit: 1 }).items[0].seq, 2);

  // A newly committed apply invalidates.
  l.apply([T({ id: 't4', amount: '1', at: '2026-10-20T01:00:04Z' })]);
  assert.throws(() => l.page({ after: next }), /stale/);

  const fresh = l.page({ limit: 1 }).next;
  // credit invalidates.
  l.credit('A', '1');
  assert.throws(() => l.page({ after: fresh }), /stale/);

  // Foreign ledger cursor.
  const other = new Ledger();
  other.credit('A', '5');
  other.apply([T({ id: 'o1', at: '2026-10-20T01:00:00Z' })]);
  other.apply([T({ id: 'o2', at: '2026-10-20T01:00:01Z' })]);
  const foreign = other.page({ limit: 1 }).next;
  assert.throws(() => l.page({ after: foreign }), /foreign/);
  assert.throws(() => other.page({ after: l.page({ limit: 1 }).next }), /foreign/);
});

// ---------------------------------------------------------------- snapshot/restore
test('snapshot/restore: exact roundtrip and behavioral preservation', () => {
  const l = new Ledger();
  l.credit('A', '100');
  l.credit('__proto__', '2.5');
  l.apply([
    T({ id: 'x', from: 'A', to: 'B', amount: '10.25', at: '2026-10-20T02:00:00.5Z' }),
    T({ id: 'y', from: 'B', to: 'A', amount: '3', at: '2026-10-20T01:00:00-01:00' }),
  ]);

  const snap = l.snapshot();
  assert.deepEqual(Object.keys(snap), ['version', 'balances', 'records', 'nextSeq']);
  assert.equal(snap.version, 1);
  assert.equal(snap.nextSeq, 3);
  assert.deepEqual(snap.balances, [
    ['A', '9275'],
    ['B', '725'],
    ['__proto__', '250'],
  ]);

  const before = canonical(snap);
  const r = Ledger.restore(snap);
  assert.equal(canonical(r.snapshot()), before);
  assert.equal(canonical(snap), before, 'restore must not mutate its input');

  assert.equal(r.balance('A'), 9275n);
  assert.equal(r.balance('B'), 725n);
  assert.deepEqual(
    r.entries().map((x) => x.id),
    ['y', 'x']
  );

  // Idempotency survives restore.
  assert.equal(r.apply([T({ id: 'x', from: 'A', to: 'B', amount: '10.25', at: '2026-10-20T02:00:00.500Z' })]), 0);
  assert.throws(() => r.apply([T({ id: 'x', from: 'A', to: 'B', amount: '10.26', at: '2026-10-20T02:00:00.5Z' })]), /conflict/);

  // New commits continue the sequence.
  assert.equal(r.apply([T({ id: 'n', from: 'A', to: 'B', amount: '1', at: '2026-10-21T00:00:00Z' })]), 1);
  assert.equal(r.entries().at(-1).seq, 3);
  assert.equal(r.balance('A'), 9175n);

  // Restored ledger has independent identity: old cursors are foreign.
  const originalCursor = l.page({ limit: 1 }).next;
  assert.throws(() => r.page({ after: originalCursor }), /foreign/);
});

test('restore: rejects malformed snapshots without mutating input', () => {
  const l = new Ledger();
  l.credit('A', '10');
  l.apply([T({ id: 'x', from: 'A', to: 'B', amount: '1', at: '2026-10-20T01:00:00Z' })]);
  const good = l.snapshot();

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const mut = (fn) => { const s = clone(good); fn(s); return s; };

  const cases = [
    null, [], 'x', 42,
    mut((s) => { s.version = 2; }),
    mut((s) => { delete s.version; }),
    mut((s) => { s.balances = 'nope'; }),
    mut((s) => { s.records = {}; }),
    mut((s) => { s.nextSeq = '2'; }),
    mut((s) => { s.nextSeq = 1; }),
    mut((s) => { s.balances[0][1] = '-1'; }),
    mut((s) => { s.balances[0][1] = '1.5'; }),
    mut((s) => { s.balances[0][1] = '01'; }),
    mut((s) => { s.balances[0][0] = ''; }),
    mut((s) => { s.balances.push(['A', '1']); }),
    mut((s) => { s.balances.push(['B', '1']); }),
    mut((s) => { s.records[0].id = ''; }),
    mut((s) => { s.records[0].from = s.records[0].to; }),
    mut((s) => { s.records[0].amount = '0'; }),
    mut((s) => { s.records[0].amount = '-1'; }),
    mut((s) => { s.records[0].amount = '1'; }), // ok -> remove below to keep test honest
  ];
  // Replace the last (valid) case with genuinely bad ones.
  cases.pop();
  cases.push(
    mut((s) => { s.records.push({ ...s.records[0], id: 'y' }); }), // duplicate seq
    mut((s) => { s.records.push({ ...s.records[0], seq: 3 }); }), // seq gap
    mut((s) => { s.records[0].seq = 2; }), // seq set != 1..N
    mut((s) => { s.records[0].at = '2026-10-20T01:00:00'; }), // no zone
    mut((s) => { s.records[0].at = '2026-10-20T02:00:00+01:00'; }), // not UTC
    mut((s) => { s.records[0].at = '2026-02-30T01:00:00Z'; }),
    mut((s) => { s.records[0].at = '2026-10-20T01:00:00.1234Z'; }),
    mut((s) => { s.records[0].seq = 1.5; }),
    mut((s) => { s.records = [s.records[0], { ...s.records[0], id: 'x' }]; }) // duplicate id? seq dup too
  );

  for (const bad of cases) {
    const before = bad === null ? null : JSON.stringify(bad);
    assert.throws(() => Ledger.restore(bad), undefined, `expected restore reject: ${before}`);
    if (bad !== null && typeof bad === 'object') assert.equal(JSON.stringify(bad), before);
  }

  // Sanity: the pristine snapshot still restores.
  assert.equal(Ledger.restore(clone(good)).entries().length, 1);
});

test('restore: accepts snapshots whose record array is not seq ordered', () => {
  const snap = {
    version: 1,
    balances: [['A', '10']],
    records: [
      { id: 'b', from: 'A', to: 'B', amount: '2.00', at: '2026-10-20T02:00:00.000Z', seq: 2 },
      { id: 'a', from: 'A', to: 'B', amount: '1.00', at: '2026-10-20T01:00:00.000Z', seq: 1 },
    ],
    nextSeq: 3,
  };
  const l = Ledger.restore(snap);
  assert.deepEqual(l.entries().map((r) => [r.id, r.seq]), [['a', 1], ['b', 2]]);
  assert.equal(l.snapshot().records[0].id, 'a');
  // next commit gets seq 3
  l.credit('A', '1');
  assert.equal(l.apply([T({ id: 'c', from: 'A', to: 'B', amount: '1', at: '2026-10-20T03:00:00Z' })]), 1);
  assert.equal(l.entries().at(-1).seq, 3);
});

// ---------------------------------------------------------------- credit
test('credit: validates account and positive money, invalidates cursors', () => {
  const l = new Ledger();
  for (const [acct, amt] of [['', '1'], [null, '1'], [5, '1'], ['A', '0'], ['A', '-1'], ['A', 2], ['A', '1e3']]) {
    assert.throws(() => l.credit(acct, amt));
  }
  l.credit('A', '1');
  assert.equal(l.balance('A'), 100n);
});

// ---------------------------------------------------------------- misc edges
test('empty ledger: entries, page, snapshot roundtrip', () => {
  const l = new Ledger();
  assert.deepEqual(l.entries(), []);
  assert.deepEqual(l.page(), { items: [], next: null });
  assert.equal(l.apply([]), 0);
  const snap = l.snapshot();
  assert.deepEqual(snap, { version: 1, balances: [], records: [], nextSeq: 1 });
  const r = Ledger.restore(snap);
  assert.deepEqual(r.snapshot(), snap);
  assert.deepEqual(r.page({ limit: 100 }), { items: [], next: null });
});

test('snapshot: returned structures are detached from internal state', () => {
  const l = new Ledger();
  l.credit('A', '5');
  l.apply([T({ id: 'x', amount: '1' })]);
  const snap = l.snapshot();
  snap.records[0].amount = '999.00';
  snap.balances[0][1] = '999999';
  snap.nextSeq = 99;
  assert.equal(l.entries()[0].amount, '1.00');
  assert.equal(l.balance('A'), 400n);
  assert.equal(l.snapshot().nextSeq, 2);
});

test('canonical: setter-only accessors are rejected too', () => {
  const obj = {};
  Object.defineProperty(obj, 'x', { enumerable: true, set() {} });
  assert.throws(() => canonical(obj), TypeError);
});

test('canonical: deep key sort is code-unit order for punctuation/unicode', () => {
  assert.equal(
    canonical({ 'é': 1, z: 2, Z: 3, '0': 4, '-': 5, ' ': 6 }),
    '{" ":6,"-":5,"0":4,"Z":3,"z":2,"é":1}'
  );
});
