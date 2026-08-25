# Unit B2 — SQLite schema, migrations, and cache (inline payloads)

Work ONLY in this repository. Touch only:
`src\halo_research_gateway\cache.py`, `src\halo_research_gateway\migrations\` (new files),
`tests\unit\test_cache.py`, `tests\unit\test_migrations.py`.

Use `sqlite3` from the standard library with WAL mode (async wrappers come in a
later unit). All timestamps are UTC RFC3339 strings.

## Migration framework (`migrations/__init__.py` + `migrations/m001_initial.py`)

- Ordered, idempotent migrations tracked by `PRAGMA user_version`.
- `migrate(db_path, backup_dir)`:
  1. if the database exists and its `user_version` is NEWER than the latest
     known migration, raise `SchemaTooNewError` and change nothing;
  2. before applying anything to an existing database, copy it to
     `backup_dir\gateway-<UTCstamp>.db` (create dir if needed); keep only the
     3 newest backups;
  3. apply each pending migration in one transaction; set `user_version`;
  4. running `migrate` twice in a row is a no-op the second time.

## m001 schema (verbatim)

```sql
CREATE TABLE schema_meta (component TEXT PRIMARY KEY, version INTEGER NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE cache_entries (
  cache_key TEXT PRIMARY KEY, provider TEXT NOT NULL, operation TEXT NOT NULL,
  result_schema_version TEXT NOT NULL, payload_schema_version INTEGER NOT NULL,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_accessed_at TEXT NOT NULL,
  status_code INTEGER, storage_kind TEXT NOT NULL, content_encoding TEXT,
  inline_payload BLOB, body_digest TEXT, body_relative_path TEXT,
  compressed_bytes INTEGER NOT NULL, uncompressed_bytes INTEGER NOT NULL,
  CHECK (storage_kind IN ('inline', 'file')));
CREATE TABLE rate_state (
  bucket_key TEXT PRIMARY KEY, last_started_at TEXT, window_started_at TEXT,
  request_count INTEGER NOT NULL DEFAULT 0, consecutive_429 INTEGER NOT NULL DEFAULT 0,
  circuit_state TEXT NOT NULL DEFAULT 'closed', circuit_until TEXT);
CREATE TABLE request_log (
  request_id TEXT PRIMARY KEY, tool TEXT NOT NULL, provider TEXT NOT NULL,
  cache_key TEXT, started_at TEXT NOT NULL, completed_at TEXT, outcome TEXT,
  upstream_status INTEGER, duration_ms INTEGER, cache_hit INTEGER NOT NULL DEFAULT 0,
  warning_codes TEXT);
```

## cache.py

- `Cache(db_path, max_bytes, entry_max_bytes, clock=None)` where `clock` is an
  injectable callable returning a UTC `datetime` (default: real time). Every
  TTL/eviction decision uses it — no direct `datetime.now()` elsewhere.
- `put(cache_key, provider, operation, payload: bytes, ttl_seconds, ...)`:
  inline storage only in this unit (`storage_kind='inline'`, payload
  gzip-compressed if that is smaller); a payload over `entry_max_bytes` raises
  `EntryTooLargeError`; `storage_kind='file'` is a `NotImplementedError` for now.
- `get(cache_key, max_age_seconds=None)`: returns the decompressed payload and
  metadata; expired entries return `None`; `max_age_seconds` returns `None` for
  entries older than that even if unexpired; every hit updates `last_accessed_at`.
- `evict()`: delete expired entries, then LRU-delete until total stored bytes
  fit `max_bytes`. **Never touches `rate_state` or `request_log`.**
- `stats()`: entry count and total bytes.

## tests (real assertions, fake clock — no sleeps)

- migrations: fresh db reaches user_version 1 with all 4 tables; second run
  no-op; newer user_version raises `SchemaTooNewError` untouched; backup file
  appears for an existing db and only 3 newest kept.
- cache: put/get roundtrip byte-exact (compressible and incompressible
  payloads); expiry via fake clock; `max_age_seconds` stricter than TTL;
  oversize raises; LRU evicts the least-recently-ACCESSED first; evict()
  preserves rows in `rate_state`; run the whole test file twice in one pytest
  invocation (parametrize or repeat) to prove no state leaks between runs
  (fresh tmp_path databases).

Run `uv run --frozen python -m pytest -q tests/unit/test_cache.py tests/unit/test_migrations.py`
yourself and make it pass before stopping.
