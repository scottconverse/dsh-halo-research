"""Deterministic acceptance grader for TownReporter (T-C).

Harness-owned, never written by the agent. Grades EXACTLY the contract in
BRIEF-TEMPLATE.md — every check maps to a numbered brief clause. Fairness rule:
this grader must pass a known-correct reference implementation before it is
allowed to grade any model output.

Usage: python grade_townreporter.py <workspace> <port>
Exit 0 = all checks pass.
"""
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.parse
import urllib.error

DISCLAIMER = ("Summarized by TownReporter from the official meeting record. "
              "Verify against the source.")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


OPENER = urllib.request.build_opener()            # follows redirects
NOFOLLOW = urllib.request.build_opener(NoRedirect())


def get(base, path, timeout=30):
    with OPENER.open(base + path, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", "ignore"), r.geturl()


def get_status(base, path, timeout=30):
    try:
        with OPENER.open(base + path, timeout=timeout) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def post(base, path, fields, timeout=30, follow=True):
    data = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(base + path, data=data, method="POST")
    op = OPENER if follow else NOFOLLOW
    try:
        with op.open(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "ignore"), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore") if e.fp else "", ""


def main():
    ws = sys.argv[1]
    port = int(sys.argv[2])
    base = f"http://127.0.0.1:{port}"
    checks = []

    def check(name, ok, note=""):
        checks.append((name, bool(ok)))
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f"  ({note})" if note and not ok else ""))

    app = os.path.join(ws, "app.py")
    check("app.py exists", os.path.isfile(app))
    if not os.path.isfile(app):
        return finish(checks)

    # fresh db for determinism
    for f in os.listdir(ws):
        if f.endswith(".db"):
            try:
                os.remove(os.path.join(ws, f))
            except OSError:
                pass

    proc = subprocess.Popen([sys.executable, "app.py"], cwd=ws,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    try:
        up = False
        for _ in range(40):
            try:
                get(base, "/")
                up = True
                break
            except Exception:
                if proc.poll() is not None:
                    break
                time.sleep(0.5)
        check(f"server starts on :{port}", up,
              "process exited" if proc.poll() is not None else "no answer")
        if not up:
            return finish(checks, proc)

        # 2. ingest -> LLM draft -> redirect to /review/<id>
        transcript = open(os.path.join(ws, "sample_transcript.txt"),
                          encoding="utf-8").read()
        t0 = time.time()
        st, html, final = post(base, "/ingest", {
            "transcript": transcript,
            "board": "City Commission",
            "meeting_date": "August 10, 2026",
        }, timeout=600)
        draft_secs = round(time.time() - t0, 1)
        m = re.search(r"/review/(\d+)", final or "")
        check("POST /ingest drafts and redirects to /review/<id>",
              st == 200 and m, f"status={st} final={final} ({draft_secs}s)")
        if not m:
            return finish(checks, proc)
        aid = m.group(1)
        print(f"        (draft took {draft_secs}s)")

        # 3. draft content present with disclaimer on review page
        st, review_html, _ = get(base, f"/review/{aid}")
        check("review page shows a draft with the disclaimer",
              st == 200 and "Summarized by TownReporter" in review_html)

        # 4. gate BLOCKS: publish without source_url / verified
        body_txt = "Grader body paragraph one.\n\nGrader body two.\n\n" + DISCLAIMER
        post(base, f"/review/{aid}", {
            "headline": "City budget adopted test headline",
            "summary": "Grader summary sentence.",
            "body": body_txt,
            "source_url": "",
            "producer": "Grader",
            "action": "publish",
        })
        check("gate blocks publish when source and verification are missing",
              get_status(base, f"/article/{aid}") == 404)

        # 5. gate PASSES: full fields -> published, approver recorded
        post(base, f"/review/{aid}", {
            "headline": "City budget adopted test headline",
            "summary": "Grader summary sentence.",
            "body": body_txt,
            "source_url": "https://example.gov/meetings/2026-08-10",
            "verified": "on",
            "producer": "Grader",
            "action": "publish",
        })
        st, art_html, _ = get(base, f"/article/{aid}")
        check("gate passes and the article publishes", st == 200)
        check("approver is recorded and shown", "Grader" in art_html)
        check("article shows the source link",
              "https://example.gov/meetings/2026-08-10" in art_html)
        check("article shows the full transcript",
              "CHAIRWOMAN ALVAREZ" in art_html)
        check("article shows the disclaimer", DISCLAIMER[:40] in art_html)

        # 6. home: search + board filter
        st, home_html, _ = get(base, "/?q=budget")
        check("search finds the article",
              "City budget adopted test headline" in home_html)
        st, right_board, _ = get(base, "/?board=" +
                                 urllib.parse.quote("City Commission"))
        st, wrong_board, _ = get(base, "/?board=" +
                                 urllib.parse.quote("School Board"))
        check("board filter includes the right board",
              "City budget adopted test headline" in right_board)
        check("board filter excludes the wrong board",
              "City budget adopted test headline" not in wrong_board)

        # 7. corrections: request -> accept -> public note
        post(base, f"/article/{aid}/correction",
             {"detail": "Vote count correction request xyz",
              "requester": "Grader"})
        st, inbox, _ = get(base, "/corrections")
        cm = re.search(r"/corrections/(\d+)", inbox)
        check("correction request appears in the inbox",
              st == 200 and cm and "xyz" in inbox)
        if cm:
            post(base, f"/corrections/{cm.group(1)}",
                 {"action": "accept",
                  "public_note": "Corrected the vote count."})
            st, art2, _ = get(base, f"/article/{aid}")
            check("accepted correction shows a public note",
                  "Correction (" in art2 and "Corrected the vote count." in art2)
        else:
            check("accepted correction shows a public note", False)

        return finish(checks, proc)
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


def finish(checks, proc=None):
    passed = sum(1 for _, ok in checks if ok)
    print(f"RESULT: {passed}/{len(checks)} checks passed")
    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    sys.exit(main())
