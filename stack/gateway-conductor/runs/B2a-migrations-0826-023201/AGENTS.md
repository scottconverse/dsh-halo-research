# Unit B2a — fix two specific migration defects

`src\halo_research_gateway\migrations\__init__.py` and
`src\halo_research_gateway\cache_errors.py` already exist and mostly work.
The frozen tests at `tests\unit\test_migrations.py` are the specification —
do not create, edit, or delete any test file.

Exactly **two** tests fail. Fix only these. Change nothing else.

## Defect 1 — `test_schema_too_new_error`: the file is modified before the refusal

```
AssertionError: assert b'SQLite form...' == b'SQLite form...'
```
The database file must be **byte-identical** after `migrate()` raises
`SchemaTooNewError`. Right now something writes to it first.

The cause is almost certainly a write-triggering PRAGMA (for example
`PRAGMA journal_mode=WAL`) or a transaction being opened before the version
check. Required order, with nothing in between:

```python
with closing(sqlite3.connect(db_path)) as conn:
    current = conn.execute("PRAGMA user_version").fetchone()[0]
if current > NEWEST_KNOWN_VERSION:
    raise SchemaTooNewError(...)
# only AFTER this point may you set journal_mode, back up, or write anything
```

Do not set `journal_mode`, do not begin a transaction, and do not create a
backup directory before that check. Open the connection, read the pragma,
close it, decide.

## Defect 2 — `test_backup_created_and_capped`: no backup is taken

```
AssertionError: assert 'a.db' not in ['a.db', 'b.db', 'c.db']
```
The list is unchanged, which means **no new backup file was written at all**.

The test hands you a database file that exists and has `user_version = 0`,
so migrations DO need to be applied. Whenever migrations will be applied to
an existing database file, you must first write a backup into `backup_dir`:

```python
os.makedirs(backup_dir, exist_ok=True)
dst = os.path.join(backup_dir, f"gateway-{stamp}.db")   # must end in .db
with closing(sqlite3.connect(db_path)) as s, closing(sqlite3.connect(dst)) as d:
    s.backup(d)
```

Then prune: list the `*.db` files in `backup_dir`, sort by modification time,
and delete all but the 3 newest. (The test seeds three stale backups and
expects the oldest, `a.db`, to be gone once yours is added.)

Note: an existing-but-empty database file still counts as "existing" — it
needs migrations, so it needs a backup.

## Definition of done

```
uv run --frozen python -m pytest -q tests/unit/test_migrations.py
```


## Frozen files (gate-enforced)

These files are the specification. Do NOT create, edit, or delete them; any modification fails the gate automatically:
- `tests/unit/test_migrations.py`


## Definition of done

Run EXACTLY this command to check your work:

```
uv run --frozen python -m pytest -q tests/unit/test_migrations.py
```

Working rules (these decide whether you finish in time):
- This command is the ONLY check that counts. Do NOT write extra scripts,
  debug files, validation harnesses, or scratch test runners - they waste the
  clock and are deleted. Edit the source file, run the command, read the
  error, edit again.
- Change the smallest thing that fixes the reported error, then re-run.
- When the command passes, STOP immediately and say you are done.
- You have 12 minutes. If time is short, make the most failing test pass
  first rather than refactoring.
