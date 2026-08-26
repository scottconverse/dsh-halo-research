# Unit B2b — fix two specific cache-eviction defects

`src\halo_research_gateway\cache.py` already exists and mostly works: 6 of
its 8 frozen tests pass. The frozen tests at `tests\unit\test_cache.py` are
the specification — do not create, edit, or delete any test file. Do not
modify `migrations\__init__.py` or `cache_errors.py`.

Exactly **two** tests fail, and both are `evict()`. Fix only `evict()` and
whatever `put`/`get` bookkeeping it depends on.

## Defect 1 — `test_lru_eviction_order`: nothing is evicted

The test stores three ~4 KB incompressible entries (about 12.3 KB total)
with `max_bytes=9000`, touches `"a"` so it is most-recently-used, then calls
`evict()`. It expects `"b"` (the least recently accessed) to be gone and
`"a"` and `"c"` to survive. Currently `"b"` is still present, so `evict()`
removed nothing.

Required behaviour of `evict()`:
1. Delete every entry whose `expires_at` is at or before `clock()`.
2. Then, **while** the SUM of `compressed_bytes` across `cache_entries`
   is greater than `self.max_bytes`, delete the single entry with the
   oldest `last_accessed_at`, and re-check the sum. Loop until the total
   is within budget or no entries remain.

Two things that commonly break this:
- `get()` must UPDATE `last_accessed_at` to `clock()` on every real hit, or
  the LRU order is wrong.
- Compare against the stored `compressed_bytes` column, not the length of
  the uncompressed value.

## Defect 2 — `test_evict_preserves_rate_state`: an over-budget entry survives

The test uses `max_bytes=100` and stores one ~300-byte incompressible entry,
then calls `evict()`. It expects `cache.get("k")` to return `None`
afterwards (the entry is over the total budget), while the row in the
`rate_state` table is untouched.

So the eviction loop must be able to empty `cache_entries` completely when
even a single entry exceeds `max_bytes`. Do not stop at "one entry left" —
the exit condition is total bytes within budget, or no rows remain.

`evict()` must issue DELETE statements against `cache_entries` **only**.
Never `DELETE FROM rate_state`, never `VACUUM`, never drop tables.

## Reminders that already work — do not regress them

- One `sqlite3.connect(...)` per operation, wrapped in `contextlib.closing`.
- Use the injected `clock()` for every time value; never `datetime.now()`.
- `get(key, max_age_seconds=...)` that is too old returns `None` but must
  NOT delete the entry.

## Definition of done

```
uv run --frozen python -m pytest -q tests/unit/test_cache.py
```
