"""Debug script for migrations issue."""

import sqlite3
from pathlib import Path

# Test database creation and schema checking
db_path = "test_debug.db"
backups_dir = "test_backups"

# Create a fresh db with version 0 first  
with sqlite3.connect(db_path) as conn:
    conn.execute("PRAGMA user_version = 0")
    conn.commit()

print(f"Created test db at {db_path}")
    
# Check current version
with sqlite3.connect(db_path) as conn:
    cursor = conn.execute("PRAGMA user_version")
    version = cursor.fetchone()[0]
    print(f"Initial version: {version}")

# Check what tables exist
with sqlite3.connect(db_path) as conn:
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Tables before migration: {tables}")

print("Done with debug script")
