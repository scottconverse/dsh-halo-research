"""Minimal notes web app: Flask + SQLite, single file."""

import html
import os
import sqlite3

from flask import Flask, redirect, request, url_for

app = Flask(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "notes.db")


def get_conn():
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = get_conn()
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS notes ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "text TEXT NOT NULL)"
        )
        conn.commit()
    finally:
        conn.close()


init_db()


def render_page(rows):
    parts = [
        "<!DOCTYPE html>",
        '<html><head><meta charset="utf-8"><title>Notes</title></head>',
        "<body>",
        "<h1>Notes</h1>",
        '<form method="post" action="/add">',
        '<input type="text" name="text">',
        '<button type="submit">Add note</button>',
        "</form>",
    ]
    for note_id, text in rows:
        parts.append(
            '<div id="note-{0}">{1}'
            '<form method="post" action="/delete/{0}">'
            '<button type="submit">Delete</button>'
            "</form></div>".format(note_id, html.escape(text))
        )
    parts.append("</body></html>")
    return "\n".join(parts)


@app.route("/")
def index():
    conn = get_conn()
    try:
        rows = conn.execute("SELECT id, text FROM notes ORDER BY id").fetchall()
    finally:
        conn.close()
    return render_page(rows)


@app.route("/add", methods=["POST"])
def add_note():
    text = request.form.get("text", "")
    conn = get_conn()
    try:
        conn.execute("INSERT INTO notes (text) VALUES (?)", (text,))
        conn.commit()
    finally:
        conn.close()
    return redirect(url_for("index"), code=302)


@app.route("/delete/<int:id>", methods=["POST"])
def delete_note(id):
    conn = get_conn()
    try:
        conn.execute("DELETE FROM notes WHERE id = ?", (id,))
        conn.commit()
    finally:
        conn.close()
    return redirect(url_for("index"), code=302)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5099)
