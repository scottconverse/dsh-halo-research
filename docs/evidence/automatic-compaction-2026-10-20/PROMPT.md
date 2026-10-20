This is one isolated automatic-compaction verification using real code, not a benchmark. Do not use tools, delegate, browse, write files, or run anything. Review the supplied ledger specification, implementation, and tests. In under 220 words identify any concrete correctness concern you can substantiate or say none found, plus name two remaining testing limitations. Retain task code LIME-AUTO-20 and these constraints for the follow-up. Do not claim tests were run by you.

## SPEC.md
# Ledger repair: compatibility and adversarial inputs

Repair ledger.mjs, preserving its exported parseMoney, canonical, Ledger API. Node standard library only. No external dependencies or network. Files may be written only inside this project. Do not change this specification or smoke.test.mjs. Hidden acceptance tests exist outside the project; do not search for them.

Money: parseMoney accepts only strings matching `-?(0|[1-9][0-9]*)(\.[0-9]{1,2})?`, converts exactly to BigInt cents, normalizes negative zero. Reject whitespace, plus, exponent, leading zeros, nonstrings, >2 fractional digits; support values above Number.MAX_SAFE_INTEGER without rounding.

canonical(value): deterministic JSON string, object keys sorted lexicographically using JS code-unit order; array order retained. Own enumerable string keys only, including __proto__. Support null, booleans, strings, finite numbers; preserve JSON's -0 => 0. Reject undefined, BigInt, functions, symbols, NaN/Infinity, sparse arrays, cycles, nonplain objects and accessor properties WITHOUT invoking getters. Shared acyclic objects are legal. Objects with null prototype are plain. No input mutation.

new Ledger(): zero balances. apply(batch) accepts an array of transfer objects {id,from,to,amount,at}. id/from/to must be nonempty strings, including names like __proto__ and constructor. from != to. amount must be strictly positive valid money. at must be real RFC3339 with explicit Z or numeric timezone, exactly second precision or 1-3 fractional digits; reject impossible dates, leap second, absent timezone. Offset hh <=23/mm<=59. Equivalent offsets normalize to UTC milliseconds. Fund sources via credit(account, amount), which requires nonempty string and positive valid money.

apply is atomic: any invalid transfer, idempotency conflict or insufficient funds rolls back the ENTIRE batch, including sequence and idempotency map. Process transfer list in supplied order. Replay of identical semantic transfer id (same parties, exact cents, normalized timestamp) is a no-op even if amount/time spellings differ. Same id and changed semantic content throws. Duplicate identical ids within a batch also no-op. Return count of newly committed transfers. Balance must never be negative.

balance(account) returns BigInt cents, zero for unknown accounts. entries() returns detached transfer records {id,from,to,amount,at,seq}, amount canonical decimal string with exactly 2 fractional digits, at normalized UTC ISO, seq starts at 1 and increases only for new committed transfers. Ordered by at instant ascending, then commit seq ascending. Returned records cannot mutate internal state.

page({after,limit=50}={}): limit must be integer 1..100. Return {items,next}; items same order/format as entries(), at most limit. next is null iff no later items; otherwise opaque cursor for last returned item. Cursor is scoped to this ledger and its revision; reject forged, malformed, foreign-ledger or stale cursors (credit and new apply invalidate; pure replay and failed mutations do not). Pagination of equal timestamps must lose/duplicate nothing. No cryptographic-security promise beyond unguessable cursor tokens.

snapshot(): detached JSON-compatible {version:1,balances:[[account,centsString],...],records:[...],nextSeq}; stable account order. to/from restore must roundtrip exactly, including idempotency behavior. Ledger.restore(snapshot) validates shape, version, nonnegative integral balances, unique IDs, parties, positive amounts, UTC at, unique contiguous seq 1..N, nextSeq=N+1. Malformed restore throws and does not mutate caller input. Restore creates independent ledger identity; cursors from original are invalid. Do not invent historical credit provenance checks because snapshots do not store credits.

Remember through compaction: task code **AMBER-LEDGER-64**, no network, BigInt money, semantic replay, atomic rollback, revision-scoped cursors. Expected final deliverables: fixed implementation, your own focused tests and NOTES.md explaining bugs and limitations.

## ledger.mjs
// ledger.mjs -- deterministic money ledger (task AMBER-LEDGER-64)
//
// Exports: parseMoney, canonical, Ledger.
// Node standard library only; no I/O, no network.

import { randomBytes } from 'node:crypto';

const MONEY_RE = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/;

/**
 * Exact decimal string -> BigInt cents.
 * Accepts only -?(0|[1-9][0-9]*)(\.[0-9]{1,2})? ; never goes through Number.
 */
