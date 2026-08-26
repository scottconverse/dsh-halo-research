"""Debug migration process step by step."""

import os
import sqlite3
from contextlib import closing

# Test the full migration process manually
db_path = "debug_test.db"
backups_dir = "debug_backups"

try:
    # Create backup directory  
    os.makedirs(backups_dir, exist_ok=True)
    
    print("=== Step 1: Creating fresh database ===")
    with closing(sqlite3.connect(db_path)) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.commit()
        
    print("Database created successfully")
    
    # Check current version
    with closing(sqlite3.connect(db_path)) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        cursor = conn.execute("PRAGMA user_version")
        current_version = cursor.fetchone()[0]
        print(f"Initial version: {current_version}")
        
        # Check tables  
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tables initially: {tables}")

    print("\n=== Step 2: Trying to run migration ===")
    
    # This is what our migrate function does
    with closing(sqlite3.connect(db_path)) as conn:
        conn.execute("PRAGMA journal_mode=WAL") 
        cursor = conn.execute("PRAGMA user_version")
        current_version = cursor.fetchone()[0]
        print(f"Version before migration: {current_version}")
        
        # Simulate the logic from migrate function
        if current_version < 1:
            print("Running migration to v1...")
            
            # Create schema_meta table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_meta (
                    component TEXT PRIMARY KEY,
                    version INTEGER NOT NULL, 
                    updated_at TEXT NOT NULL
                )
            """)
            
            # Create cache_entries table  
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
            
            # Create rate_state table
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
            
            # Create request_log table
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
            
            # Insert initial schema_meta entry 
            conn.execute("""
                INSERT OR REPLACE INTO schema_meta (component, version, updated_at) 
                VALUES ('cache', 1, datetime('now'))
            """)
            
            print("Migration completed successfully")
            
    # Check final state
    with closing(sqlite3.connect(db_path)) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        
        cursor = conn.execute("PRAGMA user_version")
        version = cursor.fetchone()[0]
        print(f"Final version: {version}")
        
        # Check tables 
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tables after migration: {tables}")
        
        # Check schema_meta
        try:
            cursor = conn.execute("SELECT * FROM schema_meta WHERE component='cache'")
            meta_row = cursor.fetchone()
            if meta_row:
                print(f"schema_meta entry found: {meta_row}")
            else:
                print("No schema_meta entry found")
        except Exception as e:
            print(f"Error querying schema_meta: {e}")

finally:
    # Cleanup
    try:
        os.remove(db_path)
        import shutil
        if os.path.exists(backups_dir):
            shutil.rmtree(backups_dir)
    except:
        pass

print("Debug completed")
