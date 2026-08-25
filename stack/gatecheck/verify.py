"""External verifier for the gate fail-closed proof (T-29).

Lives OUTSIDE the workspace. Takes the workspace path, loads mathx.py from it,
runs five exact checks. Exit 0 only if all pass. Ignores every prose file the
worker may have written -- test evidence only (spec v2.5 s21.15).
"""
import sys, importlib.util, traceback

ws = sys.argv[1]
spec = importlib.util.spec_from_file_location("mathx", ws + "/mathx.py")
try:
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
except Exception:
    print("FAIL: mathx.py did not load")
    traceback.print_exc()
    sys.exit(2)

checks = [
    ("add(2, 3) == 5",    lambda: m.add(2, 3) == 5),
    ("add(-1, 1) == 0",   lambda: m.add(-1, 1) == 0),
    ("add(0, 0) == 0",    lambda: m.add(0, 0) == 0),
    ("add(10, 32) == 42", lambda: m.add(10, 32) == 42),
    ("add(-5, -7) == -12", lambda: m.add(-5, -7) == -12),
]
failed = 0
for name, fn in checks:
    try:
        ok = fn()
    except Exception as e:
        ok = False
        name += f"  (raised {type(e).__name__}: {e})"
    print(("PASS " if ok else "FAIL ") + name)
    if not ok:
        failed += 1
print(f"RESULT: {len(checks)-failed}/{len(checks)} checks passed")
sys.exit(0 if failed == 0 else 1)
