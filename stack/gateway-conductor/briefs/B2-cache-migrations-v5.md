# Unit B2 (v5, test-first) — make the frozen acceptance tests pass

The acceptance tests ALREADY EXIST and are FROZEN:
- `tests\unit\test_cache.py`
- `tests\unit\test_migrations.py`

**Do not create, edit, delete, or add any test file. Any change to them fails
the gate automatically.** Read them first — they are the complete executable
spec. Your job is ONLY to implement:

- `src\halo_research_gateway\cache.py`
- `src\halo_research_gateway\cache_errors.py`  (`SchemaTooNewError`, `EntryTooLargeError`)
- `src\halo_research_gateway\migrations\__init__.py`

The workspace already contains a partial prior implementation of these three —
finish and fix it rather than starting over.

Key semantics the tests enforce (details in the tests themselves):
- `migrate(db_path, backup_dir)`: creates the 4 tables (`schema_meta`,
  `cache_entries`, `rate_state`, `request_log`), sets `PRAGMA user_version`;
  second run is a no-op with no new backup. On an EXISTING db file the FIRST
  operation is reading `user_version`; if newer than known, raise
  `SchemaTooNewError` before any backup or write (file byte-identical after).
  An existing db that needs migration is backed up first into `backup_dir`
  as a `.db` file via the SQLite backup API; keep only the 3 newest `.db`
  files there.
- `Cache(db_path, max_bytes, entry_max_bytes, clock=None)`: `clock` is a
  callable returning a UTC datetime. `put(key, value, ttl_seconds)` stores
  gzip-compressed bytes inline; compressed size > `entry_max_bytes` raises
  `EntryTooLargeError`. `get(key, max_age_seconds=None)` returns exact
  original bytes, honors TTL and the stricter `max_age_seconds` (a max_age
  miss does NOT delete the entry), updates `last_accessed_at`. `evict()`
  removes expired entries then least-recently-accessed until total compressed
  bytes <= `max_bytes`; never touches `rate_state` rows. `stats()` returns
  `{"entries": int, "total_compressed_bytes": int}`.
- Windows rules (previous failures): every operation opens its own connection
  via `contextlib.closing` and closes it; no connection attributes; backups
  via `sqlite3 backup()` API never file copy; `PRAGMA journal_mode=WAL` per
  connection.

Run the verifier's exact command until green before stopping:
`uv run --frozen python -m pytest -q tests/unit/test_cache.py tests/unit/test_migrations.py`
