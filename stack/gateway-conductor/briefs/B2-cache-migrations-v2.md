# Unit B2 (retry) — SQLite schema, migrations, cache

Same deliverables as before. Touch only: `src\halo_research_gateway\cache.py`,
`src\halo_research_gateway\migrations\`, `tests\unit\test_cache.py`,
`tests\unit\test_migrations.py`.

The previous attempt failed EVERY test with `PermissionError: [WinError 32]`
(file in use). Root cause class: SQLite connections left open on Windows lock
the database file, so backups, re-opens, and pytest tmp_path cleanup all fail.
These constraints are mandatory:

1. **No long-lived connections anywhere.** `Cache` stores only the database
   PATH. Every method (`put`, `get`, `evict`, `stats`) opens its own
   `sqlite3.connect(...)` and closes it in `finally` (use
   `contextlib.closing`). Same rule inside every migration function. No
   connection objects as attributes, no module-level connections, no
   fixture-scope connections in tests.
2. **Backups use the SQLite backup API, never file copy:**
   `with closing(sqlite3.connect(src)) as s, closing(sqlite3.connect(dest)) as d: s.backup(d)`.
   Never `shutil.copy` a database that any connection may have open.
3. Enable WAL per-connection with `PRAGMA journal_mode=WAL` after connect.
   Never assert on the presence or absence of `-wal`/`-shm` files.
4. Tests create databases only under pytest `tmp_path`, open nothing outside
   the function body, and never hold a connection across an assertion that
   re-opens or copies the file.

## Deliverables (unchanged contract)

- `migrations/`: ordered idempotent migrations via `PRAGMA user_version`;
  `migrate(db_path, backup_dir)` — refuse newer schema (`SchemaTooNewError`);
  backup existing db (backup API) before applying, keep 3 newest backups;
  second run is a no-op. m001 creates exactly these tables:
  `schema_meta(component TEXT PRIMARY KEY, version INTEGER NOT NULL, updated_at TEXT NOT NULL)`;
  `cache_entries(cache_key TEXT PRIMARY KEY, provider TEXT NOT NULL, operation TEXT NOT NULL,
   result_schema_version TEXT NOT NULL, payload_schema_version INTEGER NOT NULL,
   created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_accessed_at TEXT NOT NULL,
   status_code INTEGER, storage_kind TEXT NOT NULL, content_encoding TEXT,
   inline_payload BLOB, body_digest TEXT, body_relative_path TEXT,
   compressed_bytes INTEGER NOT NULL, uncompressed_bytes INTEGER NOT NULL,
   CHECK (storage_kind IN ('inline','file')))`;
  `rate_state(bucket_key TEXT PRIMARY KEY, last_started_at TEXT, window_started_at TEXT,
   request_count INTEGER NOT NULL DEFAULT 0, consecutive_429 INTEGER NOT NULL DEFAULT 0,
   circuit_state TEXT NOT NULL DEFAULT 'closed', circuit_until TEXT)`;
  `request_log(request_id TEXT PRIMARY KEY, tool TEXT NOT NULL, provider TEXT NOT NULL,
   cache_key TEXT, started_at TEXT NOT NULL, completed_at TEXT, outcome TEXT,
   upstream_status INTEGER, duration_ms INTEGER, cache_hit INTEGER NOT NULL DEFAULT 0,
   warning_codes TEXT)`.
- `cache.py`: `Cache(db_path, max_bytes, entry_max_bytes, clock=None)` with an
  injectable clock (callable returning UTC datetime); inline gzip payloads;
  oversize raises `EntryTooLargeError`; `storage_kind='file'` raises
  `NotImplementedError`; `get` honors TTL and optional `max_age_seconds`,
  updates `last_accessed_at`; `evict()` removes expired then LRU by
  `last_accessed_at` down to `max_bytes`, never touching `rate_state`;
  `stats()` returns count and bytes.

## Tests (fake clock, no sleeps, tmp_path only)

Fresh-db schema + user_version; no-op second migrate; SchemaTooNewError leaves
file untouched; backup created and capped at 3; put/get byte-exact roundtrip
(compressible + random bytes); expiry; max_age stricter than TTL; oversize;
LRU order by access; evict preserves `rate_state` rows.

Run `uv run --frozen python -m pytest -q tests/unit/test_cache.py tests/unit/test_migrations.py`
until green before stopping. If a PermissionError ever appears, you have
violated constraint 1 — find the unclosed connection.
