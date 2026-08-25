# Unit B2 (final retry) — SQLite schema, migrations, cache

Same contract and constraints as the last brief (per-operation connections via
contextlib.closing, SQLite backup API, WAL per connection, tmp_path only).
The lock errors are GONE — your structure is right. Exactly two defects remain.
Fix them and keep everything else:

## Defect 1 — tests use the cache before the schema exists
`no such table: cache_entries`. EVERY test must set up its database like this,
first thing:

```python
db = tmp_path / "gateway.db"
backups = tmp_path / "backups"
migrate(str(db), str(backups))       # creates the schema
cache = Cache(str(db), max_bytes=..., entry_max_bytes=..., clock=fake_clock)
```

Never construct `Cache` against a path that `migrate` has not been run on.
(`Cache` itself does NOT auto-migrate — that stays the caller's job.)

## Defect 2 — SchemaTooNewError never raised
In `migrate`, the FIRST operation on an existing database file must be reading
`PRAGMA user_version`. If it is GREATER than the newest known migration number,
raise `SchemaTooNewError` immediately — before any backup, before any write,
before anything else. The test:

```python
db = tmp_path / "gateway.db"
with closing(sqlite3.connect(db)) as c:
    c.execute("PRAGMA user_version = 999")
    c.commit()
with pytest.raises(SchemaTooNewError):
    migrate(str(db), str(tmp_path / "backups"))
```

must pass, and the file must be byte-identical afterward (no backup created,
compare directory listing before/after).

Change only what these two defects require. Run
`uv run --frozen python -m pytest -q tests/unit/test_cache.py tests/unit/test_migrations.py`
until green before stopping.
