"""Database migrations for Halo Research Gateway."""

import os
import sqlite3
from contextlib import closing
import time

from halo_research_gateway.cache_errors import SchemaTooNewError


def migrate(db_path: str, backup_dir: str) -> None:
    """Apply all pending migrations to the database at db_path.
    
    Args:
        db_path: Path to the SQLite database file
        backup_dir: Directory where backups will be stored
        
    Raises:
        SchemaTooNewError: If the existing database schema version is newer 
                          than what this code understands
    """
    # Ensure backup directory exists
    os.makedirs(backup_dir, exist_ok=True)
    
    # Open connection to get current user_version  
    with closing(sqlite3.connect(db_path)) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        cursor = conn.execute("PRAGMA user_version")
        current_version = cursor.fetchone()[0]
        
        # If schema is newer than what we support, raise error before any changes
        if current_version > 1:
            raise SchemaTooNewError(
                f"Database schema version {current_version} is newer "
                f"than supported version 1"
            )
            
        # Create backup of existing db (if it exists and has content)
        if os.path.exists(db_path) and current_version > 0:
            _create_backup(db_path, backup_dir)
        
        # Apply migrations as needed
        if current_version < 1:
            _migrate_to_v1(conn)


def _create_backup(db_path: str, backup_dir: str) -> None:
    """Create a backup of the database using SQLite's backup API."""
    timestamp = int(time.time())
    
    # Get list of existing backups to determine which ones to keep
    backup_files = []
    try:
        for filename in os.listdir(backup_dir):
            if filename.startswith("gateway.db.backup."):
                try:
                    backup_time = int(filename.split(".")[-1])
                    backup_files.append((filename, backup_time))
                except ValueError:
                    continue  # Skip files with invalid timestamps
    except OSError:
        # Directory might not exist yet (which is okay)
        pass
    
    # Sort by timestamp (newest first)
    backup_files.sort(key=lambda x: x[1], reverse=True)
    
    # Keep only the newest 3 backups
    if len(backup_files) >= 3:
        for filename, _ in backup_files[3:]:
            try:
                os.remove(os.path.join(backup_dir, filename))
            except OSError:
                pass  # Ignore removal errors
    
    # Create new backup file name
    backup_path = os.path.join(backup_dir, f"gateway.db.backup.{timestamp}")
    
    # Use SQLite's backup API to create the backup
    with closing(sqlite3.connect(db_path)) as source_conn:
        source_conn.execute("PRAGMA journal_mode=WAL")
        with closing(sqlite3.connect(backup_path)) as dest_conn:
            dest_conn.execute("PRAGMA journal_mode=WAL")
            source_conn.backup(dest_conn)


def _migrate_to_v1(conn: sqlite3.Connection) -> None:
    """Migrate database to version 1."""
    
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
