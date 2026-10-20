# NOTES — ledger repair (task code AMBER-LEDGER-64)

Node standard library only (`node:crypto` for cursor identity). No network, no deps.
Deliverables: `ledger.mjs` (repaired), `ledger.test.mjs` (focused tests), this file.
`SPEC.md` and `smoke.test.mjs` were not modified.

## Bugs in the original `ledger.mjs` (and the fix)

### `parseMoney`
1. `BigInt(Math.round(Number(s) * 100))` went through IEEE-754 doubles, so values
   above `2^53` cents were silently rounded, and `1.005` style inputs drifted.
2. It accepted anything `Number()` accepts: whitespace, `+1`, `1e3`, `007`, `Infinity`,
   `NaN`, non-strings, `1.234` (rounded rather than rejected), and negative zero was
   not normalized.
3. **Fix:** strict `-?(0|[1-9][0-9]*)(\.[0-9]{1,2})?` regex on `typeof s === 'string'`,
   then exact `BigInt(integerPart) * 100n + BigInt(frac.padEnd(2,'0'))`; `-0n === 0n`
   normalizes negative zero.

### `canonical`
1. No rejection at all: `undefined`, `BigInt`, functions and symbols fell through to
   `JSON.stringify` (yielding `undefined` or throwing at the wrong place),
   `NaN`/`Infinity` became `null` via `JSON.stringify`, holes in arrays were dropped
   (sparse arrays serialized as if compacted), cycles overflowed the stack, accessors
   were invoked by property access, and non-plain objects (`Date`, `Map`, class
   instances) were serialized as if plain.
2. It string-concatenated `Object.keys().sort()` (the sort itself was code-unit correct)
   but read `v[k]` instead of property descriptors, so getters ran.
3. **Fix:** explicit type switch (only null/boolean/string/finite number/plain
   object/array), recursive walk with an ancestor `Set` (shared acyclic values are
   legal, true cycles throw), `Object.getOwnPropertyDescriptor` for every key so
   accessors are detected *without invocation*, sparse arrays rejected, prototypes
   must be `Object.prototype` or `null`, keys from `Object.keys()` sorted with the
   default code-unit comparator, `JSON.stringify` only for strings/numbers
   (`-0` → `0`). No mutation of inputs.

### `Ledger`
1. **Prototype pollution / name collisions:** balances were a plain `{}`, so accounts
   or ids named `__proto__`, `constructor`, `toString` corrupted or aliased state.
2. **No validation:** empty/non-string ids and parties, `from === to`, zero/negative/
   invalid amounts, and arbitrary `at` strings were all accepted.
3. **Not atomic:** each transfer was committed inside the loop, so a later failure left
   balances, records, sequence and the idempotency set partially mutated.
4. **Broken idempotency:** any existing id was silently skipped, so a *changed*
   semantic transfer with the same id was silently ignored instead of throwing.
5. **`entries()`** sorted with `localeCompare` (locale-dependent, not instant order),
   returned the *internal* record objects (mutation leaked into state), and emitted the
   caller's raw `amount`/`at` spellings instead of canonical 2-decimal and normalized UTC.
6. **`page()`** did no limit validation, used an unscoped base64 offset (forgeable,
   reusable after foreign ledgers/stale revisions), and had no ledger identity or
   revision concept at all.
7. **`restore()`** validated nothing, kept references to caller arrays/records, never
   rebuilt the idempotency map, and produced a ledger that was not independent.
8. **Fix:** `Map` state for all account/id lookups; full transfer timestamp validation
   (RFC3339 with explicit `Z`/numeric offset, 1–3 fractional digits, real calendar
   dates via a civil-days algorithm, leap seconds rejected, `hh<=23`/`mm<=59`,
   normalization to UTC ms); staging maps + record list and a single commit at the end
   (no state change on throw, including sequence and idempotency map); idempotency map
   stores `{from,to,cents,atMs}` and compares exact semantics (conflict throws, replay
   no-ops); entries sorted by `(atMs, seq)` and returned as fresh objects with canonical
   `amount` (`"5.00"`) and `at` (`toISOString()`); `page()` validates `limit` as an
   integer 1..100, encodes a cursor as base64url of
   `<random ledger identity>:<revision>:<seq>`, verifies canonical encoding, identity
   and revision, and resumes strictly after the referenced record's seq (so equal
   timestamps never lose/duplicate); revision bumps on `credit` and on any `apply`
   that commits at least one new transfer (pure replays and failed batches do not);
   `snapshot()` emits sorted balances and detached records; `restore()` fully validates
   shape/version/balances/records/seq/nextSeq, copies and sorts records by seq, rebuilds
   balances and the idempotency map, and gets a fresh random identity so old cursors are
   rejected as foreign.

## Verification

Run (Node v24.21.0, given `node.exe`):

```
"C:/Program Files/nodejs/node.exe" --test smoke.test.mjs ledger.test.mjs
```

Result at hand-off: **27 tests, 27 pass, 0 fail** (3 supplied smoke tests + 24 focused
tests covering money grammar/precision, canonical rejection matrix and getter
non-invocation, atomic rollback, semantic replay/conflict, hostile account names,
ordering, entry detachment, pagination completeness with equal timestamps, forged/
foreign/stale cursors, snapshot roundtrip/idempotency, malformed-restore matrix and
input non-mutation, empty-ledger behavior).

## Deliberate interpretations / limitations

- **Strict RFC3339 spelling:** lowercase `t`/`z` are rejected (RFC3339 permits them as
  a note, but the spec's "explicit Z or numeric timezone" is enforced strictly here).
- **Output timestamp format:** `entries()`/`snapshot()` emit `Date#toISOString()`
  (`2026-10-20T01:00:00.000Z`). This is the canonical JS ISO form; second-precision
  inputs normalize to millisecond form.
- **`restore` "UTC at":** the `at` field must end in `Z`; numerically equivalent
  offsets such as `+00:00` are rejected as not-UTC spellings. Restore accepts records
  out of seq order as long as seq values are exactly `1..N`, then stores them in seq
  order.
- **`restore` amounts:** any syntactically valid *positive* money string is accepted
  and normalized (e.g. `"5"` → `"5.00"`). Balance cents must be canonical nonnegative
  integer strings (no leading zeros, no `-0`), and duplicate accounts/ids/seqs are
  rejected. No credit-provenance checks are invented, per spec.
- **No mutation guarantee** applies to `canonical`, `snapshot()` outputs, and `restore`
  input; internal records are frozen and every `entries()`/`page()`/`snapshot()` call
  returns fresh objects.
- **Cursor security:** only "unguessable" — 128-bit random ledger identity plus revision
  pinning in an opaque base64url token; there is no cryptographic MAC and no attempt to
  hide the token's structure from someone who already holds it.
- **`canonical` limits:** recursion depth is bounded by the JS stack (deep structures can
  throw `RangeError`); Proxies can still run traps because the language offers no
  descriptor-free introspection.
- **No `page` cursor without `after` state:** the token is the only pagination state;
  callers must hold `next` (or start again from the beginning).
