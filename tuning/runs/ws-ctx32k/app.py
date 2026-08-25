import sqlite3

from flask import Flask, redirect, request
from markupsafe import escape

app = Flask(__name__)
DB_PATH = "notes.db"


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


init_db()


@app.route("/")
def index():
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute("SELECT id, text FROM notes ORDER BY id").fetchall()
    finally:
        conn.close()

    items = "".join(
        '<li><span class="note-id">note-{nid}</span> {text} '
        '<form method="post" action="/delete/{nid}">'
        '<button type="submit">Delete</button></form></li>'.format(
            nid=nid, text=escape(text)
        )
        for nid, text in rows
    )

    html = (
        "<!DOCTYPE html>"
        "<html><head><title>Notes</title></head>"
        "<body>"
        "<h1>Notes</h1>"
        "<ul>{items}</ul>"
        '<form method="post" action="/add">'
        '<input type="text" name="text">'
        '<button type="submit">Add</button>'
        "</form>"
        "</body></html>".format(items=items)
    )
    return html


@app.route("/add", methods=["POST"])
def add():
    text = request.form.get("text", "")
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("INSERT INTO notes (text) VALUES (?)", (text,))
        conn.commit()
    finally:
        conn.close()
    return redirect("/", code=302)


@app.route("/delete/<int:id>", methods=["POST"])
def delete(id):
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("DELETE FROM notes WHERE id = ?", (id,))
        conn.commit()
    finally:
        conn.close()
    return redirect("/", code=302)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5099)
