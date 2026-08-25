# TownReporter — build brief

Build a small local civic-journalism web app called **TownReporter** in this
directory. Single file `app.py`, Python + Flask + SQLite (db file
`townreporter.db`, created on startup). Serve on **127.0.0.1 port 5155** when
run directly with `python app.py`. Every route, field name, and string below is
tested exactly as written — match them.

## The pipeline
Ingest a meeting transcript → a LOCAL LLM drafts a neutral article → a producer
reviews and passes a hard gate → publish to a public page with search →
corrections add a public note.

## Routes and contract (tested exactly)

1. `GET /` — public home. Lists PUBLISHED articles newest-first. Has a text
   search (`?q=`) matching headline, summary, body, or transcript, and a board
   filter (`?board=`). Both combinable.
2. `GET /ingest` — form: textarea `transcript`, select `board` (options exactly:
   `City Commission`, `School Board`, `Planning Board`, `County Board`), text
   `meeting_date`. `POST /ingest` drafts via the LLM (below), stores the article
   as status `draft`, then redirects (302) to `/review/<id>`.
3. `GET /review/<int:id>` — edit form: `headline`, `summary`, `body`,
   `source_url`, checkbox `verified`, text `producer`, buttons submitting
   `action=save` and `action=publish`. `POST /review/<int:id>` saves edits
   always; on `action=publish` it publishes ONLY if the **gate** passes:
   (a) `source_url` non-empty, (b) the exact disclaimer string (below) present
   in `body`, (c) `verified` checked. On publish, record `approved_by` (the
   producer field) and `approved_at`. If the gate fails, do NOT publish;
   re-render the form with the gate status.
4. `GET /article/<int:id>` — returns **404 unless published** (but allow
   `?preview=1` to view drafts). Shows headline, board, meeting date, summary,
   body, a link to `source_url`, the text `published by <approved_by>`, any
   accepted correction notes rendered as `Correction (<date>): <note>`, the FULL
   transcript, and a correction-request form.
5. `POST /article/<int:id>/correction` — fields `detail` (required),
   `requester`; stores a correction request with status `pending`.
6. `GET /corrections` — producer inbox listing requests; each pending one has a
   form that POSTs to `/corrections/<int:cid>` with `action=accept` or
   `action=reject` and a text `public_note`. Accepting makes the note appear on
   the article page as described above.

## The LLM drafting call (real, not a stub)
- Endpoint `http://127.0.0.1:1234/v1/chat/completions` (OpenAI-compatible),
  model `unsloth/qwen3-coder-30b-a3b-instruct`, header `Authorization: Bearer local`.
- Send `max_tokens: 8000`, `temperature: 0.3`. Do NOT send `enable_thinking` or
  `reasoning_effort` — they are silently ignored on this server.
- This may be a thinking model: if the response `message.content` is empty, fall
  back to `message.reasoning_content` and extract the JSON from it.
- System prompt: neutral civic-news drafting — attribute every claim to a named
  speaker or the body, state vote counts exactly, no opinion, no invented facts.
  Ask for ONLY a JSON object with keys `headline`, `summary`, `body`
  (3–6 short paragraphs separated by blank lines, no disclaimer).
- Parse the first JSON object out of the reply robustly (strip code fences,
  scan brace-balanced). After parsing, append exactly this disclaimer to the
  body, separated by a blank line:

  `Summarized by TownReporter from the official meeting record. Verify against the source.`

- A drafting call can take minutes; use a generous HTTP timeout (at least 600s).

A sample transcript for testing is in `sample_transcript.txt` here.

## Scope limits
Single user, no auth, no CSS framework needed (plain HTML fine), no extra
files beyond `app.py`. Keep it clear and correct rather than fancy.

## Your task in THIS run — build INCREMENTALLY, never all at once

The one hard rule: **never write more than about 80 lines in a single tool
call.** Do not attempt the whole app in one pass.

1. FIRST WRITE (small): create `app.py` with only a minimal skeleton — imports,
   the Flask app object, SQLite init for both tables, and stub routes that
   return placeholder text. Keep this first write under 60 lines. Then RUN it
   (`python app.py`, backgrounded) and confirm it serves on the port.
2. Then implement ONE route at a time, in this order, using the str-replace
   editor to extend `app.py`: `/ingest` (form + LLM draft call), `/review`
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

Work steadily: a short thought, then an action. Prefer doing over deliberating —
the contract above is complete, so nothing needs re-deriving.


