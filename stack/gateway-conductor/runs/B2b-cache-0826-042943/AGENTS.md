# Unit B2b — rewrite `evict()` only

Implement ONLY: `src\halo_research_gateway\cache.py`

6 of the 8 frozen tests in `tests\unit\test_cache.py` already pass. That file
is FROZEN — do not create, edit, or delete any test file. Both remaining
failures are in `evict()`, which is not deleting anything. Do not touch
`put`, `stats`, `migrations`, or `cache_errors`.

## What the two failing tests demand

`test_lru_eviction_order` — three ~4 KB incompressible entries are stored
(about 12.3 KB of `compressed_bytes` in total) with `max_bytes=9000`, `"a"` is
read so it becomes most-recently-used, then `evict()` runs. Afterwards `"b"`
must be gone and `"a"` and `"c"` must remain.

`test_evict_preserves_rate_state` — `max_bytes=100`, a single ~300 byte
incompressible entry, then `evict()`. Afterwards `cache.get("k")` must be
`None`, and the row in the `rate_state` table must still be there. So the loop
must be willing to empty `cache_entries` completely.

## Write it exactly like this

```python
def evict(self) -> None:
    now = self.clock().isoformat()
    with closing(sqlite3.connect(self.db_path)) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        # 1. expired entries first
        conn.execute("DELETE FROM cache_entries WHERE expires_at <= ?", (now,))
        conn.commit()
        # 2. then least-recently-accessed until the total fits
        while True:
            total = conn.execute(
                "SELECT COALESCE(SUM(compressed_bytes), 0) FROM cache_entries"
            ).fetchone()[0]
            if total <= self.max_bytes:
                break
            row = conn.execute(
                "SELECT cache_key FROM cache_entries "
                "ORDER BY last_accessed_at ASC, rowid ASC LIMIT 1"
            ).fetchone()
            if row is None:
                break                      # nothing left to remove
            conn.execute("DELETE FROM cache_entries WHERE cache_key = ?", (row[0],))
            conn.commit()
```

Points that have broken this twice already:
- The exit condition is **total bytes within budget, or the table is empty**.
  Never stop because "one entry is left".
- Sum the stored `compressed_bytes` column. Do not recompute sizes from the
  payloads.
- Compare `expires_at` against the injected `self.clock()`, never
  `datetime.now()`.
- Only ever `DELETE FROM cache_entries`. Never touch `rate_state`, never
  `VACUUM`, never drop a table.

Also confirm that `get()` writes a fresh `last_accessed_at` from `self.clock()`
on every successful hit — if it does not, the LRU order is wrong and `"b"`
will not be the victim.

## Definition of done

```
uv run --frozen python -m pytest -q tests/unit/test_cache.py
```


## Frozen files (gate-enforced)

These files are the specification. Do NOT create, edit, or delete them; any modification fails the gate automatically:
- `tests/unit/test_cache.py`


## Definition of done

Run EXACTLY this command to check your work:

```
uv run --frozen python -m pytest -q tests/unit/test_cache.py
```

Working rules (these decide whether you finish in time):
- This command is the ONLY check that counts. Do NOT write extra scripts,
  debug files, validation harnesses, or scratch test runners - they waste the
  clock and are deleted. Edit the source file, run the command, read the
  error, edit again.
- Change the smallest thing that fixes the reported error, then re-run.
- When the command passes, STOP immediately and say you are done.
- You have 15 minutes. If time is short, make the most failing test pass
  first rather than refactoring.
