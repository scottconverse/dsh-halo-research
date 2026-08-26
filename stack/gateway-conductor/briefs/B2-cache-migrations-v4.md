# Unit B2 (v4) — SQLite schema, migrations, cache — COMPLETE contract

Work ONLY in this repository. Touch only: `src\halo_research_gateway\cache.py`,
`src\halo_research_gateway\cache_errors.py`, `src\halo_research_gateway\migrations\`,
`tests\unit\test_cache.py`, `tests\unit\test_migrations.py`.

The workspace currently contains a STUB cache (37 lines, eviction is a comment)
and a thin test set from an interrupted round. That stub is NOT the deliverable.
This brief is the complete contract — build all of it. Do not assume any prior
state; do not reference "previous" work.

## Hard Windows constraints (violations caused 6 failed rounds — mandatory)

1. **No long-lived connections.** `Cache` stores only the database PATH. Every
   method opens its own `sqlite3.connect(...)` and closes it via
   `contextlib.closing`. Same inside every migration function. No connection
   attributes, no module-level or fixture-scope connections.
2. **Backups use the SQLite backup API, never file copy:**
   `with closing(sqlite3.connect(src)) as s, closing(sqlite3.connect(dest)) as d: s.backup(d)`.
3. `PRAGMA journal_mode=WAL` per connection. Never assert on `-wal`/`-shm` files.
4. Tests: databases only under pytest `tmp_path`; never hold a connection across
   an assertion that re-opens or copies the file.
5. In `migrate`, the FIRST operation on an existing db file is reading
   `PRAGMA user_version`. If it exceeds the newest known migration, raise
   `SchemaTooNewError` immediately — before any backup, before any write. The
   db file must be byte-identical afterward and no backup file created.
6. Every test creates its db like this, first thing — `Cache` does NOT
   auto-migrate:
   ```python
   db = tmp_path / "gateway.db"; backups = tmp_path / "backups"
   migrate(str(db), str(backups))
   cache = Cache(str(db), max_bytes=..., entry_max_bytes=..., clock=fake_clock)
   ```

## Deliverables

- `migrations/`: ordered idempotent migrations via `PRAGMA user_version`;
  `migrate(db_path, backup_dir)`; refuse newer schema (`SchemaTooNewError` from
  `cache_errors.py`); back up an existing db (backup API) before applying,
  keep only the 3 newest backups; second run is a no-op. m001 creates exactly:
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
- `cache.py`: `Cache(db_path, max_bytes, entry_max_bytes, clock=None)`;
  injectable clock (callable returning a UTC datetime); `put` stores inline
  gzip payloads with a TTL (`ttl_seconds` argument); payloads whose compressed
  size exceeds `entry_max_bytes` raise `EntryTooLargeError`;
  `storage_kind='file'` raises `NotImplementedError`; `get` returns the exact
  original bytes, honors TTL and an optional stricter `max_age_seconds`, and
  updates `last_accessed_at`; `evict()` removes expired entries then LRU by
  `last_accessed_at` down to `max_bytes`, never touching `rate_state` rows;
  `stats()` returns entry count and total compressed bytes.
- `cache_errors.py`: `SchemaTooNewError`, `EntryTooLargeError`.

## REQUIRED tests — the verifier collects and checks these EXACT function names

The gate fails if ANY name below is missing from the collected tests. Fake
clock, no sleeps, tmp_path only.

In `tests/unit/test_migrations.py`:
- `test_migrate_creates_schema` — fresh db: all four tables exist, user_version set
- `test_migrate_second_run_noop` — second migrate changes nothing
- `test_schema_too_new_error` — `PRAGMA user_version = 999` then
  `pytest.raises(SchemaTooNewError)`; file bytes identical after; no backup dir entry
- `test_backup_created_and_capped` — migrating an existing db creates a backup;
  repeated cycles keep only 3 newest

In `tests/unit/test_cache.py`:
- `test_cache_requires_migrated_database` — migrate-then-Cache works
- `test_put_get_roundtrip` — byte-exact for compressible text AND random bytes
- `test_expiry_ttl` — entry gone after fake clock passes TTL
- `test_max_age_stricter_than_ttl` — fresh by TTL, rejected by smaller max_age_seconds
- `test_oversize_entry_rejected` — `EntryTooLargeError`
- `test_lru_eviction_order` — least-recently-accessed evicted first, down to max_bytes
- `test_evict_preserves_rate_state` — rows in `rate_state` survive evict()
- `test_stats_counts_and_bytes`

Run the verifier's exact command until green before stopping:
`uv run --frozen python -m pytest -q tests/unit/test_cache.py tests/unit/test_migrations.py`
Then list `tests\unit\` and confirm both files exist. If a PermissionError
appears, you violated constraint 1 — find the unclosed connection.
