# TownReporter — build brief

Build a small local civic-journalism web app called **TownReporter** in this
directory. Single file `app.py`, Python + Flask + SQLite (db file
`townreporter.db`, created on startup). Serve on **127.0.0.1 port 5151** when
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

## Your task in THIS run
Write the complete pp.py now, matching every contract item above. Do NOT run
it, do not create any other files, do not test it. When pp.py is fully
written, stop.

