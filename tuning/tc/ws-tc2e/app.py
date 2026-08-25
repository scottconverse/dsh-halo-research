import json
import re
import sqlite3
import urllib.request
from datetime import date, datetime
from markupsafe import Markup, escape
from flask import Flask, request, redirect, url_for, render_template_string, abort

DB = "townreporter.db"
app = Flask(__name__)

DISCLAIMER = ("Summarized by TownReporter from the official meeting record. "
              "Verify against the source.")
BOARDS = ["City Commission", "School Board", "Planning Board", "County Board"]


def extract_json(text):
    """Parse the first JSON object out of a model reply (fences, prose)."""
    text = re.sub(r"```(?:json)?\s*", "", text)
    start = text.find("{")
    while start != -1:
        depth = 0
        in_str = False
        esc = False
        for i in range(start, len(text)):
            ch = text[i]
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
                        return json.loads(text[start:i + 1])
        start = text.find("{", start + 1)
    raise ValueError("no JSON object found in model reply")

SYSTEM_PROMPT = (
    "You are a neutral civic-news reporter. Draft an article from the meeting "
    "transcript provided. Attribute every claim to a named speaker or to the "
    "body itself. State vote counts exactly as recorded. No opinion, no "
    "invented facts, nothing beyond the transcript. Respond with ONLY a JSON "
    "object with keys \"headline\", \"summary\" (one sentence), and \"body\" "
    "(3-6 short paragraphs separated by blank lines). Do not include any "
    "disclaimer in the body."
)


def draft_with_llm(transcript):
    payload = {
        "model": "unsloth/qwen3-coder-30b-a3b-instruct",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript},
        ],
        "max_tokens": 8000,
        "temperature": 0.3,
    }
    req = urllib.request.Request(
        "http://127.0.0.1:1234/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer local",
        },
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    message = data["choices"][0]["message"]
    content = (message.get("content") or "").strip()
    if not content:
        content = (message.get("reasoning_content") or "").strip()
    obj = extract_json(content)
    body = str(obj["body"]).strip() + "\n\n" + DISCLAIMER
    return str(obj["headline"]).strip(), str(obj["summary"]).strip(), body


def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board TEXT, meeting_date TEXT, transcript TEXT,
        headline TEXT, summary TEXT, body TEXT, source_url TEXT,
        status TEXT DEFAULT 'draft', producer TEXT,
        approved_by TEXT, approved_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS corrections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER, detail TEXT, requester TEXT,
        status TEXT DEFAULT 'pending', public_note TEXT, note_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cols = {r[1] for r in conn.execute("PRAGMA table_info(articles)")}
    if "verified" not in cols:
        conn.execute("ALTER TABLE articles ADD COLUMN verified INTEGER DEFAULT 0")
    conn.commit()
    conn.close()

INGEST_FORM = """<!doctype html><html><head><title>Ingest — TownReporter</title></head>
<body><h1>Ingest a meeting transcript</h1>
<form method="post">
<label>Transcript<br><textarea name="transcript" rows="20" cols="80">{{ transcript }}</textarea></label><br>
<label>Board<br><select name="board">{% for b in boards %}<option>{{ b }}</option>{% endfor %}</select></label><br>
<label>Meeting date<br><input type="text" name="meeting_date" value="{{ meeting_date }}"></label><br>
<button type="submit">Draft article</button>
</form></body></html>"""


@app.route("/ingest", methods=["GET", "POST"])
def ingest():
    if request.method == "GET":
        return render_template_string(INGEST_FORM, transcript="", boards=BOARDS,
                                      meeting_date="")
    transcript = (request.form.get("transcript") or "").strip()
    board = request.form.get("board") or ""
    meeting_date = (request.form.get("meeting_date") or "").strip()
    if not transcript:
        return render_template_string(INGEST_FORM, transcript=transcript,
                                      boards=BOARDS, meeting_date=meeting_date), 400
    try:
        headline, summary, body = draft_with_llm(transcript)
    except Exception as exc:
        return render_template_string(
            INGEST_FORM, transcript=transcript, boards=BOARDS,
            meeting_date=meeting_date) + f"<p>Drafting failed: {exc}</p>", 502
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO articles (board, meeting_date, transcript, headline,"
        " summary, body, status) VALUES (?, ?, ?, ?, ?, ?, 'draft')",
        (board, meeting_date, transcript, headline, summary, body))
    article_id = cur.lastrowid
    conn.commit()
    conn.close()
    return redirect(f"/review/{article_id}", code=302)


