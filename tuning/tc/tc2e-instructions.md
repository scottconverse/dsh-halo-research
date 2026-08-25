## Your task in THIS run — work THROUGH the computer, from the first move

Hard cadence rule for this entire session: **you may never produce more than a
few sentences of thought without making a tool call.** Act first, think briefly
between actions. The contract above is complete — nothing needs re-deriving.

Your VERY FIRST action, before any planning at all, must be this tool call:
run `python --version` in the shell. That opens your act loop. From then on,
every step is: one short thought, one tool call.

Build the app THROUGH the computer, never from memory in one piece:

1. Use the shell to create the file skeleton: run a short python or shell
   command that writes a minimal `app.py` (imports, Flask app, SQLite init,
   stub routes) — under 60 lines. Then run `python app.py` in the background
   and confirm with an HTTP request that it serves.
2. Grow the app in small increments with the editor — never more than about
   40 lines per call — one route at a time, in this order: `/ingest` (form +
   LLM draft call), `/review` (edit + gate), `/article` (public page +
   transcript + corrections), `/` (list + search + board filter), the
   correction flow (`/article/<id>/correction`, `/corrections`).
3. After EVERY increment: restart the server and hit the changed route with a
   real HTTP request. Let the computer tell you whether it works — do not
   reason about correctness you can test in one command.
4. Finish with the full end-to-end pass (draft from `sample_transcript.txt`
   via the real LLM; gate blocks then passes; search; board filter; article
   page; correction accept -> public note). Write each contract item PASS or
   FAIL with one line of evidence to `TEST-RESULTS.md`.
5. Stop every process you started, then finish.

Context discipline: no whole-file re-reads, no long output dumps — targeted
edits and short commands only.
