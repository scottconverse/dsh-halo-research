"""
TownReporter — a lightweight local civic-journalism tool.

Pipeline (a lite version of civiccast.ai):
  ingest transcript -> local LLM drafts a neutral, source-attributed article
  -> producer reviews/edits + passes a hard-check gate -> publish to a public
  city site (home + search/board filter, article detail + transcript)
  -> corrections produce a public note.

Runs entirely locally. The drafting step calls a local OpenAI-compatible
LLM (LM Studio) — no cloud, no API key.

Run:  python app.py     (serves http://127.0.0.1:5050)
"""
import json
import re
import sqlite3
import time
import urllib.request
from datetime import datetime, timezone
from flask import (
    Flask, g, request, redirect, url_for, render_template_string, abort, flash
)

# ------------------------------------------------------------------ config
DB_PATH = "townreporter.db"
LLM_URL = "http://127.0.0.1:1234/v1/chat/completions"
LLM_MODEL = "unsloth/qwen3-coder-30b-a3b-instruct"
LLM_MAX_TOKENS = 8000          # thinking model: budget for reasoning + JSON output
LLM_TIMEOUT = 1800             # this box is slow; a draft can take many minutes
BOARDS = ["City Commission", "School Board", "Planning Board", "County Board"]
DISCLAIMER = ("Summarized by TownReporter from the official meeting record. "
              "Verify against the source.")

app = Flask(__name__)
app.secret_key = "townreporter-local-dev"


# ------------------------------------------------------------------ database
def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    d = g.pop("db", None)
    if d is not None:
        d.close()