REVIEW_FORM = """<!doctype html><html><head><title>Review — TownReporter</title></head>
<body><h1>Review article {{ a.id }}</h1>
{% if gate_problems %}<p id="gate">Gate: FAIL — {% for p in gate_problems %}{{ p }}; {% endfor %}</p>{% endif %}
{% if published_now %}<p id="gate">Gate: PASS — article published.</p>{% endif %}
<form method="post">
<label>Headline<br><input type="text" name="headline" value="{{ a.headline }}"></label><br>
<label>Summary<br><textarea name="summary" rows="3">{{ a.summary }}</textarea></label><br>
<label>Body<br><textarea name="body" rows="20">{{ a.body }}</textarea></label><br>
<label>Source URL<br><input type="text" name="source_url" value="{{ a.source_url }}"></label><br>
<label><input type="checkbox" name="verified" {{ "checked" if verified }} > Verified</label><br>
<label>Producer<br><input type="text" name="producer" value="{{ a.producer }}"></label><br>
<button type="submit" name="action" value="save">Save</button>
<button type="submit" name="action" value="publish">Publish</button>
</form></body></html>"""


def gate_problems(source_url, body, verified):
    problems = []
    if not (source_url or "").strip():
        problems.append("source_url is empty")
    if DISCLAIMER not in (body or ""):
        problems.append("required disclaimer missing from body")
    if not verified:
        problems.append("verified checkbox not checked")
    return problems


@app.route("/review/<int:id>", methods=["GET", "POST"])
def review(id):
    conn = get_db()
    row = conn.execute("SELECT * FROM articles WHERE id=?", (id,)).fetchone()
    if row is None:
        conn.close()
        abort(404)
    if request.method == "GET":
        return render_template_string(REVIEW_FORM, a=row, gate_problems=[],
                                      published_now=False, verified=bool(row["verified"]))
    headline = (request.form.get("headline") or "").strip()
    summary = (request.form.get("summary") or "").strip()
    body = request.form.get("body") or ""
    source_url = (request.form.get("source_url") or "").strip()
    producer = (request.form.get("producer") or "").strip()
    verified = 1 if "verified" in request.form else 0
    conn.execute(
        "UPDATE articles SET headline=?, summary=?, body=?, source_url=?,"
        " producer=?, verified=? WHERE id=?",
        (headline, summary, body, source_url, producer, verified, id))
    action = request.form.get("action")
    published_now = False
    problems = []
    if action == "publish":
        problems = gate_problems(source_url, body, verified)
        if not problems:
            conn.execute(
                "UPDATE articles SET status='published', approved_by=?,"
                " approved_at=? WHERE id=?",
                (producer, datetime.now().isoformat(timespec="seconds"), id))
            published_now = True
    conn.commit()
    row = conn.execute("SELECT * FROM articles WHERE id=?", (id,)).fetchone()
    conn.close()
    return render_template_string(REVIEW_FORM, a=row, gate_problems=problems,
                                  published_now=published_now, verified=bool(verified))


ARTICLE_PAGE = """<!doctype html><html><head><title>{{ a.headline }} — TownReporter</title></head>
<body>
<h1>{{ a.headline }}</h1>
<p>Board: {{ a.board }} | Meeting date: {{ a.meeting_date }}</p>
{% if a.status == 'published' %}<p>Published by {{ a.approved_by }}</p>{% else %}<p>Draft (preview)</p>{% endif %}
<h2>Summary</h2><p>{{ a.summary }}</p>
<div class="body">{{ body_html }}</div>
{% if a.source_url %}<p>Source: <a href="{{ a.source_url }}">{{ a.source_url }}</a></p>{% endif %}
{% for c in corrections %}<p>Correction ({{ c.note_date }}): {{ c.public_note }}</p>{% endfor %}
<h2>Full transcript</h2><pre>{{ a.transcript }}</pre>
<h2>Request a correction</h2>
<form method="post" action="/article/{{ a.id }}/correction">
<label>Detail<br><textarea name="detail" rows="4"></textarea></label><br>
<label>Requester<br><input type="text" name="requester"></label><br>
<button type="submit">Submit correction request</button>
</form>
<p><a href="/">Home</a></p>
</body></html>"""


