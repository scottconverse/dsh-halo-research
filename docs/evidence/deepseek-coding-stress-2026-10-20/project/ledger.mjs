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
