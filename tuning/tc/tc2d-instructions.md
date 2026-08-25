## Your task in THIS run — build INCREMENTALLY, never all at once

The one hard rule: **never write more than about 80 lines in a single tool
call.** Do not attempt the whole app in one pass.

Exception to the single-file limit for THIS run: you may split the code into
`app.py` plus ONE small helper module (for example `views.py` holding the HTML
strings), imported by `app.py`, so each file stays small. `python app.py` must
still start the server.

1. FIRST WRITE (small): create `app.py` with only a minimal skeleton — imports,
   the Flask app object, SQLite init for both tables, and stub routes that
   return placeholder text. Keep this first write under 60 lines. Then RUN it
   (`python app.py`, backgrounded) and confirm it serves on the port.
2. Then implement ONE route at a time, in this order, using the str-replace
   editor to extend the files: `/ingest` (form + LLM draft call), `/review`
   (edit + gate), `/article` (public page + transcript + corrections display),
   `/` (list + search + board filter), `/article/<id>/correction` and
   `/corrections` (the correction flow).
3. After EACH route: restart the server, exercise that route with a real HTTP
   request, confirm it behaves per the contract, fix if not, then move on.
4. When all routes work: run the full end-to-end pass yourself (draft from
   `sample_transcript.txt` via the real LLM, gate blocks then passes, search,
   board filter, article page, correction accept -> public note). Record each
   contract item PASS or FAIL with one line of evidence in `TEST-RESULTS.md`.
5. Stop every process you started, then finish.
6. Context discipline: never re-read whole files or dump long tool output. Use
   targeted edits and short commands so your session stays small.

Work steadily: a short thought, then an action. Prefer doing over deliberating —
the contract above is complete, so nothing needs re-deriving.