@app.route("/article/<int:id>")
def article(id):
    conn = get_db()
    row = conn.execute("SELECT * FROM articles WHERE id=?", (id,)).fetchone()
    if row is None:
        conn.close()
        abort(404)
    preview = request.args.get("preview") == "1"
    if row["status"] != "published" and not preview:
        conn.close()
        abort(404)
    corrections = conn.execute(
        "SELECT * FROM corrections WHERE article_id=? AND status='accepted'"
        " ORDER BY id", (id,)).fetchall()
    conn.close()
    body_html = Markup("".join(
        f"<p>{escape(p)}</p>" for p in (row["body"] or "").split("\n\n") if p))
    return render_template_string(ARTICLE_PAGE, a=row, corrections=corrections,
                                  body_html=body_html)


@app.route("/article/<int:id>/correction", methods=["POST"])
def request_correction(id):
    conn = get_db()
    row = conn.execute("SELECT id FROM articles WHERE id=?", (id,)).fetchone()
    if row is None:
        conn.close()
        abort(404)
    detail = (request.form.get("detail") or "").strip()
    requester = (request.form.get("requester") or "").strip()
    if not detail:
        conn.close()
        return "correction detail is required", 400
    conn.execute(
        "INSERT INTO corrections (article_id, detail, requester, status)"
        " VALUES (?, ?, ?, 'pending')", (id, detail, requester))
    conn.commit()
    conn.close()
    return redirect(f"/article/{id}", code=302)


CORRECTIONS_PAGE = """<!doctype html><html><head><title>Corrections — TownReporter</title></head>
<body><h1>Correction requests</h1>
<ul>
{% for c in items %}
<li>[{{ c.status }}] <a href="/article/{{ c.article_id }}">{{ c.headline }}</a>
— {{ c.detail }} (requester: {{ c.requester or "anonymous" }})
{% if c.status == 'pending' %}
<form method="post" action="/corrections/{{ c.id }}">
<input type="text" name="public_note" placeholder="Public note">
<button type="submit" name="action" value="accept">Accept</button>
<button type="submit" name="action" value="reject">Reject</button>
</form>{% endif %}
{% if c.status == 'accepted' and c.public_note %}<p>Correction ({{ c.note_date }}): {{ c.public_note }}</p>{% endif %}
</li>
{% else %}<li>No correction requests.</li>{% endfor %}
</ul></body></html>"""


@app.route("/corrections")
def corrections():
    conn = get_db()
    rows = conn.execute(
        "SELECT c.*, a.headline FROM corrections c"
        " JOIN articles a ON a.id=c.article_id ORDER BY c.id").fetchall()
    conn.close()
    return render_template_string(CORRECTIONS_PAGE, items=rows)


@app.route("/corrections/<int:cid>", methods=["POST"])
def decide_correction(cid):
    action = request.form.get("action")
    note = (request.form.get("public_note") or "").strip()
    conn = get_db()
    row = conn.execute("SELECT id FROM corrections WHERE id=?", (cid,)).fetchone()
    if row is None:
        conn.close()
        abort(404)
    if action == "accept":
        conn.execute(
            "UPDATE corrections SET status='accepted', public_note=?,"
            " note_date=? WHERE id=?",
            (note, date.today().isoformat(), cid))
    elif action == "reject":
        conn.execute("UPDATE corrections SET status='rejected' WHERE id=?", (cid,))
    else:
        conn.close()
        return "unknown action", 400
    conn.commit()
    conn.close()
    return redirect("/corrections", code=302)


HOME_PAGE = """<!doctype html><html><head><title>TownReporter</title></head>
<body><h1>TownReporter</h1>
<form method="get">
<input type="text" name="q" value="{{ q }}" placeholder="Search articles...">
<select name="board"><option value="">All boards</option>
{% for b in boards %}<option value="{{ b }}" {{ "selected" if board == b }}>{{ b }}</option>{% endfor %}
</select><button type="submit">Search</button></form>
<ul>
{% for a in articles %}
<li><a href="/article/{{ a.id }}">{{ a.headline }}</a> — {{ a.board }}, {{ a.meeting_date }}<br>{{ a.summary }}</li>
{% else %}<li>No published articles found.</li>{% endfor %}
</ul></body></html>"""


@app.route("/")
def home():
    q = (request.args.get("q") or "").strip()
    board = request.args.get("board") or ""
    sql = "SELECT * FROM articles WHERE status='published'"
    params = []
    if q:
        like = f"%{q}%"
        sql += (" AND (headline LIKE ? OR summary LIKE ? OR body LIKE ?"
                " OR transcript LIKE ?)")
        params.extend([like] * 4)
    if board:
        sql += " AND board=?"
        params.append(board)
    sql += " ORDER BY id DESC"
    conn = get_db()
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return render_template_string(HOME_PAGE, articles=rows, q=q, board=board,
                                  boards=BOARDS)

if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5158)
