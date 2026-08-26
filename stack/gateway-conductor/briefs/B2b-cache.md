# Unit B2b — the cache ONLY

Implement ONLY: `src\halo_research_gateway\cache.py`

The frozen tests at `tests\unit\test_cache.py` are the complete specification
— **read them first**. Do not create, edit, or delete any test file.

`src\halo_research_gateway\migrations\__init__.py` and
`src\halo_research_gateway\cache_errors.py` already exist and work — use them,
do not modify them. `migrate()` creates the schema; `Cache` never migrates.

Standard library only (`sqlite3`, `gzip`, `contextlib`, `datetime`).

## Cache

`Cache(db_path: str, max_bytes: int, entry_max_bytes: int, clock=None)`

`clock` is a callable returning a timezone-aware UTC `datetime`; default to
`lambda: datetime.now(timezone.utc)`. **Use the injected clock everywhere** —
never call `datetime.now()` directly inside a method, or the fake-clock tests
cannot control expiry.

- `put(key, value: bytes, ttl_seconds: int) -> None` — gzip-compress the
  value and store it inline in `cache_entries`. If the **compressed** size
  exceeds `entry_max_bytes`, raise `EntryTooLargeError` (from
  `cache_errors`) and store nothing. Record `created_at`, `expires_at`
  (now + ttl), `last_accessed_at`, `compressed_bytes`,
  `uncompressed_bytes`, and `storage_kind='inline'`.
- `get(key, max_age_seconds=None) -> bytes | None` — return the exact
  original bytes. Return `None` if the entry is missing or expired by its
  TTL. If `max_age_seconds` is given and the entry is older than that,
  return `None` **but leave the entry in place** (it is a freshness
  preference, not an eviction). On a real hit, update `last_accessed_at`
  from the clock.
- `evict() -> None` — first delete every expired entry, then, while the
  total of `compressed_bytes` exceeds `max_bytes`, delete the
  least-recently-accessed entry (oldest `last_accessed_at` first). **Never
  touch the `rate_state` table** or any table other than `cache_entries`.
- `stats() -> dict` — `{"entries": <count>, "total_compressed_bytes": <sum>}`.

## Windows rules (these caused six previous failures)

- **Never hold a connection open.** Every method opens its own
  `sqlite3.connect(...)` inside `contextlib.closing` and closes it before
  returning. No connection stored on the object.
- `PRAGMA journal_mode=WAL` per connection.
- If you ever see `PermissionError: [WinError 32]`, you left a connection
  open — find it.

## Definition of done

```
uv run --frozen python -m pytest -q tests/unit/test_cache.py
```
