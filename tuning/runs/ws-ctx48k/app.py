import html
import sqlite3

from flask import Flask, redirect, request, url_for

app = Flask(__name__)
DB_PATH = "notes.db"


def get_db():
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = get_db()
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "text TEXT NOT NULL)"
    )
    conn.commit()
    conn.close()


@app.route("/")
def index():
    conn = get_db()
    rows = conn.execute("SELECT id, text FROM notes ORDER BY id").fetchall()
    conn.close()

    parts = []
    for note_id, text in rows:
        safe_text = html.escape(text)
        parts.append(
            '<div class="note" id="note-{0}">{1}'
            ' <form method="post" action="/delete/{0}">'
            '<button type="submit">Delete</button>'
            "</form></div>".format(note_id, safe_text)
        )
    notes_html = "\n".join(parts)

    return (
        "<!DOCTYPE html>\n"
        "<html>\n"
        "<head><title>Notes</title></head>\n"
        "<body>\n"
        "<h1>Notes</h1>\n"
        '<form method="post" action="/add">\n'
        '<input type="text" name="text">\n'
        '<button type="submit">Add</button>\n'
        "</form>\n" + notes_html + "\n"
        "</body>\n"
        "</html>"
    )


@app.route("/add", methods=["POST"])
def add():
    text = request.form.get("text", "")
    conn = get_db()
    conn.execute("INSERT INTO notes (text) VALUES (?)", (text,))
    conn.commit()
    conn.close()
    return redirect(url_for("index"), code=302)


@app.route("/delete/<int:id>", methods=["POST"])
def delete(id):
    conn = get_db()
    conn.execute("DELETE FROM notes WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return redirect(url_for("index"), code=302)


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5099)
