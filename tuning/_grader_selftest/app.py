"""Reference-correct canary app — used ONLY to prove smoke_test.py passes a
correct implementation (grader fairness self-test). Not part of any model run."""
import sqlite3
from flask import Flask, request, redirect

app = Flask(__name__)
DB = "notes.db"


def db():
    c = sqlite3.connect(DB)
    c.execute("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT)")
    return c


@app.route("/")
def index():
    rows = db().execute("SELECT id, text FROM notes").fetchall()
    items = ""
    for nid, text in rows:
        items += (f'<li id="note-{nid}">{text}'
                  f'<form method="post" action="/delete/{nid}">'
                  f'<button type="submit">delete</button></form></li>')
    return (f"<!doctype html><html><body><h1>Notes</h1><ul>{items}</ul>"
            f'<form method="post" action="/add">'
            f'<input name="text"><button type="submit">add</button></form>'
            f"</body></html>")


@app.route("/add", methods=["POST"])
def add():
    text = request.form.get("text", "")
    c = db(); c.execute("INSERT INTO notes (text) VALUES (?)", (text,)); c.commit()
    return redirect("/")


@app.route("/delete/<int:note_id>", methods=["POST"])
def delete(note_id):
    c = db(); c.execute("DELETE FROM notes WHERE id=?", (note_id,)); c.commit()
    return redirect("/")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5099)
