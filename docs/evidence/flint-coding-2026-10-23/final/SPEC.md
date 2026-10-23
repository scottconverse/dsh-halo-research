# Newsroom dispatch queue contract

Repair this Python 3.13 standard-library-only in-memory queue without changing
its public Queue/ConflictError API. The queue is shared by worker threads.
There is deliberately no network, disk persistence or async implementation.
The injected clock returns finite monotonic seconds; tests advance it directly.

- Tenant and key are nonempty strings; owner is a nonempty string. Reject invalid
  identifiers with ValueError. IDs and claim tokens must be opaque nonempty strings.
- enqueue stores a deep snapshot of a JSON-compatible dictionary payload.
  Idempotency is scoped by (tenant,key). An exact replay of the ORIGINAL payload,
  not_before and expires_at returns the existing job snapshot, regardless of its
  current status or retry schedule. A different replay raises ConflictError and
  does not change the original job. A different tenant can reuse the same key.
- not_before and expires_at (if present) must be finite real numbers, not booleans;
  expires_at must be strictly greater than not_before. Invalid inputs raise
  ValueError without changing any jobs or idempotency mappings.
- claim(tenant,owner,limit=1,lease_seconds=30) atomically leases at most limit jobs
  FROM THAT TENANT. limit is a positive integer, excluding booleans. lease_seconds
  is positive and finite, excluding booleans. Invalid calls raise ValueError before
  mutation. Eligible jobs are pending and not_before<=now, or leased with
  lease_until<=now. Jobs with expires_at<=now must become expired and must never
  be claimed. done and expired jobs are terminal. Expiration housekeeping in claim
  must be restricted to the requested tenant.
- Claim order is ascending current not_before, then original insertion sequence
  for ties. Each new lease (including same-owner reclaims) gets a NEW token.
  lease_until is now+lease_seconds. All return values are deep snapshots.
- ack(tenant,id,token) succeeds exactly once only for that tenant's currently
  leased job, current token, now<lease_until, and now<expires_at when a deadline
  exists. It changes status to done. Otherwise return False without mutation.
- nack(tenant,id,token,delay=0) has the same ownership/token/time requirements.
  delay is finite and nonnegative, excluding booleans; invalid delays raise
  ValueError before mutation even if the job does not exist. Success returns True,
  puts it back to pending with not_before=now+delay and invalidates its old token.
- peek(tenant,id) returns a deep snapshot for that tenant, otherwise None.
  Callers must not be able to change internal state through any input or output.
- Public methods must be thread safe. A single process-local lock is acceptable;
  do not hold it while performing external I/O (there should be none).

Also provide DESIGN.md (at most 600 words): how would you evolve this into a
crash-safe multi-process newsroom publication worker using SQLite, while keeping
idempotency and fencing? Address transaction boundaries, an external CMS crash
window, delivery guarantees, clock differences, migrations and tradeoffs. Do not
claim exactly-once external publication from a database transaction alone.