def init_db():
    con = sqlite3.connect(DB_PATH)
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS articles (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            board        TEXT NOT NULL,
            meeting_date TEXT NOT NULL,
            headline     TEXT NOT NULL,
            summary      TEXT NOT NULL,
            body         TEXT NOT NULL,
            transcript   TEXT NOT NULL,
            source_url   TEXT,
            status       TEXT NOT NULL DEFAULT 'draft',   -- draft | published
            approved_by  TEXT,
            approved_at  TEXT,
            created_at   TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS corrections (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id    INTEGER NOT NULL,
            requester     TEXT,
            detail        TEXT NOT NULL,
            status        TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | rejected
            public_note   TEXT,
            created_at    TEXT NOT NULL,
            resolved_at   TEXT,
            FOREIGN KEY (article_id) REFERENCES articles(id)
        );
        """
    )
    con.commit()
    con.close()


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ------------------------------------------------------------------ the LLM
def draft_article(transcript, board, meeting_date):
    """Call the local LLM. Returns (result_dict, error_str).

    Handles the thinking model: if message.content is empty, fall back to
    message.reasoning_content and extract the JSON from it.
    """
    system = (
        "You are the drafting engine of TownReporter, a local civic-journalism "
        "tool. Turn a raw public-meeting transcript into a neutral news article.\n"
        "Hard rules:\n"
        "- Strictly factual and neutral. No opinion, no editorializing, no "
        "speculation, no judgment-implying adjectives.\n"
        "- Attribute every claim to a named speaker from the transcript "
        "(e.g. 'Commissioner Chen said') or to the body ('the commission voted'). "
        "Never invent names; if a speaker is unnamed, say 'a speaker'.\n"
        "- State vote counts exactly when votes occur, naming dissenters when named.\n"
        "- Use only facts present in the transcript. Add no outside context.\n"
        "- Plain American English, short paragraphs, AP-style tone.\n"
        "Respond with ONLY a JSON object (no markdown fences) with exactly these "
        'keys: "headline" (one neutral headline), "summary" (2-4 sentences), '
        '"body" (3-6 short paragraphs separated by blank lines). Do not include '
        "any disclaimer; it is added automatically."
    )
    user = f"Board or body: {board}\nMeeting date: {meeting_date}\n\nTRANSCRIPT:\n{transcript}"
    payload = {
        "model": LLM_MODEL,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "max_tokens": LLM_MAX_TOKENS,
        "temperature": 0.3,
    }
    req = urllib.request.Request(
        LLM_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json",
                 "Authorization": "Bearer local"},
    )
    try:
        with urllib.request.urlopen(req, timeout=LLM_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        return None, f"LLM request failed: {exc}"

    msg = (data.get("choices") or [{}])[0].get("message", {}) or {}
    content = (msg.get("content") or "").strip()
    if not content:
        # thinking model burned the budget on reasoning — recover from there
        content = (msg.get("reasoning_content") or "").strip()
    parsed = _extract_json(content)
    if not parsed:
        return None, "LLM returned no parseable article JSON."
    for k in ("headline", "summary", "body"):
        if not parsed.get(k):
            return None, f"LLM output missing '{k}'."
    return parsed, None


def _extract_json(text):
    """Pull the first {...} JSON object out of arbitrary model text."""
    if not text:
        return None
    text = re.sub(r"```(?:json)?", "", text)
    start = text.find("{")
    while start != -1:
        depth, i = 0, start
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    chunk = text[start:i + 1]
                    try:
                        return json.loads(chunk)
                    except json.JSONDecodeError:
                        break
        start = text.find("{", start + 1)
    return None


# ------------------------------------------------------------------ helpers
def get_article(aid):
    row = db().execute("SELECT * FROM articles WHERE id=?", (aid,)).fetchone()
    if row is None:
        abort(404)
    return row


def gate_checks(article, source_url, verified):
    """The hard-check gate. Returns dict of check -> bool."""
    body = article["body"] or ""
    return {
        "Source link present": bool((source_url or "").strip()),
        "Disclaimer present": DISCLAIMER in body,
        "Producer verified key facts": bool(verified),
    }


# ------------------------------------------------------------------ routes
@app.route("/")
def home():
    q = (request.args.get("q") or "").strip()
    board = (request.args.get("board") or "").strip()
    sql = "SELECT * FROM articles WHERE status='published'"
    params = []
    if board:
        sql += " AND board=?"
        params.append(board)
    if q:
        sql += " AND (headline LIKE ? OR summary LIKE ? OR body LIKE ? OR transcript LIKE ?)"
        params += [f"%{q}%"] * 4
    sql += " ORDER BY COALESCE(approved_at, created_at) DESC"
    articles = db().execute(sql, params).fetchall()
    return render_template_string(HOME, articles=articles, q=q, board=board,
                                  boards=BOARDS)


@app.route("/ingest", methods=["GET", "POST"])
def ingest():
    if request.method == "POST":
        transcript = (request.form.get("transcript") or "").strip()
        board = request.form.get("board") or BOARDS[0]
        meeting_date = (request.form.get("meeting_date") or "").strip()
        if not transcript or not meeting_date:
            flash("Transcript and meeting date are required.")
            return redirect(url_for("ingest"))
        result, err = draft_article(transcript, board, meeting_date)
        if err:
            flash(err)
            return redirect(url_for("ingest"))
        body = result["body"].strip() + "\n\n" + DISCLAIMER
        cur = db().execute(
            "INSERT INTO articles (board, meeting_date, headline, summary, body, "
            "transcript, status, created_at) VALUES (?,?,?,?,?,?, 'draft', ?)",
            (board, meeting_date, result["headline"], result["summary"], body,
             transcript, now_iso()),
        )
        db().commit()
        return redirect(url_for("review", aid=cur.lastrowid))
    return render_template_string(INGEST, boards=BOARDS,
                                  sample=_sample_transcript())


@app.route("/review/<int:aid>", methods=["GET", "POST"])
def review(aid):
    article = get_article(aid)
    if request.method == "POST":
        action = request.form.get("action")
        headline = request.form.get("headline", article["headline"])
        summary = request.form.get("summary", article["summary"])
        body = request.form.get("body", article["body"])
        source_url = (request.form.get("source_url") or "").strip()
        verified = request.form.get("verified") == "on"
        producer = (request.form.get("producer") or "Producer").strip() or "Producer"
        # persist edits first
        db().execute(
            "UPDATE articles SET headline=?, summary=?, body=?, source_url=? WHERE id=?",
            (headline, summary, body, source_url, aid),
        )
        db().commit()
        article = get_article(aid)
        checks = gate_checks(article, source_url, verified)
        if action == "publish":
            if all(checks.values()):
                db().execute(
                    "UPDATE articles SET status='published', approved_by=?, "
                    "approved_at=? WHERE id=?", (producer, now_iso(), aid))
                db().commit()
                return redirect(url_for("article", aid=aid))
            flash("Publish blocked — complete every gate check below.")
        return render_template_string(
            REVIEW, a=get_article(aid), checks=checks, source_url=source_url,
            verified=verified, producer=producer, disclaimer=DISCLAIMER)
    checks = gate_checks(article, article["source_url"], False)
    return render_template_string(
        REVIEW, a=article, checks=checks, source_url=article["source_url"] or "",
        verified=False, producer="Producer", disclaimer=DISCLAIMER)


@app.route("/article/<int:aid>")
def article(aid):
    a = get_article(aid)
    if a["status"] != "published":
        # allow preview from review, but public link only for published
        if request.args.get("preview") != "1":
            abort(404)
    cors = db().execute(
        "SELECT * FROM corrections WHERE article_id=? AND status='accepted' "
        "ORDER BY resolved_at", (aid,)).fetchall()
    return render_template_string(ARTICLE, a=a, corrections=cors)


@app.route("/article/<int:aid>/correction", methods=["POST"])
def request_correction(aid):
    get_article(aid)
    detail = (request.form.get("detail") or "").strip()
    requester = (request.form.get("requester") or "").strip()
    if not detail:
        flash("Please describe the correction.")
        return redirect(url_for("article", aid=aid))
    db().execute(
        "INSERT INTO corrections (article_id, requester, detail, created_at) "
        "VALUES (?,?,?,?)", (aid, requester, detail, now_iso()))
    db().commit()
    flash("Correction request submitted for producer review.")
    return redirect(url_for("article", aid=aid))


@app.route("/corrections")
def corrections_inbox():
    rows = db().execute(
        "SELECT c.*, a.headline FROM corrections c JOIN articles a "
        "ON a.id=c.article_id ORDER BY c.status, c.created_at DESC").fetchall()
    return render_template_string(CORRECTIONS, rows=rows)


@app.route("/corrections/<int:cid>", methods=["POST"])
def resolve_correction(cid):
    action = request.form.get("action")
    note = (request.form.get("public_note") or "").strip()
    status = "accepted" if action == "accept" else "rejected"
    db().execute(
        "UPDATE corrections SET status=?, public_note=?, resolved_at=? WHERE id=?",
        (status, note if status == "accepted" else None, now_iso(), cid))
    db().commit()
    flash(f"Correction {status}.")
    return redirect(url_for("corrections_inbox"))


def _sample_transcript():
    try:
        with open("sample_transcript.txt", encoding="utf-8") as fh:
            return fh.read()
    except OSError:
        return ""


# ------------------------------------------------------------------ templates
BASE = """
<!doctype html><html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>{% block title %}TownReporter{% endblock %}</title>
<style>
 :root{--ink:#1a2230;--muted:#5c6b7a;--line:#e2e8f0;--bg:#f7f9fc;--accent:#2f6f4f;--warn:#8a5a00}
 *{box-sizing:border-box}body{margin:0;font:16px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg)}
 a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
 header.site{background:#fff;border-bottom:1px solid var(--line);padding:14px 20px;display:flex;gap:18px;align-items:center;flex-wrap:wrap}
 header.site .brand{font-weight:700;font-size:19px;letter-spacing:-.3px}
 header.site nav{display:flex;gap:16px;font-size:14px;margin-left:auto}
 main{max-width:820px;margin:0 auto;padding:24px 20px}
 .card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:18px;margin:0 0 14px}
 .muted{color:var(--muted)}.pill{display:inline-block;background:#eef3ee;color:var(--accent);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600}
 label{display:block;font-weight:600;font-size:14px;margin:12px 0 4px}
 input[type=text],input[type=url],select,textarea{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font:inherit;background:#fff}
 textarea{min-height:120px;resize:vertical}
 button,.btn{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:10px 16px;font:inherit;font-weight:600;cursor:pointer}
 button.secondary,.btn.secondary{background:#eef1f5;color:var(--ink)}
 .flash{background:#fff3d6;border:1px solid #f0d488;color:var(--warn);padding:10px 14px;border-radius:8px;margin-bottom:14px}
 .disclaimer{background:#f3f6fb;border-left:3px solid var(--accent);padding:10px 14px;color:var(--muted);font-size:14px;border-radius:4px}
 .check{display:flex;gap:8px;align-items:center;margin:6px 0}.ok{color:var(--accent);font-weight:700}.no{color:#b23b3b;font-weight:700}
 .row{display:flex;gap:12px;flex-wrap:wrap}.row>*{flex:1;min-width:160px}
 .toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:16px}
 pre.transcript{white-space:pre-wrap;background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;max-height:420px;overflow:auto}
 .article-body p{margin:0 0 12px}
 .correction{background:#fbf3f3;border-left:3px solid #b23b3b;padding:8px 12px;border-radius:4px;margin:8px 0;font-size:14px}
</style></head><body>
<header class=site>
  <span class=brand><a href="{{ url_for('home') }}">TownReporter</a></span>
  <span class=muted style="font-size:13px">Local civic record</span>
  <nav>
    <a href="{{ url_for('home') }}">Home</a>
    <a href="{{ url_for('ingest') }}">New article</a>
    <a href="{{ url_for('corrections_inbox') }}">Corrections</a>
  </nav>
</header>
<main>
 {% with msgs = get_flashed_messages() %}{% for m in msgs %}<div class=flash>{{ m }}</div>{% endfor %}{% endwith %}
 {% block body %}{% endblock %}
</main></body></html>
"""

HOME = BASE.replace("{% block body %}{% endblock %}", """
{% block body %}
<h1 style="margin:.2em 0">Meeting coverage</h1>
<p class=muted>Neutral, source-linked summaries of public meetings — drafted locally, approved by a human.</p>
<form class=toolbar method=get action="{{ url_for('home') }}">
  <div style="flex:2"><label>Search</label><input type=text name=q value="{{ q }}" placeholder="budget, vote, a name, transcript text..."></div>
  <div><label>Board</label><select name=board onchange="this.form.submit()">
     <option value="">All boards</option>
     {% for b in boards %}<option value="{{ b }}" {{ 'selected' if b==board }}>{{ b }}</option>{% endfor %}
  </select></div>
  <div style="flex:0"><label>&nbsp;</label><button>Filter</button></div>
</form>
<p class=muted>{{ articles|length }} published article{{ '' if articles|length==1 else 's' }}{% if q or board %} matching filter{% endif %}.
  {% if q or board %}<a href="{{ url_for('home') }}">Reset</a>{% endif %}</p>
{% for a in articles %}
  <div class=card>
    <span class=pill>{{ a['board'] }}</span> <span class=muted style="font-size:13px">{{ a['meeting_date'] }}</span>
    <h3 style="margin:.3em 0"><a href="{{ url_for('article', aid=a['id']) }}">{{ a['headline'] }}</a></h3>
    <div class=muted>{{ a['summary'] }}</div>
  </div>
{% else %}
  <div class=card muted>No articles yet. <a href="{{ url_for('ingest') }}">Draft the first one.</a></div>
{% endfor %}
{% endblock %}
""")

INGEST = BASE.replace("{% block body %}{% endblock %}", """
{% block body %}
<h1>New article from a transcript</h1>
<p class=muted>Paste a public-meeting transcript. The local model drafts a neutral article you then review.</p>
<form method=post action="{{ url_for('ingest') }}">
  <div class=row>
    <div><label>Board</label><select name=board>{% for b in boards %}<option>{{ b }}</option>{% endfor %}</select></div>
    <div><label>Meeting date</label><input type=text name=meeting_date placeholder="August 10, 2026" required></div>
  </div>
  <label>Transcript</label>
  <textarea name=transcript rows=14 required>{{ sample }}</textarea>
  <p class=muted style="font-size:13px">Drafting runs on the local model and can take a few minutes on this machine.</p>
  <button type=submit>Generate draft &rarr;</button>
</form>
{% endblock %}
""")

REVIEW = BASE.replace("{% block body %}{% endblock %}", """
{% block body %}
<h1>Review draft</h1>
<p class=muted><span class=pill>{{ a['board'] }}</span> {{ a['meeting_date'] }} — status: {{ a['status'] }}</p>
<form method=post action="{{ url_for('review', aid=a['id']) }}">
  <label>Headline</label><input type=text name=headline value="{{ a['headline'] }}">
  <label>Summary</label><textarea name=summary rows=3>{{ a['summary'] }}</textarea>
  <label>Body <span class=muted style="font-weight:400">(the disclaimer must remain)</span></label>
  <textarea name=body rows=12>{{ a['body'] }}</textarea>
  <div class=disclaimer>Required disclaimer: {{ disclaimer }}</div>

  <h3 style="margin-top:22px">Publish gate</h3>
  <label>Source link (official recording URL)</label>
  <input type=url name=source_url value="{{ source_url }}" placeholder="https://city.example.gov/meetings/...">
  <div class=row style="margin-top:10px">
    <div><label>Producer name</label><input type=text name=producer value="{{ producer }}"></div>
  </div>
  <div class=check style="margin-top:10px">
    <input type=checkbox name=verified id=verified {{ 'checked' if verified }}>
    <label for=verified style="margin:0">I have verified the key facts (decisions, votes, dollar amounts, names, dates)</label>
  </div>

  <div class=card style="margin-top:14px">
    <strong>Gate status</strong>
    {% for name, ok in checks.items() %}
      <div class=check><span class="{{ 'ok' if ok else 'no' }}">{{ '✓' if ok else '✗' }}</span> {{ name }}</div>
    {% endfor %}
  </div>

  <div class=row style="margin-top:8px;flex:0">
    <button type=submit name=action value=save class=secondary style="flex:0">Save edits</button>
    <button type=submit name=action value=publish style="flex:0">Publish</button>
    <a class="btn secondary" style="flex:0" href="{{ url_for('article', aid=a['id']) }}?preview=1">Preview</a>
  </div>
</form>
{% endblock %}
""")

ARTICLE = BASE.replace("{% block body %}{% endblock %}", """
{% block body %}
<p class=muted><a href="{{ url_for('home') }}">&larr; All coverage</a></p>
<span class=pill>{{ a['board'] }}</span> <span class=muted style="font-size:13px">{{ a['meeting_date'] }}
  {% if a['status']=='published' and a['approved_by'] %} · published by {{ a['approved_by'] }}{% endif %}</span>
<h1 style="margin:.2em 0">{{ a['headline'] }}</h1>
<p style="font-size:18px;color:var(--muted)">{{ a['summary'] }}</p>
{% for c in corrections %}<div class=correction><strong>Correction ({{ c['resolved_at'][:10] }}):</strong> {{ c['public_note'] }}</div>{% endfor %}
<div class=article-body>{% for para in a['body'].split('\n\n') %}<p>{{ para }}</p>{% endfor %}</div>
{% if a['source_url'] %}<p><strong>Source:</strong> <a href="{{ a['source_url'] }}" target=_blank rel=noopener>Official meeting recording</a></p>{% endif %}

<h3 style="margin-top:26px">Full transcript</h3>
<pre class=transcript>{{ a['transcript'] }}</pre>

<div class=card style="margin-top:22px">
  <strong>Request a correction</strong>
  <form method=post action="{{ url_for('request_correction', aid=a['id']) }}">
    <label>Your name (optional)</label><input type=text name=requester>
    <label>What should be corrected?</label><textarea name=detail rows=3 required></textarea>
    <button type=submit style="margin-top:8px">Submit correction request</button>
  </form>
</div>
{% endblock %}
""")

CORRECTIONS = BASE.replace("{% block body %}{% endblock %}", """
{% block body %}
<h1>Corrections</h1>
<p class=muted>Producer review of public correction requests.</p>
{% for c in rows %}
 <div class=card>
  <span class=pill>{{ c['status'] }}</span>
  <a href="{{ url_for('article', aid=c['article_id']) }}">{{ c['headline'] }}</a>
  <div class=muted style="font-size:13px">{{ c['created_at'][:16].replace('T',' ') }}{% if c['requester'] %} · {{ c['requester'] }}{% endif %}</div>
  <p>{{ c['detail'] }}</p>
  {% if c['status']=='pending' %}
   <form method=post action="{{ url_for('resolve_correction', cid=c['id']) }}">
     <label>Public correction note (shown on the article if accepted)</label>
     <input type=text name=public_note placeholder="What changed and why">
     <div class=row style="flex:0;margin-top:8px">
       <button type=submit name=action value=accept style="flex:0">Accept</button>
       <button type=submit name=action value=reject class=secondary style="flex:0">Reject</button>
     </div>
   </form>
  {% elif c['public_note'] %}<div class=correction>Public note: {{ c['public_note'] }}</div>{% endif %}
 </div>
{% else %}<div class=card muted>No correction requests yet.</div>{% endfor %}
{% endblock %}
""")


if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5154, debug=False)

