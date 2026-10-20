**Task code:** AMBER-LEDGER-64.

**Five key correctness requirements (from `SPEC.md`, as I read it):** exact BigInt money parsing with no float rounding; deterministic `canonical` serialization that rejects accessors without invoking getters; atomic `apply` so a failed batch rolls back with no partial mutation; semantic (not syntactic) idempotent replay of identical transfers; and non-negative balances plus canonical, detached `entries()` ordering.

**Files I changed:** rewrote `ledger.mjs`; created `ledger.test.mjs`; created `NOTES.md`. `SPEC.md` and `smoke.test.mjs` untouched.

**Testing actually run before compaction:** `node --test smoke.test.mjs ledger.test.mjs` via `C:/Program Files/nodejs/node.exe`, reaching a reported 27 tests / 27 pass / 0 fail after two earlier failures (a syntax error, then one bad expected-balance assertion I corrected). I also ran small ad-hoc node probes for timestamp and cursor edge cases. Not verified: hidden acceptance tests were never run or seen, so my SPEC interpretations (lowercase `t`/`z` rejection, millisecond `toISOString()` output, cursor strength) remain assumptions.

**64K ceiling:** Not reached as far as I can tell. I emitted only the single `stress-1` line before the compaction; I have no observed evidence of a 64K response truncation, and no 12,000-line stream was produced.