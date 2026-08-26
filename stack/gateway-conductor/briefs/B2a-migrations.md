# Unit B2a — SQLite schema and migrations ONLY

Implement ONLY these files:
- `src\halo_research_gateway\migrations\__init__.py`
- `src\halo_research_gateway\cache_errors.py`

The frozen tests at `tests\unit\test_migrations.py` are the complete
specification — **read them first**. Do not create, edit, or delete any test
file. Ignore `tests\unit\test_cache.py` entirely; it belongs to a later unit.

Standard library only (`sqlite3`, `contextlib`, `os`, `pathlib`, `datetime`).

## cache_errors.py

Two exception classes: `SchemaTooNewError`, `EntryTooLargeError`.

## migrations/__init__.py

`migrate(db_path: str, backup_dir: str) -> None`, plus an ordered list of
migrations tracked by `PRAGMA user_version`.

Order of operations — this order is enforced by the tests:
1. If the database file already exists, the **first** thing you do is open it
   and read `PRAGMA user_version`. If that value is greater than the newest
   migration number you know, raise `SchemaTooNewError` **immediately** —
   before any backup, before any write. The file must be byte-identical
   afterwards and no backup file may be created.
2. If migrations need to be applied to an existing database, back it up first
   into `backup_dir` as a `.db` file using the **SQLite backup API**:
   `with closing(sqlite3.connect(src)) as s, closing(sqlite3.connect(dst)) as d: s.backup(d)`.
   Never copy a database file with `shutil`.
3. Keep only the **3 newest** `.db` files in `backup_dir`; delete older ones
   (compare by file modification time).
4. Apply pending migrations and set `PRAGMA user_version`. Running `migrate`
   a second time must change nothing and create no new backup.

Migration m001 creates exactly these four tables:

- `schema_meta(component TEXT PRIMARY KEY, version INTEGER NOT NULL, updated_at TEXT NOT NULL)`
- `cache_entries(cache_key TEXT PRIMARY KEY, provider TEXT NOT NULL, operation TEXT NOT NULL,
   result_schema_version TEXT NOT NULL, payload_schema_version INTEGER NOT NULL,
   created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_accessed_at TEXT NOT NULL,
   status_code INTEGER, storage_kind TEXT NOT NULL, content_encoding TEXT,
   inline_payload BLOB, body_digest TEXT, body_relative_path TEXT,
   compressed_bytes INTEGER NOT NULL, uncompressed_bytes INTEGER NOT NULL,
   CHECK (storage_kind IN ('inline','file')))`
- `rate_state(bucket_key TEXT PRIMARY KEY, last_started_at TEXT, window_started_at TEXT,
   request_count INTEGER NOT NULL DEFAULT 0, consecutive_429 INTEGER NOT NULL DEFAULT 0,
   circuit_state TEXT NOT NULL DEFAULT 'closed', circuit_until TEXT)`
- `request_log(request_id TEXT PRIMARY KEY, tool TEXT NOT NULL, provider TEXT NOT NULL,
   cache_key TEXT, started_at TEXT NOT NULL, completed_at TEXT, outcome TEXT,
   upstream_status INTEGER, duration_ms INTEGER, cache_hit INTEGER NOT NULL DEFAULT 0,
   warning_codes TEXT)`

## Windows rules (these caused six previous failures)

- **Never hold a connection open.** Every function opens its own
  `sqlite3.connect(...)` inside `contextlib.closing` and closes it before
  returning. No connections stored on objects or at module level.
- Set `PRAGMA journal_mode=WAL` per connection. Never assert on `-wal`/`-shm`
  files.
- If you ever see `PermissionError: [WinError 32]`, you left a connection
  open — find it.

## Definition of done

```
uv run --frozen python -m pytest -q tests/unit/test_migrations.py
```
