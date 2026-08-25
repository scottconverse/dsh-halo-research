import json
import re
import sqlite3
from datetime import datetime, timezone

import requests

from flask import Flask, g, redirect, render_template_string, request, url_for

DB_PATH = "townreporter.db"
app = Flask(__name__)

LLM_URL = "http://127.0.0.1:1234/v1/chat/completions"
LLM_MODEL = "unsloth/qwen3-coder-30b-a3b-instruct"
DISCLAIMER = "Summarized by TownReporter from the official meeting record. Verify against the source."

SYSTEM_PROMPT = (
    "You are a neutral civic-news reporter for a local town newspaper. Draft a news article from the provided meeting transcript. "
    "Attribute every claim to a named speaker or to the body itself. State vote counts exactly as recorded in the transcript. "
    "No opinion, no invented facts, no speculation beyond what the record states. "
    "Respond with ONLY a JSON object (no prose, no code fences) with keys: "
    '"headline" (a concise news headline), '
    '"summary" (one or two sentences), and '
    '"body" (3-6 short paragraphs separated by blank lines; do not include any disclaimer).'
)


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def extract_json(text):
    """Parse the first JSON object out of a reply robustly (strip code fences, scan brace-balanced)."""
    candidate = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", candidate, re.DOTALL)
    if fence:
        candidate = fence.group(1).strip()
    start = candidate.find("{")
    while start != -1:
        depth = 0
        in_str = False
        esc = False
        for i in range(start, len(candidate)):
            ch = candidate[i]
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
            else:
                if ch == '"':
                    in_str = True
                elif ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(candidate[start : i + 1])
                        except json.JSONDecodeError:
                            break
        start = candidate.find("{", start + 1)
    raise ValueError("no JSON object found in LLM reply")


def draft_article(transcript, board):
    """Call the local LLM and return a dict with headline/summary/body (disclaimer appended)."""
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Board: {board}\n\nTranscript:\n{transcript}"},
        ],
        "max_tokens": 8000,
        "temperature": 0.3,
    }
    resp = requests.post(
        LLM_URL,
        json=payload,
        headers={"Authorization": "Bearer local"},
        timeout=600,
    )
    resp.raise_for_status()
    message = resp.json()["choices"][0]["message"]
    content = (message.get("content") or "").strip()
    if not content:
        content = (message.get("reasoning_content") or "").strip()
    data = extract_json(content)
    body = str(data.get("body", "")).strip()
    if body:
        body += "\n\n" + DISCLAIMER
    else:
        body = DISCLAIMER
    return {
        "headline": str(data.get("headline", "")).strip(),
        "summary": str(data.get("summary", "")).strip(),
        "body": body,
    }


def get_db():
    db = getattr(g, "_db", None)
    if db is None:
        db = g._db = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_db(exc):
    db = getattr(g, "_db", None)
    if db is not None:
        db.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY AUTOINCREMENT, headline TEXT DEFAULT '', summary TEXT DEFAULT '', body TEXT DEFAULT '', source_url TEXT DEFAULT '', board TEXT DEFAULT '', meeting_date TEXT DEFAULT '', transcript TEXT DEFAULT '', status TEXT DEFAULT 'draft', approved_by TEXT DEFAULT '', approved_at TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS corrections (id INTEGER PRIMARY KEY AUTOINCREMENT, article_id INTEGER NOT NULL, detail TEXT DEFAULT '', requester TEXT DEFAULT '', public_note TEXT DEFAULT '', status TEXT DEFAULT 'pending', created_at TEXT);
"""


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript(SCHEMA)
    db.commit()
    db.close()


@app.route("/")
def home():
    return "TownReporter skeleton: /"

INGEST_TEMPLATE = """<!doctype html>
<html><head><title>TownReporter — Ingest</title></head>
<body>
<h1>Ingest meeting transcript</h1>
{% if error %}<p style="color:red">{{ error }}</p>{% endif %}
<form method="post" action="/ingest">
  <label>Transcript<br><textarea name="transcript" rows="20" cols="80">{{ transcript or '' }}</textarea></label><br>
  <label>Board
    <select name="board">
      {% for b in boards %}<option value="{{ b }}" {{ 'selected' if b == board else '' }}>{{ b }}</option>{% endfor %}
    </select>
  </label><br>
  <label>Meeting date<br><input type="text" name="meeting_date" value="{{ meeting_date or '' }}"></label><br>
  <button type="submit">Draft article</button>
</form>
</body></html>"""


@app.route("/ingest", methods=["GET", "POST"])
def ingest():
    boards = ["City Commission", "School Board", "Planning Board", "County Board"]
    if request.method == "GET":
        return render_template_string(INGEST_TEMPLATE, boards=boards, error=None, transcript="", board="", meeting_date="")
    transcript = (request.form.get("transcript") or "").strip()
    board = request.form.get("board") or ""
    meeting_date = (request.form.get("meeting_date") or "").strip()
    if not transcript:
        return render_template_string(INGEST_TEMPLATE, boards=boards, error="Transcript is required.", transcript="", board=board, meeting_date=meeting_date), 400
    try:
        draft = draft_article(transcript, board)
    except Exception as exc:
        return render_template_string(INGEST_TEMPLATE, boards=boards, error=f"Drafting failed: {exc}", transcript=transcript, board=board, meeting_date=meeting_date), 502
    db = get_db()
    cur = db.execute(
        "INSERT INTO articles (headline, summary, body, source_url, board, meeting_date, transcript, status, created_at) VALUES (?, ?, ?, '', ?, ?, ?, 'draft', ?)",
        (draft["headline"], draft["summary"], draft["body"], board, meeting_date, transcript, now_iso()),
    )
    db.commit()
    return redirect(url_for("review", id=cur.lastrowid))

@app.route("/review/<int:id>")
def review(id):
    return f"TownReporter skeleton: /review/{id}"

@app.route("/article/<int:id>")
def article(id):
    return f"TownReporter skeleton: /article/{id}"

@app.route("/corrections")
def corrections():
    return "TownReporter skeleton: /corrections"


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5155)