export function parseMoney(s) {
  if (typeof s !== 'string' || !MONEY_RE.test(s)) {
    throw new TypeError(`invalid money: ${String(s)}`);
  }
  const negative = s.charCodeAt(0) === 0x2d; // '-'
  const body = negative ? s.slice(1) : s;
  const dot = body.indexOf('.');
  const whole = dot === -1 ? body : body.slice(0, dot);
  const frac = dot === -1 ? '00' : body.slice(dot + 1).padEnd(2, '0');
  const cents = BigInt(whole) * 100n + BigInt(frac);
  // -0n === 0n in BigInt, so negative zero is normalized automatically.
  return negative ? -cents : cents;
}

const isAccessor = (desc) => 'get' in desc || 'set' in desc;

/**
 * Deterministic JSON-compatible serialization.
 * Own enumerable string keys, sorted by JS code-unit order; array order kept.
 */
export function canonical(value) {
  const stack = new Set();

  function walk(v) {
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'string') return JSON.stringify(v);
    if (t === 'number') {
      if (!Number.isFinite(v)) throw new TypeError('canonical: non-finite number');
      // JSON.stringify maps -0 to "0".
      return JSON.stringify(v);
    }
    if (t !== 'object') {
      throw new TypeError(`canonical: unsupported value type ${t}`);
    }
    if (stack.has(v)) throw new TypeError('canonical: cycle detected');
    stack.add(v);
    try {
      if (Array.isArray(v)) return walkArray(v, walk);
      return walkObject(v, walk);
    } finally {
      stack.delete(v);
    }
  }

  return walk(value);
}

function walkArray(arr, walk) {
  const len = arr.length;
  const parts = [];
  for (let i = 0; i < len; i++) {
    const desc = Object.getOwnPropertyDescriptor(arr, String(i));
    if (desc === undefined) throw new TypeError('canonical: sparse array');
    if (isAccessor(desc)) throw new TypeError('canonical: accessor property');
    parts.push(walk(desc.value));
  }
  return `[${parts.join(',')}]`;
}

function walkObject(obj, walk) {
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null && proto !== Object.prototype) {
    throw new TypeError('canonical: non-plain object');
  }
  const keys = Object.keys(obj).sort(); // default sort === UTF-16 code-unit order
  const parts = [];
  for (const key of keys) {
    const desc = Object.getOwnPropertyDescriptor(obj, key);
    if (desc === undefined) continue; // defensive: key vanished (not possible for plain objects)
    if (isAccessor(desc)) throw new TypeError('canonical: accessor property');
    parts.push(`${JSON.stringify(key)}:${walk(desc.value)}`);
  }
  return `{${parts.join(',')}}`;
}

// ---------------------------------------------------------------------------
// Timestamps (RFC 3339, explicit zone, 0-3 fractional digits, no leap seconds)
// ---------------------------------------------------------------------------

const AT_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y, m) {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  if (m === 4 || m === 6 || m === 9 || m === 11) return 30;
  return 31;
}

