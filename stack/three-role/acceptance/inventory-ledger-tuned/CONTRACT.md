# Inventory ledger completion contract

Build a dependency-free Node 24 library and CLI from this incomplete starter.
This is a disposable product acceptance exercise, not Verdict or a benchmark.
One process writes at a time. Multiwriter locking, a GUI, network access,
authentication, release packaging and publication are outside this task.

R1 — Export emptyState(), applyBatch(state, events), report(state) from ledger.mjs.
State format is {version:1,events:[...]}. Accepted events have exactly four fields:
id, sku, kind, quantity. id is 1–64 ASCII letters/digits/_/-, sku is 1–32 uppercase
ASCII letters/digits/_/-, kind is receive or ship, quantity is a positive safe
integer. Reject unknown fields, wrong types, malformed state or malformed events.

R2 — A batch is a transaction: validate and apply all events or throw without
changing the caller's state, event objects or array. A shipment may exactly
empty stock but must never make a SKU negative. Every intermediate balance and
sum must remain a safe integer. Returned state must not share mutable event
objects with the input. Rejected batches have no partially accepted prefix.

R3 — Event IDs are durable idempotency keys. Replaying an identical event is a
no-op regardless of object key insertion order, within a batch or across calls.
Reuse of an ID with different sku/kind/quantity rejects the whole batch. Persist
one copy per ID. Validate prior stored events, including conflicting/duplicate
IDs and historical overdrafts; a malformed prior ledger is not silently trusted.

R4 — report produces {balances:[{sku,quantity}],eventCount}. Include every SKU
ever touched, including zero balance, in ASCII ascending SKU order. eventCount
counts unique accepted events only. Return no timestamps or nondeterministic
fields. Reporting never mutates the state. The result is derived from validated
history; invalid prior state must be rejected.

R5 — cli.mjs supports apply <state.json> <batch.json> and report <state.json>.
Apply consumes a JSON array, saves the accepted state and prints report JSON.
Report prints report JSON and does not write. A missing state is empty. Invalid
arguments, JSON, state or events produce nonzero exit, empty stdout, and one JSON
error object on stderr. Usage errors must not modify files. Paths with spaces
work. No dependencies, interactive prompts, network or shell interpolation.

R6 — Persist using a unique sibling temporary file followed by atomic rename.
Do not truncate the existing ledger before the transaction succeeds. If a
validation/read/write/rename error occurs preserve the previous ledger and clean
up only the owned temporary file. Never remove someone else's file. Demonstrate
preservation after rejected apply and corrupt-state rejection; inspect the write
path for atomicity. This does not claim power-loss durability/fsync guarantees.

R7 — Keep acceptance.test.mjs and this CONTRACT.md byte-for-byte unchanged. Add
focused regression cases for additional defects found if needed. Run the existing
Node acceptance suite, capture command, exit code and unedited output in
verification.txt, and document actual behavior and limitations in README.md.
No git push, tag, publication, package installation or changes outside this folder.

R8 — Auditor independently traces every R1–R7 through source and existing
execution receipts, records each separately, and closes each real finding only
after rereading the fix. Start with a read-only baseline review. Coder must wait
for the Coordinator's explicit GO BASELINE REVIEW COMPLETE message before editing
or running checks. Coordinator sends that message after the Auditor records its
initial material findings, then keeps the workers moving until R1–R8 are verified,
all findings are closed and both workers settle. Do not treat a final message or
green suite alone as acceptance. No additional features or invented blockers.
