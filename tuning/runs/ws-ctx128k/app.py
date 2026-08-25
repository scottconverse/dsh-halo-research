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


init_db()


@app.route("/")
def index():
    conn = get_db()
    rows = conn.execute("SELECT id, text FROM notes ORDER BY id").fetchall()
    conn.close()

    items_html = []
    for note_id, text in rows:
        items_html.append(
            "<li>"
            + html.escape(text)
            + " <form method=\"post\" action=\"/delete/"
            + str(note_id)
            + "\"><button type=\"submit\">Delete</button></form> "
            + "<span class=\"note-id\">note-"
            + str(note_id)
            + "</span>"
            + "</li>"
        )
    notes_html = "\n".join(items_html)

    page = (
        "<!DOCTYPE html>\n"
        "<html>\n"
        "<head><title>Notes</title></head>\n"
        "<body>\n"
        "<h1>Notes</h1>\n"
        "<ul>\n" + notes_html + "\n</ul>\n"
        '<form method="post" action="/add">\n'
        '  <input type="text" name="text">\n'
        "  <button type=\"submit\">Add</button>\n"
        "</form>\n"
        "</body>\n"
        "</html>"
    )
    return page


@app.route("/add", methods=["POST"])
def add():
    text = request.form.get("text", "")
    conn = get_db()
    conn.execute("INSERT INTO notes (text) VALUES (?)", (text,))
    conn.commit()
    conn.close()
    return redirect(url_for("index"), code=302)


@app.route("/delete/<int:note_id>", methods=["POST"])
def delete(note_id):
    conn = get_db()
    conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    return redirect(url_for("index"), code=302)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5099)
