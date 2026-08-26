# GATE FEEDBACK - round 2

The external verifier rejected the work. Exact output:

```
.....FF...FF                                                             [100%]
================================== FAILURES ===================================
___________________________ test_lru_eviction_order ___________________________

tmp_path = WindowsPath('C:/Users/scott/AppData/Local/Temp/pytest-of-scott/pytest-838/test_lru_eviction_order0')

    def test_lru_eviction_order(tmp_path):
        cache, clock, _ = make_cache(tmp_path, max_bytes=9000)
        a, b, c = os.urandom(4096), os.urandom(4096), os.urandom(4096)
        cache.put("a", a, ttl_seconds=3600)
        clock.advance(10)
        cache.put("b", b, ttl_seconds=3600)
        clock.advance(10)
        cache.put("c", c, ttl_seconds=3600)
        clock.advance(10)
        assert cache.get("a") == a  # refreshes a's last_accessed_at
        clock.advance(10)
        cache.evict()               # ~12.3KB stored, limit 9000 -> exactly one must go
>       assert cache.get("b") is None  # least recently accessed
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
E       AssertionError: assert b'\xd8\x88\x17\x88\x1e\xa5NG\'TY\x92=\x9f\x14\x03k\xb4\xef\xc3\x9d\xa3\xb9s\x9c\xef\xe1\xe0\xd20\x10\xfa\x7f\x92\x10\x...c0\x97\xc8\x1e2]w\x81=o\x93\x9d(\xbd`x\xcd\xa8\xad\x81)P\x9d\x86\xc9SoS\xae\xc7\x96\x10{f*\xcf\x0cj&\xc3z\xf0\x8d%\xa3' is None
E        +  where b'\xd8\x88\x17\x88\x1e\xa5NG\'TY\x92=\x9f\x14\x03k\xb4\xef\xc3\x9d\xa3\xb9s\x9c\xef\xe1\xe0\xd20\x10\xfa\x7f\x92\x10\x...c0\x97\xc8\x1e2]w\x81=o\x93\x9d(\xbd`x\xcd\xa8\xad\x81)P\x9d\x86\xc9SoS\xae\xc7\x96\x10{f*\xcf\x0cj&\xc3z\xf0\x8d%\xa3' = get('b')
E        +    where get = <halo_research_gateway.cache.Cache object at 0x00000180C9C12780>.get

tests\unit\test_cache.py:83: AssertionError
_______________________ test_evict_preserves_rate_state _______________________

tmp_path = WindowsPath('C:/Users/scott/AppData/Local/Temp/pytest-of-scott/pytest-838/test_evict_preserves_rate_stat0')

    def test_evict_preserves_rate_state(tmp_path):
        cache, clock, db = make_cache(tmp_path, max_bytes=100)
        with closing(sqlite3.connect(db)) as conn:
            conn.execute("INSERT INTO rate_state (bucket_key) VALUES ('reddit')")
            conn.commit()
        cache.put("k", os.urandom(300), ttl_seconds=3600)  # incompressible, over max_bytes
        cache.evict()
>       assert cache.get("k") is None
E       assert b'ylR\xdd"k\x86Z\x8d+\xf2\xf0`\xf3f:\x96\xfd\xd5\x9f`\x81|\xa2\xb2\xbf%\xc2\x1e4\x8d\x98\xd8\x83\x93mOZ\xd9*\xfc\x1b}k...\xae(s\x03x\xcd\x8e\x96\x12\xb9\x8di\xc6\x8f\xcb\x18\x95\x8a\xf4\xc426C\x0ex\xf9\xa2\x80\xbe\xd2\xf8\x9f\xa6\xfaH\xeb;' is None
E        +  where b'ylR\xdd"k\x86Z\x8d+\xf2\xf0`\xf3f:\x96\xfd\xd5\x9f`\x81|\xa2\xb2\xbf%\xc2\x1e4\x8d\x98\xd8\x83\x93mOZ\xd9*\xfc\x1b}k...\xae(s\x03x\xcd\x8e\x96\x12\xb9\x8di\xc6\x8f\xcb\x18\x95\x8a\xf4\xc426C\x0ex\xf9\xa2\x80\xbe\xd2\xf8\x9f\xa6\xfaH\xeb;' = get('k')
E        +    where get = <halo_research_gateway.cache.Cache object at 0x00000180C71C25A0>.get

tests\unit\test_cache.py:95: AssertionError
__________________________ test_schema_too_new_error __________________________

tmp_path = WindowsPath('C:/Users/scott/AppData/Local/Temp/pytest-of-scott/pytest-838/test_schema_too_new_error0')

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

tmp_path = WindowsPath('C:/Users/scott/AppData/Local/Temp/pytest-of-scott/pytest-838/test_backup_created_and_capped0')

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
FAILED tests/unit/test_cache.py::test_lru_eviction_order - AssertionError: as...
FAILED tests/unit/test_cache.py::test_evict_preserves_rate_state - assert b'y...
FAILED tests/unit/test_migrations.py::test_schema_too_new_error - AssertionEr...
FAILED tests/unit/test_migrations.py::test_backup_created_and_capped - Assert...
4 failed, 8 passed in 0.39s
RESULT: FAIL (pytest exit 1)
```

