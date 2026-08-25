import os
import sqlite3

from flask import Flask, redirect, render_template_string, request

app = Flask(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "notes.db")

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Notes</title>
</head>
<body>
  <h1>Notes</h1>
  <form method="post" action="/add">
    <input type="text" name="text">
    <button type="submit">Add note</button>
  </form>
  <ul>
    {% for note in notes %}
    <li id="note-{{ note.id }}">
      {{ note.text }}
      <form method="post" action="/delete/{{ note.id }}">
        <button type="submit">Delete</button>
      </form>
    </li>
    {% endfor %}
  </ul>
</body>
</html>
"""


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


@app.route("/")
def index():
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT id, text FROM notes ORDER BY id").fetchall()
    finally:
        conn.close()
    return render_template_string(PAGE_TEMPLATE, notes=rows)


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


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5099)