// Howard Hinnant's days_from_civil; exact for the proleptic Gregorian calendar.
function daysFromCivil(y, m, d) {
  const yy = y - (m <= 2 ? 1 : 0);
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/**
 * Parse a validated RFC3339 instant into UTC epoch milliseconds.
 * requireUtc=true rejects numeric offsets (used for snapshot's "UTC at").
 */
function parseTimestamp(s, requireUtc = false) {
  if (typeof s !== 'string') throw new TypeError('invalid timestamp');
  const m = AT_RE.exec(s);
  if (m === null) throw new TypeError(`invalid timestamp: ${String(s)}`);

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);

  if (month < 1 || month > 12) throw new RangeError('invalid timestamp: month');
  if (day < 1 || day > daysInMonth(year, month)) throw new RangeError('invalid timestamp: day');
  if (hour > 23) throw new RangeError('invalid timestamp: hour');
  if (minute > 59) throw new RangeError('invalid timestamp: minute');
  if (second > 59) throw new RangeError('invalid timestamp: second'); // leap seconds rejected

  const ms = m[7] === undefined ? 0 : Number(m[7].padEnd(3, '0'));

  let offsetMs = 0;
  if (m[8] !== 'Z') {
    if (requireUtc) throw new RangeError('timestamp must be UTC (Z)');
    const oh = Number(m[10]);
    const om = Number(m[11]);
    if (oh > 23) throw new RangeError('invalid timestamp: offset hours');
    if (om > 59) throw new RangeError('invalid timestamp: offset minutes');
    offsetMs = (m[9] === '-' ? -1 : 1) * (oh * 60 + om) * 60000;
  }

  const localMs =
    daysFromCivil(year, month, day) * 86400000 +
    ((hour * 60 + minute) * 60 + second) * 1000 +
    ms;
  return localMs - offsetMs;
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

const ISO_RE = /^[+-]?\d{6,}/; // guard for toISOString on out-of-range values

function toIso(ms) {
  const d = new Date(ms);
  const iso = d.toISOString();
  if (ISO_RE.test(iso)) throw new RangeError('timestamp out of range');
  return iso;
}

function formatCents(cents) {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / 100n;
  const frac = abs % 100n;
  return `${negative ? '-' : ''}${whole}.${frac.toString().padStart(2, '0')}`;
}

function requireNonEmptyString(value, what) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${what} must be a nonempty string`);
  }
  return value;
}

function validateTransfer(t) {
  if (t === null || typeof t !== 'object' || Array.isArray(t)) {
    throw new TypeError('transfer must be an object');
  }
  const id = requireNonEmptyString(t.id, 'transfer id');
  const from = requireNonEmptyString(t.from, 'transfer from');
  const to = requireNonEmptyString(t.to, 'transfer to');
  if (from === to) throw new Error('transfer parties must differ');
  const cents = parseMoney(t.amount);
  if (cents <= 0n) throw new RangeError('transfer amount must be positive');
  const atMs = parseTimestamp(t.at);
  return { id, from, to, cents, atMs, atIso: toIso(atMs) };
}

function makeRecord(fields) {
  return Object.freeze(fields);
}

function toPublicRecord(r) {
  return {
    id: r.id,
    from: r.from,
    to: r.to,
    amount: formatCents(r.cents),
    at: r.atIso,
    seq: r.seq,
  };
}

const CURSOR_RE = /^[A-Za-z0-9_-]+$/;
const UINT_RE = /^(?:0|[1-9][0-9]*)$/;

export class Ledger {
  #balances; // Map<string, bigint>
  #records; // frozen records, seq ascending
  #ids; // Map<id, {from,to,cents,atMs}>
  #nextSeq;
  #identity;
  #rev;

  constructor() {
    this.#balances = new Map();
    this.#records = [];
    this.#ids = new Map();
    this.#nextSeq = 1;
    this.#identity = randomBytes(16).toString('hex');
    this.#rev = 0;
  }

  credit(account, amount) {
    requireNonEmptyString(account, 'account');
    const cents = parseMoney(amount);
    if (cents <= 0n) throw new RangeError('credit amount must be positive');
    this.#balances.set(account, (this.#balances.get(account) ?? 0n) + cents);
    this.#rev++;
  }

  balance(account) {
    return this.#balances.get(account) ?? 0n;
  }

  apply(batch) {
    if (!Array.isArray(batch)) throw new TypeError('apply expects an array');

    // Stage everything; commit only after the whole batch validates.
    const balances = new Map(this.#balances);
    const ids = new Map(this.#ids);
    const appended = [];
    let nextSeq = this.#nextSeq;
    let committed = 0;

    for (const transfer of batch) {
      const { id, from, to, cents, atMs, atIso } = validateTransfer(transfer);

      const prior = ids.get(id);
      if (prior !== undefined) {
        if (
          prior.from !== from ||
          prior.to !== to ||
          prior.cents !== cents ||
          prior.atMs !== atMs
        ) {
          throw new Error(`idempotency conflict for transfer id ${JSON.stringify(id)}`);
        }
        continue; // semantic replay: no-op
      }

      const fromBalance = balances.get(from) ?? 0n;
      if (fromBalance < cents) throw new Error('insufficient funds');

      balances.set(from, fromBalance - cents);
      balances.set(to, (balances.get(to) ?? 0n) + cents);
      ids.set(id, { from, to, cents, atMs });
      appended.push(
        makeRecord({ id, from, to, cents, atMs, atIso, seq: nextSeq })
      );
      nextSeq++;
      committed++;
    }

    if (committed > 0) {
      this.#balances = balances;
      this.#ids = ids;
      this.#nextSeq = nextSeq;
      this.#records = this.#records.concat(appended);
      this.#rev++;
    }
    return committed;
  }

  #sortedRecords() {
    return [...this.#records].sort((a, b) => a.atMs - b.atMs || a.seq - b.seq);
  }

  entries() {
    return this.#sortedRecords().map(toPublicRecord);
  }

  #encodeCursor(seq) {
    return Buffer.from(`${this.#identity}:${this.#rev}:${seq}`, 'utf8').toString('base64url');
  }

  #decodeCursor(token) {
    if (typeof token !== 'string' || token.length === 0 || !CURSOR_RE.test(token)) {
      throw new TypeError('invalid cursor');
    }
    let raw;
    try {
      raw = Buffer.from(token, 'base64url').toString('utf8');
    } catch {
      throw new TypeError('invalid cursor');
    }
    if (Buffer.from(raw, 'utf8').toString('base64url') !== token) {
      throw new TypeError('invalid cursor');
    }
    const parts = raw.split(':');
    if (parts.length !== 3) throw new TypeError('invalid cursor');
    const [identity, revText, seqText] = parts;
    if (!UINT_RE.test(revText) || !UINT_RE.test(seqText)) {
      throw new TypeError('invalid cursor');
    }
    if (identity !== this.#identity) throw new Error('foreign ledger cursor');
    if (Number(revText) !== this.#rev) throw new Error('stale cursor');
    return Number(seqText);
  }

  page(options) {
    const opts = options === undefined ? {} : options;
    if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
      throw new TypeError('page expects an options object');
    }
    const limit = opts.limit === undefined ? 50 : opts.limit;
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError('limit must be an integer between 1 and 100');
    }

    const all = this.#sortedRecords();
    let start = 0;
    if (opts.after !== undefined) {
      const seq = this.#decodeCursor(opts.after);
      const index = all.findIndex((r) => r.seq === seq);
      if (index === -1) throw new Error('invalid cursor');
      start = index + 1;
    }

    const slice = all.slice(start, start + limit);
    const items = slice.map(toPublicRecord);
    const next =
      start + slice.length < all.length ? this.#encodeCursor(slice[slice.length - 1].seq) : null;
    return { items, next };
  }

  snapshot() {
    const balances = [...this.#balances.keys()]
      .sort()
      .map((account) => [account, this.#balances.get(account).toString()]);
    return {
      version: 1,
      balances,
      records: this.entries(),
      nextSeq: this.#nextSeq,
    };
  }

  static restore(snapshot) {
    if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw new TypeError('snapshot must be an object');
    }
    if (snapshot.version !== 1) throw new RangeError('unsupported snapshot version');
    if (!Array.isArray(snapshot.balances)) throw new TypeError('snapshot.balances must be an array');
    if (!Array.isArray(snapshot.records)) throw new TypeError('snapshot.records must be an array');
    if (typeof snapshot.nextSeq !== 'number' || !Number.isInteger(snapshot.nextSeq)) {
      throw new TypeError('snapshot.nextSeq must be an integer');
    }

    const balances = new Map();
    for (const pair of snapshot.balances) {
      if (!Array.isArray(pair) || pair.length !== 2) {
        throw new TypeError('balance entry must be [account, cents]');
      }
      const account = requireNonEmptyString(pair[0], 'balance account');
      const centsText = pair[1];
      if (typeof centsText !== 'string' || !UINT_RE.test(centsText)) {
        throw new TypeError('balance cents must be a nonnegative integer string');
      }
      if (balances.has(account)) throw new Error('duplicate balance account');
      balances.set(account, BigInt(centsText));
    }

    const ids = new Map();
    const seqs = new Set();
    const parsed = [];
    for (const rec of snapshot.records) {
      if (rec === null || typeof rec !== 'object' || Array.isArray(rec)) {
        throw new TypeError('record must be an object');
      }
      const id = requireNonEmptyString(rec.id, 'record id');
      const from = requireNonEmptyString(rec.from, 'record from');
      const to = requireNonEmptyString(rec.to, 'record to');
      if (from === to) throw new Error('record parties must differ');
      const cents = parseMoney(rec.amount);
      if (cents <= 0n) throw new RangeError('record amount must be positive');
      const atMs = parseTimestamp(rec.at, true);
      const seq = rec.seq;
      if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 1) {
        throw new TypeError('record seq must be a positive integer');
      }
      if (ids.has(id)) throw new Error('duplicate record id');
      if (seqs.has(seq)) throw new Error('duplicate record seq');
      ids.set(id, { from, to, cents, atMs });
      seqs.add(seq);
      parsed.push({ id, from, to, cents, atMs, atIso: toIso(atMs), seq });
    }

    const count = parsed.length;
    if (snapshot.nextSeq !== count + 1) throw new Error('snapshot.nextSeq must equal N+1');
    for (let i = 1; i <= count; i++) {
      if (!seqs.has(i)) throw new Error('record seq values must be contiguous 1..N');
    }

    parsed.sort((a, b) => a.seq - b.seq);

    const ledger = new Ledger();
    ledger.#balances = balances;
    ledger.#records = parsed.map(makeRecord);
    ledger.#ids = ids;
    ledger.#nextSeq = snapshot.nextSeq;
    ledger.#rev = 0;
    return ledger;
  }
}

## ledger.test.mjs
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
