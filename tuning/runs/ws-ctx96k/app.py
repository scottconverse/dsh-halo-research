"""Minimal notes web app: Flask + SQLite, single file."""

import os
import sqlite3

from flask import Flask, g, redirect, render_template_string, request

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "notes.db")

app = Flask(__name__)


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS notes ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "text TEXT NOT NULL)"
        )
        conn.commit()
    finally:
        conn.close()


PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Notes</title>
</head>
<body>
<h1>Notes</h1>
<form method="post" action="/add">
  <input type="text" name="text" placeholder="New note">
  <button type="submit">Add</button>
</form>
<ul>
{% for note in notes %}
<li>
  <span class="note-id">note-{{ note.id }}</span>
  {{ note.text }}
  <form method="post" action="/delete/{{ note.id }}">
    <button type="submit">Delete</button>
  </form>
</li>
{% endfor %}
</ul>
</body>
</html>"""


@app.route("/")
def index():
    db = get_db()
    notes = db.execute("SELECT id, text FROM notes ORDER BY id").fetchall()
    return render_template_string(PAGE_TEMPLATE, notes=notes)


@app.route("/add", methods=["POST"])
def add():
    text = request.form.get("text", "")
    db = get_db()
    db.execute("INSERT INTO notes (text) VALUES (?)", (text,))
    db.commit()
    return redirect("/", code=302)


@app.route("/delete/<int:id>", methods=["POST"])
def delete(id):
    db = get_db()
    db.execute("DELETE FROM notes WHERE id = ?", (id,))
    db.commit()
    return redirect("/", code=302)


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5099)
