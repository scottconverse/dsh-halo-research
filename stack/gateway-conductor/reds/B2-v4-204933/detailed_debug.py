import os
import sqlite3
from contextlib import closing

# Simulate exact steps of the failing test  
db_path = "detailed_debug.db"
backups_dir = "debug_backups"

try:
    # Create backup directory (like tmp_path)
    os.makedirs(backups_dir, exist_ok=True) 
    
    print("Step 1: Creating database with version 0")
    with closing(sqlite3.connect(db_path)) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA user_version = 0") 
        conn.commit()
    
    print("Step 2: Check initial state")
    with closing(sqlite3.connect(db_path)) as conn:
        cursor = conn.execute("PRAGMA user_version")
        version = cursor.fetchone()[0]
        print(f"Initial version: {version}")
        
    print("Step 3: Run migration from our code")  
    # This is what we do in migrate function
    with closing(sqlite3.connect(db_path)) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        cursor = conn.execute("PRAGMA user_version")
        current_version = cursor.fetchone()[0]
        print(f"Version before migration: {current_version}")
        
        if current_version < 1:
            print("Running _migrate_to_v1 logic...")
            
            # Create all tables (same as in _migrate_to_v1) 
            conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_meta (
                    component TEXT PRIMARY KEY,
                    version INTEGER NOT NULL, 
                    updated_at TEXT NOT NULL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cache_entries (
                    cache_key TEXT PRIMARY KEY,
                    provider TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    result_schema_version TEXT NOT NULL,
                    payload_schema_version INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    last_accessed_at TEXT NOT NULL,
                    status_code INTEGER,
                    storage_kind TEXT NOT NULL,
                    content_encoding TEXT,
                    inline_payload BLOB,
                    body_digest TEXT,
                    body_relative_path TEXT,
                    compressed_bytes INTEGER NOT NULL,
                    uncompressed_bytes INTEGER NOT NULL,
                    CHECK (storage_kind IN ('inline','file'))
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS rate_state (
                    bucket_key TEXT PRIMARY KEY,
                    last_started_at TEXT,
                    window_started_at TEXT,
                    request_count INTEGER NOT NULL DEFAULT 0,
                    consecutive_429 INTEGER NOT NULL DEFAULT 0,
                    circuit_state TEXT NOT NULL DEFAULT 'closed',
                    circuit_until TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS request_log (
                    request_id TEXT PRIMARY KEY,
                    tool TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    cache_key TEXT,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    outcome TEXT,
                    upstream_status INTEGER,
                    duration_ms INTEGER,
                    cache_hit INTEGER NOT NULL DEFAULT 0,
                    warning_codes TEXT
                )
            """)
            
            # Update schema version  
            conn.execute("PRAGMA user_version = 1")
            
            # Insert initial schema_meta entry (the critical part)
            print("About to insert into schema_meta...")
            result = conn.execute("""
                INSERT OR REPLACE INTO schema_meta (component, version, updated_at) 
                VALUES ('cache', 1, datetime('now'))
            """)  
            print(f"Insert result: {result}")
            
            # Important: commit the transaction!
            conn.commit()
            print("Transaction committed")
        
        # Check final state
        cursor = conn.execute("PRAGMA user_version")
        version_after = cursor.fetchone()[0]
        print(f"Version after migration: {version_after}")

    print("\nStep 4: Checking if schema_meta exists")
    with closing(sqlite3.connect(db_path)) as conn:
        try:
            cursor = conn.execute("SELECT * FROM schema_meta WHERE component='cache'")
            meta_row = cursor.fetchone()
            print(f"schema_meta row found: {meta_row}")
            
            # Also check all rows
            cursor = conn.execute("SELECT * FROM schema_meta")
            all_rows = cursor.fetchall()
            print(f"All schema_meta rows: {all_rows}")
            
        except Exception as e:
            print(f"Error querying schema_meta: {e}")

finally:
    try:
        os.remove(db_path)
        import shutil
        if os.path.exists(backups_dir):
            shutil.rmtree(backups_dir) 
    except Exception as e:
        pass

print("Detailed debug completed")
