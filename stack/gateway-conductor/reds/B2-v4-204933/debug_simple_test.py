import sqlite3

# Test basic functionality 
conn = sqlite3.connect('test_simple.db')
cursor = conn.execute("PRAGMA user_version")
print("Version:", cursor.fetchone()[0])

# Try creating table and inserting data
conn.execute("""
    CREATE TABLE IF NOT EXISTS schema_meta (
        component TEXT PRIMARY KEY,
        version INTEGER NOT NULL, 
        updated_at TEXT NOT NULL
    )
""")

conn.execute("""
    INSERT OR REPLACE INTO schema_meta (component, version, updated_at) 
    VALUES ('cache', 1, '2024-01-01')
""")
conn.commit()
print("Test completed successfully")
conn.close()

# Check what's in there now
conn = sqlite3.connect('test_simple.db') 
cursor = conn.execute("SELECT * FROM schema_meta")
rows = cursor.fetchall()  
print(f"Rows found: {len(rows)}")
for row in rows:
    print(row)
conn.close()
