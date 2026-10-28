# Inventory ledger

Dependency-free Node.js (24) inventory ledger: a small ES module library plus a
CLI. The ledger is a plain JSON document of accepted events; balances are always
derived from verified history.

## Usage

```sh
node cli.mjs apply <state.json> <batch.json>
node cli.mjs report <state.json>
```

- `apply` reads the batch (a JSON array), validates the stored ledger and the
  whole batch, writes the accepted state atomically, then prints the report.
- `report` prints the report and never writes.
- A missing state file is treated as an empty ledger (and is not created by
  `report`).
- Paths, including paths with spaces, are passed as ordinary arguments; no shell
  interpolation or interactive prompts are involved.

On success the CLI prints one JSON object on stdout and exits 0. On any usage,
JSON, state or event error it exits nonzero, prints nothing on stdout, and
prints exactly one JSON object on stderr:

```json
{"error":"<message>"}
```

Usage errors are detected before any file is opened, so they cannot modify the
ledger.

## Library API

`ledger.mjs` exports:

- `emptyState()` → `{ version: 1, events: [] }`
- `applyBatch(state, events)` → new state, or throws
- `report(state)` → `{ balances: [{ sku, quantity }], eventCount }`

### State and events

State is `{ version: 1, events: [...] }`.

An accepted event has exactly four fields:

- `id`: 1–64 ASCII letters, digits, `_` or `-`; a durable idempotency key.
- `sku`: 1–32 uppercase ASCII letters, digits, `_` or `-`.
- `kind`: `receive` or `ship`.
- `quantity`: a positive safe integer.

Unknown fields, wrong types, malformed state and malformed events are rejected
with a thrown `Error`. Stored history is validated on entry to both `report` and
`applyBatch`: the version must be 1, `events` must be an array, each stored event
must be shape-valid, IDs must be unique, and replaying history must never create
a negative balance, a duplicate ID or an unsafe-integer sum.

### Transactional batches

`applyBatch` validates and applies the entire batch against a detached working
copy. Either every event is accepted or the call throws with no change to the
caller's state, event objects or array. A shipment may bring a SKU to exactly
zero but never below zero, and every intermediate balance is checked with
`Number.isSafeInteger`. Rejected batches leave no partially accepted prefix.

Returned state owns fresh event objects, so mutating the result (or its event
objects) never mutates the input.

### Idempotency

Event IDs are durable idempotency keys. Replaying an identical event — compared
field-by-field, independent of object key order — is a no-op, whether the replay
occurs inside one batch or across calls. Reusing an ID with a different SKU,
kind or quantity rejects the whole batch. One copy per ID is persisted.

### Reporting

`report` returns `{ balances: [{ sku, quantity }], eventCount }`:

- every SKU ever touched appears, including those at zero balance;
- rows are sorted by SKU in ASCII (code-unit) ascending order;
- `eventCount` counts unique accepted events only;
- no timestamps or nondeterministic fields are produced;
- reporting never mutates the state.

## Persistence

`apply` writes the new ledger to a unique sibling temporary file
(`.<name>.<pid>.<random>.tmp`, created with `O_EXCL`) and then atomically renames
it over the state path. The existing ledger is never truncated before the
transaction succeeds. If validation, reading, writing or renaming fails, the
previous ledger is preserved and only the temporary file this process created is
removed; no other file is ever unlinked. The directory is left containing just
the state and batch files after an apply (successful or rejected).

This design relies on same-directory rename atomicity and a single writer.

## Verification

`verification.txt` records the exact command, the unedited output and the exit
code of the acceptance suite:

```sh
node --test
```

## Limitations

- Single-writer only: no locking, multiwriter coordination or concurrency
  control is provided.
- No `fsync`/power-loss durability guarantee. The rename is atomic with respect
  to other processes' view of the directory entry, but a crash between the
  temporary write and the rename, or lost OS buffers, is not covered.
- No network access, authentication, GUI or release packaging.
- No third-party dependencies; only Node.js built-ins are used.
- The library trusts nothing about prior state: all history is revalidated on
  every call, which is O(events) per operation.
