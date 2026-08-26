# GATE FEEDBACK - round 1

The external verifier rejected the work. Exact output:

```
..FF                                                                     [100%]
================================== FAILURES ===================================
__________________________ test_schema_too_new_error __________________________

tmp_path = WindowsPath('C:/Users/scott/AppData/Local/Temp/pytest-of-scott/pytest-839/test_schema_too_new_error0')

    def test_schema_too_new_error(tmp_path):
        db = tmp_path / "gateway.db"
        with closing(sqlite3.connect(db)) as c:
            c.execute("PRAGMA user_version = 999")
            c.commit()
        before = db.read_bytes()
        with pytest.raises(SchemaTooNewError):
            migrate(str(db), str(tmp_path / "backups"))
>       assert db.read_bytes() == before  # refused BEFORE any backup or write
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
E       AssertionError: assert b'SQLite form...0\x00\x00\x00' == b'SQLite form...0\x00\x00\x00'
E         
E         At index 18 diff: b'\x02' != b'\x01'
E         Use -v to get more diff

tests\unit\test_migrations.py:50: AssertionError
_______________________ test_backup_created_and_capped ________________________

tmp_path = WindowsPath('C:/Users/scott/AppData/Local/Temp/pytest-of-scott/pytest-839/test_backup_created_and_capped0')

    def test_backup_created_and_capped(tmp_path):
        backups = tmp_path / "backups"
        backups.mkdir()
        for i, name in enumerate(["a.db", "b.db", "c.db"]):  # stale backups, a.db oldest
            p = backups / name
            p.write_bytes(b"old")
            os.utime(p, (1000 + i, 1000 + i))
        db = tmp_path / "gateway.db"
        with closing(sqlite3.connect(db)) as c:  # existing unmigrated db -> must be backed up
            c.execute("PRAGMA user_version = 0")
            c.commit()
        migrate(str(db), str(backups))
        remaining = sorted(f.name for f in backups.glob("*.db"))
        assert len(remaining) == 3      # 3 stale + 1 new, pruned to the 3 newest
>       assert "a.db" not in remaining  # the oldest was pruned
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
E       AssertionError: assert 'a.db' not in ['a.db', 'b.db', 'c.db']

tests\unit\test_migrations.py:69: AssertionError
=========================== short test summary info ===========================
FAILED tests/unit/test_migrations.py::test_schema_too_new_error - AssertionEr...
FAILED tests/unit/test_migrations.py::test_backup_created_and_capped - Assert...
2 failed, 2 passed in 0.20s

RESULT: FAIL (acceptance command exit 1)
```

