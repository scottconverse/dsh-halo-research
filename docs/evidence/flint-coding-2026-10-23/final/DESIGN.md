# Design: crash-safe multi-process newsroom publication worker

The in-memory `Queue` is a lease/fencing primitive. To survive process crashes
and run multiple worker replicas it maps onto a transactional store such as
SQLite (standard library `sqlite3`, schema versioned).

**Transaction boundaries.** Enqueue becomes `BEGIN IMMEDIATE` → idempotency
lookup (`(tenant, key)` unique) → insert-or-return-existing → `COMMIT`. Claim
becomes `BEGIN IMMEDIATE` → tenant-scoped expiry sweep → select eligible
(pending `not_before <= now`, or leased `lease_until <= now`) ordered by
`(not_before, sequence)` → fencing update (`status`, new token, new
`lease_until`) → `COMMIT`. Immediate transactions give one writer, so lease
decisions are atomic across processes; the fencing token (monotonic per job)
plus `lease_until` replaces the in-process token, so a stale worker holding an
old token loses the job.

**External CMS crash window.** The queue ack marks the lease delivered, but the
real crash window is between the worker's successful CMS write and the queue
ack. Use an outbox: write job id + attempt + idempotency key to an
`outbox` table in the same transaction that granted the lease; the worker
publishes to the CMS, then a separate transaction marks the attempt done. On
recovery, a sweep re-claims expired leases and re-pushes unacknowledged
outbox rows.

**Delivery guarantees.** At-least-once delivery with idempotent consumer
semantics: the CMS receives `(job_id, attempt)` and dedupes. This does not
yield exactly-once external publication from a database transaction alone; the
commit and the CMS write are separate steps and need reconciliation.

**Clock differences.** Each process has a local monotonic clock; SQLite stores
UTC epoch seconds. Persist both lease deadline and created/updated timestamps,
and compare deadlines against the stored lease value, tolerating clock skew.

**Migrations / tradeoffs.** Version the schema additively (status, token,
lease_until, sequence columns with backfill); keep the in-memory semantics as
the reference. SQLite limits write throughput and is single-writer; for high
throughput move to a real broker plus the same lease/outbox pattern.
