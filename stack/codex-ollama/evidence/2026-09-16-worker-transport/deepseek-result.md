Implemented the narrow alias-collision fix.

**Files changed**
- `stack/codex-ollama/skill/scripts/ask_local.py`
  - `_canonical_path()` now uses `os.path.realpath()` before `os.path.normcase()`, resolving symlink and Windows junction aliases for collision checks.
- `stack/codex-ollama/skill/scripts/test_ask_local.py`
  - Added a focused regression test that simulates an output path resolving to the prompt input and verifies rejection occurs before inference or writes.

**Test command and result**
- `python -B -m unittest -v test_ask_local.py`
- Result: `Ran 17 tests in 0.989s` — `OK`

**Limitation**
- This environment could not create a real Windows symlink (`WinError 1314: A required privilege is not held by the client`), so the regression test uses `unittest.mock.patch` to simulate the alias while exercising the real `_canonical_path()` collision flow.