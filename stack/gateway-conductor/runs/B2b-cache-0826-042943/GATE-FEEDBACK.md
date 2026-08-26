# GATE FEEDBACK - round 1

The external verifier rejected the work. Exact output:

```
.....FF.                                                                 [100%]
================================== FAILURES ===================================
___________________________ test_lru_eviction_order ___________________________

tmp_path = WindowsPath('C:/Users/scott/AppData/Local/Temp/pytest-of-scott/pytest-856/test_lru_eviction_order0')

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
E       AssertionError: assert b'\x9f\xd2CM\x072\xd2\x8c-W1\xe6s\x04\xdb\xd3\xd7$\xab\x9eD\xa6\xb1\x98\x94\xe9\xc0\x1e\xa5\xbf\xa0V\x08\x1cJ\xbb\x91v...x9bU\x132r\xaaL\x9bL\xb1\xa6\xf2\xd4\x8a\r.^9p\x1d\xe5\x82\x03\xf0\xd8\xbe$\x1d:\xd9>\x8bJ\xab\xbc\x97\xcb\xcd\x0f\xda' is None
E        +  where b'\x9f\xd2CM\x072\xd2\x8c-W1\xe6s\x04\xdb\xd3\xd7$\xab\x9eD\xa6\xb1\x98\x94\xe9\xc0\x1e\xa5\xbf\xa0V\x08\x1cJ\xbb\x91v...x9bU\x132r\xaaL\x9bL\xb1\xa6\xf2\xd4\x8a\r.^9p\x1d\xe5\x82\x03\xf0\xd8\xbe$\x1d:\xd9>\x8bJ\xab\xbc\x97\xcb\xcd\x0f\xda' = get('b')
E        +    where get = <halo_research_gateway.cache.Cache object at 0x000002082382F200>.get

tests\unit\test_cache.py:83: AssertionError
_______________________ test_evict_preserves_rate_state _______________________

tmp_path = WindowsPath('C:/Users/scott/AppData/Local/Temp/pytest-of-scott/pytest-856/test_evict_preserves_rate_stat0')

    def test_evict_preserves_rate_state(tmp_path):
        cache, clock, db = make_cache(tmp_path, max_bytes=100)
        with closing(sqlite3.connect(db)) as conn:
            conn.execute("INSERT INTO rate_state (bucket_key) VALUES ('reddit')")
            conn.commit()
        cache.put("k", os.urandom(300), ttl_seconds=3600)  # incompressible, over max_bytes
        cache.evict()
>       assert cache.get("k") is None
E       assert b'\xff \xae\x93:_L6\x82\x06\xee\xffS1\xefSv\x94\x9d\x18\xe5\xcf6\x1f4"\xf6\x14\x16D\xed3+\xf9h\xe7G\x11\xc5,\xf65\x9c\...xd4\x96\xd0\xc6\x93\xfc\xe9\x85\xe2\x1d\x8b8\x00\x1f\x99I\x0f\xc7\x7f\xa6\xe7|w\x9a\x9a\xbc\x15\xc2\x99\x86fx\x08!\xae' is None
E        +  where b'\xff \xae\x93:_L6\x82\x06\xee\xffS1\xefSv\x94\x9d\x18\xe5\xcf6\x1f4"\xf6\x14\x16D\xed3+\xf9h\xe7G\x11\xc5,\xf65\x9c\...xd4\x96\xd0\xc6\x93\xfc\xe9\x85\xe2\x1d\x8b8\x00\x1f\x99I\x0f\xc7\x7f\xa6\xe7|w\x9a\x9a\xbc\x15\xc2\x99\x86fx\x08!\xae' = get('k')
E        +    where get = <halo_research_gateway.cache.Cache object at 0x000002082382FFB0>.get

tests\unit\test_cache.py:95: AssertionError
=========================== short test summary info ===========================
FAILED tests/unit/test_cache.py::test_lru_eviction_order - AssertionError: as...
FAILED tests/unit/test_cache.py::test_evict_preserves_rate_state - assert b'\...
2 failed, 6 passed in 0.39s

RESULT: FAIL (acceptance command exit 1)
```

