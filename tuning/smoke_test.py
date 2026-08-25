"""Deterministic acceptance check for the canary task.

Harness-owned (NOT written by the agent). Starts the agent's app.py on port
5099, exercises the exact contract in canary-task.txt, and prints PASS/FAIL
with an exit code (0 = pass). Every check maps 1:1 to a stated requirement, so
the bar is exactly the spec — no more, no less.

Usage:  python smoke_test.py <workspace_dir>
"""
import subprocess
import sys
import time
import urllib.request
import urllib.parse
import os
import signal
import re

PORT = 5099
BASE = f"http://127.0.0.1:{PORT}"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=10) as r:
        return r.status, r.read().decode("utf-8", "ignore")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # do not follow; let the 3xx surface as HTTPError


_no_follow = urllib.request.build_opener(_NoRedirect)


def post(path, fields):
    data = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(BASE + path, data=data, method="POST")
    try:
        r = _no_follow.open(req, timeout=10)
        return r.status, r.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, ""  # 302 arrives here because we don't follow


def main():
    ws = sys.argv[1] if len(sys.argv) > 1 else "."
    app = os.path.join(ws, "app.py")
    if not os.path.isfile(app):
        print("FAIL: app.py not found in", ws)
        return 1

    # clean any stale db so the run is deterministic
    for f in ("notes.db",):
        p = os.path.join(ws, f)
        if os.path.exists(p):
            try:
                os.remove(p)
            except OSError:
                pass

    proc = subprocess.Popen([sys.executable, "app.py"], cwd=ws,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    checks = []
    try:
        # wait for the server to come up (max 20s)
        up = False
        for _ in range(40):
            try:
                get("/")
                up = True
                break
            except Exception:
                time.sleep(0.5)
        checks.append(("server starts on :5099", up))
        if not up:
            raise SystemExit

        # add a note
        st, _ = post("/add", {"text": "alpha-note-xyz"})
        checks.append(("POST /add redirects (302)", st == 302))

        # list shows it, and exposes a note-<id>
        st, html = get("/")
        checks.append(("GET / lists the added note", "alpha-note-xyz" in html))
        m = re.search(r"note-(\d+)", html)
        checks.append(("note id rendered as note-<id>", bool(m)))
        note_id = m.group(1) if m else None

        # add a second, confirm both listed
        post("/add", {"text": "beta-note-xyz"})
        _, html2 = get("/")
        checks.append(("second note also listed",
                       "alpha-note-xyz" in html2 and "beta-note-xyz" in html2))

        # delete the first
        if note_id is not None:
            st, _ = post(f"/delete/{note_id}", {})
            checks.append(("POST /delete/<id> redirects (302)", st == 302))
            _, html3 = get("/")
            checks.append(("deleted note gone, other remains",
                           "alpha-note-xyz" not in html3 and "beta-note-xyz" in html3))
        else:
            checks.append(("POST /delete/<id> redirects (302)", False))
            checks.append(("deleted note gone, other remains", False))
    finally:
        try:
            if os.name == "nt":
                proc.terminate()
            else:
                os.kill(proc.pid, signal.SIGTERM)
        except Exception:
            pass
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()

    passed = sum(1 for _, ok in checks if ok)
    for name, ok in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    print(f"RESULT: {passed}/{len(checks)} checks passed")
    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    sys.exit(main())
