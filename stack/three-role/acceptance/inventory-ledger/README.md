# Inventory ledger

Dependency-free Node 24 library and CLI for a single-writer inventory ledger.
`CONTRACT.md` is authoritative; `CONTRACT.md` and `acceptance.test.mjs` are
protected and must remain byte-for-byte unchanged.

## Library API (`ledger.mjs`)

- `emptyState()` returns a fresh `{ version: 1, events: [] }`.
- `applyBatch(state, events)` validates the complete prior ledger and the
  complete incoming batch, then returns a new state. It never mutates the
  caller's state, batch, or event objects.
- `report(state)` returns `{ balances, eventCount }` derived from validated
  history and never mutates the state.

An event is a plain object with exactly four own fields:

```json
{"id":"r1","sku":"WIDGET","kind":"receive","quantity":10}
```

- `id`: 1-64 ASCII letters, digits, `_`, or `-`
- `sku`: 1-32 uppercase ASCII letters, digits, `_`, or `-`
- `kind`: `receive` or `ship`
- `quantity`: a positive safe integer

Unknown fields, symbols, non-plain objects, wrong types, malformed state, and
malformed batches are rejected. State must be a plain object with exactly
`version: 1` and an `events` array.

## Transaction and idempotency semantics

- A batch is all-or-nothing. Any invalid event, ID conflict, insufficient
  stock, or safe-integer overflow throws before the caller's state changes.
  There is no partially accepted prefix.
- Event IDs are durable idempotency keys. Replaying an identical event is a
  no-op, including when object key order differs. Reusing an ID with a
  different `sku`, `kind`, or `quantity` rejects the whole batch.
- Stored history is revalidated on every `applyBatch` and `report` call.
  Duplicate stored IDs (including exact duplicates), historical overdrafts,
  invalid events, and overflowed balances make the prior ledger invalid.
- All stored and newly accepted events in a returned state are detached copies.
- `report` includes every SKU ever touched, even at zero balance, sorted by
  ASCII code-unit order. `eventCount` counts unique accepted events. Only these
  fields are returned; no timestamps or other nondeterministic data are added.

## CLI (`cli.mjs`)

```text
node cli.mjs apply <state.json> <batch.json>
node cli.mjs report <state.json>
```

- `apply` reads a JSON array batch, applies it transactionally, atomically
  replaces the state file, and prints the resulting report JSON.
- `report` prints report JSON and never writes.
- A missing state file is treated as `emptyState()`.
- Arguments are strict: `apply` requires exactly two paths and `report`
  exactly one. Unknown commands and extra arguments are usage errors.
- On every failure the process exits nonzero, writes nothing to stdout, and
  writes exactly one JSON object such as `{"error":"Invalid event id"}` to
  stderr. Usage errors are detected before any file read or write.
- Paths are passed as process arguments, so spaces are supported. The CLI has
  no dependencies, prompts, network access, or shell interpolation.

## Persistence and atomicity

State is written to a uniquely named sibling temporary file (created with
exclusive `wx` semantics) in the ledger's directory, then renamed over the
ledger. The old ledger is never truncated before that rename. If validation,
reading, writing, closing, or renaming fails, the previous ledger remains in
place and only the temporary file created by this invocation is removed.
Existing files are never overwritten as temporary files, and unrelated files
are never removed.

## Limitations

- No `fsync` or other power-loss durability guarantee is provided. Atomicity
  is limited to the replace operation on one filesystem.
- A single writer is assumed. There is no multiwriter or inter-process lock.
- IDs are durable only within the state file; there is no external store.
- No GUI, authentication, network integration, or publication tooling is
  included, as required by the contract.

## Tests

```text
node --test acceptance.test.mjs
node --test regression.test.mjs
```

`verification.txt` records the exact acceptance command, exit code, output,
and SHA-256 receipts for the two protected files. `regression.test.mjs`
contains additional focused cases for strict state shape, in-batch replay,
overflow rollback, non-plain events, ASCII ordering, creation from a missing
state, and side-effect-free usage errors.
